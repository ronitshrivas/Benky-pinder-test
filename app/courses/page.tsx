'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Play, Clock, BarChart3, Lock, Sparkles, BookOpen } from 'lucide-react';
import { getCourses } from '@/lib/firestore';
import { Course } from '@/types';
import { formatPrice, hasCourseAccess } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';

const mockCourses: Course[] = [
  {
    id: '1', title: 'Yoga for Perimenopause & Menopause', slug: 'yoga-perimenopause',
    description: 'Targeted practices to support hormonal balance, bone health, and emotional wellbeing during this transformative time.',
    longDescription: '', price: 79, currency: 'AUD', thumbnailUrl: '/images/course1.jpg', thumbnail: '/images/course1.jpg',
    category: 'yoga', level: 'all-levels', duration: '6 weeks', totalDuration: '6 weeks', lessons: [], totalLessons: 24,
    published: true, status: 'published', featured: true, createdAt: '', updatedAt: '', enrolledCount: 156,
  },
  {
    id: '2', title: 'Morning Flow Foundations', slug: 'morning-flow',
    description: 'Build a consistent morning practice with gentle flows that energise body and mind for the day ahead.',
    longDescription: '', price: 49, currency: 'AUD', thumbnailUrl: '/images/course2.jpg', thumbnail: '/images/course2.jpg',
    category: 'yoga', level: 'beginner', duration: '4 weeks', totalDuration: '4 weeks', lessons: [], totalLessons: 16,
    published: true, status: 'published', featured: true, createdAt: '', updatedAt: '', enrolledCount: 234,
  },
  {
    id: '3', title: 'Restorative Evening Practice', slug: 'restorative-evening',
    description: 'Wind down with deeply relaxing poses, breathwork, and guided meditation for better sleep.',
    longDescription: '', price: 59, currency: 'AUD', thumbnailUrl: '/images/course3.jpg', thumbnail: '/images/course3.jpg',
    category: 'meditation', level: 'all-levels', duration: '4 weeks', totalDuration: '4 weeks', lessons: [], totalLessons: 16,
    published: true, status: 'published', featured: false, createdAt: '', updatedAt: '', enrolledCount: 189,
  },
  {
    id: '4', title: 'Breathwork & Pranayama Mastery', slug: 'breathwork-mastery',
    description: 'Explore the power of breath to transform your energy, calm your nervous system, and deepen awareness.',
    longDescription: '', price: 69, currency: 'AUD', thumbnailUrl: '/images/gallery1.jpg', thumbnail: '/images/gallery1.jpg',
    category: 'breathwork', level: 'intermediate', duration: '5 weeks', totalDuration: '5 weeks', lessons: [], totalLessons: 20,
    published: true, status: 'published', featured: false, createdAt: '', updatedAt: '', enrolledCount: 98,
  },
  {
    id: '5', title: 'Strength & Flexibility Over 40', slug: 'strength-flexibility',
    description: 'A progressive programme combining yoga with functional movement to build strength safely and sustainably.',
    longDescription: '', price: 89, currency: 'AUD', thumbnailUrl: '/images/about.jpg', thumbnail: '/images/about.jpg',
    category: 'yoga', level: 'intermediate', duration: '8 weeks', totalDuration: '8 weeks', lessons: [], totalLessons: 32,
    published: true, status: 'published', featured: false, createdAt: '', updatedAt: '', enrolledCount: 145,
  },
  {
    id: '6', title: 'Meditation for Beginners', slug: 'meditation-beginners',
    description: 'A gentle introduction to meditation with guided sessions that make starting a practice effortless.',
    longDescription: '', price: 39, currency: 'AUD', thumbnailUrl: '/images/gallery2.jpg', thumbnail: '/images/gallery2.jpg',
    category: 'meditation', level: 'beginner', duration: '3 weeks', totalDuration: '3 weeks', lessons: [], totalLessons: 12,
    published: true, status: 'published', featured: false, createdAt: '', updatedAt: '', enrolledCount: 312,
  },
];

