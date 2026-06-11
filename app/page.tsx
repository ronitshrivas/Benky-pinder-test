'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Leaf, Heart, Sun, Sparkles, Star, Check } from 'lucide-react';
import { getCourses, getRetreats, getTestimonials } from '@/lib/firestore';
import { formatDate, formatPrice } from '@/lib/utils';
import { Course, Retreat, Testimonial } from '@/types';
import { Skeleton } from '@/components/ui/Skeleton';

const heroMobileImage = '/images/mobile1.png';
const heroDesktopImage = '/images/becky.png';
const retreatsMobileHeroImage = '/images/img12.jpeg';
const retreatsDesktopHeroImage = '/images/img12.jpeg';


const pillars = [
  { icon: Leaf, title: 'Mindful Movement', desc: 'Honour your body at every stage' },
  { icon: Heart, title: 'Inner Balance', desc: 'Challenge meets nurture' },
  { icon: Sun, title: 'Joyful Living', desc: 'Celebrate life fully' },
  { icon: Sparkles, title: 'Feminine Wisdom', desc: 'Embrace your power' },
];


function InnerCircleForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'already' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.message === 'Already subscribed') {
        setStatus('already');
      } else if (data.success) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="mx-auto max-w-md bg-white/10 border border-white/20 rounded-lg px-8 py-6 text-center">
        <p className="text-accent text-lg font-serif mb-1">🌿 Check your inbox!</p>
        <p className="text-white/80 text-sm">
          Your complimentary morning practice is on its way. Watch for an email from Becky.
        </p>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="mx-auto max-w-md bg-white/10 border border-white/20 rounded-lg px-8 py-6 text-center">
        <p className="text-accent font-semibold mb-1">You're already in the Inner Circle 🌿</p>
        <p className="text-white/70 text-sm">
          Check your original welcome email for your personal video link.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-md overflow-hidden rounded shadow-2xl"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        className="flex-1 px-6 py-4 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-primary-dark px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-black disabled:opacity-60"
      >
        {status === 'loading' ? '…' : 'Subscribe'}
      </button>
    </form>
  );
}



