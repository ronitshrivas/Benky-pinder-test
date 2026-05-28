'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import VideoPlayer from '@/components/ui/VideoPlayer';
import { Leaf, Mail, Loader2, Lock } from 'lucide-react';

interface VideoData {
  videoUrl: string;
  title: string;
  description: string;
}

type Status = 'loading' | 'valid' | 'invalid';

export default function InnerCircleWatchPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<Status>('loading');
  const [video, setVideo] = useState<VideoData | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('invalid');
      setReason('No access token found in this link.');
      return;
    }

    fetch(`/api/inner-circle/validate?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid) {
          setVideo({ videoUrl: data.videoUrl, title: data.title, description: data.description });
          setStatus('valid');
        } else {
          setReason(data.reason || 'This link is not valid.');
          setStatus('invalid');
        }
      })
      .catch(() => {
        setReason('Something went wrong. Please try again.');
        setStatus('invalid');
      });
  }, [token]);

  /* ── Loading ── */
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-accent animate-spin mx-auto mb-4" />
          <p className="text-white/60 text-sm">Preparing your practice…</p>
        </div>
      </div>
    );
  }

  /* ── Invalid / Expired ── */
  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-[#F8F6F0] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Logo area */}
          {/* <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary/40" />
            </div>
            <p
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
              className="text-2xl text-primary font-semibold"
            >
              Becky Pinder Yoga
            </p>
          </div> */}

          <div className="bg-white rounded-2xl shadow-sm border border-surface-dark p-10">
            <h1
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
              className="text-3xl text-primary font-bold mb-3"
            >
              Link Not Found
            </h1>
            <p className="text-text-light text-sm leading-relaxed mb-8">
              {reason}
            </p>

            {/* Re-subscribe form */}
            <div className="border-t border-gray-100 pt-8">
              <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-4">
                Join the Inner Circle
              </p>
              <p className="text-text-light text-sm mb-6">
                Enter your email below to receive a fresh access link to your complimentary video.
              </p>
              <ReSubscribeForm />
            </div>
          </div>

          <Link href="/" className="mt-6 inline-block text-xs text-text-light hover:text-accent transition-colors">
            ← Back to Becky Pinder Yoga
          </Link>
        </div>
      </div>
    );
  }

  /* ── Valid — show video ── */
  return (
    <div className="min-h-screen bg-[#0D1B2A]">
      {/* Top bar */}
      {/* <div className="bg-primary px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
          <Leaf className="w-4 h-4 text-accent" />
          <span
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
            className="text-lg font-semibold"
          >
            Becky Pinder Yoga
          </span>
        </Link>
        <span className="text-[10px] uppercase tracking-widest text-accent font-bold">
          Inner Circle
        </span>
      </div> */}

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Title */}
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-semibold mb-3">
            Your Complimentary Practice
          </p>
          <h1
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
            className="text-3xl md:text-5xl text-white font-bold leading-tight"
          >
            {video!.title}
          </h1>
          {video!.description && (
            <p className="mt-4 text-white/60 max-w-xl mx-auto text-sm leading-relaxed">
              {video!.description}
            </p>
          )}
        </div>

        {/* Video player */}
        <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-video bg-black">
          <VideoPlayer
            src={video!.videoUrl}
            lessonId="inner-circle-complimentary"
            userId={undefined}
          />
        </div>

        {/* Footer note */}
        {/* <div className="mt-10 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-2.5">
            <Mail className="w-4 h-4 text-accent" />
            <p className="text-white/60 text-xs">
              This link was sent to you personally — enjoy your practice 🌿
            </p>
          </div> */}

          <div className="mt-8">
            <Link
              href="/courses"
              className="inline-flex items-center gap-2 bg-accent text-primary font-bold text-xs uppercase tracking-widest px-8 py-3 rounded hover:bg-accent/90 transition-colors"
            >
              Explore Full Programs →
            </Link>
          </div>
        </div>
      </div>
  
  );
}

/* ── Small re-subscribe form for the invalid state ── */
function ReSubscribeForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'already'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setState('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.message === 'Already subscribed') {
        setState('already');
      } else {
        setState('done');
      }
    } catch {
      setState('idle');
    }
  };

  if (state === 'done') {
    return (
      <p className="text-sm text-green-600 font-medium">
        ✓ Check your inbox — your new link is on its way!
      </p>
    );
  }

  if (state === 'already') {
    return (
      <p className="text-sm text-accent font-medium">
        You're already subscribed. Please check your original email for your access link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex overflow-hidden rounded shadow-sm">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 px-4 py-3 text-sm outline-none border border-gray-200 rounded-l"
      />
      <button
        type="submit"
        disabled={state === 'loading'}
        className="bg-primary text-white px-5 py-3 text-xs font-bold uppercase tracking-widest hover:bg-primary-dark transition-colors disabled:opacity-60"
      >
        {state === 'loading' ? '…' : 'Send'}
      </button>
    </form>
  );
}
