import React, { useState, useMemo } from 'react';
import { Clock, Search, WifiOff, Cloud, Edit2 } from 'lucide-react';
import { Order } from '../types';

interface OrderHistoryProps {
  orders: Order[];
  onClose: () => void;
  onEdit: (order: Order) => void;
}

export function OrderHistory({ orders, onClose, onEdit }: OrderHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Payment filter
      if (paymentFilter !== 'all' && order.paymentType !== paymentFilter) return false;
      
      // Date filter (orders date matches selected YYYY-MM-DD)
      if (dateFilter) {
        const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
        if (orderDate !== dateFilter) return false;
      }

      // Search filter
      const query = searchQuery.toLowerCase();
      if (query && !order.dailyNumber.toString().includes(query) && !order.items.some(item => item.name.toLowerCase().includes(query))) {
        return false;
      }
      return true;
    }).slice().reverse();
  }, [orders, searchQuery, paymentFilter, dateFilter]);

  return (
    <div className="fixed inset-0 bg-brand-bg z-50 flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-brand-card shadow-md gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-3 whitespace-nowrap">
          <Clock className="w-8 h-8 text-brand-accent" />
          Today's Orders ({orders.length})
        </h2>
        
        <div className="flex-1 max-w-xl mx-auto md:mx-4 flex flex-col md:flex-row gap-2">
          <div className="flex items-center flex-1 bg-brand-bg rounded-lg px-4 border border-gray-700 focus-within:border-brand-accent focus-within:ring-1 focus-within:ring-brand-accent transition-all h-10">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or item name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-3 text-brand-text placeholder-gray-500 focus:outline-none"
            />
          </div>
          <select 
            value={paymentFilter} 
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="bg-brand-bg rounded-lg px-2 border border-gray-700 text-gray-300 focus:outline-none h-10"
          >
            <option value="all">All Payments</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-brand-bg rounded-lg px-2 border border-gray-700 text-gray-300 focus:outline-none h-10"
          />
        </div>

        <button 
          onClick={onClose}
          className="px-6 py-3 rounded-lg border border-brand-accent text-brand-accent font-semibold hover:bg-brand-accent hover:text-brand-bg transition-colors whitespace-nowrap"
        >
          Back to POS
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 bg-[#0f111a]">
        {filteredOrders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            {orders.length === 0 ? (
              <>
                <Clock className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-xl">No orders placed today.</p>
              </>
            ) : (
              <>
                <Search className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-xl">No orders match your search.</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl mx-auto">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-brand-card p-4 rounded-xl border border-gray-700/50 flex flex-col md:flex-row md:items-center gap-4 shadow-lg shadow-[#1a1a2e]/50">
                <div className="flex flex-col items-start gap-1 min-w-[120px]">
                  <span className="text-xl font-black text-brand-accent">
                    #{order.dailyNumber.toString().padStart(3, '0')}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <div className="flex items-center gap-2">
                       {order.syncStatus === 'pending' ? (
                           <WifiOff className="w-3 h-3 text-yellow-500" title="Offline - Pending Sync" />
                       ) : (
                           <Cloud className="w-3 h-3 text-emerald-500" title="Synced to Cloud" />
                       )}
                       {order.editHistory && order.editHistory.length > 0 && (
                          <span className="text-[10px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded font-bold" title={`${order.editHistory.length} edits`}>EDITED</span>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="text-brand-text mb-2">
                    {order.items.map(item => (
                      <span key={item.id} className="inline-block bg-brand-bg text-sm px-2 py-1 rounded mr-2 mb-1 border border-gray-700/50">
                        {item.qty}× {item.name} {item.size === 'H' ? '(H)' : '(F)'}
                      </span>
                    ))}
                  </div>
                  {order.comment && (
                    <p className="text-xs text-brand-accent/80 mt-1 italic">
                      Note: {order.comment}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-gray-700/30 md:border-t-0">
                  <button 
                    onClick={() => {
                        onEdit(order);
                        onClose();
                    }} 
                    className="p-2 border border-gray-700 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    order.paymentType === 'cash' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {order.paymentType}
                  </span>
                  <span className="text-2xl font-bold w-24 text-right tabular-nums text-brand-accent">
                    ₹{order.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
