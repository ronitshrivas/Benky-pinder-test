'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBlogPosts } from '@/lib/firestore';
import { BlogPost } from '@/types';
import { formatDate } from '@/lib/utils';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await getBlogPosts(true);
        if (active) {
          setPosts(data);
        }
      } catch (e) {
        console.error('Failed to load blog posts:', e);
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

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast.error('Please enter your email address.');
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok && data?.error) {
        throw new Error(data.error);
      }

      toast.success(data?.message || 'You are subscribed!');
      setEmail('');
    } catch (error: any) {
      toast.error(error?.message || 'Unable to subscribe right now.');
    } finally {
      setSubscribing(false);
    }
  };

  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <>
      {/* Hero */}
      <section className="bg-surface-cream py-20 text-center px-4">
        <p className="section-label text-accent mb-3">Insights & Inspiration</p>
        <h1 className="font-serif text-4xl md:text-5xl text-primary">The Blog</h1>
        <p className="text-text-light mt-4 max-w-xl mx-auto">
          Thoughts on wellness and living life to the full.
        </p>
      </section>

      {/* Featured Post */}
      {loading ? (
        <section className="section-padding bg-surface">
          <div className="max-w-7xl mx-auto flex justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" />
          </div>
        </section>
      ) : featured ? (
        <section className="section-padding bg-surface">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="relative h-[350px] rounded-lg overflow-hidden">
                <Image
                  src={featured.coverImageUrl || featured.thumbnail || '/images/course1.jpg'}
                  alt={featured.title}
                  fill
                  sizes="(max-width: 767px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute top-4 left-4 bg-accent text-primary px-3 py-1 text-xs font-semibold rounded">
                  Featured
                </div>
              </div>
              <div>
                <span className="text-accent text-xs tracking-wider uppercase">{featured.category}</span>
                <h2 className="font-serif text-2xl md:text-3xl text-primary mt-2 mb-4">{featured.title}</h2>
                <p className="text-text-light leading-relaxed mb-4">{featured.excerpt}</p>
                <div className="flex items-center text-sm text-text-light mb-6">
                  <Calendar className="w-4 h-4 mr-2" /> {formatDate(featured.publishedAt)}
                </div>
                <Link href={`/blog/${featured.slug}`} className="btn-primary">
                  Read Article <ArrowRight className="w-4 h-4 inline ml-2" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="section-padding bg-surface">
          <div className="max-w-7xl mx-auto text-center py-16">
            <p className="text-text-light">No published blog posts yet.</p>
          </div>
        </section>
      )}

      {/* Posts Grid */}
      {!loading && rest.length > 0 && (
        <section className="section-padding bg-surface-cream">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {rest.map((post) => (
                <article key={post.id} className="card group">
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.coverImageUrl || post.thumbnail || '/images/course1.jpg'}
                      alt={post.title}
                      fill
                      sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 text-primary px-3 py-1 text-xs font-semibold rounded">
                      {post.category}
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center text-xs text-text-light mb-3">
                      <Calendar className="w-3 h-3 mr-1" /> {formatDate(post.publishedAt)}
                    </div>
                    <h3 className="font-serif text-lg text-primary mb-2 group-hover:text-accent transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-text-light text-sm leading-relaxed mb-4">{post.excerpt}</p>
                    <Link href={`/blog/${post.slug}`} className="text-accent text-sm font-medium hover:underline">
                      Read More →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="section-padding bg-surface">
        <div className="max-w-xl mx-auto text-center">
          <p className="section-label">Never Miss a Post</p>
          <h2 className="section-title mb-4">Subscribe to Updates</h2>
          <p className="text-text-light mb-8">Get new articles delivered to your inbox along with exclusive yoga tips.</p>
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              placeholder="Your email"
              className="input-field flex-1"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={subscribing}
            />
            <button type="submit" className="btn-primary disabled:opacity-50" disabled={subscribing}>
              {subscribing ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
