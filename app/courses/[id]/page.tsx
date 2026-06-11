'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, CheckCircle, Lock, Play, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getCourseById, getCourses } from '@/lib/firestore';
import { Course } from '@/types';
import { formatPrice, hasCourseAccess, getCourseExpiryLabel } from '@/lib/utils';

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user, userData, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!id) return;
      setLoading(true);
      const [data, coursesList] = await Promise.all([
        getCourseById(id as string),
        getCourses(true)
      ]);
      if (active) {
        setCourse(data);
        setAllCourses(coursesList);
        setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-primary mb-3">Course not found</h1>
          <p className="text-text-light mb-6">This course does not exist or is no longer available.</p>
          <Link href="/courses" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const owned = !!user && hasCourseAccess(userData?.purchasedCourses, userData?.courseExpiry, course.id);
  const expiryLabel = getCourseExpiryLabel(userData?.purchasedCourses, userData?.courseExpiry, course.id);
  const isExpired = !!user && !!userData?.purchasedCourses?.includes(course.id) && !owned;

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative overflow-hidden bg-primary">
        <div className="absolute inset-0 opacity-20">
          <Image
            src={course.thumbnailUrl || course.thumbnail || '/images/course1.jpg'}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_30%] sm:object-center"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-20 animate-fade-up">
          <Link href="/courses" className="inline-flex items-center gap-2 text-white/70 hover:text-accent text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </Link>
          <div className="max-w-3xl">
            <p className="section-label text-accent mb-3">{course.status === 'upcoming' ? 'Upcoming Course' : 'Online Learning'}</p>
            <h1 className="font-serif text-4xl md:text-5xl text-white mb-4">{course.title}</h1>
            <p className="text-white/70 text-lg leading-relaxed max-w-2xl">{course.description}</p>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-2"><Clock className="w-4 h-4 text-accent" /> {course.duration}</span>
              <span>{course.totalLessons} lessons</span>
              <span className="capitalize">{course.level}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-12 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="relative aspect-video">
              <Image
                src={course.thumbnailUrl || course.thumbnail || '/images/course1.jpg'}
                alt={course.title}
                fill
                sizes="100vw"
                className="object-cover object-[50%_30%] sm:object-center"
              />
              <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                <Play className="w-16 h-16 text-accent" />
              </div>
            </div>
            <div className="p-6">
              <h2 className="font-serif text-2xl text-primary mb-3">About this course</h2>
              <p className="text-text-light leading-relaxed">{course.longDescription || course.description}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="font-serif text-2xl text-primary mb-4">
              {course.isBundle ? 'Courses Included' : 'Lessons'}
            </h2>
            <div className="space-y-3">
              {course.isBundle ? (
                course.bundledCourses?.length ? (
                  course.bundledCourses.map((courseId, index) => {
                    const matched = allCourses.find(c => c.id === courseId);
                    return (
                      <div key={courseId} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-accent">🌿</span>
                          <p className="font-medium text-primary">{matched?.title || `Course ${index + 1}`}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-text-light">No courses have been added to this bundle yet.</p>
                )
              ) : (
                course.lessons?.length ? course.lessons.map((lesson, index) => (
                  <div key={lesson.id || `${course.id}-lesson-${index + 1}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3">
                    <div>
                      <p className="font-medium text-primary">{lesson.title}</p>
                      <p className="text-xs text-text-light">{lesson.description}</p>
                    </div>
                    <span className="text-xs text-text-light">{lesson.duration}</span>
                  </div>
                )) : (
                  <p className="text-text-light">Lessons will appear here after purchase.</p>
                )
              )}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
            {course.status === 'upcoming' ? (
              <>
                <p className="text-text-light text-sm">Course Status</p>
                <div className="font-serif text-3xl text-accent mt-2 mb-6">Coming Soon</div>
                <div className="flex items-start gap-2 text-text-light bg-surface-cream rounded-lg px-4 py-3 mb-4 text-xs">
                  <Sparkles className="w-4.5 h-4.5 text-accent mt-0.5 flex-shrink-0" />
                  <span>Becky is preparing this course for the library. Stay tuned for details!</span>
                </div>
                <button disabled className="btn-primary w-full opacity-60 cursor-not-allowed">
                  Coming Soon
                </button>
              </>
            ) : owned ? (
              <>
                <p className="text-text-light text-sm">Course price</p>
                <div className="font-serif text-4xl text-accent mt-2 mb-6">{formatPrice(course.price, course.currency || 'AUD')}</div>
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3 mb-2">
                  <CheckCircle className="w-4 h-4" />
                  You already own this course
                </div>
                {expiryLabel && (
                  <p className="text-xs text-text-light mb-4">Access expires on {expiryLabel}</p>
                )}
                <Link href={`/dashboard/courses/${course.id}`} className="btn-primary w-full text-center inline-flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Go to Lessons
                </Link>
              </>
            ) : isExpired ? (
              <>
                <p className="text-text-light text-sm">Course price</p>
                <div className="font-serif text-4xl text-accent mt-2 mb-6">{formatPrice(course.price, course.currency || 'AUD')}</div>
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-4 py-3 mb-4">
                  <Lock className="w-4 h-4" />
                  Your 6-month access has expired
                </div>
                <Link href={`/courses/${course.id}/purchase`} className="btn-primary w-full text-center inline-flex items-center justify-center gap-2">
                  Repurchase Course
                </Link>
              </>
            ) : (
              <>
                <p className="text-text-light text-sm">Course price</p>
                <div className="font-serif text-4xl text-accent mt-2 mb-6">{formatPrice(course.price, course.currency || 'AUD')}</div>
                <div className="flex items-start gap-2 text-text-light bg-surface-cream rounded-lg px-4 py-3 mb-2">
                  <Lock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Secure checkout via Square or PayPal</span>
                </div>
                <p className="text-xs text-text-light mb-4">Unlimited access for 6 months from purchase</p>
                <Link href={`/courses/${course.id}/purchase`} className="btn-primary w-full text-center inline-flex items-center justify-center gap-2">
                  Buy Course
                </Link>
              </>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
