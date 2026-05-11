'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { getCourseById } from '@/lib/firestore';
import { Course } from '@/types';
import { formatPrice } from '@/lib/utils';

declare global {
  interface Window {
    Square?: any;
  }
}

export default function CoursePurchasePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const cardRef = useRef<any>(null);
  const cardInitializedRef = useRef(false);
  const cardContainerId = 'square-card-container';

  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || '';
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';
  // Use a ref to store the script source to avoid unnecessary re-renders
  const [scriptSrc, setScriptSrc] = useState('');
  
  useEffect(() => {
    const src = appId.startsWith('sandbox-')
      ? 'https://sandbox.web.squarecdn.com/v1/square.js'
      : 'https://web.squarecdn.com/v1/square.js';
    setScriptSrc(src);
  }, [appId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnTo=/courses/${id}/purchase`);
    }
  }, [user, authLoading, router, id]);

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
        setLoading(false);
      }
    }
    loadCourse();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!sdkLoaded || !course || !appId || !locationId || cardInitializedRef.current) return;

    let mounted = true;
    async function initCard() {
      if (!window.Square) {
        if (mounted) setError('Square SDK not loaded yet.');
        return;
      }

      try {
        setReady(false);
        const payments = window.Square.payments(appId, locationId);
        const card = await payments.card();
        await card.attach(`#${cardContainerId}`);
        
        if (mounted) {
          cardRef.current = card;
          cardInitializedRef.current = true;
          setReady(true);
          setError('');
        }
      } catch (e: any) {
        console.error('Square initialization error:', e);
        if (mounted) {
          setError(
            e?.message ||
              'Could not load the Square payment form. Please check your configuration and try again.'
          );
        }
      }
    }

    initCard();
    return () => {
      mounted = false;
      if (cardRef.current?.destroy) {
        cardRef.current.destroy().catch(() => undefined);
      }
      cardRef.current = null;
      cardInitializedRef.current = false;
      setReady(false);
    };
  }, [sdkLoaded, course, appId, locationId]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!cardRef.current) {
      setError('Payment form is not ready yet.');
      return;
    }

    try {
      setProcessing(true);
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        throw new Error('Card validation failed. Please check your details and try again.');
      }

      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId: tokenResult.token,
          amount: course?.price,
          currency: 'USD',
          userId: user?.uid,
          userEmail: user?.email,
          userName: userData?.displayName || user?.displayName || 'Student',
          itemId: course?.id,
          itemTitle: course?.title,
          itemType: 'course',
          itemThumbnail: course?.thumbnailUrl || course?.thumbnail || '',
          itemVideoUrl: course?.previewVideoUrl || course?.lessons?.find((lesson) => lesson.videoUrl)?.videoUrl || '',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      await refreshUserData();
      toast.success('Payment successful!');
      router.push(`/dashboard/courses/${course?.id}`);
    } catch (err: any) {
      const message = err?.message || 'Payment failed';
      setError(message);
      toast.error(message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
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

  return (
    <div className="min-h-screen bg-surface">
      {scriptSrc && <Script src={scriptSrc} onLoad={() => setSdkLoaded(true)} />}

      <section className="bg-primary py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Link href={`/courses/${course.id}`} className="inline-flex items-center gap-2 text-white/70 hover:text-accent text-sm mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Course
          </Link>
          <h1 className="font-serif text-3xl text-white">Secure Checkout</h1>
          <p className="text-white/60 mt-1">{course.title}</p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-text-light text-sm">Course</p>
              <h2 className="font-serif text-2xl text-primary">{course.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-text-light text-sm">Total</p>
              <div className="font-serif text-3xl text-accent">{formatPrice(course.price, 'USD')}</div>
            </div>
          </div>

          <div className="rounded-lg bg-surface-cream p-4 mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-accent mt-0.5" />
            <p className="text-sm text-text-light">
              Your payment is processed securely through Square. After successful payment, access is granted automatically and your receipt is emailed to you.
            </p>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
              <div>
                <label className="input-label">Card Details</label>
                <div id={cardContainerId} className="min-h-[320px] rounded-lg border border-gray-200 p-4 bg-white" />
              </div>

              <p className="text-xs text-text-light">
                Sandbox test card example: Visa `4111 1111 1111 1111`, CVV `111`, future expiry, and a valid postal code for USD.
              </p>

              {error && (
                <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">
                  {error}
                </div>
              )}

            <button
              type="submit"
              disabled={!ready || processing}
              className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {processing ? 'Processing...' : `Pay ${formatPrice(course.price, 'USD')}`}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-serif text-2xl text-primary mb-3">What happens next</h3>
            <ol className="space-y-3 text-sm text-text-light">
              <li>1. Enter your card details in the secure Square form.</li>
              <li>2. We tokenize the card and send the token to the payment API.</li>
              <li>3. On success, your course access is granted automatically.</li>
              <li>4. You will receive a receipt by email.</li>
            </ol>
          </div>

          <div className="bg-primary text-white rounded-lg shadow-sm p-6">
            <p className="text-accent text-sm uppercase tracking-wider mb-2">Included</p>
            <ul className="space-y-2 text-white/80 text-sm">
              <li>{course.totalLessons} on-demand lessons</li>
              <li>Lifetime access to the course area</li>
              <li>Secure checkout via Square</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
