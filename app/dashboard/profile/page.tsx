'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Phone, Camera, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { updateUserProfile } from '@/lib/firestore';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: '', phone: '', bio: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (userData) {
      setForm({
        displayName: userData.displayName || '',
        phone: userData.phone || '',
        bio: userData.bio || '',
      });
    }
  }, [userData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, form);
      toast.success('Profile updated!');
    } catch (e) {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  };

  if (authLoading || !user) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-serif text-3xl text-white">My Profile</h1>
          <p className="text-white/60 mt-1">Manage your account details</p>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm p-8 space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-primary" />
              )}
              <button type="button" className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent rounded-full flex items-center justify-center">
                <Camera className="w-3 h-3 text-primary" />
              </button>
            </div>
            <div>
              <p className="font-medium text-primary">{userData?.displayName || 'Student'}</p>
              <p className="text-sm text-text-light">{user.email}</p>
              <p className="text-xs text-text-light mt-1">Member since {new Date(userData?.createdAt || '').toLocaleDateString()}</p>
            </div>
          </div>

          <hr />

          {/* Form Fields */}
          <div>
            <label className="input-label">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
              <input
                type="email"
                value={user.email || ''}
                disabled
                className="input-field pl-10 bg-gray-50 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-text-light mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="input-label">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field pl-10"
                placeholder="+44..."
              />
            </div>
          </div>

          <div>
            <label className="input-label">Bio (optional)</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="input-field resize-none"
              rows={3}
              placeholder="Tell us a bit about yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
