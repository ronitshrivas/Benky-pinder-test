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
            <p className="section-label text-accent mb-3 text-xl md:text-2xl">Soulful wellness retreats </p>
            <h1 className="font-serif text-4xl md:text-6xl text-white">Escape &amp; Transform</h1>
            <p className="text-white/75 mt-4 max-w-xl mx-auto text-xl md:text-2xl">
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
              <div key={retreat.id} className="mb-32 last:mb-0">
                  {(() => {
                    const retreatImages = [
                      ...(retreat.images || []),
                      ...(retreat.galleryImages || []),
                    ].filter((image, index, self) => Boolean(image) && self.indexOf(image) === index);
                    const imagesToShow = retreatImages.length > 0 ? retreatImages : [retreat.thumbnailUrl || retreat.thumbnail || '/images/retreat.jpg'];
                    
                    // We'll put the first 3 images in the left column next to the text
                    const sideImages = imagesToShow.slice(0, 3);
                    const bottomImages = imagesToShow.slice(3);

                    return (
                      <>
                        <div className="grid md:grid-cols-2 gap-12 items-start mb-8">
                          {/* Left Column: Image Stack */}
                          <div className="flex flex-col gap-4">
                            {sideImages.map((image, index) => (
                              <button
                                key={`${retreat.id}-side-${image}-${index}`}
                                type="button"
                                onClick={() => openGallery(retreat, index)}
                                className="relative overflow-hidden rounded-lg bg-primary/5 aspect-video w-full group shadow-sm"
                              >
                                <Image
                                  src={image}
                                  alt={`${retreat.title} image ${index + 1}`}
                                  fill
                                  sizes="(max-width: 767px) 100vw, 50vw"
                                  quality={80}
                                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                              </button>
                            ))}
                          </div>

                          {/* Right Column: Details */}
                          <div className="bg-white/50 backdrop-blur-sm p-8 rounded-2xl border border-primary/5 shadow-sm">
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

                            <p className="text-text-light leading-relaxed mb-6 whitespace-pre-line">{retreat.description}</p>

                            <h4 className="font-serif text-lg text-primary mb-3">What&apos;s Included</h4>
                            <ul className="space-y-2 mb-8">
                              {(retreat.inclusions || []).map((item) => (
                                <li key={item} className="flex items-start text-sm text-text-light">
                                  <Check className="w-4 h-4 text-accent mr-2 mt-0.5 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>

                            <div className="bg-surface-cream p-6 rounded-xl">
                              <div className="flex items-end justify-between mb-4">
                                <div className="text-accent font-serif text-3xl">{formatPrice(retreat.price, retreat.currency || 'AUD')}</div>
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
                              <hr className="my-3 border-accent/20" />
                              <Link href={`/contact`} className="btn-outline w-full text-center block text-xs">
                                Register Interest
                              </Link>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Section: Remaining images in 2-column grid */}
                        {bottomImages.length > 0 && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {bottomImages.map((image, index) => (
                              <button
                                key={`${retreat.id}-bottom-${image}-${index}`}
                                type="button"
                                onClick={() => openGallery(retreat, index + 3)}
                                className="relative overflow-hidden rounded-lg bg-primary/5 aspect-video w-full group shadow-sm"
                              >
                                <Image
                                  src={image}
                                  alt={`${retreat.title} image ${index + 4}`}
                                  fill
                                  sizes="(max-width: 767px) 100vw, 50vw"
                                  quality={80}
                                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
