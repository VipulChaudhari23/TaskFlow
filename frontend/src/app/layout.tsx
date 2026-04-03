import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'TaskFlow — Task Management',
  description: 'A modern task management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#17171f',
              color: '#f1f1f5',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#17171f' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#17171f' },
            },
          }}
        />
      </body>
    </html>
  );
}
