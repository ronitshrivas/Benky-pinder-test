'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-context';
import { getRetreat } from '@/lib/firestore';
import { Retreat } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { PaymentForm } from '@/components/ui/PaymentForm';

export default function RetreatBookingPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const [retreat, setRetreat] = useState<Retreat | null>(null);
  const [loading, setLoading] = useState(true);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?returnTo=/retreats/${id}/book`);
    }
  }, [user, authLoading, router, id]);

  // Load retreat data
  useEffect(() => {
    let active = true;
    async function loadRetreat() {
      if (!id) return;
      try {
        const data = await getRetreat(id as string);
        if (active) setRetreat(data);
      } catch (err) {
        console.error('Error loading retreat:', err);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRetreat();
    return () => { active = false; };
  }, [id]);

  const retreatAmount = retreat?.depositAmount || retreat?.price || 0;
  const isDepositPayment = Boolean(
    retreat?.depositAmount && retreat.depositAmount < (retreat.price || 0)
  );

  const handleSuccess = async (orderId: string) => {
    await refreshUserData();
    router.push('/dashboard');
  };

  const handleError = (message: string) => {
    console.error('Retreat payment error:', message);
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!retreat) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-primary mb-3">Retreat not found</h1>
          <Link href="/retreats" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Retreats
          </Link>
        </div>
      </div>
    );
  }

  const alreadyBooked = !!user && !!userData?.registeredRetreats?.includes(retreat.id);

  if (alreadyBooked) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="flex items-center justify-center gap-2 text-green-700 bg-green-50 rounded-xl px-6 py-4 mb-6">
            <CheckCircle className="w-5 h-5" />
            You are already registered for this retreat.
          </div>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const mainImage =
    retreat.thumbnailUrl ||
    retreat.thumbnail ||
    retreat.images?.[0] ||
    '/images/retreat.jpg';

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <section className="bg-primary py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href={`/retreats/${retreat.id}`}
            className="inline-flex items-center gap-2 text-white/70 hover:text-accent text-sm mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Retreat
          </Link>
          <h1 className="font-serif text-3xl text-white">Reserve Your Place</h1>
          <p className="text-white/60 mt-1">{retreat.title}</p>
        </div>
      </section>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-8">
        {/* Left — Payment form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
          {/* Order summary */}
          <div className="flex items-center justify-between pb-5 border-b border-gray-100">
            <div>
              <p className="text-text-light text-sm">
                {isDepositPayment ? 'Deposit payment' : 'Retreat payment'}
              </p>
              <h2 className="font-serif text-2xl text-primary">{retreat.title}</h2>
            </div>
            <div className="text-right">
              <p className="text-text-light text-sm">Total due</p>
              <div className="font-serif text-3xl text-accent">
                {formatPrice(retreatAmount, retreat.currency || 'AUD')}
              </div>
            </div>
          </div>

          {/* Shared payment form (Square + PayPal tabs) */}
          {user && (
            <PaymentForm
              amount={retreatAmount}
              currency={retreat.currency || 'AUD'}
              userId={user.uid}
              userEmail={user.email!}
              userName={userData?.displayName || user.displayName || 'Guest'}
              itemId={retreat.id}
              itemTitle={retreat.title}
              itemType="retreat"
              itemThumbnail={mainImage}
              itemVideoUrl=""
              paymentLabel={isDepositPayment ? 'Deposit' : 'Full payment'}
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
              <li>Your retreat registration is confirmed instantly.</li>
              <li>A receipt is emailed to you automatically.</li>
            </ol>
          </div>

          <div className="bg-primary text-white rounded-2xl shadow-sm p-6">
            <p className="text-accent text-sm uppercase tracking-wider mb-3">Booking Notes</p>
            <ul className="space-y-2 text-white/80 text-sm">
              {retreat.startDate && (
                <li>
                  {formatDate(retreat.startDate)}
                  {retreat.endDate ? ` – ${formatDate(retreat.endDate)}` : ''}
                </li>
              )}
              <li>{isDepositPayment ? 'Deposit payment selected' : 'Full retreat payment selected'}</li>
              <li>Secure checkout via Square or PayPal</li>
            </ul>
            {retreat.paymentNote && (
              <p className="mt-4 text-sm text-white/80 whitespace-pre-line">{retreat.paymentNote}</p>
            )}
          </div>

          {/* Retreat image */}
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-sm">
            <Image
              src={mainImage}
              alt={retreat.title}
              fill
              sizes="(max-width:1023px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
