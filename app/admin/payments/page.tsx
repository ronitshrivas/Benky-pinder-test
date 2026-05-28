'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, Download, Search, Filter, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllOrders } from '@/lib/firestore';
import { Order } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';

export default function AdminPaymentsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'course' | 'retreat'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    getAllOrders().then(setOrders).catch(console.error);
  }, []);

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.userName.toLowerCase().includes(search.toLowerCase()) || o.itemTitle.toLowerCase().includes(search.toLowerCase());
    const matchType = filter === 'all' || o.type === filter;
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const totalRevenue = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + o.amount, 0);
  const thisMonthRevenue = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return o.status === 'completed' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((sum, o) => sum + o.amount, 0);

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl text-white">Payment History</h1>
          <p className="text-white/60 mt-1">{orders.length} total transactions</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Revenue Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">${totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-text-light">Total Revenue</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">${thisMonthRevenue.toLocaleString()}</p>
                <p className="text-xs text-text-light">This Month</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{orders.filter(o => o.status === 'completed').length}</p>
                <p className="text-xs text-text-light">Successful Payments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
              placeholder="Search by customer or item..."
            />
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)} className="input-field w-auto">
            <option value="all">All Types</option>
            <option value="course">Courses</option>
            <option value="retreat">Retreats</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="input-field w-auto">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-cream">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Customer</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Item</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Type</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Amount</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Note</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-text-light">No payments found</td></tr>
                ) : (
                  filtered.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-primary">{order.userName}</p>
                          <p className="text-xs text-text-light">{order.userEmail}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{order.itemTitle}</td>
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
                        }`}>{order.status}</span>
                      </td>
                      <td className="px-6 py-4 text-xs text-text-light">
                        {order.paymentLabel && (
                          <span className={`px-2 py-1 rounded-full ${
                            order.paymentLabel === 'Deposit' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                            {order.paymentLabel}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {order.invoiceUrl && (
                          <a href={order.invoiceUrl} target="_blank" rel="noopener" className="text-accent hover:underline flex items-center gap-1 text-xs">
                            <Download className="w-3 h-3" /> PDF
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
      </div>
    </div>
  );
}
