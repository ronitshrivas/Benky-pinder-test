'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, X, Upload, Video, Save, Eye, EyeOff, DollarSign, GripVertical, Check, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCourses, addCourse, updateCourse, deleteCourse } from '@/lib/firestore';
import { uploadFile, uploadFileWithProgress } from '@/lib/firebase';
import { Course, Lesson } from '@/types';
import toast from 'react-hot-toast';
import { ImageCropper } from '@/components/ui/ImageCropper';

function makeLessonId(courseId: string | null, index: number, title?: string) {
  return `${courseId || 'new-course'}-lesson-${index + 1}-${String(title || 'lesson').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'item'}`;
}

export default function AdminCoursesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({
    title: '', description: '', price: '', currency: 'USD',
    thumbnail: '', category: 'yoga', status: 'published' as 'published' | 'draft' | 'upcoming',
    isBundle: false, bundledCourses: [] as string[],
  });
  const [lessons, setLessons] = useState<Partial<Lesson>[]>([]);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [activeSection, setActiveSection] = useState<'details' | 'lessons'>('details');
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [showCropper, setShowCropper] = useState(false);
  const thumbRef = useRef<HTMLInputElement>(null);

  const isLessonUploading = (index: number) => {
    const progress = uploadProgress[`lesson-${index}`];
    return progress !== undefined && progress < 100;
  };

  const buildCourseData = (nextLessons: Partial<Lesson>[], resolvedThumbnail = form.thumbnail) => {
    return {
      ...form,
      thumbnail: resolvedThumbnail,
      price: parseFloat(form.price) || 0,
      lessons: nextLessons as Lesson[],
      totalLessons: nextLessons.length,
      totalDuration: nextLessons.reduce((acc, l) => acc + (parseInt(l.duration || '0') || 0), 0) + ' mins',
      updatedAt: new Date().toISOString(),
      isBundle: form.isBundle,
      bundledCourses: form.isBundle ? form.bundledCourses : [],
    };
  };

  useEffect(() => {
    if (!authLoading && (!user || userData?.role !== 'admin')) router.push('/');
  }, [user, userData, authLoading, router]);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    const data = await getCourses(false);
    setCourses(data);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const objectUrl = URL.createObjectURL(f);
    setCropImageSrc(objectUrl);
    setShowCropper(true);
    if (thumbRef.current) thumbRef.current.value = '';
  };

  const handleCropComplete = (croppedFile: File) => {
    setThumbnailFile(croppedFile);
    setThumbnailPreview(URL.createObjectURL(croppedFile));
    setShowCropper(false);
    setCropImageSrc('');
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropImageSrc('');
  };

  const addLesson = () => {
    setLessons([
      ...lessons,
      {
        id: makeLessonId(editCourse?.id || null, lessons.length, ''),
        title: '',
        description: '',
        duration: '',
        videoUrl: '',
        order: lessons.length + 1,
      },
    ]);
  };

  const updateLesson = (index: number, field: string, value: string) => {
    const updated = [...lessons];
    updated[index] = { ...updated[index], [field]: value };
    setLessons(updated);
  };

  const removeLesson = (index: number) => {
    setLessons(lessons.filter((_, i) => i !== index));
  };

  const handleLessonVideo = async (index: number, file: File) => {
    const uploadKey = `lesson-${index}`;
    try {
      if (!user) {
        toast.error('You must be logged in to upload videos.');
        return;
      }

      setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
      const token = await user.getIdToken();

      // Upload through our same-origin API route to avoid browser-side CORS/network failures.
      // The route validates the admin token, creates the Bunny placeholder, and streams the file to Bunny.
      const uploadUrl = `/api/admin/video/upload?title=${encodeURIComponent(file.name)}`;

      const bunnyEmbedUrl = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const parsed = JSON.parse(xhr.responseText);
              resolve(parsed.url || '');
            } catch {
              resolve('');
            }
          } else {
            let message = `Video upload failed with status ${xhr.status}.`;
            try {
              const parsed = JSON.parse(xhr.responseText);
              if (parsed?.error) message = parsed.error;
            } catch {
              if (xhr.responseText) message = xhr.responseText;
            }
            reject(new Error(message));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network error occurred during video upload. Please check your connection or the server route.'));
        };

        xhr.send(file);
      });

      const nextLessons = lessons.map((lesson, lessonIndex) =>
        lessonIndex === index ? { ...lesson, videoUrl: bunnyEmbedUrl } : lesson
      );
      updateLesson(index, 'videoUrl', bunnyEmbedUrl);

      if (editCourse) {
        await updateCourse(editCourse.id, buildCourseData(nextLessons));
      }

      setUploadProgress(prev => ({ ...prev, [uploadKey]: 100 }));
      toast.success('Video uploaded successfully!');
      window.setTimeout(() => {
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[uploadKey];
          return next;
        });
      }, 1500);
    } catch (e: any) {
      console.error('Video upload failed:', e);
      setUploadProgress(prev => {
        const next = { ...prev };
        delete next[uploadKey];
        return next;
      });
      toast.error(e.message || 'Upload failed');
    }
  };

  const isAnyLessonUploading = Object.entries(uploadProgress).some(([key, progress]) => key.startsWith('lesson-') && progress < 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isAnyLessonUploading) {
      toast.error('Please wait for video uploads to finish before saving.');
      return;
    }
    setSaving(true);
    try {
      let thumbnail = form.thumbnail;
      if (thumbnailFile) {
        const uploadKey = 'thumbnail';
        setUploadProgress(prev => ({ ...prev, [uploadKey]: 0 }));
        thumbnail = await uploadFileWithProgress(
          thumbnailFile, 
          `courses/thumbnails/${Date.now()}_${thumbnailFile.name}`,
          (progress) => {
            setUploadProgress(prev => ({ ...prev, [uploadKey]: progress }));
          }
        );
      }
      const courseData = {
        ...buildCourseData(lessons, thumbnail),
      };
      if (editCourse) {
        await updateCourse(editCourse.id, courseData);
        toast.success('Course updated');
      } else {
        await addCourse({ ...courseData, createdAt: new Date().toISOString(), enrolledCount: 0 });
        toast.success('Course created');
      }
      setShowModal(false);
      resetForm();
      loadCourses();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? Students who purchased it will lose access.')) return;
    try {
      await deleteCourse(id);
      toast.success('Course deleted');
      loadCourses();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const openEdit = (course: Course) => {
    setEditCourse(course);
    setForm({
      title: course.title, description: course.description, price: course.price.toString(),
      currency: course.currency, thumbnail: course.thumbnail, category: course.category,
      status: course.status, isBundle: course.isBundle || false, bundledCourses: course.bundledCourses || [],
    });
    setLessons((course.lessons || []).map((lesson, index) => ({
      ...lesson,
      id: lesson.id || makeLessonId(course.id, index, lesson.title),
    })));
    setThumbnailPreview(course.thumbnail);
    setShowModal(true);
  };

  const resetForm = () => {
    setEditCourse(null);
    setForm({ title: '', description: '', price: '', currency: 'USD', thumbnail: '', category: 'yoga', status: 'published' as any, isBundle: false, bundledCourses: [] });
    setLessons([]);
    setThumbnailFile(null);
    setThumbnailPreview('');
    setUploadProgress({});
    setActiveSection('details');
    setShowCropper(false);
    setCropImageSrc('');
  };

  const ProgressBar = ({ progress }: { progress: number }) => (
    <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
      <div 
        className="bg-accent h-full transition-all duration-300 ease-out" 
        style={{ width: `${progress}%` }}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-surface">
      <section className="bg-primary py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl text-white">Courses Management</h1>
            <p className="text-white/60 mt-1">{courses.length} courses · Manage video content</p>
          </div>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Course
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {courses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-sm">
            <Video className="w-12 h-12 text-text-light/30 mx-auto mb-4" />
            <p className="text-text-light mb-4">No courses yet. Create your first video course.</p>
            <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Course
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-cream">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Course</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Price</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Lessons</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Enrolled</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-text-light uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded overflow-hidden flex-shrink-0">
                          {course.thumbnail && <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <p className="font-medium text-primary text-sm">{course.title}</p>
                          <p className="text-xs text-text-light">{course.category}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-accent font-medium">${course.price}</td>
                    <td className="px-6 py-4 text-sm text-text-light">{course.totalLessons}</td>
                    <td className="px-6 py-4 text-sm text-text-light">{course.enrolledCount}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded ${
                        course.status === 'published' ? 'bg-green-100 text-green-700' :
                        course.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(course)} className="text-text-light hover:text-accent"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(course.id)} className="text-text-light hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Course Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="font-serif text-xl text-primary">{editCourse ? 'Edit' : 'Create'} Course</h2>
              <button onClick={() => setShowModal(false)} className="text-text-light hover:text-primary"><X className="w-5 h-5" /></button>
            </div>

            {/* Tabs */}
            <div className="flex border-b px-6">
              <button
                onClick={() => setActiveSection('details')}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeSection === 'details' ? 'border-accent text-accent' : 'border-transparent text-text-light'}`}
              >
                Course Details
              </button>
              {!form.isBundle && (
                <button
                  onClick={() => setActiveSection('lessons')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px ${activeSection === 'lessons' ? 'border-accent text-accent' : 'border-transparent text-text-light'}`}
                >
                  Lessons ({lessons.length})
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {activeSection === 'details' ? (
                <div className="space-y-5">
                  <div>
                    <label className="input-label">Course Title *</label>
                    <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g., 30-Day Yoga Foundations" />
                  </div>
                  <div>
                    <label className="input-label">Description *</label>
                    <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field resize-none" rows={4} placeholder="Course description..." />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="input-label">Price ($) *</label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light" />
                        <input type="number" required step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="input-field pl-10" placeholder="49.00" />
                      </div>
                    </div>
                    <div>
                      <label className="input-label">Category</label>
                      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                        <option value="yoga">Yoga</option>
                        <option value="meditation">Meditation</option>
                        <option value="wellness">Wellness</option>
                        <option value="breathwork">Breathwork</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Thumbnail</label>
                    <div onClick={() => thumbRef.current?.click()} className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center cursor-pointer hover:border-accent transition-colors">
                      {thumbnailPreview ? (
                        <img src={thumbnailPreview} alt="Thumbnail" className="w-full h-32 object-cover rounded" />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-text-light/40 mb-2" />
                          <p className="text-xs text-text-light/60">Upload Thumbnail</p>
                        </div>
                      )}
                    </div>
                    {uploadProgress['thumbnail'] !== undefined && uploadProgress['thumbnail'] < 100 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-[10px] text-text-light mb-1">
                          <span>Uploading thumbnail...</span>
                          <span>{Math.round(uploadProgress['thumbnail'])}%</span>
                        </div>
                        <ProgressBar progress={uploadProgress['thumbnail']} />
                      </div>
                    )}
                    <input ref={thumbRef} type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </div>
                  <div>
                    <label className="input-label">Status</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.status === 'published'} onChange={() => setForm({ ...form, status: 'published' })} className="accent-accent" />
                        <Eye className="w-4 h-4" /><span className="text-sm">Published</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.status === 'upcoming'} onChange={() => setForm({ ...form, status: 'upcoming' })} className="accent-accent" />
                        <Sparkles className="w-4 h-4 text-accent" /><span className="text-sm">Upcoming</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={form.status === 'draft'} onChange={() => setForm({ ...form, status: 'draft' })} className="accent-accent" />
                        <EyeOff className="w-4 h-4" /><span className="text-sm">Draft</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-4 border rounded-lg hover:bg-gray-50">
                      <input 
                        type="checkbox" 
                        checked={form.isBundle} 
                        onChange={(e) => setForm({ ...form, isBundle: e.target.checked })}
                        className="w-5 h-5 accent-accent"
                      />
                      <div>
                        <p className="font-medium text-primary text-sm">This is a Course Bundle</p>
                        <p className="text-xs text-text-light">Instead of uploading video lessons, you can group multiple existing courses together.</p>
                      </div>
                    </label>
                  </div>
                  {form.isBundle && (
                    <div className="border p-4 rounded-lg bg-gray-50">
                      <label className="input-label mb-3">Select Courses for this Bundle</label>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {courses.filter(c => c.id !== editCourse?.id && !c.isBundle).map(c => (
                          <label key={c.id} className="flex items-center gap-3 p-2 bg-white border rounded cursor-pointer hover:border-accent">
                            <input 
                              type="checkbox"
                              checked={form.bundledCourses.includes(c.id)}
                              onChange={(e) => {
                                const newSelection = e.target.checked 
                                  ? [...form.bundledCourses, c.id]
                                  : form.bundledCourses.filter(id => id !== c.id);
                                setForm({ ...form, bundledCourses: newSelection });
                              }}
                              className="accent-accent w-4 h-4"
                            />
                            <div className="flex items-center gap-2">
                              {c.thumbnail && <img src={c.thumbnail} alt="" className="w-8 h-8 rounded object-cover" />}
                              <span className="text-sm font-medium text-primary">{c.title}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Lessons Section */
                <div className="space-y-4">
                  {/* Pro Video Optimization Alert */}
                  <div className="bg-[#1B2A4A]/5 border border-[#C9A84C]/20 rounded-lg p-4 flex items-start gap-3">
                    <div className="bg-[#C9A84C]/10 p-2.5 rounded-full text-accent flex-shrink-0">
                      <Video className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm text-primary font-semibold">Pro Video Tips for Zero-Lag Streaming</h4>
                      <p className="text-xs text-text-light mt-1 leading-relaxed">
                        To guarantee a <strong>100% zero-lag, premium "YouTube" experience</strong> for your students, we highly recommend hosting externally:
                      </p>
                      <ul className="text-xs text-text-light list-disc list-inside mt-2 space-y-1">
                        <li><strong>Recommended (Best Performance)</strong>: Upload your course videos to <strong>YouTube (as "Unlisted")</strong> or <strong>Vimeo</strong>, then paste the link directly in the video field below! This automatically scales quality and eliminates lag.</li>
                        <li><strong>Direct File Uploads</strong>: Never upload raw `.mov` recordings (they are massive). Convert and compress them to **H.264 MP4 (720p/1080p, 1.5 - 3 Mbps)** using free tools like <a href="https://handbrake.fr/" target="_blank" rel="noopener noreferrer" className="text-accent underline font-semibold hover:text-accent-light">Handbrake</a> before uploading.</li>
                      </ul>
                    </div>
                  </div>

                  {lessons.map((lesson, i) => (
                    <div key={i} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-text-light" />
                          <span className="text-sm font-medium text-primary">Lesson {i + 1}</span>
                        </div>
                        <button type="button" onClick={() => removeLesson(i)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <input type="text" value={lesson.title || ''} onChange={(e) => updateLesson(i, 'title', e.target.value)} className="input-field text-sm" placeholder="Lesson title" />
                      <input type="text" value={lesson.description || ''} onChange={(e) => updateLesson(i, 'description', e.target.value)} className="input-field text-sm" placeholder="Brief description" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input type="text" value={lesson.duration || ''} onChange={(e) => updateLesson(i, 'duration', e.target.value)} className="input-field text-sm" placeholder="Duration (e.g., 15 min)" />
                        
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <input 
                              type="text" 
                              value={lesson.videoUrl || ''} 
                              onChange={(e) => updateLesson(i, 'videoUrl', e.target.value)} 
                              className="input-field text-sm flex-1" 
                              placeholder="YouTube/Vimeo link or Video URL" 
                            />
                            {lesson.videoUrl && (
                              <button 
                                type="button" 
                                onClick={() => updateLesson(i, 'videoUrl', '')} 
                                className="text-red-400 hover:text-red-500 p-1 flex-shrink-0"
                                title="Clear video link"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          {!lesson.videoUrl && (
                            <div className="rounded-lg border border-dashed border-gray-200 bg-surface/30 px-3 py-1.5 min-h-[42px] flex items-center justify-center">
                              {isLessonUploading(i) ? (
                                <div className="w-full">
                                  <div className="flex items-center justify-between text-[10px] text-text-light mb-1">
                                    <span>Uploading video...</span>
                                    <span>{Math.round(uploadProgress[`lesson-${i}`])}%</span>
                                  </div>
                                  <ProgressBar progress={uploadProgress[`lesson-${i}`]} />
                                </div>
                              ) : (
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-accent hover:underline">
                                  <Upload className="w-3.5 h-3.5" /> Or Upload Video File
                                  <input type="file" accept="video/*" onChange={(e) => { if (e.target.files?.[0]) handleLessonVideo(i, e.target.files[0]); }} className="hidden" />
                                </label>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={addLesson} className="w-full border-2 border-dashed border-gray-200 rounded-lg py-3 text-sm text-text-light hover:border-accent hover:text-accent transition-colors">
                    + Add Lesson
                  </button>
                </div>
              )}

              <div className="mt-6 pt-6 border-t flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving || isAnyLessonUploading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : isAnyLessonUploading ? 'Uploading Video...' : editCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cropper Modal */}
      {showCropper && (
        <ImageCropper
          imageSrc={cropImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
          aspectRatio={4 / 3}
        />
      )}
    </div>
  );
}
