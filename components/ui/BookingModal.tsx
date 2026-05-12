'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Retreat } from '@/types';
import { formatPrice, formatDate } from '@/lib/utils';
import { PaymentForm } from './PaymentForm';
import { X, Check, ArrowLeft, CreditCard, BadgeInfo, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface BookingModalProps {
  retreat: Retreat;
  user: any;
  userData: any;
  onClose: () => void;
  onSuccess: (orderId: string) => void;
  hideDetailLink?: boolean;
}

export function BookingModal({ retreat, user, userData, onClose, onSuccess, hideDetailLink }: BookingModalProps) {
  const [step, setStep] = useState<'selection' | 'payment'>('selection');
  const [paymentType, setPaymentType] = useState<'full' | 'deposit'>('full');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Prevent scrolling when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const retreatAmount = paymentType === 'deposit' ? (retreat.depositAmount || retreat.price) : retreat.price;
  const isDepositPayment = paymentType === 'deposit';

  const mainImage = retreat.thumbnailUrl || retreat.thumbnail || retreat.images?.[0] || '/images/retreat.jpg';

  const handleSelection = (type: 'full' | 'deposit') => {
    setPaymentType(type);
    setStep('payment');
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-primary p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="flex items-center gap-4">
            {step === 'payment' && (
              <button 
                onClick={() => setStep('selection')}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Back to selection"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h2 className="font-serif text-2xl">Reserve Your Place</h2>
              <p className="text-white/70 text-sm">{retreat.title}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'selection' ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Pay in Full */}
                <button
                  onClick={() => handleSelection('full')}
                  className="group relative flex flex-col p-6 rounded-xl border-2 border-surface-dark hover:border-accent bg-surface transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-sm font-semibold text-text-light uppercase tracking-wider">Pay in Full</span>
                    <span className="p-1 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                      <Check className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="font-serif text-3xl text-primary mb-1">{formatPrice(retreat.price, retreat.currency || 'AUD')}</div>
                  <p className="text-sm text-text-light">All-inclusive package</p>
                  <div className="mt-4 pt-4 border-t border-gray-100 w-full text-xs text-text-light">
                    Immediate confirmation
                  </div>
                </button>

                {/* Pay Deposit */}
                {retreat.depositAmount ? (
                  <button
                    onClick={() => handleSelection('deposit')}
                    className="group relative flex flex-col p-6 rounded-xl border-2 border-surface-dark hover:border-accent bg-surface transition-all text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-sm font-semibold text-text-light uppercase tracking-wider">Pay Deposit</span>
                      <span className="p-1 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white transition-colors">
                        <CreditCard className="w-4 h-4" />
                      </span>
                    </div>
                    <div className="font-serif text-3xl text-primary mb-1">{formatPrice(retreat.depositAmount, retreat.currency || 'AUD')}</div>
                    <p className="text-sm text-text-light">Secure your spot today</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 w-full text-xs text-text-light">
                      {retreat.balanceDueDate ? `Balance due by ${formatDate(retreat.balanceDueDate)}` : 'Balance due later'}
                    </div>
                  </button>
                ) : (
                  <div className="flex flex-col p-6 rounded-xl border-2 border-gray-100 bg-gray-50/50 opacity-60">
                    <div className="text-sm font-semibold text-text-light uppercase tracking-wider mb-4">Deposit Option</div>
                    <p className="text-sm text-text-light italic">Not available for this retreat</p>
                  </div>
                )}
              </div>

              <div className="bg-surface-cream rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <BadgeInfo className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-text-light">
                    <p className="font-semibold text-primary mb-1">What happens next?</p>
                    <p>After choosing your payment option, you can complete the transaction securely with your card or PayPal. Access is granted immediately upon success.</p>
                  </div>
                </div>
              </div>

              {!hideDetailLink && (
                <div className="text-center pt-4 border-t border-gray-100">
                  <Link 
                    href={`/retreats/${retreat.id}`} 
                    onClick={onClose}
                    className="text-accent hover:underline font-medium text-sm inline-flex items-center gap-1"
                  >
                    View complete details & curated experience <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <p className="text-text-light text-xs uppercase tracking-wider mb-1">
                    {isDepositPayment ? 'Deposit payment' : 'Full retreat payment'}
                  </p>
                  <h3 className="font-serif text-xl text-primary">{retreat.title}</h3>
                </div>
                <div className="text-right">
                  <p className="text-text-light text-xs mb-1">Total due</p>
                  <div className="font-serif text-2xl text-accent">
                    {formatPrice(retreatAmount, retreat.currency || 'AUD')}
                  </div>
                </div>
              </div>

              <PaymentForm
                amount={retreatAmount}
                currency={retreat.currency || 'AUD'}
                userId={user.uid}
                userEmail={user.email!}
                userName={userData?.displayName || user.displayName || 'Guest'}
                itemId={retreat.id}
                itemTitle={retreat.title}
                itemType="retreat"
                itemThumbnail={mainImage}
                itemVideoUrl=""
                paymentLabel={isDepositPayment ? 'Deposit' : 'Full payment'}
                onSuccess={onSuccess}
                onError={(msg) => console.error('Booking payment error:', msg)}
              />
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
