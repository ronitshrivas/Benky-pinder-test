'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, X, Upload, FileText, Save, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getBlogPosts, addBlogPost, updateBlogPost, deleteBlogPost } from '@/lib/firestore';
import { uploadFile } from '@/lib/firebase';
import { BlogPost } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function AdminBlogPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState({
    title: '', excerpt: '', content: '', category: 'yoga',
    thumbnail: '', status: 'published' as 'published' | 'draft',
  });
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    const data = await getBlogPosts();
    setPosts(data);
  };

  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbFile(f);
    setThumbPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let thumbnail = form.thumbnail;
      if (thumbFile) {
        thumbnail = await uploadFile(thumbFile, `blog/${Date.now()}_${thumbFile.name}`);
      }
      const postData = {
        ...form,
        thumbnail,
        author: 'Becky Pinder',
        updatedAt: new Date().toISOString(),
      };
      if (editPost) {
        await updateBlogPost(editPost.id, postData);
        toast.success('Post updated');
      } else {
        await addBlogPost({ ...postData, createdAt: new Date().toISOString() });
        toast.success('Post published');
      }
      setShowModal(false);
      resetForm();
      loadPosts();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this blog post?')) return;
    try { await deleteBlogPost(id); toast.success('Deleted'); loadPosts(); }
    catch (e) { toast.error('Failed to delete'); }
  };

  const openEdit = (post: BlogPost) => {
    setEditPost(post);
    setForm({
      title: post.title, excerpt: post.excerpt, content: post.content,
      category: post.category, thumbnail: post.thumbnail, status: post.status,
    });
    setThumbPreview(post.thumbnail);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditPost(null);
    setForm({ title: '', excerpt: '', content: '', category: 'yoga', thumbnail: '', status: 'published' });
    setThumbFile(null);
    setThumbPreview('');
  };

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Blog Management</h1>
            <p className="text-white/60 mt-1">{posts.length} posts</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Post
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {posts.length === 0 ? (
          <div className="text-center py-20">
            <FileText className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
            <p className="text-text-light">No blog posts yet. Write your first article.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-cream">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Post</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Category</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded overflow-hidden flex-shrink-0">
                          {post.thumbnail && <img src={post.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium text-primary text-sm">{post.title}</p>
                          <p className="text-xs text-text-light line-clamp-1">{post.excerpt}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded capitalize">{post.category}</span></td>
                    <td className="px-6 py-4 text-sm text-text-light">{formatDate(post.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded ${post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(post)} className="text-text-light hover:text-accent"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(post.id)} className="text-text-light hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="font-serif text-xl text-primary">{editPost ? 'Edit' : 'New'} Blog Post</h2>
              <button onClick={() => setShowModal(false)} className="text-text-light hover:text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div><label className="input-label">Title *</label><input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Post title" /></div>
              <div><label className="input-label">Excerpt *</label><input type="text" required value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} className="input-field" placeholder="Brief summary..." /></div>
              <div><label className="input-label">Content *</label><textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="input-field resize-none font-mono text-sm" rows={12} placeholder="Write your blog post content here (supports Markdown)..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                    <option value="yoga">Yoga</option>
                    <option value="wellness">Wellness</option>
                    <option value="meditation">Meditation</option>
                    <option value="retreats">Retreats</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="input-field">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Featured Image</label>
                <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors">
                  {thumbPreview ? <img src={thumbPreview} alt="" className="w-full h-32 object-cover rounded" /> : <><Upload className="w-6 h-6 text-text-light mx-auto mb-1" /><p className="text-xs text-text-light">Upload image</p></>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">{saving ? 'Saving...' : editPost ? 'Update Post' : 'Publish Post'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
