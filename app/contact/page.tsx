'use client';

import { useState } from 'react';
import { Mail, MapPin, Instagram, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { InstagramPopupLink } from '@/components/ui/InstagramPopupLink';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Message sent! I\'ll be in touch soon.');
        setForm({ name: '', email: '', phone: '', subject: '', message: '' });
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    } catch (e) {
      toast.error('Network error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      {/* Hero */}
      <section className="bg-surface-cream py-20 text-center px-4">
        <p className="section-label text-accent mb-3">Get in Touch</p>
        <h1 className="font-serif text-4xl md:text-5xl text-primary">Contact</h1>
        <p className="text-text-light mt-4 max-w-xl mx-auto">
          Whether you have a question about a retreat, course, or just want to say hello — I&apos;d love to hear from you.
        </p>
      </section>

      {/* Contact Form + Info */}
      <section className="section-padding bg-surface">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-12">
          {/* Info */}
          <div className="md:col-span-1">
            <h2 className="font-serif text-2xl text-primary mb-6">Let&apos;s Connect</h2>
            <div className="space-y-6">
              <div className="flex items-start">
                <Mail className="w-5 h-5 text-accent mt-1 mr-3" />
                <div>
                  <p className="font-medium text-sm">Email</p>
                  <a href="mailto:hello@beckypinderyoga.com" className="text-text-light text-sm hover:text-accent">
                    hello@beckypinderyoga.com
                  </a>
                </div>
              </div>
              <div className="flex items-start">
                <MapPin className="w-5 h-5 text-accent mt-1 mr-3" />
                <div>
                  <p className="font-medium text-sm">Based In</p>
                  <p className="text-text-light text-sm">Sydney, Australia</p>
                </div>
              </div>
              <div className="flex items-start">
                <Instagram className="w-5 h-5 text-accent mt-1 mr-3" />
                <div>
                  <p className="font-medium text-sm">Instagram</p>
                  <InstagramPopupLink placement="bottom" className="text-text-light text-sm hover:text-accent text-left" />
                </div>
              </div>
            </div>

            <div className="mt-10 p-6 bg-surface-cream rounded-lg">
              <h3 className="font-serif text-lg text-primary mb-2">Response Time</h3>
              <p className="text-text-light text-sm">
                I personally read and respond to every message, usually within 24-48 hours.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="input-label">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="input-label">Email *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="input-field"
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="input-label">Phone (optional)</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="input-field"
                    placeholder="+44..."
                  />
                </div>
                <div>
                  <label className="input-label">Subject *</label>
                  <select
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Select a topic</option>
                    <option value="Retreat Inquiry">Retreat Inquiry</option>
                    <option value="Course Question">Course Question</option>
                    <option value="Private Session">Private Session</option>
                    <option value="Collaboration">Collaboration</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="input-label">Message *</label>
                <textarea
                  required
                  rows={6}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="input-field resize-none"
                  placeholder="Tell me how I can help..."
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
