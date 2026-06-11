'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar } from 'lucide-react';
import { getBlogPost } from '@/lib/firestore';
import { BlogPost } from '@/types';
import { formatDate } from '@/lib/utils';

export default function BlogArticlePage() {
  const { slug } = useParams();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!slug) return;
      try {
        const data = await getBlogPost(slug as string);
        if (active) {
          setPost(data);
        }
      } catch (error) {
        console.error('Failed to load blog post:', error);
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
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>;
  }

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-serif text-3xl text-primary mb-3">Article not found</h1>
          <p className="text-text-light mb-6">This blog post may have been removed or is still unpublished.</p>
          <Link href="/blog" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <section className="relative h-[50vh] min-h-[380px] overflow-hidden bg-primary">
        <Image
          src={post.coverImageUrl || post.thumbnail || '/images/course1.jpg'}
          alt={post.title}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-primary/55" />
        <div className="absolute inset-0 flex items-end">
          <div className="max-w-5xl mx-auto w-full px-4 pb-10">
            <Link href="/blog" className="inline-flex items-center gap-2 text-white/75 hover:text-accent text-sm mb-5">
              <ArrowLeft className="w-4 h-4" /> Back to Blog
            </Link>
            <div className="max-w-3xl">
              <span className="text-accent text-xs tracking-wider uppercase">{post.category}</span>
              <h1 className="font-serif text-4xl md:text-5xl text-white mt-2 mb-4">{post.title}</h1>
              <div className="flex items-center text-sm text-white/75">
                <Calendar className="w-4 h-4 mr-2 text-accent" /> {formatDate(post.publishedAt)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-surface">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-text-light leading-relaxed mb-8">{post.excerpt}</p>
          <div className="prose prose-lg max-w-none text-text-light">
            <p className="whitespace-pre-line leading-relaxed">
              {post.content || 'This article content has not been added yet.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
