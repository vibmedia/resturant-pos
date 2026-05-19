export type Size = 'H' | 'F';

export interface MenuItem {
  id: number;
  name: string;
  h: number | null;
  f: number;
  imageUrl?: string;
}

export interface Category {
  name: string;
  items: MenuItem[];
}

export interface CartItem {
  id: string; // unique based on itemId + size
  menuItemId: number;
  name: string;
  size: Size;
  price: number;
  qty: number;
}

export interface OrderEditHistory {
  timestamp: number;
  previousItems: CartItem[];
  previousTotal: number;
  editorId: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
}

export interface Order {
  id: string;
  dailyNumber: number;
  items: CartItem[];
  total: number;
  comment: string;
  paymentType: 'cash' | 'card';
  createdAt: number;
  syncStatus?: 'synced' | 'pending';
  editHistory?: OrderEditHistory[];
  customer?: CustomerInfo;
}

export interface User {
  id: string;
  name: string;
  pin: string;
  role: 'admin' | 'staff';
}

export interface AppSettings {
  collectCustomerInfo: boolean;
}
