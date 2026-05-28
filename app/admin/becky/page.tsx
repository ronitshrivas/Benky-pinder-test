'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';

const defaultBio = [
  'As a dedicated practitioner of Yoga for 35 years and a teacher of Yoga for 15 years I have come to experience first-hand the transformative potency of Yoga both in my own life and in the lives of others.',
  'The unique gift of Yoga is that the benefits trickle down through every layer of our being, physical, mental, emotional and spiritual.',
  'Over the decades I have been very fortunate to have practiced with many wonderful Yoga, meditation and movement teachers in extensive trainings both in Australia and internationally. My own approach to teaching is grounded in the simple aspiration to feel great in the body. I have come to understand that there is a strong connection between how we move and hold ourselves. I have come to understand that there is a strong connection between how we move and express in our bodies to the energy we broadcast out to the world.',
  'My professional life also includes decades of experience as a hair and makeup artist where I worked both in the commercial and event world as well as in some of Sydneys most prestigious salons. With a client list that includes women from all walks of life from working mums to CEOs and entrepreneurs to film and television personalities.',
  'Through both Yoga and my experience in the beauty world I have come to learn that true radiance is not something you apply or put on it is something you embody. My intention for the retreat and travel experiences I offer along with my online classes is to share distilled empowering practices in an environment where the qualities of self-acceptance and self-confidence can thrive. Whether in some far flung location or virtually.',
  'I flavour everything with the ethos that life is to be lived fully, abundantly and with as much joy as we can squeeze in!',
].join('\n\n');

export default function AdminBeckyPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bioContent, setBioContent] = useState(defaultBio);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) {
      router.push('/');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    let active = true;

    async function loadContent() {
      try {
        const response = await fetch('/api/admin/becky', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load Becky content');
        }
        if (active) setBioContent(data.bioContent || defaultBio);
      } catch (error) {
        console.error('Failed to load Becky content:', error);
        if (active) setBioContent(defaultBio);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadContent();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const response = await fetch('/api/admin/becky', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bioContent }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to save bio');
      }
      setBioContent(data.bioContent || bioContent);
      toast.success('Bio updated');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save bio');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="font-serif text-3xl text-white">About Becky</h1>
              <p className="text-white/60 mt-1">Edit the Becky bio only.</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-serif text-xl text-primary">Bio</h2>
            <div>
              <label className="input-label">Bio Content</label>
              <textarea
                className="input-field resize-none font-sans"
                rows={22}
                value={bioContent}
                onChange={(e) => setBioContent(e.target.value)}
                placeholder="Write Becky&apos;s bio here. Use a blank line between paragraphs."
              />
            </div>
          </section>

          <div className="flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary inline-flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Bio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
