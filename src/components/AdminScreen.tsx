import React, { useState, useEffect } from 'react';
import { User, MenuItem, Category, Order } from '../types';
import { menuData as defaultMenuData } from '../data';
import { Settings, Users, ShoppingBag, Coffee, ChevronLeft, LogOut } from 'lucide-react';

interface AdminScreenProps {
  onLogout: () => void;
}

export function AdminScreen({ onLogout }: AdminScreenProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'menu' | 'orders'>('orders');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('pos_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('pos_orders');
    return saved ? JSON.parse(saved) : [];
  });

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('pos_users', JSON.stringify(newUsers));
  };

  return (
    <div className="flex h-screen bg-brand-bg">
      {/* Sidebar */}
      <div className="w-64 bg-brand-card border-r border-gray-800 flex flex-col p-4 z-10">
        <h2 className="text-xl font-bold text-brand-accent mb-8 mt-4 flex items-center gap-2">
          <Settings /> Admin Panel
        </h2>
        
        <div className="flex flex-col gap-2 flex-1">
          <button onClick={() => setActiveTab('orders')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${activeTab === 'orders' ? 'bg-brand-accent text-brand-bg' : 'text-gray-300 hover:bg-gray-800'}`}>
            <ShoppingBag size={20} /> Orders
          </button>
          <button onClick={() => setActiveTab('menu')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${activeTab === 'menu' ? 'bg-brand-accent text-brand-bg' : 'text-gray-300 hover:bg-gray-800'}`}>
            <Coffee size={20} /> Menu Items
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-3 p-3 rounded-lg font-medium transition-colors ${activeTab === 'users' ? 'bg-brand-accent text-brand-bg' : 'text-gray-300 hover:bg-gray-800'}`}>
            <Users size={20} /> Users
          </button>
        </div>
        <div className="mt-auto">
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-3 rounded-lg font-bold transition-colors bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20">
            <LogOut size={20} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col bg-[#0f111a] p-8">
        <h1 className="text-3xl font-bold mb-6 capitalize">{activeTab} Management</h1>
        <div className="flex-1 overflow-y-auto bg-brand-card rounded-xl border border-gray-800 p-6 shadow-xl">
          {activeTab === 'users' && <UsersManager users={users} onSave={saveUsers} />}
          {activeTab === 'menu' && <MenuManager />}
          {activeTab === 'orders' && <OrdersManager orders={orders} />}
        </div>
      </div>
    </div>
  );
}

function UsersManager({ users, onSave }: { users: User[], onSave: (u: User[]) => void }) {
  const [newUser, setNewUser] = useState({ name: '', pin: '', role: 'staff' });

  const handleAdd = () => {
    if (!newUser.name || !newUser.pin) return;
    const added = [...users, { id: Date.now().toString(), name: newUser.name, pin: newUser.pin, role: newUser.role as 'staff'|'admin' }];
    onSave(added);
    setNewUser({ name: '', pin: '', role: 'staff' });
  };

  const handleDelete = (id: string) => {
    if (users.length === 1) return alert("Cannot delete last user!");
    onSave(users.filter(u => u.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Name</label>
          <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-brand-bg border border-gray-700 rounded-lg p-2 text-white" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">PIN</label>
          <input type="text" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} className="w-full bg-brand-bg border border-gray-700 rounded-lg p-2 text-white" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Role</label>
          <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as 'staff'|'admin'})} className="w-full bg-brand-bg border border-gray-700 rounded-lg p-2 text-white">
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button onClick={handleAdd} className="bg-brand-accent text-brand-bg font-bold px-6 py-2 rounded-lg">Add User</button>
      </div>

      <div className="grid gap-2">
        {users.map(u => (
          <div key={u.id} className="flex justify-between items-center bg-brand-bg p-4 rounded-lg border border-gray-800">
            <div>
              <p className="font-bold">{u.name} <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300 ml-2">{u.role}</span></p>
              <p className="text-sm text-gray-500">PIN: {u.pin}</p>
            </div>
            <button onClick={() => handleDelete(u.id)} className="text-red-400 hover:text-red-300 font-semibold px-4 py-2">Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuManager() {
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('pos_menu');
    return saved ? JSON.parse(saved) : defaultMenuData.categories;
  });
  const [activeCategory, setActiveCategory] = useState(categories[0]?.name || '');
  
  const [editingItem, setEditingItem] = useState<{ id: number, name: string, h: string, f: string, category: string, imageUrl?: string } | null>(null);
  const [newCatName, setNewCatName] = useState('');

  const saveMenu = (cats: Category[]) => {
    setCategories(cats);
    localStorage.setItem('pos_menu', JSON.stringify(cats));
    window.dispatchEvent(new Event('storage'));
  };

  const handleSaveItem = () => {
    if (!editingItem || !editingItem.name || !editingItem.f) return;
    const priceF = parseInt(editingItem.f, 10);
    const priceH = editingItem.h ? parseInt(editingItem.h, 10) : null;
    if (isNaN(priceF)) return;

    let newCats = [...categories];
    
    // If it's an existing item (id !== 0)
    if (editingItem.id !== 0) {
       // Remove from old category
       newCats = newCats.map(c => ({
         ...c,
         items: c.items.filter(i => i.id !== editingItem.id)
       }));
       // Add to new/existing category
       newCats = newCats.map(c => {
         if (c.name === editingItem.category) {
           return { ...c, items: [...c.items, { id: editingItem.id, name: editingItem.name, f: priceF, h: priceH, imageUrl: editingItem.imageUrl }] };
         }
         return c;
       });
    } else {
       // New Item
       newCats = newCats.map(c => {
         if (c.name === editingItem.category) {
           return { ...c, items: [...c.items, { id: Date.now(), name: editingItem.name, f: priceF, h: priceH, imageUrl: editingItem.imageUrl }] };
         }
         return c;
       });
    }

    saveMenu(newCats);
    setEditingItem(null);
  };

  const handleDeleteItem = (catName: string, itemId: number) => {
    if(!confirm("Are you sure you want to delete this item?")) return;
    const newCats = categories.map(c => {
      if (c.name === catName) {
        return { ...c, items: c.items.filter(i => i.id !== itemId) };
      }
      return c;
    });
    saveMenu(newCats);
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCatName.toLowerCase())) {
        alert("Category already exists!");
        return;
    }
    const newCats = [...categories, { name: newCatName.trim(), items: [] }];
    saveMenu(newCats);
    setActiveCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleDeleteCategory = (catName: string) => {
    if(!confirm(`Are you sure you want to delete the category "${catName}" and all its items?`)) return;
    const newCats = categories.filter(c => c.name !== catName);
    saveMenu(newCats);
    if(activeCategory === catName) setActiveCategory(newCats[0]?.name || '');
  };

  return (
    <div className="space-y-6">
      
      {/* Category Management */}
      <div className="flex gap-4 items-center bg-brand-bg p-4 rounded-lg border border-gray-800">
        <input 
          type="text" 
          value={newCatName} 
          onChange={e => setNewCatName(e.target.value)} 
          className="flex-1 bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white" 
          placeholder="New Category Name"
        />
        <button onClick={handleAddCategory} className="bg-brand-accent text-brand-bg font-bold px-6 py-2 rounded-lg">Add Category</button>
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
         {categories.map(c => (
           <div key={c.name} className="flex flex-col gap-1 items-center">
             <button onClick={() => setActiveCategory(c.name)} className={`px-4 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap ${activeCategory === c.name ? 'bg-brand-accent text-brand-bg' : 'bg-gray-800 text-gray-400'}`}>
                {c.name}
             </button>
             {activeCategory === c.name && (
               <button onClick={() => handleDeleteCategory(c.name)} className="text-red-400 text-[10px] uppercase font-bold hover:text-red-300">
                 Delete Cat
               </button>
             )}
           </div>
         ))}
      </div>

      {editingItem && (
        <div className="flex gap-4 items-end bg-[#16213e] p-4 rounded-lg border border-brand-accent shadow-lg shadow-brand-accent/10 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Item Name</label>
            <input type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white" />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold uppercase text-brand-accent mb-1">Half ₹</label>
            <input type="number" value={editingItem.h} onChange={e => setEditingItem({...editingItem, h: e.target.value})} className="w-full bg-[#1a1a2e] border border-brand-accent/50 rounded-lg p-2 text-white" placeholder="Opt." />
          </div>
          <div className="w-24">
            <label className="block text-xs font-semibold uppercase text-brand-accent mb-1">Full ₹</label>
            <input type="number" value={editingItem.f} onChange={e => setEditingItem({...editingItem, f: e.target.value})} className="w-full bg-[#1a1a2e] border border-brand-accent/50 rounded-lg p-2 text-white" />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Category</label>
            <select value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})} className="w-full bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white">
              {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Image URL (Optional)</label>
            <input type="text" value={editingItem.imageUrl || ''} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} className="w-full bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white" placeholder="https://..." />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditingItem(null)} className="bg-gray-700 text-white font-bold px-4 py-2 rounded-lg">Cancel</button>
            <button onClick={handleSaveItem} className="bg-brand-accent text-brand-bg font-bold px-6 py-2 rounded-lg">Save</button>
          </div>
        </div>
      )}

      {/* Item List */}
      <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-lg border border-gray-800">
        <h3 className="font-bold text-gray-400 uppercase tracking-widest">{activeCategory} Items</h3>
        <button 
          onClick={() => setEditingItem({ id: 0, name: '', h: '', f: '', category: activeCategory, imageUrl: '' })}
          className="bg-brand-accent text-brand-bg text-sm font-bold px-4 py-1.5 rounded-lg"
        >
          + Add New Item
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[400px] p-1">
        {categories.find(c => c.name === activeCategory)?.items.map(item => (
          <div key={item.id} className="bg-brand-bg p-3 rounded-lg border border-gray-800 flex justify-between items-center group hover:border-gray-600 transition-colors">
            <div className="flex items-center gap-3">
               <img 
                 src={item.imageUrl || `https://loremflickr.com/320/240/${activeCategory.toLowerCase().replace(' ', '')},food?lock=${item.name.length}`}
                 alt={item.name} 
                 className="w-12 h-12 rounded object-cover bg-gray-800"
               />
               <div>
                 <p className="font-bold text-sm text-brand-text truncate max-w-[150px]">{item.name}</p>
                 <p className="text-xs text-brand-accent font-semibold mt-1">H: {item.h !== null ? `₹${item.h}` : '-'} | F: ₹{item.f}</p>
               </div>
            </div>
            <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => setEditingItem({ id: item.id, name: item.name, h: item.h?.toString() || '', f: item.f.toString(), category: activeCategory, imageUrl: item.imageUrl || '' })}
                className="text-gray-400 hover:text-brand-accent text-xs px-2 py-1 bg-gray-800 rounded font-semibold"
              >
                Edit
              </button>
              <button onClick={() => handleDeleteItem(activeCategory, item.id)} className="text-red-400 hover:text-red-300 text-xs px-2 py-1 bg-gray-800 rounded font-semibold">Delete</button>
            </div>
          </div>
        ))}
        {categories.find(c => c.name === activeCategory)?.items.length === 0 && (
          <p className="text-gray-500 text-sm col-span-full py-4 text-center">No items in this category.</p>
        )}
      </div>
    </div>
  );
}

