'use client';

import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { LogOut, CheckSquare } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    router.push('/login');
  };

  return (
    <header
      className="sticky top-0 z-30 px-4 md:px-8"
      style={{
        background: 'rgba(15,15,19,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="max-w-5xl mx-auto h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent)' }}
          >
            <CheckSquare size={14} color="white" />
          </div>
          <span
            className="font-bold text-base"
            style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            TaskFlow
          </span>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="hidden sm:block text-sm" style={{ color: 'var(--text-secondary)' }}>
              {user.name}
            </span>
          )}
          <button onClick={handleLogout} className="btn-ghost py-1.5 px-3 text-xs">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
