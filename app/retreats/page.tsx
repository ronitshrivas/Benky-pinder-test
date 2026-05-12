'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Check } from 'lucide-react';
import { getRetreats } from '@/lib/firestore';
import { Retreat, GalleryItem } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { GalleryViewer } from '@/components/ui/GalleryViewer';
import { BookingModal } from '@/components/ui/BookingModal';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';

const retreatsMobileHeroImage = '/images/img18.jpeg';
const retreatsDesktopHeroImage = '/images/img17.jpeg';

export default function RetreatsPage() {
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [selectedRetreat, setSelectedRetreat] = useState<Retreat | null>(null);

  const { user, userData, refreshUserData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getRetreats(true);
        if (active) {
          setRetreats(data);
        }
      } catch (e) {
        console.error('Failed to load retreats:', e);
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
  }, []);

  const openGallery = (retreat: Retreat, startIndex: number) => {
    const retreatImages = [
      ...(retreat.images || []),
      ...(retreat.galleryImages || []),
    ].filter((image, index, self) => Boolean(image) && self.indexOf(image) === index);

    if (retreatImages.length === 0) return;

    setGalleryItems(
      retreatImages.map((url, index) => ({
        id: `${retreat.id}-${index}`,
        type: 'image',
        url,
        thumbnailUrl: url,
        thumbnail: url,
        title: retreat.title,
        location: retreat.location,
        category: 'retreat',
        order: index,
        published: true,
        createdAt: retreat.createdAt,
      })),
    );
    setGalleryIndex(startIndex);
  };

  const handleBookClick = (retreat: Retreat) => {
    if (!user) {
      toast.error('Please log in to book your place');
      router.push(`/login?returnTo=/retreats`);
      return;
    }
    setSelectedRetreat(retreat);
  };

  const handleBookingSuccess = async (orderId: string) => {
    await refreshUserData();
    setSelectedRetreat(null);
    toast.success('Booking confirmed!');
    router.push('/dashboard');
  };

  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] min-h-[400px]">
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={retreatsMobileHeroImage} />
          <img
            src={retreatsDesktopHeroImage}
            alt="Retreats"
            className="h-full w-full object-cover object-center"
            loading="eager"
          />
        </picture>
        {/* Dark overlay — ensures text is always readable over the photo */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.52) 100%)' }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <div>
            <p className="section-label text-accent mb-3">Soulful wellness retreats </p>
            <h1 className="font-serif text-4xl md:text-6xl text-white">Escape &amp; Transform</h1>
            <p className="text-white/75 mt-4 max-w-xl mx-auto">
             Intimate retreats designed for women that offer renewal, connection and joy.
            </p>
          </div>
        </div>
      </section>

      {/* Retreats List */}
      <section className="section-padding bg-surface">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
            </div>
          ) : retreats.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm">
              <p className="text-text-light mb-4">No published retreats yet.</p>
              <Link href="/contact" className="btn-primary inline-flex items-center gap-2">
                Register Interest
              </Link>
            </div>
          ) : (
            retreats.map((retreat) => (
              <div key={retreat.id} className="grid md:grid-cols-2 gap-12 items-start mb-20 last:mb-0">
                {/* Image */}
                <div className="relative rounded-lg overflow-hidden bg-primary/5 p-2">
                  {(() => {
                    const retreatImages = [
                      ...(retreat.images || []),
                      ...(retreat.galleryImages || []),
                    ].filter((image, index, self) => Boolean(image) && self.indexOf(image) === index);
                    const imagesToShow = retreatImages.length > 0 ? retreatImages : [retreat.thumbnailUrl || retreat.thumbnail || '/images/retreat.jpg'];

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-[120px] sm:auto-rows-[140px]">
                        {imagesToShow.map((image, index) => (
                          <button
                            key={`${retreat.id}-${image}-${index}`}
                            type="button"
                            onClick={() => openGallery(retreat, index)}
                            className={`relative overflow-hidden rounded-md bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                              index === 0 ? 'col-span-2 row-span-2' : ''
                            }`}
                            aria-label={`Open ${retreat.title} gallery image ${index + 1}`}
                          >
                            <Image
                              src={image}
                              alt={`${retreat.title} image ${index + 1}`}
                              fill
                              sizes={index === 0 ? '(max-width: 767px) 100vw, 50vw' : '(max-width: 767px) 50vw, 16vw'}
                              quality={75}
                              priority={retreats[0]?.id === retreat.id && index === 0}
                              loading={retreats[0]?.id === retreat.id && index === 0 ? 'eager' : 'lazy'}
                              className="object-cover object-center transition-transform duration-500 hover:scale-105"
                            />
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  {typeof retreat.spotsRemaining === 'number' && retreat.spotsRemaining > 0 ? (
                    <div className="absolute top-4 left-4 bg-accent text-primary px-4 py-2 text-sm font-semibold rounded">
                      {retreat.spotsRemaining} spots remaining
                    </div>
                  ) : null}
                </div>

                {/* Details */}
                <div>
                  <p className="section-label">{retreat.subtitle || 'Retreat'}</p>
                  <h2 className="font-serif text-3xl md:text-4xl text-primary mb-4">{retreat.title}</h2>

                  <div className="flex flex-wrap gap-4 mb-6">
                    <span className="flex items-center text-sm text-text-light">
                      <MapPin className="w-4 h-4 text-accent mr-2" /> {retreat.location}
                    </span>
                    <span className="flex items-center text-sm text-text-light">
                      <Calendar className="w-4 h-4 text-accent mr-2" /> {formatDate(retreat.startDate)} — {formatDate(retreat.endDate)}
                    </span>
                  </div>

                  <p className="text-text-light leading-relaxed mb-6">{retreat.description}</p>

                  {/* Inclusions */}
                  <h4 className="font-serif text-lg text-primary mb-3">What&apos;s Included</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
                    {(retreat.inclusions || []).map((item) => (
                      <li key={item} className="flex items-start text-sm text-text-light">
                        <Check className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Price & CTA */}
                  <div className="bg-surface-cream p-6 rounded-lg">
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        {/* <span className="text-text-light text-sm">From</span> */}
                        <div className="text-accent font-serif text-3xl">{formatPrice(retreat.price, retreat.currency || 'AUD')}</div>
                        <span className="text-text-light text-xs">per person, all inclusive</span>
                      </div>
                    </div>
                    {user && userData?.registeredRetreats?.includes(retreat.id) ? (
                      <Link href="/dashboard" className="btn-primary w-full text-center block mb-2 bg-green-700 hover:bg-green-800 border-none">
                        Already Registered
                      </Link>
                    ) : (
                      <button 
                        onClick={() => handleBookClick(retreat)}
                        className="btn-primary w-full text-center block mb-2"
                      >
                        Book Your Place
                      </button>
                    )}

                    <hr className="my-2" />
                     <Link href={`/contact`} className="btn-primary w-full text-center block">
                      Register Interest
                    </Link>
                   
                  </div>
                  
                   
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {galleryItems && galleryIndex !== null && (
        <GalleryViewer
          items={galleryItems}
          initialIndex={galleryIndex}
          onClose={() => {
            setGalleryItems(null);
            setGalleryIndex(null);
          }}
        />
      )}

      {selectedRetreat && (
        <BookingModal
          retreat={selectedRetreat}
          user={user}
          userData={userData}
          onClose={() => setSelectedRetreat(null)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {/* CTA */}
      <section className="bg-surface-cream py-20 text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl text-primary mb-4">Can&apos;t Find the Right Retreat?</h2>
          <p className="text-text-light mb-8">Get in touch and I&apos;ll let you know about upcoming retreats before they&apos;re publicly announced.</p>
          <Link href="/contact" className="btn-primary">Register Your Interest</Link>
        </div>
      </section>
    </>
  );
}
