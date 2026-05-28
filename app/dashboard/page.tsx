'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Play, BookOpen, Receipt, User, Clock, CheckCircle, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCourseById, getUserPurchases } from '@/lib/firestore';
import { Order } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';

export default function DashboardPage() {
  const { user, userData, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [purchases, setPurchases] = useState<Order[]>([]);
  const [resolvedThumbnails, setResolvedThumbnails] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'courses' | 'history'>('courses');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getUserPurchases(user.uid).then(setPurchases).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    let active = true;

    async function resolveThumbnails() {
      const missing = purchases.filter(
        (purchase) => purchase.type === 'course' && !purchase.itemThumbnail,
      );

      if (missing.length === 0) return;

      const entries = await Promise.all(
        missing.map(async (purchase) => {
          try {
            const course = await getCourseById(purchase.itemId);
            const thumbnail = course?.thumbnailUrl || course?.thumbnail || '/images/course1.jpg';
            return [purchase.itemId, thumbnail] as const;
          } catch {
            return [purchase.itemId, '/images/course1.jpg'] as const;
          }
        }),
      );

      if (active) {
        setResolvedThumbnails((current) => ({
          ...current,
          ...Object.fromEntries(entries),
        }));
      }
    }

    resolveThumbnails();

    return () => {
      active = false;
    };
  }, [purchases]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;

  const coursePurchases = purchases.filter(p => p.type === 'course');

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <section className="bg-primary py-12 px-4 animate-fade-in">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Welcome back, {userData?.displayName || 'Student'}</h1>
            <p className="text-white/60 mt-1">Your learning dashboard</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Link href="/dashboard/profile" className="flex items-center gap-2 text-accent text-sm hover:underline">
              <User className="w-4 h-4" /> Edit Profile
            </Link>
            <button 
              onClick={() => logout()}
              className="flex items-center gap-2 text-white/50 text-xs hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 mt-6 relative z-10">
        <div className="flex w-full flex-col sm:flex-row gap-2 bg-white rounded-lg shadow-sm p-1">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'courses' ? 'bg-primary text-accent' : 'text-text-light hover:bg-gray-50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> My Courses
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-1 items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === 'history' ? 'bg-primary text-accent' : 'text-text-light hover:bg-gray-50'
            }`}
          >
            <Receipt className="w-4 h-4" /> Purchase History
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-10 animate-fade-up">
        {activeTab === 'courses' ? (
          <>
            {coursePurchases.length === 0 ? (
              <div className="text-center py-20">
                <BookOpen className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
                <h2 className="font-serif text-2xl text-primary mb-2">No Courses Yet</h2>
                <p className="text-text-light mb-6">Browse our library and start your learning journey.</p>
                <Link href="/courses" className="btn-primary">Explore Courses</Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coursePurchases.map((purchase) => (
                  <div key={purchase.id} className="card group animate-fade-up">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={purchase.itemThumbnail || resolvedThumbnails[purchase.itemId] || '/images/course1.jpg'}
                        alt={purchase.itemTitle}
                        fill
                        sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                        className="object-cover scale-[1.02] group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                        <Play className="w-12 h-12 text-accent" />
                      </div>
                      {purchase.progress && purchase.progress >= 100 && (
                        <div className="absolute top-3 right-3 bg-green-500 text-white px-3 py-1 text-xs rounded flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Complete
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-lg text-primary mb-2">{purchase.itemTitle}</h3>
                      <div className="flex items-center text-xs text-text-light mb-4">
                        <Clock className="w-3 h-3 mr-1" /> Purchased {formatDate(purchase.createdAt)}
                      </div>
                      {/* Progress Bar */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs text-text-light mb-1">
                          <span>Progress</span>
                          <span>{purchase.progress || 0}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full transition-all"
                            style={{ width: `${purchase.progress || 0}%` }}
                          />
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/courses/${purchase.itemId}`}
                        className="btn-primary w-full text-center text-sm py-2"
                      >
                        {(purchase.progress || 0) > 0 ? 'Continue Learning' : 'Start Course'}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Purchase History */
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-cream">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Item</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Amount</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase tracking-wider">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {purchases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-text-light">No purchases yet</td>
                    </tr>
                  ) : (
                    purchases.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-primary">{order.itemTitle}</td>
                        <td className="px-6 py-4">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">{order.type}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-text-light">{formatDate(order.createdAt)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-accent">{formatPrice(order.amount, 'USD')}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {order.invoiceUrl && (
                            <a href={order.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-accent text-xs hover:underline">
                              Download
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
