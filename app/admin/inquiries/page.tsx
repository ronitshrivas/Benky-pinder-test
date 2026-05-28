'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Search, Calendar, User, MessageSquare, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getInquiries } from '@/lib/firestore';
import { Inquiry } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminInquiriesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) {
      router.push('/');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    async function loadInquiries() {
      try {
        const data = await getInquiries();
        setInquiries(data);
      } catch (error) {
        console.error('Failed to load inquiries:', error);
        toast.error('Failed to load inquiries');
      } finally {
        setIsLoading(false);
      }
    }
    if (user && userData?.role === 'admin') {
      loadInquiries();
    }
  }, [user, userData]);

  const filtered = inquiries.filter(i =>
    !search || 
    i.name?.toLowerCase().includes(search.toLowerCase()) || 
    i.email?.toLowerCase().includes(search.toLowerCase()) ||
    i.subject?.toLowerCase().includes(search.toLowerCase()) ||
    i.message?.toLowerCase().includes(search.toLowerCase())
  );

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl text-white">Inquiries</h1>
          <p className="text-white/60 mt-1">{inquiries.length} total messages</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filter */}
        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search inquiries..."
          />
        </div>

        {/* Inquiries List */}
        <div className="space-y-6">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center shadow-sm">
              <MessageSquare className="w-12 h-12 text-primary/10 mx-auto mb-4" />
              <p className="text-text-light">No inquiries found</p>
            </div>
          ) : (
            filtered.map((inquiry) => (
              <div key={inquiry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-primary/40" />
                      </div>
                      <div>
                        <h3 className="font-medium text-primary text-lg">{inquiry.name}</h3>
                        <div className="flex items-center gap-3 text-sm text-text-light mt-0.5">
                          <a href={`mailto:${inquiry.email}`} className="flex items-center gap-1 hover:text-accent transition-colors">
                            <Mail className="w-3.5 h-3.5" /> {inquiry.email}
                          </a>
                          {inquiry.phone && (
                            <span className="flex items-center gap-1">
                              <span className="w-1 h-1 bg-gray-300 rounded-full" /> {inquiry.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1.5 text-xs text-text-light bg-surface-cream px-3 py-1.5 rounded-full">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(inquiry.createdAt)}
                      </div>
                      {inquiry.subject && (
                        <span className="text-xs font-semibold text-accent uppercase tracking-wider">
                          {inquiry.subject}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-surface-cream/50 rounded-lg p-5 mb-4">
                    <p className="text-text leading-relaxed whitespace-pre-wrap">{inquiry.message}</p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                    <div className="flex gap-4">
                      <a 
                        href={`mailto:${inquiry.email}?subject=Re: ${inquiry.subject || 'Your Inquiry'}`}
                        className="btn-primary !py-2 !px-6 !text-xs rounded-full flex items-center gap-2"
                      >
                        <Mail className="w-3.5 h-3.5" /> Reply via Email
                      </a>
                    </div>
                    <div className="flex items-center gap-4">
                       {/* Future: Add delete or status toggle functionality */}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
