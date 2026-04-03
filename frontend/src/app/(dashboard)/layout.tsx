'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ProfileProvider, useProfile } from '@/context/ProfileContext';
import { Loader2 } from 'lucide-react';

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace('/login'); return; }
    // If logged in but no profile selected, go to profile picker (unless already there)
    if (user && !activeProfile && pathname !== '/profiles') {
      router.replace('/profiles');
    }
  }, [user, loading, activeProfile, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <Guard>{children}</Guard>
      </ProfileProvider>
    </AuthProvider>
  );
}