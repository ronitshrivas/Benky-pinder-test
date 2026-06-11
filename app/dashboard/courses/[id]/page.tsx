'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Play, CheckCircle, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import VideoPlayer from '@/components/ui/VideoPlayer';
import { useAuth } from '@/lib/auth-context';
import { getCourseById, updateLessonProgress } from '@/lib/firestore';
import { Course, Lesson } from '@/types';
import toast from 'react-hot-toast';
import { hasCourseAccess } from '@/lib/utils';

function getPlayableLessonUrl(lesson: Lesson | null): string {
  if (!lesson) return '';
  const anyLesson = lesson as any;
  const nestedVideoUrl = anyLesson.video && typeof anyLesson.video === 'object' ? anyLesson.video.url : '';
  return (
    lesson.videoUrl ||
    anyLesson.videoURL ||
    anyLesson.videoLink ||
    anyLesson.lessonVideoUrl ||
    anyLesson.lessonUrl ||
    anyLesson.mediaUrl ||
    anyLesson.fileUrl ||
    anyLesson.url ||
    nestedVideoUrl ||
    anyLesson.video ||
    anyLesson.src ||
    anyLesson.playbackUrl ||
    anyLesson.downloadUrl ||
    ''
  ).trim();
}

export default function CourseViewerPage() {
  const { id } = useParams();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [expandedModule, setExpandedModule] = useState<number>(0);
  const purchaseRefreshAttempted = useRef(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (id) {
      getCourseById(id as string).then((data) => {
        if (data) {
          setCourse(data);
        }
      });
    }
  }, [id]);

  useEffect(() => {
    if (!course) return;
    const firstPlayableLesson = course.lessons.find((lesson) => getPlayableLessonUrl(lesson));
    setCurrentLesson((prev) => {
      if (prev && course.lessons.some((lesson) => lesson.id === prev.id)) {
        return prev;
      }
      return firstPlayableLesson || course.lessons[0] || null;
    });
    setExpandedModule(0);
    setCompletedLessons(userData?.lessonProgress?.[course.id] || []);
  }, [course, userData]);

  useEffect(() => {
    if (course && userData?.lessonProgress?.[course.id]) {
      setCompletedLessons(userData.lessonProgress[course.id]);
    }
  }, [course, userData]);

  useEffect(() => {
    if (!user || !id || !course) return;
    if (hasCourseAccess(userData?.purchasedCourses, userData?.courseExpiry, id as string)) return;
    if (purchaseRefreshAttempted.current) return;

    purchaseRefreshAttempted.current = true;
    refreshUserData().catch(() => undefined);
  }, [user, id, course, userData, refreshUserData]);

  // Check if user has active (non-expired) access to this course
  const hasPurchased = hasCourseAccess(userData?.purchasedCourses, userData?.courseExpiry, id as string);
  const isExpired = !!userData?.purchasedCourses?.includes(id as string) && !hasPurchased;

  if (!course) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;

  if (!hasPurchased) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-text-light/30 mx-auto mb-4" />
          {isExpired ? (
            <>
              <h1 className="font-serif text-2xl text-primary mb-2">Access Expired</h1>
              <p className="text-text-light mb-6">Your 6-month access to this course has expired. Repurchase to continue learning.</p>
              <button onClick={() => router.push(`/courses/${id}/purchase`)} className="btn-primary">
                Repurchase Course
              </button>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-primary mb-2">Course Locked</h1>
              <p className="text-text-light mb-6">You need to purchase this course to access the video lessons.</p>
              <button onClick={() => router.push(`/courses/${id}/purchase`)} className="btn-primary">
                Purchase Course
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const markComplete = async (lessonId: string) => {
    if (!user || !id) return;
    const updated = [...completedLessons, lessonId];
    setCompletedLessons(updated);
    try {
      await updateLessonProgress(user.uid, id as string, lessonId);
      toast.success('Lesson marked as complete!');
    } catch (e) {
      toast.error('Failed to save progress');
    }
  };

  const activeVideoUrl = getPlayableLessonUrl(currentLesson) || course.previewVideoUrl || '';

  // Get index of current lesson to calculate next lesson (preloading & auto-advancing)
  const currentLessonIndex = currentLesson
    ? course.lessons.findIndex((lesson) => lesson.id === currentLesson.id)
    : -1;

  const nextLesson =
    currentLessonIndex !== -1 && currentLessonIndex + 1 < course.lessons.length
      ? course.lessons[currentLessonIndex + 1]
      : null;

  const nextVideoUrl = nextLesson ? getPlayableLessonUrl(nextLesson) : '';

  const progress = course.totalLessons > 0
    ? Math.round((completedLessons.length / course.totalLessons) * 100)
    : 0;

  // Group lessons into modules (every 4 lessons)
  const modules: { title: string; lessons: Lesson[] }[] = [];
  for (let i = 0; i < course.lessons.length; i += 4) {
    modules.push({
      title: `Module ${Math.floor(i / 4) + 1}`,
      lessons: course.lessons.slice(i, i + 4),
    });
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-black rounded-lg overflow-hidden aspect-video mb-4">
              {activeVideoUrl ? (
                <VideoPlayer
                  src={activeVideoUrl}
                  lessonId={currentLesson?.id || 'preview'}
                  userId={user?.uid}
                  nextVideoUrl={nextVideoUrl}
                  title={currentLesson?.title || course.title}
                  onEnded={() => {
                    if (currentLesson) {
                      markComplete(currentLesson.id);
                      if (nextLesson) {
                        setCurrentLesson(nextLesson);
                        const nextModuleIndex = Math.floor((currentLessonIndex + 1) / 4);
                        setExpandedModule(nextModuleIndex);
                        toast.success(`Up Next: ${nextLesson.title}`, { icon: '🎓' });
                      }
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Play className="w-16 h-16 text-accent mx-auto mb-4" />
                    <p className="text-white/60">
                      {course.lessons.length > 0 ? 'This lesson does not have a playable video yet.' : 'Select a lesson to begin'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Lesson Info */}
            {currentLesson && (
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="font-serif text-xl text-primary">{currentLesson.title}</h2>
                    <p className="text-text-light text-sm mt-1">{currentLesson.description}</p>
                    <p className="text-xs text-text-light mt-2">Duration: {currentLesson.duration}</p>
                  </div>
                  {!completedLessons.includes(currentLesson.id) ? (
                    <button
                      onClick={() => markComplete(currentLesson.id)}
                      className="btn-primary text-xs py-2 px-4"
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <span className="flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" /> Completed
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lesson Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden sticky top-24">
              {/* Progress */}
              <div className="p-4 bg-primary">
                <h3 className="text-white font-serif text-lg mb-2">{course.title}</h3>
                <div className="flex justify-between text-xs text-white/60 mb-1">
                  <span>{completedLessons.length}/{course.totalLessons} lessons</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Lesson List */}
              <div className="max-h-[60vh] overflow-y-auto">
                {modules.map((module, mi) => (
                  <div key={mi}>
                    <button
                      onClick={() => setExpandedModule(expandedModule === mi ? -1 : mi)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-surface-cream text-sm font-medium text-primary hover:bg-gray-100"
                    >
                      {module.title}
                      {expandedModule === mi ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedModule === mi && (
                      <div>
                        {module.lessons.map((lesson) => (
                          <button
                            key={lesson.id}
                            onClick={() => setCurrentLesson(lesson)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                              currentLesson?.id === lesson.id ? 'bg-primary/5 border-l-2 border-l-accent' : ''
                            }`}
                          >
                            {completedLessons.includes(lesson.id) ? (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            ) : (
                              <Play className="w-4 h-4 text-text-light flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="truncate text-primary">{lesson.title}</p>
                              <p className="text-xs text-text-light">{lesson.duration}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
