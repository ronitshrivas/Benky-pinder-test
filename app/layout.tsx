import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import PageTransition from '@/components/layout/PageTransition';
import './globals.css';

export const metadata: Metadata = {
  title: 'Becky Pinder Yoga & Wellness',
  description: 'Yoga & Wellness for women. Online courses, luxury retreats, and personalised coaching with Becky Pinder.',
  keywords: ['yoga', 'wellness', 'retreats', 'online courses', 'women over 40', 'Becky Pinder'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="afterInteractive"
        />
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-24">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1B2A4A',
                color: '#fff',
                borderRadius: '8px',
              },
              success: {
                iconTheme: { primary: '#C9A84C', secondary: '#1B2A4A' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
