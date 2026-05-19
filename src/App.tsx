import React, { useState, useEffect } from 'react';
import { PinScreen } from './components/PinScreen';
import { PosScreen } from './components/PosScreen';
import { AdminScreen } from './components/AdminScreen';
import { User } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Basic session persistence for PIN, expires in 30 minutes
    const authTime = localStorage.getItem('pos_auth_time');
    const savedUser = localStorage.getItem('pos_current_user');
    if (authTime && savedUser) {
      const isExpired = Date.now() - parseInt(authTime, 10) > 30 * 60 * 1000;
      if (!isExpired) {
        try {
          return JSON.parse(savedUser) as User;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  });

  const [currentView, setCurrentView] = useState<'pos' | 'admin'>('pos');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pos_auth_time', Date.now().toString());
    localStorage.setItem('pos_current_user', JSON.stringify(user));
    setCurrentView(user.role === 'admin' ? 'admin' : 'pos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pos_auth_time');
    localStorage.removeItem('pos_current_user');
  };

  useEffect(() => {
    // Prevent default context menu (right click) on tablet POS
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Check auth expiry periodically
    const interval = setInterval(() => {
      const authTime = localStorage.getItem('pos_auth_time');
      if (authTime && Date.now() - parseInt(authTime, 10) > 30 * 60 * 1000) {
        handleLogout();
      }
    }, 60000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(interval);
    };
  }, []);

  if (!currentUser) {
    return <PinScreen onSuccess={handleLogin} />;
  }

  return (
    <>
      {currentUser.role === 'admin' && (
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-50 bg-[#e2a039] text-[#1a1a2e] px-4 py-1 rounded-b-lg font-bold text-xs flex gap-4 shadow-lg cursor-pointer">
          <span onClick={() => setCurrentView('pos')} className={currentView === 'pos' ? 'opacity-100' : 'opacity-50'}>POS</span>
          <span onClick={() => setCurrentView('admin')} className={currentView === 'admin' ? 'opacity-100' : 'opacity-50'}>ADMIN</span>
          <span onClick={handleLogout} className="opacity-50">LOGOUT</span>
        </div>
      )}
      
      {currentView === 'pos' ? (
        <PosScreen onLogout={handleLogout} currentUser={currentUser} />
      ) : (
        <AdminScreen onLogout={handleLogout} />
      )}
    </>
  );
}
