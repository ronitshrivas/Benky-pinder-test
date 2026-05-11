'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, X, Upload, MapPin, Video, Image as ImageIcon, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getGalleryItems, addGalleryItem, updateGalleryItem, deleteGalleryItem } from '@/lib/firestore';
import { uploadFile } from '@/lib/firebase';
import { GalleryItem } from '@/types';
import toast from 'react-hot-toast';

export default function AdminGalleryPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<GalleryItem | null>(null);
  const [form, setForm] = useState({ title: '', location: '', type: 'image' as 'image' | 'video', description: '' });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    const data = await getGalleryItems();
    setItems(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    // Auto-detect type
    if (f.type.startsWith('video/')) setForm({ ...form, type: 'video' });
    else setForm({ ...form, type: 'image' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !editItem) { toast.error('Please select a file'); return; }
    setSaving(true);
    try {
      let url = editItem?.url || '';
      let thumbnail = editItem?.thumbnail || '';
      if (file) {
        url = await uploadFile(file, `gallery/${Date.now()}_${file.name}`);
        thumbnail = url; // For videos, you'd generate a thumbnail
      }
      const data = { ...form, url, thumbnail, createdAt: new Date().toISOString() };
      if (editItem) {
        await updateGalleryItem(editItem.id, data);
        toast.success('Gallery item updated');
      } else {
        await addGalleryItem(data);
        toast.success('Gallery item added');
      }
      setShowModal(false);
      resetForm();
      loadItems();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    try {
      await deleteGalleryItem(id);
      toast.success('Deleted');
      loadItems();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (item: GalleryItem) => {
    setEditItem(item);
    setForm({ title: item.title, location: item.location || '', type: item.type, description: item.description || '' });
    setPreview(item.url);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditItem(null);
    setForm({ title: '', location: '', type: 'image', description: '' });
    setFile(null);
    setPreview('');
  };

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Gallery Management</h1>
            <p className="text-white/60 mt-1">Manage photos and videos for the public gallery</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Media
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'image', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f ? 'bg-primary text-accent' : 'bg-white text-text-light hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? 'All' : f === 'image' ? 'Photos' : 'Videos'} ({f === 'all' ? items.length : items.filter(i => i.type === f).length})
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <ImageIcon className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
            <p className="text-text-light mb-4">No gallery items yet. Add your first photo or video.</p>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Media
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-square relative">
                  {item.type === 'video' ? (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                      <Video className="w-10 h-10 text-accent" />
                    </div>
                  ) : (
                    <Image
                      src={item.url || item.thumbnail}
                      alt={item.title}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                      className="object-cover"
                    />
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={() => openEdit(item)} className="w-9 h-9 bg-white rounded-full flex items-center justify-center">
                      <Edit2 className="w-4 h-4 text-primary" />
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="w-9 h-9 bg-red-500 rounded-full flex items-center justify-center">
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  {item.type === 'video' && (
                    <span className="absolute top-2 left-2 bg-primary/80 text-white text-xs px-2 py-0.5 rounded">Video</span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-primary truncate">{item.title}</p>
                  {item.location && (
                    <p className="text-xs text-text-light flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {item.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-serif text-xl text-primary">{editItem ? 'Edit' : 'Add'} Gallery Item</h2>
              <button onClick={() => setShowModal(false)} className="text-text-light hover:text-primary">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* File Upload */}
              <div>
                <label className="input-label">Media File {!editItem && '*'}</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-accent transition-colors"
                >
                  {preview ? (
                    <div className="relative w-full h-40">
                      {form.type === 'video' ? (
                        <video src={preview} className="w-full h-full object-contain rounded" />
                      ) : (
                        <img src={preview} alt="Preview" className="w-full h-full object-contain rounded" />
                      )}
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-text-light mx-auto mb-2" />
                      <p className="text-sm text-text-light">Click to upload photo or video</p>
                      <p className="text-xs text-text-light mt-1">JPG, PNG, MP4, MOV (max 100MB)</p>
                    </>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
              </div>

              {/* Title */}
              <div>
                <label className="input-label">Title *</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field"
                  placeholder="e.g., Morning Yoga in France"
                />
              </div>

              {/* Location */}
              <div>
                <label className="input-label">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="input-field pl-10"
                    placeholder="e.g., South West France"
                  />
                </div>
              </div>

              {/* Type */}
              <div>
                <label className="input-label">Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.type === 'image'}
                      onChange={() => setForm({ ...form, type: 'image' })}
                      className="accent-accent"
                    />
                    <span className="text-sm">Photo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={form.type === 'video'}
                      onChange={() => setForm({ ...form, type: 'video' })}
                      className="accent-accent"
                    />
                    <span className="text-sm">Video</span>
                  </label>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="input-label">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editItem ? 'Update Item' : 'Add to Gallery'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