const courseHeroVideo = '/images/video2.mp4';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(mockCourses); // keep mock as fallback
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const { user, userData } = useAuth();
  const heroVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const coursesData = await getCourses();
        if (coursesData.length > 0) setCourses(coursesData);
      } catch (e) {
        toast.error('Failed to load courses');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (heroVideoRef.current) {
      heroVideoRef.current.playbackRate = 0.72;
    }
  }, []);

  const filtered = filter === 'all' ? courses : courses.filter((c) => c.category === filter);
  const categories = ['all', ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))];

  return (
    <>
      {/* Hero */}
      <section className="relative h-[50vh] min-h-[350px] overflow-hidden bg-surface-cream">
        <video
          ref={heroVideoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/images/course1.jpg"
        >
          <source src={courseHeroVideo} type="video/mp4" />
        </video>
        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.52) 0%, rgba(0,0,0,0.36) 55%, rgba(0,0,0,0.54) 100%)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div className="animate-fade-up">
            <p className="section-label text-accent mb-3">Online Learning</p>
            <h1 className="font-serif text-4xl md:text-6xl text-white">Video Courses</h1>
            <p className="text-white/75 mt-4 max-w-xl mx-auto">
              Access classes anytime,anywhere. Learn at your own pace.
            </p>
          </div>
        </div>
      </section>

      {/* Categories Filter */}
      <section className="bg-surface-cream py-8 border-b">
        <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-5 py-2 text-xs tracking-wider uppercase rounded-full transition-all ${
                    filter === cat
                      ? 'bg-primary text-accent'
                      : 'bg-white text-text-light hover:bg-surface-cream'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
        </div>
      </section>

      {/* Courses/Bundles Grid */}
      <section className="section-padding bg-surface animate-fade-in">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="card group">
                  <Skeleton className="aspect-[4/3] w-full rounded-t-2xl" />
                  <div className="p-6">
                    <Skeleton className="h-4 w-1/4 mb-2" />
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-6 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filtered.map((course) => {
                const owned = !!user && hasCourseAccess(userData?.purchasedCourses, userData?.courseExpiry, course.id);
                const isExpired = !!user && !!userData?.purchasedCourses?.includes(course.id) && !owned;
                return (
                  <div key={course.id} className="card group animate-fade-up">
                    <Link href={`/courses/${course.id}`} className="block">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Image
                          src={course.thumbnailUrl || course.thumbnail || '/images/course1.jpg'}
                          alt={course.title}
                          fill
                          sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                          className="object-cover scale-[1.02] group-hover:scale-[1.06] transition-transform duration-500 ease-out"
                        />
                        <div className="absolute inset-0 bg-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {course.status === 'upcoming' ? (
                            <Sparkles className="w-12 h-12 text-accent" />
                          ) : owned ? (
                            <Play className="w-12 h-12 text-accent" />
                          ) : (
                            <Lock className="w-10 h-10 text-primary/80" />
                          )}
                        </div>
                        <div className="absolute top-3 left-3 bg-accent text-primary px-3 py-1 text-xs font-semibold rounded">
                          {course.category}
                        </div>
                        {course.status === 'upcoming' && (
                          <div className="absolute top-3 right-3 bg-primary text-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded shadow-md">
                            Coming Soon
                          </div>
                        )}
                      </div>
                    </Link>
                  {course.isBundle ? (
                    <div className="p-6">
                      <Link href={`/courses/${course.id}`} className="inline-block">
                        <h3 className="font-serif text-xl text-primary mb-3 hover:text-accent transition-colors">{course.title}</h3>
                      </Link>
                      <p className="text-text-light text-sm leading-relaxed mb-5">{course.description}</p>
                      
                      {/* Bundle Courses Preview */}
                      <div className="mb-6 pt-4 border-t border-gray-50">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-text-light block mb-2">Courses Included:</span>
                        <ul className="text-xs text-text-light/90 space-y-1.5">
                          {(course.bundledCourses || []).slice(0, 4).map((courseId) => {
                            const matched = courses.find(c => c.id === courseId);
                            return matched ? (
                              <li key={courseId} className="flex items-center gap-1.5 font-medium truncate">
                                <span className="text-accent text-sm">🌿</span> {matched.title}
                              </li>
                            ) : null;
                          })}
                          {(course.bundledCourses?.length || 0) > 4 && (
                            <li className="text-xs text-accent font-medium pl-5">+ {(course.bundledCourses?.length || 0) - 4} more courses</li>
                          )}
                        </ul>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {owned ? (
                          <Link href="/dashboard" className="btn-primary text-xs py-2 px-4">
                            Go to Dashboard
                          </Link>
                        ) : isExpired ? (
                          <>
                            <span className="text-amber-600 text-xs font-semibold">Access Expired</span>
                            <Link href={`/courses/${course.id}/purchase`} className="btn-primary text-xs py-2 px-4">
                              Repurchase
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="text-accent font-serif text-2xl">{formatPrice(course.price, course.currency || 'AUD')}</span>
                            <Link href={user ? `/courses/${course.id}/purchase` : '/login'} className="btn-primary text-xs py-2 px-4">
                              Buy Bundle
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6">
                      <div className="flex items-center gap-4 text-xs text-text-light mb-3">
                        <span className="flex items-center"><Clock className="w-3 h-3 mr-1" />{course.duration}</span>
                        <span className="flex items-center"><BarChart3 className="w-3 h-3 mr-1" />{course.level}</span>
                        <span>{course.totalLessons} lessons</span>
                      </div>
                      <Link href={`/courses/${course.id}`} className="inline-block">
                        <h3 className="font-serif text-xl text-primary mb-2 hover:text-accent transition-colors">{course.title}</h3>
                      </Link>
                      <p className="text-text-light text-sm leading-relaxed mb-4">{course.description}</p>
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        {course.status === 'upcoming' ? (
                          <>
                            <span className="text-text-light font-sans text-xs font-semibold uppercase tracking-wider">Coming Soon</span>
                            <span className="text-xs text-accent font-semibold bg-primary-pale/50 px-2.5 py-1 rounded">Upcoming</span>
                          </>
                        ) : owned ? (
                          <Link href={`/dashboard/courses/${course.id}`} className="btn-primary text-xs py-2 px-4">
                            Continue Learning
                          </Link>
                        ) : isExpired ? (
                          <>
                            <span className="text-amber-600 text-xs font-semibold">Access Expired</span>
                            <Link href={`/courses/${course.id}/purchase`} className="btn-primary text-xs py-2 px-4">
                              Repurchase
                            </Link>
                          </>
                        ) : (
                          <>
                            <span className="text-accent font-serif text-2xl">{formatPrice(course.price, course.currency || 'AUD')}</span>
                            <Link href={user ? `/courses/${course.id}/purchase` : '/login'} className="btn-primary text-xs py-2 px-4">
                              Buy Course
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* How It Works */}
      <section className="section-padding bg-surface-cream">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-serif text-3xl text-primary mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Choose Your Course', desc: 'Browse our library and find the perfect programme for your goals.' },
              { step: '02', title: 'Make Payment', desc: "Secure checkout via Square. You'll receive an invoice by email." },
              { step: '03', title: 'Start Learning', desc: 'Instant access to classes you can take anytime/anywhere.' },
            ].map((item) => (
                <div key={item.step}>
                  <div className="text-accent font-serif text-4xl mb-3">{item.step}</div>
                <h3 className="text-primary font-serif text-xl mb-2">{item.title}</h3>
                <p className="text-text-light text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
