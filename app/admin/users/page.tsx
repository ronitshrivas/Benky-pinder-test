'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Search, Shield, ShieldOff, Mail, BookOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getAllUsers, updateUserRole } from '@/lib/firestore';
import { UserData } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    getAllUsers().then(setUsers).catch(console.error);
  }, []);

  const toggleAdmin = async (uid: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!confirm(`Change this user's role to ${newRole}?`)) return;
    try {
      await updateUserRole(uid, newRole);
      setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as any } : u));
      toast.success(`Role updated to ${newRole}`);
    } catch (e) {
      toast.error('Failed to update role');
    }
  };

  const filtered = users.filter(u =>
    !search || u.displayName?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-serif text-3xl text-white">User Management</h1>
          <p className="text-white/60 mt-1">{users.length} registered users</p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
            placeholder="Search users by name or email..."
          />
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface-cream">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">User</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Joined</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Courses</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-text-light">No users found</td></tr>
                ) : (
                  filtered.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                            {u.photoURL ? (
                              <img src={u.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-primary">{u.displayName || 'No name'}</p>
                            <p className="text-xs text-text-light">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light">{formatDate(u.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1 text-sm text-text-light">
                          <BookOpen className="w-3 h-3" /> {u.purchasedCourses?.length || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleAdmin(u.uid, u.role)}
                            className="text-xs flex items-center gap-1 text-text-light hover:text-accent"
                            title={u.role === 'admin' ? 'Remove admin' : 'Make admin'}
                          >
                            {u.role === 'admin' ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                            {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          <a href={`mailto:${u.email}`} className="text-xs flex items-center gap-1 text-text-light hover:text-accent">
                            <Mail className="w-3 h-3" /> Email
                          </a>
                        </div>
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
