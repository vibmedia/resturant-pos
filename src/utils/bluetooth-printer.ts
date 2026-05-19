/**
 * Web Bluetooth ESC/POS thermal printer utility for Nukkad Street Cafe.
 * Targets 58mm/80mm receipt printers commonly used with Android tablets.
 *
 * Flow: connect() → printReceipt(order) → disconnect()
 * The connection is cached so repeated prints don't re-pair.
 */

import { CartItem, Order } from '../types';

// ESC/POS command constants
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: new Uint8Array([ESC, 0x40]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 0x01]),
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0x00]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 0x02]),
  BOLD_ON: new Uint8Array([ESC, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
  DOUBLE_SIZE: new Uint8Array([ESC, 0x21, 0x30]),
  NORMAL_SIZE: new Uint8Array([ESC, 0x21, 0x00]),
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 0x01]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0x00]),
  CUT: new Uint8Array([GS, 0x56, 0x00]),
  PARTIAL_CUT: new Uint8Array([GS, 0x56, 0x01]),
  FEED_3: new Uint8Array([ESC, 0x64, 0x03]),
  FEED_5: new Uint8Array([ESC, 0x64, 0x05]),
  LINE: new Uint8Array([LF]),
};

// Standard BLE serial service/characteristic UUIDs used by most thermal printers
const PRINTER_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

const PRINTER_CHAR_UUIDS = [
  '00002af1-0000-1000-8000-00805f9b34fb',
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
];

export interface PrinterStatus {
  connected: boolean;
  deviceName: string | null;
  error: string | null;
}

let device: BluetoothDevice | null = null;
let server: BluetoothRemoteGATTServer | null = null;
let writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

export function isBluetoothSupported(): boolean {
  return !!navigator.bluetooth;
}

export function getPrinterStatus(): PrinterStatus {
  return {
    connected: !!writeCharacteristic && !!server?.connected,
    deviceName: device?.name ?? null,
    error: null,
  };
}

export async function connectPrinter(): Promise<PrinterStatus> {
  if (!isBluetoothSupported()) {
    return { connected: false, deviceName: null, error: 'Web Bluetooth not supported. Use Chrome on Android.' };
  }

  // If already connected, return current status
  if (writeCharacteristic && server?.connected) {
    return { connected: true, deviceName: device?.name ?? null, error: null };
  }

  try {
    device = await navigator.bluetooth.requestDevice({
      // Accept any device, then we discover services
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICE_UUIDS,
    });

    if (!device.gatt) {
      return { connected: false, deviceName: null, error: 'No GATT server on this device.' };
    }

    server = await device.gatt.connect();

    // Try each known service UUID until we find one
    let service: BluetoothRemoteGATTService | null = null;
    for (const uuid of PRINTER_SERVICE_UUIDS) {
      try {
        service = await server.getPrimaryService(uuid);
        if (service) break;
      } catch {
        continue;
      }
    }

    if (!service) {
      // Fallback: try to discover all services
      const services = await server.getPrimaryServices();
      if (services.length > 0) {
        service = services[0];
      }
    }

    if (!service) {
      return { connected: false, deviceName: device.name ?? null, error: 'No supported print service found on this device.' };
    }

    // Find writable characteristic
    for (const uuid of PRINTER_CHAR_UUIDS) {
      try {
        writeCharacteristic = await service.getCharacteristic(uuid);
        if (writeCharacteristic) break;
      } catch {
        continue;
      }
    }

    if (!writeCharacteristic) {
      const chars = await service.getCharacteristics();
      for (const c of chars) {
        if (c.properties.write || c.properties.writeWithoutResponse) {
          writeCharacteristic = c;
          break;
        }
      }
    }

    if (!writeCharacteristic) {
      return { connected: false, deviceName: device.name ?? null, error: 'No writable characteristic found.' };
    }

    // Listen for disconnection
    device.addEventListener('gattserverdisconnected', () => {
      writeCharacteristic = null;
      server = null;
    });

    return { connected: true, deviceName: device.name ?? 'Unknown Printer', error: null };
  } catch (err: any) {
    const msg = err?.message || 'Failed to connect';
    if (msg.includes('cancelled') || msg.includes('User cancelled')) {
      return { connected: false, deviceName: null, error: null }; // User cancelled — not an error
    }
    return { connected: false, deviceName: null, error: msg };
  }
}

export function disconnectPrinter(): void {
  if (server?.connected) {
    server.disconnect();
  }
  writeCharacteristic = null;
  server = null;
  device = null;
}

// Write data in chunks (BLE has a 20-byte MTU by default, many printers accept 512)
async function writeData(data: Uint8Array): Promise<void> {
  if (!writeCharacteristic) throw new Error('Printer not connected');

  const CHUNK = 128;
  for (let i = 0; i < data.length; i += CHUNK) {
    const chunk = data.slice(i, i + CHUNK);
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    // Small delay between chunks to prevent buffer overflow
    await new Promise(r => setTimeout(r, 20));
  }
}

function textToBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function padRight(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : str + ' '.repeat(len - str.length);
}

function padLeft(str: string, len: number): string {
  return str.length >= len ? str.substring(0, len) : ' '.repeat(len - str.length) + str;
}

// 32 chars width for 58mm, 48 chars for 80mm — we'll target 32 (safe default)
const LINE_WIDTH = 32;

function separator(): Uint8Array {
  return textToBytes('-'.repeat(LINE_WIDTH) + '\n');
}

export async function printReceipt(order: Order): Promise<void> {
  if (!writeCharacteristic || !server?.connected) {
    throw new Error('Printer not connected. Please connect first.');
  }

  const now = new Date(order.createdAt);
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const orderNum = String(order.dailyNumber).padStart(3, '0');

  // Build receipt buffer
  const parts: Uint8Array[] = [];
  const push = (...items: Uint8Array[]) => parts.push(...items);

  // Initialize
  push(CMD.INIT);

  // Header
  push(CMD.ALIGN_CENTER);
  push(CMD.DOUBLE_SIZE);
  push(textToBytes('NUKKAD\n'));
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_ON);
  push(textToBytes('STREET CAFE\n'));
  push(CMD.BOLD_OFF);
  push(textToBytes('\n'));

  // Order info
  push(CMD.DOUBLE_HEIGHT);
  push(CMD.BOLD_ON);
  push(textToBytes(`ORDER #${orderNum}\n`));
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_OFF);
  push(textToBytes(`${dateStr}  ${timeStr}\n`));
  push(textToBytes(`Payment: ${order.paymentType.toUpperCase()}\n`));
  push(CMD.ALIGN_LEFT);
  push(separator());

  // Column header
  push(CMD.BOLD_ON);
  const header = padRight('ITEM', 18) + padLeft('QTY', 4) + padLeft('AMT', 10);
  push(textToBytes(header + '\n'));
  push(CMD.BOLD_OFF);
  push(separator());

  // Items
  for (const item of order.items) {
    const displayName = item.name.length > 16
      ? item.name.substring(0, 16)
      : item.name;
    const sizeTag = item.size === 'H' ? '(H)' : '(F)';
    const nameCol = padRight(`${displayName} ${sizeTag}`, 18);
    const qtyCol = padLeft(String(item.qty), 4);
    const amtCol = padLeft(`₹${item.price * item.qty}`, 10);
    push(textToBytes(`${nameCol}${qtyCol}${amtCol}\n`));
  }

  push(separator());

  // Total
  push(CMD.BOLD_ON);
  push(CMD.DOUBLE_HEIGHT);
  const totalLine = padRight('TOTAL', 22) + padLeft(`₹${order.total}`, 10);
  push(textToBytes(totalLine + '\n'));
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_OFF);

  // Comment
  if (order.comment) {
    push(CMD.LINE);
    push(textToBytes(`Note: ${order.comment}\n`));
  }

  // Footer
  push(CMD.LINE);
  push(CMD.ALIGN_CENTER);
  push(separator());
  push(textToBytes('Thank you!\n'));
  push(textToBytes('Visit us again :)\n'));
  push(CMD.FEED_5);
  push(CMD.PARTIAL_CUT);

  // Concatenate all parts into a single buffer
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.length;
  }

  await writeData(buffer);
}

/**
 * Print a KOT (Kitchen Order Ticket) — larger text, no prices, just items + qty.
 */
export async function printKOT(order: Order): Promise<void> {
  if (!writeCharacteristic || !server?.connected) {
    throw new Error('Printer not connected.');
  }

  const orderNum = String(order.dailyNumber).padStart(3, '0');
  const now = new Date(order.createdAt);
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const parts: Uint8Array[] = [];
  const push = (...items: Uint8Array[]) => parts.push(...items);

  push(CMD.INIT);

  // KOT Header
  push(CMD.ALIGN_CENTER);
  push(CMD.DOUBLE_SIZE);
  push(CMD.BOLD_ON);
  push(textToBytes(`KOT #${orderNum}\n`));
  push(CMD.NORMAL_SIZE);
  push(CMD.BOLD_OFF);
  push(textToBytes(`${timeStr}\n`));
  push(CMD.ALIGN_LEFT);
  push(separator());

  // Items — big and clear for the kitchen
  push(CMD.DOUBLE_HEIGHT);
  for (const item of order.items) {
    const sizeTag = item.size === 'H' ? '(H)' : '(F)';
    const line = padRight(`${item.qty}x ${item.name}`, 28) + padLeft(sizeTag, 4);
    push(textToBytes(line + '\n'));
  }
  push(CMD.NORMAL_SIZE);

  // Comment
  if (order.comment) {
    push(separator());
    push(CMD.BOLD_ON);
    push(textToBytes(`NOTE: ${order.comment}\n`));
    push(CMD.BOLD_OFF);
  }

  push(CMD.FEED_3);
  push(CMD.PARTIAL_CUT);

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const buffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    buffer.set(part, offset);
    offset += part.length;
  }

  await writeData(buffer);
}
