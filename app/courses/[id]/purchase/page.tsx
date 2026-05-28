'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Play, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { getCourseById } from '@/lib/firestore';
import { Course } from '@/types';
import { formatPrice } from '@/lib/utils';
import { PaymentForm } from '@/components/ui/PaymentForm';

export default function CoursePurchasePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnTo=/courses/${id}/purchase`);
    }
  }, [user, authLoading, router, id]);

  // Load course data
  useEffect(() => {
    let active = true;
    async function loadCourse() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getCourseById(id as string);
        if (active) {
          setCourse(data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading course:', err);
        if (active) setLoading(false);
      }
    }
    loadCourse();
    return () => { active = false; };
  }, [id]);

  const handleSuccess = async (orderId: string) => {
    await refreshUserData();
    router.push(`/dashboard/courses/${course?.id}`);
  };

  const handleError = (message: string) => {
    // error already toasted inside PaymentForm
    console.error('Course payment error:', message);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-primary mb-3">Course not found</h1>
          <Link href="/courses" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </Link>
        </div>
      </div>
    );
  }

  const owned = !!user && !!userData?.purchasedCourses?.includes(course.id);

  if (owned) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-xl px-6 py-4 mb-6">
            <CheckCircle className="w-5 h-5" />
            You already own this course.
          </div>
          <Link
            href={`/dashboard/courses/${course.id}`}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Play className="w-4 h-4" /> Go to Lessons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <section className="bg-primary py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href={`/courses/${course.id}`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-accent text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h1 className="font-serif text-3xl text-white">Secure Checkout</h1>
          <p className="text-white/60 mt-1">{course.title}</p>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        {/* Left — Payment form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Order summary */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-100">
            <div>
              <p className="text-text-light text-sm">Course</p>
              <h2 className="font-serif text-2xl text-primary">{course.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-text-light text-sm">Total</p>
              <div className="font-serif text-3xl text-accent">{formatPrice(course.price, course.currency || 'AUD')}</div>
            </div>
          </div>

          {/* Shared payment form (Square + PayPal tabs) */}
          {user && (
            <PaymentForm
              amount={course.price}
              currency={course.currency || 'AUD'}
              userId={user.uid}
              userEmail={user.email!}
              userName={userData?.displayName || user.displayName || 'Student'}
              itemId={course.id}
              itemTitle={course.title}
              itemType="course"
              itemThumbnail={course.thumbnailUrl || course.thumbnail || ''}
              itemVideoUrl={
                course.previewVideoUrl ||
                course.lessons?.find((l) => l.videoUrl)?.videoUrl ||
                ''
              }
              onSuccess={handleSuccess}
              onError={handleError}
            />
          )}
        </div>

        {/* Right — Info panels */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-serif text-2xl text-primary mb-3">What happens next</h3>
            <ol className="space-y-3 text-sm text-text-light list-decimal list-inside">
              <li>Choose your payment method: card or PayPal.</li>
              <li>Complete the secure payment form.</li>
              <li>Course access is granted instantly on success.</li>
              <li>A receipt is emailed to you automatically.</li>
            </ol>
          </div>

          <div className="bg-primary text-white rounded-2xl shadow-sm p-6">
            <p className="text-accent text-sm uppercase tracking-wider mb-2">Included</p>
            <ul className="space-y-2 text-white/80 text-sm">
              <li>{course.totalLessons} on-demand lessons</li>
              <li>Lifetime access to the course area</li>
              <li>Secure checkout via Square or PayPal</li>
            </ul>
          </div>

          {/* Course thumbnail */}
          {(course.thumbnailUrl || course.thumbnail) && (
            <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm">
              <Image
                src={course.thumbnailUrl || course.thumbnail || ''}
                alt={course.title}
                fill
                sizes="(max-width:1023px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
