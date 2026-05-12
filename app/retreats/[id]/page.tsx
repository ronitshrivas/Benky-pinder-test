'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, Check, MapPin, Users, Sparkles, BadgeInfo, CreditCard } from 'lucide-react';
import { getRetreat } from '@/lib/firestore';
import { Retreat, GalleryItem } from '@/types';
import { formatDate, formatPrice } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import { GalleryViewer } from '@/components/ui/GalleryViewer';
import { BookingModal } from '@/components/ui/BookingModal';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function RetreatDetailPage() {
  const { id } = useParams();
  const [retreat, setRetreat] = useState<Retreat | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function load() {
      if (!id) return;
      try {
        const data = await getRetreat(id as string);
        if (active) {
          setRetreat(data);
        }
      } catch (error) {
        console.error('Failed to load retreat:', error);
        toast.error('Failed to load retreat details');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <Skeleton className="h-[55vh] min-h-[420px] w-full rounded-none" />
        <section className="section-padding bg-surface">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-8 w-1/3 mb-4" />
                <Skeleton className="h-32 w-full" />
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-8 w-1/4 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-40 md:h-52 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
            <aside className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-10 w-3/4 mb-6" />
                <Skeleton className="h-24 w-full mb-6" />
                <Skeleton className="h-12 w-full" />
              </div>
            </aside>
          </div>
        </section>
      </div>
    );
  }

  if (!retreat) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-primary mb-3">Retreat not found</h1>
          <p className="text-text-light mb-6">This retreat is unavailable or has not been published yet.</p>
          <Link href="/retreats" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Retreats
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages = (retreat.images?.length ? retreat.images : retreat.galleryImages || []).filter(Boolean);
  const mainImage = retreat.thumbnailUrl || retreat.thumbnail || galleryImages[0] || '/images/retreat.jpg';
  const showSpotsRemaining = typeof retreat.spotsRemaining === 'number' && retreat.spotsRemaining > 0;

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative h-[55vh] min-h-[420px] overflow-hidden">
        <Image src={mainImage} alt={retreat.title} fill sizes="100vw" className="object-cover object-center" priority quality={80} />
        <div className="absolute inset-0 bg-primary/50" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-7xl mx-auto w-full px-4 pb-10">
            <Link href="/retreats" className="inline-flex items-center gap-2 text-white/75 hover:text-accent text-sm mb-5">
              <ArrowLeft className="w-4 h-4" /> Back to Retreats
            </Link>
            <div className="max-w-3xl">
              <p className="section-label text-accent mb-3">{retreat.subtitle || 'Retreat'}</p>
              <h1 className="font-serif text-4xl md:text-6xl text-white mb-4">{retreat.title}</h1>
              <div className="flex flex-wrap gap-4 text-white/80 text-sm">
                <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4 text-accent" /> {retreat.location}</span>
                <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-accent" /> {formatDate(retreat.startDate)} - {formatDate(retreat.endDate)}</span>
                {showSpotsRemaining ? (
                  <span className="inline-flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> {retreat.spotsRemaining} spots left</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="font-serif text-2xl text-primary mb-4">About this retreat</h2>
              <p className="text-text-light leading-relaxed">{retreat.longDescription || retreat.description}</p>
            </div>

            {retreat.earlyBirdOffer || retreat.paymentNote || retreat.depositNote ? (
              <div className="bg-surface-cream rounded-lg p-6">
                <h2 className="font-serif text-2xl text-primary mb-4">Investment & Booking</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {retreat.earlyBirdOffer ? (
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                        <BadgeInfo className="w-4 h-4 text-accent" />
                        Early Bird Offer
                      </div>
                      <p className="text-sm text-text-light whitespace-pre-line">{retreat.earlyBirdOffer}</p>
                    </div>
                  ) : null}
                  {retreat.depositNote || retreat.depositAmount ? (
                    <div className="rounded-lg bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
                        <CreditCard className="w-4 h-4 text-accent" />
                        Deposit
                      </div>
                      {retreat.depositAmount ? (
                        <p className="text-sm text-text-light mb-2">
                          Deposit amount: <span className="font-semibold text-primary">{formatPrice(retreat.depositAmount, retreat.currency || 'AUD')}</span>
                        </p>
                      ) : null}
                      <p className="text-sm text-text-light whitespace-pre-line">{retreat.depositNote}</p>
                      <div className="mt-3 text-xs text-text-light space-y-1">
                        {retreat.depositDueDate ? <p>Deposit due by {formatDate(retreat.depositDueDate)}</p> : null}
                        {retreat.balanceDueDate ? <p>Remaining balance due by {formatDate(retreat.balanceDueDate)}</p> : null}
                      </div>
                    </div>
                  ) : null}
                </div>
                {retreat.paymentNote ? <p className="text-sm text-text-light mt-4 whitespace-pre-line">{retreat.paymentNote}</p> : null}
              </div>
            ) : null}

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="font-serif text-2xl text-primary mb-4">Gallery</h2>
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {galleryImages.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      onClick={() => setGalleryIndex(index)}
                      className="relative h-40 md:h-52 rounded-lg overflow-hidden group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Image
                        src={image}
                        alt={`${retreat.title} gallery ${index + 1}`}
                        fill
                        sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-text-light">More retreat images will appear here once uploaded.</p>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="font-serif text-2xl text-primary mb-4">What&apos;s included</h2>
              <ul className="grid md:grid-cols-2 gap-3">
                {(retreat.inclusions || []).map((item) => (
                  <li key={item} className="flex items-start gap-2 text-text-light text-sm">
                    <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {retreat.exclusions?.length ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-serif text-2xl text-primary mb-4">Not Included</h2>
                <ul className="grid md:grid-cols-2 gap-3">
                  {retreat.exclusions.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-text-light text-sm">
                      <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {retreat.highlights?.length ? (
              <div className="bg-surface-cream rounded-lg p-6">
                <h2 className="font-serif text-2xl text-primary mb-4">Highlights</h2>
                <div className="grid md:grid-cols-2 gap-3">
                  {retreat.highlights.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-text-light text-sm">
                      <Sparkles className="w-4 h-4 text-accent" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {retreat.experiences?.length ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-serif text-2xl text-primary mb-4">Curated Experiences</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {retreat.experiences.map((experience) => (
                    <div key={experience.title} className="rounded-lg border border-surface-dark/60 p-4">
                      <div className="font-semibold text-primary mb-2">{experience.title}</div>
                      <p className="text-sm leading-relaxed text-text-light">{experience.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <p className="text-text-light text-sm">Retreat price</p>
              <div className="font-serif text-4xl text-accent mt-2 mb-2">{formatPrice(retreat.price, retreat.currency || 'AUD')}</div>
              <p className="text-sm text-text-light mb-6">Per person, all inclusive</p>

              <div className="rounded-lg bg-surface-cream p-4 mb-6 space-y-3">
                <p className="text-sm text-primary font-semibold mb-1">Secure your place</p>
                <p className="text-text-light text-sm">
                  {retreat.depositAmount
                    ? `Deposit options are available from ${formatPrice(retreat.depositAmount, retreat.currency || 'AUD')}.`
                    : 'Your retreat price is paid in full to reserve your place.'}
                </p>
                {retreat.balanceDueDate ? (
                  <p className="text-text-light text-sm">Balance due by {formatDate(retreat.balanceDueDate)}</p>
                ) : null}
                {retreat.depositDueDate ? (
                  <p className="text-text-light text-sm">Deposit due by {formatDate(retreat.depositDueDate)}</p>
                ) : null}
              </div>

              {user && userData?.registeredRetreats?.includes(retreat.id) ? (
                <Link href="/dashboard" className="btn-primary w-full text-center block mb-2 bg-green-700 hover:bg-green-800 border-none">
                  Already Registered
                </Link>
              ) : (
                <button 
                  onClick={() => {
                    if (!user) {
                      toast.error('Please log in to book your place');
                      router.push(`/login?returnTo=/retreats/${retreat.id}`);
                      return;
                    }
                    setShowBookingModal(true);
                  }}
                  className="btn-primary w-full text-center inline-flex items-center justify-center gap-2"
                >
                  Book Your Place
                </button>
              )}
              <p className="text-xs text-text-light text-center mt-3">Secure checkout via Square or PayPal</p>
            </div>
          </aside>
        </div>
      </section>

      {galleryIndex !== null && galleryImages.length > 0 && (
        <GalleryViewer
          items={galleryImages.map((url, i) => ({ id: String(i), url, type: 'image' as const, title: retreat.title, location: retreat.location })) as GalleryItem[]}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      )}

      {showBookingModal && retreat && (
        <BookingModal
          retreat={retreat}
          user={user}
          userData={userData}
          onClose={() => setShowBookingModal(false)}
          onSuccess={async () => {
            await refreshUserData();
            setShowBookingModal(false);
            toast.success('Booking confirmed!');
            router.push('/dashboard');
          }}
          hideDetailLink={true}
        />
      )}
    </div>
  );
}
