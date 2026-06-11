'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, BookOpen, Image as ImageIcon, Receipt, TrendingUp, DollarSign, Eye, MapPin, FileText, Video, MessageSquare, Package } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAdminStats } from '@/lib/firestore';

export default function AdminDashboard() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0, totalRevenue: 0, totalCourses: 0,
    totalRetreats: 0, totalOrders: 0, totalInquiries: 0,
    recentOrders: [] as any[],
  });

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) {
      router.push('/');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      getAdminStats().then(setStats).catch(console.error);
    }
  }, [user, userData]);

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'bg-blue-50 text-blue-600' },
    { icon: DollarSign, label: 'Total Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, color: 'bg-green-50 text-green-600' },
    { icon: BookOpen, label: 'Active Courses', value: stats.totalCourses, color: 'bg-purple-50 text-purple-600' },
    { icon: MapPin, label: 'Retreats', value: stats.totalRetreats, color: 'bg-orange-50 text-orange-600' },
    { icon: Receipt, label: 'Total Orders', value: stats.totalOrders, color: 'bg-indigo-50 text-indigo-600' },
    { icon: Eye, label: 'Inquiries', value: stats.totalInquiries, color: 'bg-pink-50 text-pink-600' },
  ];

  const adminLinks = [
    { href: '/admin/courses', label: 'Manage Courses', icon: BookOpen, desc: 'Add, edit, delete video courses and bundles' },
    { href: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare, desc: 'Manage client testimonials' },
    { href: '/admin/retreats', label: 'Manage Retreats', icon: MapPin, desc: 'Manage retreat listings' },
    { href: '/admin/gallery', label: 'Gallery', icon: ImageIcon, desc: 'Manage photos & videos' },
    { href: '/admin/becky', label: 'About Becky', icon: FileText, desc: 'Edit Becky page copy & philosophy' },
    { href: '/admin/payments', label: 'Payments', icon: Receipt, desc: 'View payment history' },
    { href: '/admin/users', label: 'Users', icon: Users, desc: 'Manage user accounts' },
    { href: '/admin/blog', label: 'Blog', icon: TrendingUp, desc: 'Manage blog posts' },
    { href: '/admin/inquiries', label: 'Inquiries', icon: Eye, desc: 'View contact form submissions' },
    { href: '/admin/inner-circle', label: 'Inner Circle Video', icon: Video, desc: 'Complimentary video for subscribers' },
  ];

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl text-white">Admin Dashboard</h1>
          <p className="text-white/60 mt-1">Welcome back, Becky</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-10">
          {statCards.map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg p-4 shadow-sm">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-primary">{stat.value}</p>
              <p className="text-xs text-text-light mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 className="font-serif text-xl text-primary mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {adminLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
            >
              <div className="w-12 h-12 bg-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                <link.icon className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-medium text-primary">{link.label}</h3>
                <p className="text-sm text-text-light mt-1">{link.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent Orders */}
        <h2 className="font-serif text-xl text-primary mb-4">Recent Orders</h2>
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-cream">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-light uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-light uppercase">Item</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-light uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-text-light uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.recentOrders.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-text-light text-sm">No orders yet</td></tr>
              ) : (
                stats.recentOrders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="px-6 py-3 text-sm">{order.userName}</td>
                    <td className="px-6 py-3 text-sm">{order.itemTitle}</td>
                    <td className="px-6 py-3 text-sm text-accent font-medium">${order.amount}</td>
                    <td className="px-6 py-3"><span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{order.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
