'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, X, Upload, MapPin, Calendar, Users, Save, DollarSign } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getRetreats, addRetreat, updateRetreat, deleteRetreat } from '@/lib/firestore';
import { uploadFile } from '@/lib/firebase';
import { Retreat } from '@/types';
import toast from 'react-hot-toast';

export default function AdminRetreatsPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editRetreat, setEditRetreat] = useState<Retreat | null>(null);
  const [form, setForm] = useState({
    title: '', subtitle: '', description: '', longDescription: '', location: '', startDate: '', endDate: '',
    price: '', currency: 'AUD', maxSpots: '', spotsLeft: '',
    inclusions: '', exclusions: '', highlights: '', experiences: '',
    earlyBirdOffer: '', paymentNote: '', depositNote: '', depositAmount: '', depositDueDate: '', balanceDueDate: '',
    featured: false,
    status: 'published' as 'published' | 'draft',
  });
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => { loadRetreats(); }, []);

  const loadRetreats = async () => {
    const data = await getRetreats(false);
    setRetreats(data);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFile(file, `retreats/${Date.now()}_${file.name}`);
        setImages(prev => [...prev, url]);
      } catch (err) {
        toast.error('Failed to upload image');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setFormError('End date cannot be before start date.');
      return;
    }

    if (images.length === 0) {
      setFormError('Please upload at least one retreat image.');
      return;
    }

    setSaving(true);
    try {
      const retreatData = {
        title: form.title,
        subtitle: form.subtitle,
        description: form.description,
        longDescription: form.longDescription,
        location: form.location,
        startDate: form.startDate,
        endDate: form.endDate,
        price: parseFloat(form.price) || 0,
        currency: form.currency,
        maxSpots: parseInt(form.maxSpots) || 20,
        spotsLeft: parseInt(form.spotsLeft) || parseInt(form.maxSpots) || 20,
        images,
        thumbnail: images[0] || '',
        inclusions: form.inclusions.split('\n').filter(Boolean),
        exclusions: form.exclusions.split('\n').filter(Boolean),
        highlights: form.highlights.split('\n').filter(Boolean),
        experiences: form.experiences
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const [title, ...rest] = line.split('|');
            return {
              title: title?.trim() || '',
              description: rest.join('|').trim(),
            };
          })
          .filter((item) => item.title || item.description),
        earlyBirdOffer: form.earlyBirdOffer,
        paymentNote: form.paymentNote,
        depositNote: form.depositNote,
        depositAmount: parseFloat(form.depositAmount) || 0,
        depositDueDate: form.depositDueDate,
        balanceDueDate: form.balanceDueDate,
        featured: form.featured,
        status: form.status,
        updatedAt: new Date().toISOString(),
      };
      if (editRetreat) {
        await updateRetreat(editRetreat.id, retreatData);
        toast.success('Retreat updated');
      } else {
        await addRetreat({ ...retreatData, createdAt: new Date().toISOString(), registrations: 0 });
        toast.success('Retreat created');
      }
      setShowModal(false);
      resetForm();
      loadRetreats();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this retreat?')) return;
    try { await deleteRetreat(id); toast.success('Deleted'); loadRetreats(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const openEdit = (retreat: Retreat) => {
    setEditRetreat(retreat);
    setForm({
      title: retreat.title, subtitle: retreat.subtitle || '', description: retreat.description, 
      longDescription: retreat.longDescription || '', location: retreat.location,
      startDate: retreat.startDate, endDate: retreat.endDate, price: retreat.price.toString(),
      currency: retreat.currency, maxSpots: retreat.maxSpots.toString(), spotsLeft: retreat.spotsLeft.toString(),
      inclusions: retreat.inclusions.join('\n'),
      exclusions: (retreat.exclusions || []).join('\n'),
      highlights: retreat.highlights.join('\n'),
      experiences: (retreat.experiences || []).map((item) => `${item.title} | ${item.description}`).join('\n'),
      earlyBirdOffer: retreat.earlyBirdOffer || '',
      paymentNote: retreat.paymentNote || '',
      depositNote: retreat.depositNote || '',
      depositAmount: retreat.depositAmount ? retreat.depositAmount.toString() : '',
      depositDueDate: retreat.depositDueDate || '',
      balanceDueDate: retreat.balanceDueDate || '',
      featured: retreat.featured,
      status: retreat.status,
    });
    setImages(retreat.images || []);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditRetreat(null);
    setForm({
      title: '',
      subtitle: '',
      description: '',
      longDescription: '',
      location: '',
      startDate: '',
      endDate: '',
      price: '',
      currency: 'AUD',
      maxSpots: '',
      spotsLeft: '',
      inclusions: '',
      exclusions: '',
      highlights: '',
      experiences: '',
      earlyBirdOffer: '',
      paymentNote: '',
      depositNote: '',
      depositAmount: '',
      depositDueDate: '',
      balanceDueDate: '',
      featured: false,
      status: 'published',
    });
    setImages([]);
  };

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Retreats Management</h1>
            <p className="text-white/60 mt-1">{retreats.length} retreats</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Retreat
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {retreats.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <MapPin className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
            <p className="text-text-light mb-4">No retreats yet. Create your first retreat listing.</p>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Retreat
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {retreats.map((retreat) => (
              <div key={retreat.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="h-48 bg-primary/10 relative">
                  {retreat.thumbnail && <img src={retreat.thumbnail} alt="" className="w-full h-full object-cover" />}
                  <span className={`absolute top-3 right-3 text-xs px-2 py-1 rounded ${retreat.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {retreat.status}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="font-serif text-lg text-primary">{retreat.title}</h3>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-light">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {retreat.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {retreat.startDate} - {retreat.endDate}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {retreat.spotsLeft}/{retreat.maxSpots} spots</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <span className="text-accent font-bold">${retreat.price}</span>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(retreat)} className="text-text-light hover:text-accent"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(retreat.id)} className="text-text-light hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="font-serif text-xl text-primary">{editRetreat ? 'Edit' : 'Create'} Retreat</h2>
              <button onClick={() => setShowModal(false)} className="text-text-light hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div><label className="input-label">Title *</label><input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g., Joie De Vivre — Yoga & Wellness Escape" /></div>
              <div><label className="input-label">Subtitle</label><input type="text" value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className="input-field" placeholder="e.g., A Journey of Rejuvenation" /></div>
              <div><label className="input-label">Short Description (for cards) *</label><textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={2} /></div>
              <div><label className="input-label">Long Description / About *</label><textarea required value={form.longDescription} onChange={(e) => setForm({ ...form, longDescription: e.target.value })} className="input-field resize-none" rows={5} /></div>
              <div><label className="input-label">Location *</label><input type="text" required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="South West France" /></div>
              {formError && <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{formError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="input-label">Start Date *</label><input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="input-field" /></div>
                <div><label className="input-label">End Date *</label><input type="date" required min={form.startDate || undefined} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="input-field" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="input-label">Price ($) *</label><input type="number" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field" /></div>
                <div><label className="input-label">Max Spots</label><input type="number" value={form.maxSpots} onChange={(e) => setForm({ ...form, maxSpots: e.target.value })} className="input-field" /></div>
                <div><label className="input-label">Spots Left</label><input type="number" value={form.spotsLeft} onChange={(e) => setForm({ ...form, spotsLeft: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="input-label">Inclusions (one per line)</label><textarea value={form.inclusions} onChange={(e) => setForm({ ...form, inclusions: e.target.value })} className="input-field resize-none" rows={3} placeholder="Daily yoga sessions&#10;Gourmet meals&#10;Spa treatments" /></div>
              <div><label className="input-label">Not Included (one per line)</label><textarea value={form.exclusions} onChange={(e) => setForm({ ...form, exclusions: e.target.value })} className="input-field resize-none" rows={3} placeholder="Airfares&#10;Lunches&#10;Travel insurance" /></div>
              <div><label className="input-label">Highlights (one per line)</label><textarea value={form.highlights} onChange={(e) => setForm({ ...form, highlights: e.target.value })} className="input-field resize-none" rows={3} placeholder="Beautiful countryside venue&#10;Small intimate group" /></div>
              <div><label className="input-label">Curated Experiences</label><textarea value={form.experiences} onChange={(e) => setForm({ ...form, experiences: e.target.value })} className="input-field resize-none" rows={6} placeholder="Saint-Émilion Wine Tour | Visit three renowned wineries with an expert guide.&#10;Rocamadour & Dordogne | Overnight stay in Rocamadour and explore Sarlat the next day." /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="input-label">Early Bird Offer</label><textarea value={form.earlyBirdOffer} onChange={(e) => setForm({ ...form, earlyBirdOffer: e.target.value })} className="input-field resize-none" rows={4} placeholder="Early Bird Offer: $3,000 AUD..." /></div>
                <div><label className="input-label">Payment Note</label><textarea value={form.paymentNote} onChange={(e) => setForm({ ...form, paymentNote: e.target.value })} className="input-field resize-none" rows={4} placeholder="Secure your place with a 50% deposit..." /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="input-label">Deposit Amount</label><input type="number" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} className="input-field" placeholder="1750" /></div>
                <div><label className="input-label">Deposit Due Date</label><input type="date" value={form.depositDueDate} onChange={(e) => setForm({ ...form, depositDueDate: e.target.value })} className="input-field" /></div>
                <div><label className="input-label">Balance Due Date</label><input type="date" value={form.balanceDueDate} onChange={(e) => setForm({ ...form, balanceDueDate: e.target.value })} className="input-field" /></div>
              </div>
              <div><label className="input-label">Deposit Note</label><textarea value={form.depositNote} onChange={(e) => setForm({ ...form, depositNote: e.target.value })} className="input-field resize-none" rows={3} placeholder="Secure your place with a 50% deposit..." /></div>
              <label className="flex items-center gap-2 text-sm text-text-light">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} />
                Mark as featured on the home page
              </label>
              <div>
                <label className="input-label">Images</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {images.map((img, i) => (
                    <div key={i} className="relative w-20 h-20 rounded overflow-hidden">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))} className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs">×</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} className="text-xs text-accent hover:underline flex items-center gap-1"><Upload className="w-3 h-3" /> Upload Images</button>
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Saving...' : editRetreat ? 'Update' : 'Create'} Retreat</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
