import Image from 'next/image';
import Link from 'next/link';
import { InstagramPopupLink } from '@/components/ui/InstagramPopupLink';

export default function Footer() {
  return (
    <footer className="border-b border-accent/20 bg-primary text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="inline-flex mb-4">
              <Image
                src="/images/logo.png"
                alt="Becky Pinder"
                width={230}
                height={89}
                className="h-20 w-auto"
                priority={false}
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed">
              Offering unique retreats and travel experiences with wellness, joy and abundance at their heart.
            </p>
          </div>

          <div>
            <h4 className="text-accent text-xs tracking-[0.2em] uppercase mb-4">Navigate</h4>
            <ul className="space-y-2">
              <li><Link href="/" className="text-white/60 hover:text-accent text-sm transition-colors">Home</Link></li>
              <li><Link href="/retreats" className="text-white/60 hover:text-accent text-sm transition-colors">Retreats</Link></li>
              <li><Link href="/courses" className="text-white/60 hover:text-accent text-sm transition-colors">Courses</Link></li>
              <li><Link href="/becky" className="text-white/60 hover:text-accent text-sm transition-colors">About Becky</Link></li>
              <li><Link href="/blog" className="text-white/60 hover:text-accent text-sm transition-colors">Blog</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-accent text-xs tracking-[0.2em] uppercase mb-4">Programs</h4>
            <ul className="space-y-2">
              <li><Link href="/courses" className="text-white/60 hover:text-accent text-sm transition-colors">Online Courses</Link></li>
              <li><Link href="/retreats" className="text-white/60 hover:text-accent text-sm transition-colors">Unique Retreats</Link></li>
              <li><Link href="/contact" className="text-white/60 hover:text-accent text-sm transition-colors">Private Sessions</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-accent text-xs tracking-[0.2em] uppercase mb-4">Connect</h4>
            <ul className="space-y-2">
              <li><Link href="/contact" className="text-white/60 hover:text-accent text-sm transition-colors">Contact</Link></li>
              <li><InstagramPopupLink placement="top" className="text-white/60 hover:text-accent text-sm transition-colors" /></li>
              <li><a href="https://facebook.com/beckypinderyoga" target="_blank" rel="noopener" className="text-white/60 hover:text-accent text-sm transition-colors">Facebook</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/40 text-xs">
            © {new Date().getFullYear()} Becky Pinder Yoga & Wellness. All rights reserved.
          </p>
          {/* <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="#" className="text-white/40 hover:text-accent text-xs transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-white/40 hover:text-accent text-xs transition-colors">Terms of Service</Link>
          </div> */}
        </div>
      </div>
    </footer>
  );
}
