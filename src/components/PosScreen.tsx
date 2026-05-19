import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, CheckCircle, Plus, Minus, Trash2, Banknote, CreditCard, Wifi, WifiOff, X } from 'lucide-react';
import { menuData } from '../data';
import { OrderHistory } from './OrderHistory';
import { CartItem, MenuItem, Order, Size, User, OrderEditHistory } from '../types';

interface PosScreenProps {
  onLogout: () => void;
  currentUser: User;
}

const getCategoryImageUrl = (category: string) => {
  const sanitize = category.toLowerCase().replace(' ', '');
  return `https://loremflickr.com/320/240/${sanitize},food?lock=${sanitize.length}`;
};

export function PosScreen({ onLogout, currentUser }: PosScreenProps) {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('pos_cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [comment, setComment] = useState('');
  const [paymentType, setPaymentType] = useState<'cash'|'card'>('cash');
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pos_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [dailyNumber, setDailyNumber] = useState<number>(() => {
    const savedNum = localStorage.getItem('pos_daily_number');
    const savedDate = localStorage.getItem('pos_date');
    const today = new Date().toDateString();
    
    if (savedDate !== today) {
      localStorage.setItem('pos_date', today);
      return 1;
    }
    return savedNum ? parseInt(savedNum, 10) : 1;
  });
  const [showHistory, setShowHistory] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Online/Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync offline orders when back online
  useEffect(() => {
    if (isOnline) {
      const hasPending = orders.some(o => o.syncStatus === 'pending');
      if (hasPending) {
        // Simulate network sync delay
        const timer = setTimeout(() => {
          setOrders(prev => prev.map(o => o.syncStatus === 'pending' ? { ...o, syncStatus: 'synced' } : o));
          setToast('Offline orders synchronized.');
          setTimeout(() => setToast(null), 3000);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, orders]);

  // Audio Context for beep
  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('pos_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('pos_daily_number', dailyNumber.toString());
  }, [dailyNumber]);

  const itemsConfig = useMemo(() => {
    const saved = localStorage.getItem('pos_menu');
    const currentMenuOptions = saved ? JSON.parse(saved) : menuData.categories;
    if (activeCategory === 'All') {
      return currentMenuOptions.flatMap((c: any) => c.items.map((i: any) => ({...i, category: c.name})));
    }
    return currentMenuOptions.find((c: any) => c.name === activeCategory)?.items.map((i: any) => ({...i, category: activeCategory})) || [];
  }, [activeCategory]);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  const handleAddToCart = (item: MenuItem, size: Size) => {
    const price = size === 'H' ? item.h : item.f;
    if (price === null) return;

    const cartId = `${item.id}-${size}`;
    
    setCart(prev => {
      const existing = prev.find(i => i.id === cartId);
      if (existing) {
        return prev.map(i => i.id === cartId ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, {
        id: cartId,
        menuItemId: item.id,
        name: item.name,
        size,
        price,
        qty: 1
      }];
    });
  };

  const updateCartQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }).filter(i => i.qty > 0));
  };
  
  const clearCartItem = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder(order);
    setCart([...order.items]);
    setComment(order.comment || '');
    setPaymentType(order.paymentType);
    setShowHistory(false);
  };

  const cancelEdit = () => {
    setEditingOrder(null);
    setCart([]);
    setComment('');
    setPaymentType('cash');
  };

  const placeOrder = () => {
    if (cart.length === 0) return;

    if (editingOrder) {
      const editHistoryEntry: OrderEditHistory = {
        timestamp: Date.now(),
        previousItems: editingOrder.items,
        previousTotal: editingOrder.total,
        editorId: currentUser.id
      };
      const existingHistory = editingOrder.editHistory || [];
      const updatedOrder: Order = {
        ...editingOrder,
        items: [...cart],
        total: cartTotal,
        comment,
        paymentType,
        syncStatus: isOnline ? 'synced' : 'pending',
        editHistory: [...existingHistory, editHistoryEntry]
      };
      setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
      setEditingOrder(null);
      setToast(`Order #${String(editingOrder.dailyNumber).padStart(3, '0')} updated!`);
    } else {
      const newOrder: Order = {
        id: Date.now().toString(),
        dailyNumber,
        items: [...cart],
        total: cartTotal,
        comment,
        paymentType,
        createdAt: Date.now(),
        syncStatus: isOnline ? 'synced' : 'pending'
      };

      setOrders(prev => [...prev, newOrder]);
      setDailyNumber(prev => prev + 1);
      setToast(`Order #${String(dailyNumber).padStart(3, '0')} placed! ₹${cartTotal}`);
    }

    setCart([]);
    setComment('');
    playBeep();
    setTimeout(() => setToast(null), 3000);
  };

  if (showHistory) {
    return <OrderHistory orders={orders} onClose={() => setShowHistory(false)} onEdit={handleEditOrder} />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header & Categories Merged */}
      <nav className="flex-none bg-[#16213e] border-b border-[#e2a039]/30 p-2 z-10 w-full flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="flex bg-[#1a1a2e] px-3 py-1 rounded-full border border-[#e2a039]/20 items-center">
                <span className="text-xs text-[#e2a039]/80 uppercase font-semibold mr-2">{editingOrder ? 'Editing' : 'Order'}</span>
                <span className="font-mono text-sm font-bold">#{String(editingOrder ? editingOrder.dailyNumber : dailyNumber).padStart(3, '0')}</span>
             </div>
             <div className="flex items-center" title={isOnline ? 'Online' : 'Offline'}>
               {isOnline ? <Wifi className="w-4 h-4 text-emerald-500" /> : <WifiOff className="w-4 h-4 text-red-500" />}
             </div>
          </div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setShowHistory(true)}
                className="p-1.5 bg-[#1a1a2e] rounded-full hover:bg-[#0f111a] border border-[#e2a039]/20 transition-colors shadow-sm flex items-center justify-center"
                title="History"
             >
                <History className="w-4 h-4 text-[#e2a039]" />
             </button>
             <button 
                onClick={onLogout}
                className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-full font-bold hover:bg-red-500/20 transition-colors title='Logout'"
             >
               Logout
             </button>
          </div>
        </div>

        {/* Categories (wrapped, no slider) */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <button
            onClick={() => setActiveCategory('All')}
            className={`px-3 py-1 rounded-lg text-xs transition-colors ${
              activeCategory === 'All' 
                ? 'bg-[#e2a039] text-[#1a1a2e] font-bold uppercase' 
                : 'bg-[#1a1a2e] hover:bg-[#0f111a] border border-[#f5f5f5]/10 font-semibold text-[#f5f5f5]'
            }`}
          >
            All
          </button>
          {menuData.categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                activeCategory === cat.name 
                  ? 'bg-[#e2a039] text-[#1a1a2e] font-bold uppercase' 
                  : 'bg-[#1a1a2e] hover:bg-[#0f111a] border border-[#f5f5f5]/10 font-semibold'
              } ${cat.name === 'Combos' && activeCategory !== 'Combos' ? 'text-[#e2a039]' : 'text-[#f5f5f5]'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </nav>

      {/* Menu Area */}
      <main className="flex-1 overflow-y-auto p-3 md:p-4 pb-[260px] bg-[#0f111a]">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 max-w-[1400px] mx-auto">
          {itemsConfig.map((item: any) => {
            const isCombo = item.h === null;
            return (
              <motion.div 
                key={item.id}
                whileTap={{ scale: 0.95 }}
                className={`bg-[#16213e] rounded-xl border border-[#f5f5f5]/5 flex flex-col p-2.5 justify-between overflow-hidden ${isCombo ? 'shadow-md shadow-[#e2a039]/10' : ''}`}
              >
                <div className="flex flex-col gap-2 mb-2">
                  <img 
                    src={item.imageUrl || getCategoryImageUrl(item.category)} 
                    alt={item.name} 
                    className="w-full h-20 object-cover rounded-md bg-[#1a1a2e] block"
                    loading="lazy"
                  />
                  <h3 className={`font-bold text-xs md:text-sm leading-tight h-10 ${isCombo ? 'text-[#e2a039]' : ''}`}>{item.name}</h3>
                </div>
                <div className={`mt-auto ${isCombo ? '' : 'grid grid-cols-2 gap-2'}`}>
                  {!isCombo && (
                    <button 
                      onClick={() => handleAddToCart(item, 'H')}
                      className="bg-[#1a1a2e] hover:bg-[#e2a039]/10 border border-[#e2a039]/20 p-2 rounded-lg text-center transition-colors shadow-sm"
                    >
                      <span className="block text-[8px] uppercase text-[#e2a039] font-bold">Half</span>
                      <span className="font-bold text-sm text-[#f5f5f5]">₹{item.h}</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleAddToCart(item, 'F')}
                    className={isCombo 
                      ? "w-full bg-[#e2a039] hover:bg-[#e2a039]/90 text-[#1a1a2e] p-2 rounded-lg text-center font-bold transition-colors shadow-sm"
                      : "bg-[#1a1a2e] hover:bg-[#e2a039]/10 border border-[#e2a039]/20 p-2 rounded-lg text-center transition-colors shadow-sm"
                    }
                  >
                    {!isCombo && <span className="block text-[8px] uppercase text-[#e2a039] font-bold">Full</span>}
                    <span className="font-bold text-sm text-[#f5f5f5]">₹{item.f}</span>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>

      {/* Bill Bar (Fixed Bottom) */}
      <footer className="fixed bottom-0 left-0 right-0 h-[240px] md:h-48 bg-[#16213e]/95 backdrop-blur-md border-t-2 border-[#e2a039] px-4 md:px-6 py-4 flex flex-col md:flex-row gap-4 md:gap-6 shadow-2xl z-20">
        {editingOrder && (
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-yellow-500 text-[#1a1a2e] px-4 py-1.5 rounded-t-lg font-bold flex items-center justify-between gap-4 z-30 shadow-lg">
             <span className="text-sm">Editing Order #{String(editingOrder.dailyNumber).padStart(3, '0')}</span>
             <button onClick={cancelEdit} className="p-0.5 bg-[#1a1a2e]/10 rounded hover:bg-[#1a1a2e]/20 transition-colors"><X size={16} /></button>
          </div>
        )}
        {/* Cart Items ScrollArea */}
        <div className="flex-1 bg-[#1a1a2e] rounded-xl p-3 border border-[#f5f5f5]/10 overflow-hidden flex flex-col h-[120px] md:h-full">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[#f5f5f5]/50 italic text-sm text-center">
              No items in {editingOrder ? 'edited order' : 'cart'}. Tap menu to add.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {cart.map(item => {
                const isComboItem = item.size === 'F' && menuData.categories.find(c => c.items.find(i => i.id === item.menuItemId))?.name === 'Combos';
                return (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => updateCartQty(item.id, -1)} className="w-6 h-6 bg-[#16213e] hover:bg-gray-700 text-[#f5f5f5] rounded flex items-center justify-center font-bold transition-colors"><Minus size={14} /></button>
                        <span className="w-6 text-center font-bold leading-6">{item.qty}</span>
                        <button onClick={() => updateCartQty(item.id, 1)} className="w-6 h-6 bg-[#16213e] hover:bg-gray-700 text-[#f5f5f5] rounded flex items-center justify-center font-bold transition-colors"><Plus size={14} /></button>
                      </div>
                      <span className={`font-medium ${isComboItem ? 'text-[#e2a039]' : ''}`}>
                        {item.name} {isComboItem ? '' : (item.size === 'H' ? '(H)' : '(F)')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-mono font-bold text-base">₹{item.price * item.qty}</span>
                      <button onClick={() => clearCartItem(item.id)} className="text-red-400/70 hover:text-red-400 transition-colors p-1" title="Remove">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="w-full md:w-80 flex flex-col justify-between shrink-0 h-[100px] md:h-auto overflow-y-auto md:overflow-visible">
          <div className="space-y-2 md:space-y-3 flex-shrink-0">
            <div className="flex gap-2">
              <button 
                onClick={() => setPaymentType('cash')}
                className={`flex-1 py-2 md:py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                  paymentType === 'cash' ? 'bg-[#22c55e] text-white ring-2 ring-[#22c55e]/30' : 'bg-[#1a1a2e] border border-[#f5f5f5]/10 text-white/50 hover:text-white/80'
                }`}
              >
                {paymentType === 'cash' && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                CASH
              </button>
              <button 
                onClick={() => setPaymentType('card')}
                className={`flex-1 py-2 md:py-3 rounded-lg font-bold text-xs uppercase flex items-center justify-center gap-2 transition-all ${
                  paymentType === 'card' ? 'bg-[#3b82f6] text-white opacity-100 ring-2 ring-[#3b82f6]/30' : 'bg-[#1a1a2e] border border-[#f5f5f5]/10 text-white/50 hover:opacity-100'
                }`}
              >
                {paymentType === 'card' && <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>}
                CARD
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Add order comment..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full bg-[#1a1a2e] border border-[#f5f5f5]/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#e2a039]/50 text-[#f5f5f5]"
            />
          </div>
          
          <div className="flex items-end justify-between border-t border-[#f5f5f5]/10 pt-2 md:pt-4 mt-2 flex-shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-widest text-[#f5f5f5]/60 font-bold">Total Payable</span>
              <span className="text-3xl md:text-4xl font-mono font-black text-[#e2a039]">₹{cartTotal}</span>
            </div>
            <button 
              disabled={cart.length === 0}
              onClick={placeOrder}
              className={`h-12 md:h-16 px-4 md:px-8 rounded-xl font-black text-sm md:text-lg flex items-center gap-2 transition-all shadow-xl ${
                cart.length > 0 
                  ? 'bg-[#e2a039] text-[#1a1a2e] shadow-[#e2a039]/20 hover:scale-105 active:scale-95' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
              }`}
            >
              {editingOrder ? 'UPDATE ORDER' : 'PLACE ORDER'} <span className="text-xl md:text-2xl">→</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#22c55e] text-white px-6 py-3 rounded-full shadow-2xl font-bold flex items-center gap-2 z-50 border border-[#22c55e]"
          >
            <CheckCircle size={20} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