function OrdersManager({ orders }: { orders: Order[] }) {
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'cash' | 'upi'>('all');
  const [dateFilter, setDateFilter] = useState('');

  const filteredOrders = orders.filter(order => {
    if (paymentFilter !== 'all' && order.paymentType !== paymentFilter) return false;
    if (dateFilter) {
      const orderDate = new Date(order.createdAt).toISOString().split('T')[0];
      if (orderDate !== dateFilter) return false;
    }
    return true;
  }).slice().reverse();

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex gap-4 items-center bg-brand-bg p-4 rounded-lg border border-gray-800">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-brand-accent font-bold uppercase">Payment Type</label>
          <select 
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as any)}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white text-sm focus:outline-none"
          >
            <option value="all">All</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-brand-accent font-bold uppercase">Date</label>
          <input 
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-[#1a1a2e] border border-gray-700 rounded-lg p-2 text-white text-sm focus:outline-none h-[38px]"
          />
        </div>
      </div>
      
      <div className="grid gap-2 overflow-y-auto h-full pr-2">
        {filteredOrders.map(order => (
          <div key={order.id} className="bg-brand-bg p-4 rounded-lg border border-gray-800 flex justify-between items-center">
            <div>
              <span className="font-bold text-brand-accent mr-3">#{String(order.dailyNumber).padStart(3, '0')}</span>
              <span className="text-sm text-gray-400">{new Date(order.createdAt).toLocaleString()}</span>
              <div className="mt-1">
                {order.items.map(i => (
                  <span key={i.id} className="text-xs border border-gray-800 bg-gray-900 rounded px-1.5 py-0.5 mr-1 mb-1 inline-block">
                    {i.qty}x {i.name} ({i.size})
                  </span>
                ))}
              </div>
              {order.editHistory && order.editHistory.length > 0 && (
                <p className="text-xs text-yellow-500 mt-2 italic">Edited {order.editHistory.length} times</p>
              )}
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-brand-text">₹{order.total}</p>
              <p className="text-xs text-gray-500 uppercase">{order.paymentType}</p>
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && <p className="text-center text-gray-500 mt-10">No orders match filters.</p>}
      </div>
    </div>
  );
}