export default function HomePage() {
  const [featuredRetreat, setFeaturedRetreat] = useState<Retreat | null>(null);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [dynamicTestimonials, setDynamicTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadHomepageContent() {
      try {
        const [retreats, courses, dbTestimonials] = await Promise.all([
          getRetreats(true),
          getCourses(true),
          getTestimonials(true).catch(() => [] as Testimonial[])
        ]);
        if (cancelled) return;

        const nextRetreat = retreats.find((retreat) => retreat.featured) || retreats[0] || null;
        const nextCourses = courses.filter((course) => course.featured).slice(0, 3);

        setFeaturedRetreat(nextRetreat);
        setFeaturedCourses(nextCourses.length > 0 ? nextCourses : courses.slice(0, 3));
        setDynamicTestimonials(dbTestimonials);
      } catch (error) {
        console.error('Failed to load homepage content:', error);
        if (!cancelled) {
          setFeaturedRetreat(null);
          setFeaturedCourses([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadHomepageContent();

    return () => {
      cancelled = true;
    };
  }, []);

  const retreatDates = featuredRetreat ? `${formatDate(featuredRetreat.startDate)} - ${formatDate(featuredRetreat.endDate)}` : '';

  return (
    <>
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-black min-h-[80svh] md:min-h-[90svh]">
        <picture className="absolute inset-0 h-full w-full">
          <source media="(max-width: 770px)" srcSet={heroMobileImage} />
          <img
            src={heroDesktopImage}
            alt="Becky Pinder Yoga"
            className="hero-main-img absolute inset-0 h-full w-full"
          />
        </picture>

        {/* Desktop overlay */}
        <div
          className="absolute inset-0 z-[1] hidden md:block"
          style={{
            background: `
        linear-gradient(
          90deg,
          rgba(248,246,240,0.82) 0%,
          rgba(248,246,240,0.58) 32%,
          rgba(248,246,240,0.12) 58%,
          rgba(0,0,0,0.06) 100%
        )
      `,
          }}
        />

        {/* Top vignette */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background: `linear-gradient(to bottom, rgba(0,0,0,0.30) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0.10) 100%)`,
          }}
        />

        {/* Content */}
        <div
          className="relative z-10 flex flex-col justify-start md:justify-center hero-content-wrap"
          style={{ minHeight: 'var(--hero-height, 90svh)', paddingTop: 'var(--hero-pt, 10vh)', paddingBottom: '4vh' }}
        >
          <div className="px-6 sm:px-10 md:px-16 lg:px-24 xl:px-32">
            <div className="max-w-[240px] xs:max-w-[320px] md:max-w-[760px] text-left">

              {/* Line 1: script heading */}
              <p
                className="hidden md:block"
                style={{
                  fontFamily: '"Qwigley", cursive',
                  fontWeight: 400,
                  fontSize: 'clamp(24px, 7vw, 60px)',
                  lineHeight: 1.15,
                  color: '#1B2A4A',
                  marginBottom: '2px',
                  textShadow: '0 1px 8px rgba(255,255,255,0.9), 0 0px 2px rgba(255,255,255,0.7)',
                }}
              >
                Unique retreats
                <sup style={{ fontSize: '0.35em', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif', verticalAlign: 'super', marginLeft: '2px' }}></sup>
              </p>

              {/* Line 2: "Travel Experiences" — Cormorant bold gold, slightly smaller */}
              <h1
                className="hidden md:block"
                style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 800,
                  fontSize: 'clamp(1.7rem, 6vw, 4rem)',
                  lineHeight: 1.0,
                  letterSpacing: '-0.04em',
                  color: '#C9A84C',
                  marginTop: '4px',
                }}
              >
                Travel Experiences
              </h1>

              {/* Gold divider */}
              <div
                className="hidden md:block"
                style={{
                  marginTop: '18px',
                  height: '2px',
                  width: '52px',
                  background: '#C9A84C',
                }}
              />
               <p
                className="hidden md:block"
                style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 500,
                  fontSize: 'clamp(18px, 3vw, 30px)',
                  lineHeight: 1.10,
                  color: '#1B2A4A',
                  marginTop: '14px',
                }}
              >
                Online Yoga Classes
                <sup style={{ fontSize: '0.38em', fontFamily: 'Montserrat, sans-serif', verticalAlign: 'super', marginLeft: '1px' }}></sup>
              </p>

              {/* Line 3: "Trust Your Design™" — Cormorant medium dark */}
              <p
                className="hidden md:block"
                style={{
                  fontFamily: '"Cormorant Garamond", serif',
                  fontWeight: 500,
                  fontSize: 'clamp(18px, 3vw, 30px)',
                  lineHeight: 1.10,
                  color: '#1B2A4A',
                  marginTop: '14px',
                }}
              >
                that nurture body mind soul.
                <sup style={{ fontSize: '0.38em', fontFamily: 'Montserrat, sans-serif', verticalAlign: 'super', marginLeft: '1px' }}></sup>
              </p>

              {/* CTA Button — outlined, "EXPLORE NOW" and "ONLINE CLASSES" */}
              <div className="hero-explore-cta mt-8 md:mt-[20px] flex flex-col md:flex-row gap-3 items-start">
                <a
                  href="/retreats"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '38px',
                    width: '150px',
                    padding: '0 12px',
                    border: '1px solid #C9A84C',
                    color: 'black',
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: 500,
                    fontSize: '9px',
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',

                    backdropFilter: 'blur(3px)',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#1B2A4A';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#1B2A4A';
                  }}
                >
                  EXPLORE NOW
                </a>

                <a
                  href="/courses"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '38px',
                    width: '150px',
                    padding: '0 12px',
                    border: '1px solid #C9A84C',
                    color: 'black',
                    fontFamily: '"Montserrat", sans-serif',
                    fontWeight: 500,
                    fontSize: '9px',
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',

                    backdropFilter: 'blur(3px)',
                    transition: 'all 0.3s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = '#1B2A4A';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.12)';
                    (e.currentTarget as HTMLAnchorElement).style.color = '#1B2A4A';
                  }}
                >
                  ONLINE CLASSES
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 2. Quote Section */}
      <section className="bg-primary-dark py-24 text-center">
        <div className="container mx-auto px-6">
          <blockquote className="mx-auto mb-6 max-w-3xl font-serif text-3xl italic leading-tight text-white md:text-5xl">
            "Radiance is not something you put on, it is something you embody."
          </blockquote>
          {/* <cite className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            — Becky Pinder
          </cite> */}
        </div>
      </section>

      {/* 3. Upcoming Retreat */}

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
            <p className="section-label text-accent text-2xl mb:text-2xl mb-3">Unique retreats</p>
            <h1 className="font-serif text-4xl md:text-6xl text-white">Escape &amp; Transform</h1>
            <p className="text-white/75 mt-4 max-w-xl mx-auto font-extrabold">
              Soulful retreats and unique travel experiences for women.
            </p>
          </div>
        </div>
      </section>
      <section className="bg-surface-cream py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="section-label text-2xl md:text-3xl">Upcoming Retreat</span>
            <div className="mx-auto mb-6 h-0.5 w-12 bg-accent" />
            <h2 className="section-title mb-3 text-primary">
              {/* {featuredRetreat?.location || 'South West France'} */}‘Joie de Vivre’
            </h2>
            <h3 className="font-serif text-3xl text-primary/90 mb-4">
              {/* {featuredRetreat?.title || 'Joie de Vivre'} */}South West France
            </h3>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              {/* {retreatDates || '23-30 September 2026'} */}23 September-30 September 2026
            </p>
            <div className="space-y-4 text-text-light leading-relaxed">
              <p>
                {/* {featuredRetreat?.longDescription ||
                  "This September join me for some 'Joie de Vivre' - a Yoga and Wellness escape in South West France. Settle into the magic of early autumn at La Brousteleyre, a charming rural property in the region around St Emilion surrounded by vineyards and pristine parkland."} */}
                This September join me for a truly special week in the heart of South West France.  A retreat designed to nourish your body, uplift your spirit and fill you with a sense of pure Joie De Vivre!

                Days unfold with morning yoga, meditation, and countryside walks. Joyful experiences await from the vineyards and Chateau of Saint-Émilion, the golden light and medieval villages of the Dordogne, the coastal charm of Cap Ferret to the elegant architecture and fresh seafood of Bordeaux-the City of Wine-this sensory retreat is woven around celebrating life! Evenings bring sunset apéritifs and delicious French fare at the farmhouse table, shared with a small group of women. I hope you can join me for a soul enriching feast for the senses.
              </p>
              {/* <p>
                {featuredRetreat?.paymentNote ||
                  'Days unfold with morning yoga, meditation, countryside walks, sunset apéritifs, delicious French fare, and a small intimate group of women gathered around the farmhouse table.'}
              </p> */}
            </div>

            {/* {featuredRetreat?.inclusions && featuredRetreat.inclusions.length > 0 && (
              <div className="mt-10 text-left max-w-lg mx-auto">
                <h4 className="font-serif text-xl text-primary mb-4 text-center">What's Included</h4>
                <ul className="grid grid-cols-1 gap-3">
                  {featuredRetreat.inclusions.map((item) => (
                    <li key={item} className="flex items-start text-sm text-text-light">
                      <Check className="w-4 h-4 text-accent mr-3 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )} */}
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link href={featuredRetreat ? `/retreats/${featuredRetreat.id}` : '/retreats'} className="btn-navy inline-flex items-center gap-2">
                FIND OUT MORE
              </Link>
              <Link href="/retreats" className="btn-outline">
                View Retreats
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/*  
 //retreats page contener */}





      {/* 4. About Becky - Split Layout */}
      <section className="overflow-hidden">
        <div className="grid md:grid-cols-2">
          <div className="relative h-[500px] md:h-auto">
            <Image
              src="/images/img7.jpeg"
              alt="Becky Pinder"
              fill
              sizes="(max-width: 1023px) 100vw, 50vw"
              className="object-cover transition-transform duration-700 hover:scale-105"
            />
          </div>
          <div className="flex flex-col justify-center bg-primary-pale p-12 lg:p-24">
            <span className="section-label">About Becky</span>
            <div className="mb-6 h-0.5 w-12 bg-accent" />
            {/* <h2 className="section-title mb-6 text-primary">35 Years of Yoga. A Life Lived on the Mat.</h2> */}
            <div className="space-y-4 text-text-light">
              <p>
                My intention for the retreat and travel experiences I offer along with my online classes is to share distilled empowering practices in an environment where the qualities of inner peace and self confidence can thrive.
              </p>
              <p>
                My approach to teaching is grounded in the simple aspiration to feel great in the body,peaceful in mind and joyous in spirit.
              </p>
            </div>
            <div className="mt-8">
              <Link href="/becky" className="btn-navy">
                Read My Story
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Online Programs (Courses) */}
      <section className="bg-surface-cream py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <span className="section-label">Online Programs</span>
            <div className="mx-auto mb-6 h-0.5 w-12 bg-accent" />
            <h2 className="section-title text-primary">Choose Your Practice</h2>
          </div>

          {isLoading ? (
            <div className="grid gap-8 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card h-[400px]">
                  <Skeleton className="h-full w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-3">
              {featuredCourses.map((course) => (
                <div key={course.id} className="card group border border-surface-dark bg-white transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                  <div className="relative h-64 overflow-hidden">
                    <Image
                      src={course.thumbnailUrl || course.thumbnail || '/images/yoga5.jpg'}
                      alt={course.title}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-8">
                    <span className="mb-3 inline-block bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white">
                      {course.category || 'All Levels'}
                    </span>
                    <h3 className="mb-3 font-serif text-2xl text-primary">{course.title}</h3>
                    <p className="mb-6 text-sm leading-relaxed text-text-light">
                      {course.description?.substring(0, 100)}...
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-serif text-xl text-accent">
                        {formatPrice(course.price, course.currency || 'AUD')}
                      </span>
                      <Link href={`/courses`} className="text-xs font-bold uppercase tracking-widest text-primary hover:text-accent">
                        View Course
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-16 text-center">
            <Link href="/courses" className="btn-outline">
              View All Programs
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Stats Section */}
      {/* <section className="bg-primary py-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { num: '35+', label: 'Years of Practice' },
              { num: '500+', label: 'Students Worldwide' },
              { num: '15+', label: 'Years Teaching' },
              { num: '12', label: 'Retreats Hosted' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="mb-2 font-serif text-5xl text-white md:text-6xl">{stat.num}</div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* 7. Student Stories (Testimonials) */}
      <section className="bg-primary-pale py-24">
        <div className="container mx-auto px-6">
          <div className="mb-16 text-center">
            <span className="section-label">Student Stories</span>
            <div className="mx-auto mb-6 h-0.5 w-12 bg-accent" />
            <h2 className="section-title text-primary">What Students Say</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {dynamicTestimonials.map((t, i) => (
              <div key={i} className="card border border-surface-dark bg-white p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:p-7">
                <div className="mb-3 flex gap-1">
                  {[...Array(t.rating || 5)].map((_, star) => (
                    <Star key={star} className="h-3 w-3 fill-accent text-accent" />
                  ))}
                </div>
                <blockquote className="mb-6 font-sans text-sm italic leading-relaxed text-text-light">
                  "{t.text}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-bold text-white">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">{t.name}</div>
                    <div className="text-xs text-text-light">{t.meta || 'Student'}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Gallery Section */}
      <section className="grid grid-cols-2 md:grid-cols-4 h-[300px]">
        {['img1.jpeg', 'img5.jpeg', 'img6.jpeg', 'img4.jpeg'].map((img, i) => (
          <div key={i} className="group relative overflow-hidden">
            <Image
              src={`/images/${img}`}
              alt="Becky Pinder Yoga"
              fill
              sizes="(max-width: 767px) 50vw, (max-width: 1023px) 33vw, 25vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>
        ))}
      </section>

      {/* 9. Newsletter Section */}
      <section className="bg-primary py-24 text-center">
        <div className="container mx-auto max-w-2xl px-6">
          <span className="section-label !text-accent-light">Stay Connected</span>
          <h2 className="section-title mb-4 text-white">Join Becky's Inner Circle</h2>
          <p className="mb-10 text-white/80">
            Recieve a complimentary 10 minute radiance boost  morning practice.<br />
            Early access to retreats
            Delivered to your inbox
          </p>

          <InnerCircleForm />
        </div>
      </section>


      {/* 9. Final CTA Banner */}
      <section className="relative py-32 text-center">
        <Image
          src="/images/img4.jpeg"
          alt="Begin Today"
          fill
          className="object-cover object-[35%] md:object-center"
        />
        <div className="absolute inset-0 bg-primary-dark/30" />
        <div className="relative z-10 container mx-auto px-6">
          <span className="section-label !text-accent-light">Begin Today</span>
          <h2 className="section-title mb-6 text-white">I look forward to welcoming you.</h2>
          <p className="mx-auto mb-10 max-w-xl text-white/90">
            Join a retreat, book a class or simply say hello
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/courses" className="btn-accent">
              Explore Programs
            </Link>
            <Link href="/contact" className="btn-white">
              Book a Discovery Call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
