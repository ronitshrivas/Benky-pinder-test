'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, X, Save, Star, ArrowUp, ArrowDown, RefreshCw, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getTestimonials, createTestimonial, updateTestimonial, deleteTestimonial } from '@/lib/firestore';
import { Testimonial } from '@/types';
import toast from 'react-hot-toast';

const defaultStaticTestimonials = [
  { name: 'Louise', meta: 'Student for 7 years', rating: 5, text: 'Becky is a wonderful yoga teacher. Her classes are friendly, inclusive and uplifting, and equally suited to beginners and those more experienced, to the young and those of more mature age. She has a warm, wise and calm presence, and we love her!' },
  { name: 'Debbie', meta: 'Student for 6 years', rating: 5, text: "I attended Becky's beautiful classes for more than 6 years. To sum up: calms the mind, balm for the soul, each class a different challenge for the body, incorporating all 3 together in a way no other teacher has done in the past. We all miss her!" },
  { name: 'Carolyn and Mark', meta: 'Students', rating: 5, text: "We first met Becky at a retreat she held at Brampston beach. We had a great experience and have since attended her classes. Her expert knowledge and calming vibe is magical. Can't recommend her enough. Loved by all." },
  { name: 'Carlos', meta: 'Student for 3 years', rating: 5, text: "I devoted my time to attend Becky's classes weekly for over 3 years. Her class isn't a routine, alternates different poses, from core to flexibility, focuses the mind body connection by breath work to start the class, including affirmation. I love the integration of the spiritual aspect of her class. I always found myself centred, positive and calm for the day after her classes. Namaste." },
  { name: 'Coleen', meta: 'Student for 7 years', rating: 5, text: 'Rebecca is a brilliant teacher, she is fun and communicates well so the moves are easy to follow. All the classes had a genuine friendly feel and everyone was able to participate to their own level. I would thoroughly recommend Rebecca as a wonderful teacher and person.' },
  { name: 'Ann', meta: 'Student for 8 years', rating: 5, text: 'During the last 8 years I have found Rebecca to be a truly inspirational yoga teacher. Not only is she a master of yoga, she also demonstrates patience and kindness. She has been greatly missed by her students in Far North Qld, but we live in hope that one day she may return.' },
  { name: 'Frances', meta: 'Student for 5 years', rating: 5, text: "I had never done any previous yoga classes and started with Rebecca after finishing full time work. I found the classes beneficial physically but also for the mind. Her personal touches within the class are very special. Starting with a warm welcome, and she was always aware of everyone's differences within the practice. Attending Rebecca's classes was also the start of belonging to a wonderful community. Rebecca is both a beautiful instructor and person." },
  { name: 'Sally', meta: 'Student for 10 years', rating: 5, text: "I enjoyed Becky's yoga classes for well over a decade. In her soothing voice she began and ended her classes with gentle, partly guided meditations. Her participants were at various levels, and she always encouraged modifications to suit our own bodies. I am so sorry that she moved away!" },
  { name: 'Shelagh', meta: 'Student', rating: 5, text: 'Love your teaching style Becky. You guide each of us to achieve the very best we can. Thank you.' },
  { name: 'Stephanie', meta: 'Retreat Guest', rating: 5, text: 'Becky has the gift to inspire and educate with the wisdom of an old soul. I would highly recommend anyone who wants to nurture their body and soul to attend one of her fantastic and rejuvenating retreats.' },
  { name: 'Basha', meta: 'Student', rating: 5, text: "I love going to Becky’s classes. She is one of the best Yoga teachers I have been to over the years and I miss her very much. " },
  { name: 'Fiona', meta: 'Student', rating: 5, text: "I attended my first Yoga class ever in my mid 60’s. I thought what am I doing here with all these experienced people. I don’t belong. How wrong was I ! Becky made me feel so comfortable and welcome and gave me adjustments so I could participate in the class. I am astounded by the improvements I have made. Becky reminded me that you are never too old to learn something new. " }
];

