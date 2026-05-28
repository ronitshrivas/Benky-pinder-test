'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adminDb } from '@/lib/firebase-admin';
import { Upload, Video, Save, Eye, EyeOff, Users, Play, CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoDoc {
  videoUrl: string;
  title: string;
  description: string;
  published: boolean;
  updatedAt: string;
}

export default function AdminInnerCirclePage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({ title: '', description: '', videoUrl: '', published: true });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [existing, setExisting] = useState<VideoDoc | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  // Load existing data
  useEffect(() => {
    if (!user || userData?.role !== 'admin') return;
    (async () => {
      try {
        const [videoRes, subRes] = await Promise.all([
          fetch('/api/admin/inner-circle'),
          fetch('/api/admin/inner-circle/subscribers'),
        ]);
        if (videoRes.ok) {
          const data = await videoRes.json();
          if (data.video) {
            setExisting(data.video);
            setForm({
              title: data.video.title,
              description: data.video.description,
              videoUrl: data.video.videoUrl,
              published: data.video.published,
            });
          }
        }
        if (subRes.ok) {
          const data = await subRes.json();
          setSubscriberCount(data.count ?? 0);
        }
      } catch {
        // non-fatal
      } finally {
        setLoadingData(false);
      }
    })();
  }, [user, userData]);

  const handleVideoUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const token = await user.getIdToken();
      const uploadUrl = `/api/admin/video/upload?title=${encodeURIComponent(file.name)}`;

      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText).url || ''); } catch { resolve(''); }
          } else {
            let msg = `Upload failed (${xhr.status})`;
            try { if (JSON.parse(xhr.responseText)?.error) msg = JSON.parse(xhr.responseText).error; } catch {}
            reject(new Error(msg));
          }
        };
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      setForm((prev) => ({ ...prev, videoUrl: url }));
      toast.success('Video uploaded successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!form.videoUrl) { toast.error('Please add a video URL or upload a video first.'); return; }
    if (!form.title) { toast.error('Please add a title for the video.'); return; }
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/inner-circle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Save failed');
      toast.success('Complimentary video saved!');
      setExisting({ ...form, updatedAt: new Date().toISOString() });
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <section className="bg-primary py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-serif text-3xl text-white">Inner Circle — Complimentary Video</h1>
          <p className="text-white/60 mt-1">
            Upload the free video that subscribers receive when they join Becky's Inner Circle
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Stats bar */}
        {subscriberCount !== null && (
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-5 border border-surface-dark">
            <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary">{subscriberCount}</p>
              <p className="text-sm text-text-light">
                Inner Circle {subscriberCount === 1 ? 'subscriber has' : 'subscribers have'} access to this video
              </p>
            </div>
            {existing && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                {existing.published ? (
                  <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1 rounded-full text-xs font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Published
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full text-xs font-medium">
                    <EyeOff className="w-3.5 h-3.5" /> Draft
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-dark overflow-hidden">
          <div className="p-6 border-b bg-surface-cream">
            <h2 className="font-serif text-lg text-primary">Video Details</h2>
            <p className="text-sm text-text-light mt-1">
              This is the <strong>only</strong> video shown to Inner Circle subscribers — separate from your paid courses.
            </p>
          </div>

          <div className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="input-label">Video Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="e.g., 10-Minute Radiance Boost Morning Practice"
              />
            </div>

            {/* Description */}
            <div>
              <label className="input-label">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field resize-none"
                rows={3}
                placeholder="A short description shown on the watch page…"
              />
            </div>

            {/* Video URL or Upload */}
            <div>
              <label className="input-label">Video *</label>
              <div className="space-y-3">
                {/* URL input */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={form.videoUrl}
                    onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                    className="input-field flex-1"
                    placeholder="Paste YouTube / Vimeo link or video URL"
                  />
                  {form.videoUrl && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, videoUrl: '' })}
                      className="text-red-400 hover:text-red-600 p-1"
                      title="Clear video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 text-xs text-text-light">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span>or upload a file</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Upload area */}
                {!form.videoUrl && (
                  <div
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      uploading ? 'border-accent/50 bg-accent/5' : 'border-gray-200 hover:border-accent cursor-pointer'
                    }`}
                  >
                    {uploading ? (
                      <div className="space-y-2">
                        <Loader2 className="w-6 h-6 text-accent animate-spin mx-auto" />
                        <p className="text-xs text-text-light">Uploading… {uploadProgress}%</p>
                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-accent h-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-7 h-7 text-text-light/40 mx-auto mb-2" />
                        <p className="text-sm text-text-light">Click to upload video file</p>
                        <p className="text-xs text-text-light/60 mt-1">MP4, MOV (H.264 recommended)</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) handleVideoUpload(e.target.files[0]); }}
                    />
                  </div>
                )}

                {/* Preview badge */}
                {form.videoUrl && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                    <Play className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-xs text-green-700 truncate flex-1">{form.videoUrl}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Published toggle */}
            <div>
              <label className="input-label">Visibility</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.published}
                    onChange={() => setForm({ ...form, published: true })}
                    className="accent-accent"
                  />
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Published — subscribers can watch</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!form.published}
                    onChange={() => setForm({ ...form, published: false })}
                    className="accent-accent"
                  />
                  <EyeOff className="w-4 h-4" />
                  <span className="text-sm">Draft — hidden from subscribers</span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving…' : 'Save Complimentary Video'}
            </button>
            {existing?.videoUrl && (
              <a
                href={`/api/inner-circle/validate?token=admin-preview`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline flex items-center gap-2"
              >
                <Video className="w-4 h-4" /> Preview Watch Page
              </a>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-[#1B2A4A]/5 border border-[#C9A84C]/20 rounded-xl p-5">
          <h3 className="font-serif text-sm text-primary font-semibold mb-2">How this works</h3>
          <ul className="text-sm text-text-light space-y-1.5 list-disc list-inside">
            <li>When a guest enters their email on the home page, they're saved as a subscriber.</li>
            <li>They immediately receive a branded email with a unique magic-link button.</li>
            <li>Clicking the link opens <strong>/inner-circle/watch/[token]</strong> — no login needed.</li>
            <li>The link never expires and plays only this video.</li>
            <li>This is completely separate from your paid courses.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
