'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/retreats', label: 'Retreats' },
  { href: '/courses', label: 'Courses' },
  { href: '/becky', label: 'Becky' },
  { href: '/blog', label: 'Blog' },
  { href: '/#client-stories', label: 'Reviews' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, userData, logout, isAdmin } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setUserMenuOpen(false);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    navLinks.forEach((link) => {
      router.prefetch(link.href);
    });
  }, [mobileMenuOpen, router]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-accent/20 bg-primary backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[5.9rem] items-center justify-between gap-6 sm:h-24">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/logo.png"
              alt="Becky Pinder"
              width={300}
              height={112}
              className="h-[8rem] w-auto sm:h-[8rem]"
              priority
            />
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-8 lg:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-sans text-sm uppercase tracking-[0.22em] transition-colors duration-300 ${pathname === link.href ? 'text-accent' : 'text-primary-pale/90 hover:text-accent'
                  }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 border border-accent/40 px-4 py-2 font-sans text-sm uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-primary"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 border border-accent/40 px-4 py-2 font-sans text-sm uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-primary"
                >
                  <User className="h-4 w-4" />
                  Account
                </Link>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex border border-accent/60 px-6 py-3 font-sans text-sm uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-primary"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => {
              setMobileMenuOpen((open) => {
                const next = !open;
                if (!next) setUserMenuOpen(false);
                return next;
              });
            }}
            className="rounded-full border border-accent/30 bg-white/0 p-2 text-accent transition-colors hover:bg-white/5 lg:hidden"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-accent/15 bg-primary animate-slide-down">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                prefetch
                className="block py-3 font-sans text-sm uppercase tracking-[0.22em] text-primary-pale/90 transition-colors duration-300 hover:text-accent"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-5 border-t border-accent/15 pt-5">
              {user ? (
                <div className="space-y-1">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 py-2 font-sans text-sm uppercase tracking-[0.22em] text-primary-pale/90 transition-colors hover:text-accent"
                  >
                    <User className="h-4 w-4" />
                    <span>{userData?.displayName?.split(' ')[0] || 'Account'}</span>
                  </button>
                  {userMenuOpen && (
                    <div className="ml-6 space-y-1 border-l border-accent/15 pl-4">
                      <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block py-2 text-sm text-primary-pale/70 hover:text-accent">
                        <User className="mr-2 inline h-4 w-4" /> Account
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={() => setMobileMenuOpen(false)} prefetch className="block py-2 text-sm text-primary-pale/70 hover:text-accent">
                          <LayoutDashboard className="mr-2 inline h-4 w-4" /> Admin Panel
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  prefetch
                  className="inline-flex border border-accent/60 px-6 py-3 font-sans text-sm uppercase tracking-[0.22em] text-accent transition-colors hover:bg-accent hover:text-primary"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
