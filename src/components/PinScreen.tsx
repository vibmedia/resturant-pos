import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, Loader2 } from 'lucide-react';
import { User } from '../types';
import { API_BASE_URL } from '../config';

interface PinScreenProps {
  onSuccess: (user: User) => void;
}

export function PinScreen({ onSuccess }: PinScreenProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const savedUsers = localStorage.getItem('pos_users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      const initialUsers: User[] = [
        { id: '1', name: 'Staff', pin: '1234', role: 'staff' },
        { id: '2', name: 'Admin', pin: '1497', role: 'admin' },
      ];
      localStorage.setItem('pos_users', JSON.stringify(initialUsers));
      setUsers(initialUsers);
    }
  }, []);

  const handleKeyPress = (num: string) => {
    if (error) {
       setError(false);
       setPin(num);
       return;
    }
    setPin((prev) => prev.length < 6 ? prev + num : prev);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          onSuccess({ id: '1', name: pin === '1497' || pin === '0000' ? 'Admin' : 'Staff', pin, role: pin === '1497' || pin === '0000' ? 'admin' : 'staff' });
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    
    // Fallback to local users if API fails or rejects
    const user = users.find(u => u.pin === pin);
    if (user) {
      onSuccess(user);
    } else {
      setError(true);
      setPin('');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen items-center justify-center bg-brand-bg flex-col">
      <div className="mb-8 flex flex-col items-center">
        <Lock className="h-12 w-12 text-brand-accent mb-4" />
        <h1 className="text-2xl font-semibold text-brand-text">Enter PIN to Unlock</h1>
      </div>
      
      <motion.div
        animate={error ? { x: [-10, 10, -10, 10, 0] } : {}}
        transition={{ duration: 0.4 }}
        className="bg-brand-card p-8 rounded-2xl shadow-xl w-full max-w-sm"
      >
        <div className="flex justify-center mb-8 h-8">
          <div className="flex gap-4">
            {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-colors ${
                  i < pin.length ? 'bg-brand-accent' : 'bg-brand-bg border border-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <p className="text-red-400 text-center mb-4 text-sm font-medium">
            Incorrect PIN. Try again.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="h-16 rounded-xl bg-brand-bg text-brand-text text-2xl font-semibold hover:bg-opacity-80 active:scale-95 transition-all outline-none"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleDelete}
            className="h-16 rounded-xl bg-brand-bg/50 text-brand-text text-lg font-medium hover:bg-opacity-80 active:scale-95 transition-all outline-none"
          >
            Del
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="h-16 rounded-xl bg-brand-bg text-brand-text text-2xl font-semibold hover:bg-opacity-80 active:scale-95 transition-all outline-none"
          >
            0
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="h-16 rounded-xl bg-brand-accent text-brand-bg text-lg font-bold hover:opacity-90 active:scale-95 transition-all outline-none flex items-center justify-center"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'OK'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
