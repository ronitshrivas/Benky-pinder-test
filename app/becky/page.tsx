'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Leaf, Sun, Award, X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import Image from 'next/image';
import { getGalleryItems } from '@/lib/firestore';
import { GalleryItem } from '@/types';
import { GalleryViewer } from '@/components/ui/GalleryViewer';
import { Skeleton } from '@/components/ui/Skeleton';

const aboutMobileImage = '/images/about.jpeg';
const aboutDesktopImage = '/images/about copy.jpeg';

export default function BeckyPage() {
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadGallery() {
      try {
        const items = await getGalleryItems(true);
        if (active) {
          setGalleryItems(items.slice(0, 8));
        }
      } catch (error) {
        console.error('Failed to load gallery items:', error);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadGallery();

    return () => {
      active = false;
    };
  }, []);

  const isVideoItem = (item: GalleryItem) =>
    item.type === 'video' ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.url || '') ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.thumbnailUrl || '') ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.thumbnail || '');

  const marqueeItems = galleryItems.length > 1 ? [...galleryItems, ...galleryItems, ...galleryItems] : galleryItems;

  return (
    <>
      {/* Hero */}
      <section className="relative h-[60vh] lg:min-h-[450px] overflow-hidden">
        <picture className="absolute inset-0 block h-full w-full">
          <source media="(max-width: 767px)" srcSet={aboutMobileImage} />
          <img
            src={aboutDesktopImage}
            alt="Becky Pinder"
            className="h-full w-full object-cover object-[62%_50%] lg:object-[64%_40%]"
            loading="eager"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-transparent" />
        <div className="absolute inset-0 flex items-center px-4">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-lg">
              {/* <p className="section-label text-accent mb-3">About</p> */}
              <h1 className="font-serif text-4xl md:text-6xl text-white">Meet Becky</h1>
              <p className="text-white/70 mt-4 text-lg">
               
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bio */}
      <section className="section-padding bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none space-y-6 text-text-light leading-relaxed">
            <p>
              As a dedicated practitioner of Yoga for 35 years and a teacher of Yoga for 15 years I have come to experience first-hand the transformative potency of Yoga both in my own life and in the lives of others.
              The unique gift of Yoga is that the benefits trickle down through every layer of our being, physical, mental, emotional and spiritual.

            </p>
            <p>
              Over the decades I have been very fortunate to have practiced with many wonderful Yoga, meditation and movement teachers in extensive trainings both in Australia and internationally. My own approach to teaching is grounded in the simple aspiration to feel great in the body. I have come to understand that there is a strong connection between how we move and hold ourselves. I have come to understand that there is a strong connection between how we move and express in our bodies to the energy we broadcast out to the world.
            </p>
            <p>
My professional life also includes decades of experience as a hair and makeup artist where I worked both in the commercial and event world as well as in some of Sydneys most prestigious salons.
With a client list that includes women from all walks of life from working mums to CEO’s and entrepreneurs to film and television personalities.             </p>
            <p>
              Through both Yoga and my experience in the beauty world I have come to  learn that true radiance is  not something you apply or put on it is something you embody. My intention for the retreat and travel experiences I offer along with my online classes is to share distilled empowering practices in an environment where the qualities of self-acceptance and self-confidence can thrive. 