export default function AdminTestimonialsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTestimonial, setEditTestimonial] = useState<Testimonial | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    meta: '',
    rating: 5,
    text: '',
    order: 0,
    published: true
  });

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) {
      router.push('/');
    }
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    loadTestimonials();
  }, []);

  const loadTestimonials = async () => {
    setLoading(true);
    try {
      const data = await getTestimonials(false);
      setTestimonials(data);
    } catch (e) {
      toast.error('Failed to load testimonials');
    } finally {
      setLoading(false);
    }
  };

  const handleImportDefaults = async () => {
    if (!confirm('This will load all 12 original testimonials into the database. Proceed?')) return;
    setImporting(true);
    try {
      let count = 0;
      for (const t of defaultStaticTestimonials) {
        await createTestimonial({
          ...t,
          order: count,
          published: true
        });
        count++;
      }
      toast.success('Successfully imported default testimonials!');
      loadTestimonials();
    } catch (e) {
      toast.error('Failed to import testimonials');
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.text) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const testimonialData = {
        ...form,
        rating: Number(form.rating),
        order: Number(form.order)
      };

      if (editTestimonial) {
        await updateTestimonial(editTestimonial.id, testimonialData);
        toast.success('Testimonial updated');
      } else {
        await createTestimonial(testimonialData);
        toast.success('Testimonial added');
      }
      setShowModal(false);
      resetForm();
      loadTestimonials();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save testimonial');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this testimonial?')) return;
    try {
      await deleteTestimonial(id);
      toast.success('Testimonial deleted');
      loadTestimonials();
    } catch (e) {
      toast.error('Failed to delete testimonial');
    }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= testimonials.length) return;

    const list = [...testimonials];
    const current = list[index];
    const target = list[targetIndex];

    try {
      const currentOrder = current.order;
      const targetOrder = target.order;

      // Swap orders
      await updateTestimonial(current.id, { order: targetOrder });
      await updateTestimonial(target.id, { order: currentOrder });

      toast.success('Order updated');
      loadTestimonials();
    } catch (e) {
      toast.error('Failed to update order');
    }
  };

  const openEdit = (t: Testimonial) => {
    setEditTestimonial(t);
    setForm({
      name: t.name,
      meta: t.meta || '',
      rating: t.rating || 5,
      text: t.text,
      order: t.order || 0,
      published: t.published !== false
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditTestimonial(null);
    setForm({
      name: '',
      meta: '',
      rating: 5,
      text: '',
      order: testimonials.length,
      published: true
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Testimonials Management</h1>
            <p className="text-white/60 mt-1">{testimonials.length} reviews · Showcased on Homepage</p>
          </div>
          <div className="flex gap-2">
            {testimonials.length === 0 && (
              <button
                onClick={handleImportDefaults}
                disabled={importing}
                className="btn-outline border-white/40 text-white hover:bg-white/10 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} /> Import Defaults
              </button>
            )}
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Testimonial
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {testimonials.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <MessageSquare className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
            <p className="text-text-light mb-4">No testimonials in the database. Use the button above to import Becky's default testimonials, or write a new one.</p>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Create Testimonial
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface-cream">
                  <tr>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Order</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Author</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Rating</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Testimonial</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Status</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {testimonials.map((t, index) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleReorder(index, 'up')}
                            disabled={index === 0}
                            className="p-1 rounded text-text-light hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleReorder(index, 'down')}
                            disabled={index === testimonials.length - 1}
                            className="p-1 rounded text-text-light hover:bg-gray-100 disabled:opacity-30"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-text-light ml-1 font-semibold">{t.order}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-primary text-sm">{t.name}</p>
                        {t.meta && <p className="text-xs text-text-light">{t.meta}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-0.5">
                          {[...Array(t.rating || 5)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-accent text-accent" />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-text-light max-w-md truncate">
                        "{t.text}"
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs px-2 py-1 rounded ${t.published ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {t.published ? 'Visible' : 'Hidden'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(t)} className="text-text-light hover:text-accent p-1"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(t.id)} className="text-text-light hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Testimonial Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif text-xl text-primary">{editTestimonial ? 'Edit' : 'Add'} Testimonial</h2>
              <button onClick={() => setShowModal(false)} className="text-text-light hover:text-primary"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="input-label">Author Name *</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Louise"
                />
              </div>
              <div>
                <label className="input-label">Author Subtitle / Meta Description (Optional)</label>
                <input
                  type="text"
                  value={form.meta}
                  onChange={(e) => setForm({ ...form, meta: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Student for 7 years"
                />
              </div>
              <div>
                <label className="input-label">Rating (1 to 5 Stars)</label>
                <select
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                  className="input-field"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>
              <div>
                <label className="input-label">Testimonial Text *</label>
                <textarea
                  required
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="input-field resize-none"
                  rows={5}
                  placeholder="Insert review text..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Display Order</label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Visibility</label>
                  <div className="flex h-12 items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.published}
                        onChange={(e) => setForm({ ...form, published: e.target.checked })}
                        className="rounded border-gray-300 text-accent focus:ring-accent accent-accent"
                      />
                      <span className="text-sm">Visible on site</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