Whether in some far flung location or virtually. 
            </p>
            <p>
              I flavour everything with the ethos that life is to be lived fully, abundantly and with as much joy as we can squeeze in!
            </p>
            {/* <p className="font-serif text-primary text-xl mt-8">
              I look forward to welcome you on this.
            </p> */}
          </div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="section-padding bg-surface-cream">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label">My Philosophy</p>
            <h2 className="section-title">What Guides My Teaching</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Heart, title: 'Empower', desc: "strength comes from staying connected to your true nature. " },
              { icon: Leaf, title: 'Be receptive', desc: ' quiet the mind and life will whisper through intuition. ' },
              { icon: Sun, title: 'Gratitude', desc: 'commit to making the most of your blessings.' },
              { icon: Award, title: 'Radiate', desc: 'choose now to live fully as your highest expression.' },
            ].map((item) => (
              <div key={item.title} className="text-center p-6">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-serif text-xl text-primary mb-2">{item.title}</h3>
                <p className="text-text-light text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Credentials */}
      {/* <section className="section-padding bg-surface">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="section-label">Credentials & Experience</p>
            <h2 className="section-title mb-6">Qualified & Experienced</h2>
            <ul className="space-y-4">
              {[
                '35+ years personal yoga practice',
                '15+ years teaching experience',
                'Certified Yoga Alliance (RYT-500)',
                "Specialist in women's health & perimenopause yoga",
                'Trained in Restorative Yoga & Yoga Nidra',
                'Breathwork & Pranayama certified',
                'Hosted 12+ international retreats',
                'Over 2,000 students taught worldwide',
              ].map((item) => (
                <li key={item} className="flex items-start">
                  <span className="w-2 h-2 bg-accent rounded-full mt-2 mr-3 flex-shrink-0" />
                  <span className="text-text-light">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative aspect-[3/4] h-[420px] w-full max-w-[480px] overflow-hidden rounded-lg md:h-auto md:justify-self-end">
            <Image
              src="/images/img7.jpeg"
              alt="Becky teaching"
              fill
              sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 480px"
              className="object-cover object-center"
            />
          </div>
        </div>
      </section> */}

      {/* Gallery */}
      <section className="section-padding bg-surface-cream">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-label">Gallery</p>
            {/* <h2 className="section-title">Moments of Practice</h2> */}
          </div>

          {isLoading ? (
            <div className="flex gap-4 overflow-hidden pb-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="flex-shrink-0 rounded-2xl h-[280px] w-[78vw] sm:w-[46vw] lg:w-[32vw] lg:h-[360px]" />
              ))}
            </div>
          ) : galleryItems.length > 0 ? (
            <div className="overflow-x-auto gold-scrollbar pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="gallery-marquee flex w-max gap-4 pr-4">
              {marqueeItems.map((item, i) => (
                <button
                  key={`${item.id}-${i}`}
                  type="button"
                  onClick={() => setSelectedIndex(i % galleryItems.length)}
                  className="group relative flex-shrink-0 overflow-hidden rounded-2xl bg-primary/5 h-[280px] w-[78vw] sm:w-[46vw] lg:w-[32vw] lg:h-[360px] snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {isVideoItem(item) ? (
                    <video
                      src={item.url}
                      className="absolute inset-0 w-full h-full object-cover object-center scale-[1.01] transition-transform duration-700 group-hover:scale-[1.06]"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    <Image
                      src={item.thumbnailUrl || item.thumbnail || item.url || '/images/gallery1.jpg'}
                      alt={item.title || 'Gallery'}
                      fill
                      sizes="(max-width: 767px) 50vw, (max-width: 1023px) 25vw, 20vw"
                      className="object-cover object-center scale-[1.01] transition-transform duration-700 group-hover:scale-[1.06]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent opacity-90" />
                  {/* <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 text-white">
                    <p className="text-sm md:text-base font-serif leading-tight">
                      {item.title || 'Gallery Moment'}
                    </p>
                    {item.location && (
                      <p className="mt-1 text-[11px] md:text-xs uppercase tracking-[0.18em] text-white/70">
                        {item.location}
                      </p>
                    )}
                  </div> */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity duration-300 group-hover:bg-black/10 group-hover:opacity-100">
                    <span className="flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                      {isVideoItem(item) ? <Play className="w-3.5 h-3.5" /> : null}
                      Open
                    </span>
                  </div>
                </button>
              ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-text-light">
              <p>No gallery items have been published yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Gallery Viewer */}
      {selectedIndex !== null && galleryItems.length > 0 && (
        <GalleryViewer
          items={galleryItems}
          initialIndex={selectedIndex}
          onClose={() => setSelectedIndex(null)}
        />
      )}

      {/* CTA */}
      <section className="bg-primary py-20 text-center px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl text-white mb-4">Ready to Begin?</h2>
          <p className="text-white/60 mb-8">
            Whether it&apos;s a retreat, online course, or simply a conversation - I&apos;d love to connect.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/contact" className="btn-primary">Get in Touch</Link>
            <Link href="/courses" className="btn-outline border-white text-white hover:bg-white hover:text-primary">Browse Courses</Link>
          </div>
        </div>
      </section>
    </>
  );
}
