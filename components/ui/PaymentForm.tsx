'use client';

/**
 * components/ui/PaymentForm.tsx
 *
 * Shared, reusable payment form used on both the course purchase page and the
 * retreat booking page.  Renders a two-tab switcher:
 *   Tab 1 — Credit / Debit Card  (Square Web Payments SDK)
 *   Tab 2 — PayPal               (@paypal/react-paypal-js PayPalButtons)
 *
 * All secrets live server-side.  The browser only touches public keys / order IDs.
 */

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { CreditCard, Loader2, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PaymentFormProps {
  /** Numeric amount in the display currency (will be charged in AUD) */
  amount: number;
  currency: string;
  userId: string;
  userEmail: string;
  userName: string;
  itemId: string;
  itemTitle: string;
  itemType: 'course' | 'retreat';
  itemThumbnail?: string;
  itemVideoUrl?: string;
  paymentLabel?: string;
  /** Called on successful payment with the internal orderId (and optional Square receipt URL) */
  onSuccess: (orderId: string, receiptUrl?: string) => void;
  /** Called when payment fails — show error in parent if needed */
  onError: (message: string) => void;
}

declare global {
  interface Window {
    Square?: any;
  }
}

// ─── Square card sub-component ────────────────────────────────────────────────

function SquareCardForm({
  amount,
  currency,
  userId,
  userEmail,
  userName,
  itemId,
  itemTitle,
  itemType,
  itemThumbnail,
  itemVideoUrl,
  paymentLabel,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APP_ID || '';
  const locationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || '';

  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [formError, setFormError] = useState('');
  const cardRef = useRef<any>(null);
  const cardInitRef = useRef(false);
  const containerId = 'sq-card-container';

  const scriptSrc = appId.startsWith('sandbox-')
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';

  // Initialise Square card form once SDK is loaded
  useEffect(() => {
    if (!sdkLoaded || !appId || !locationId || cardInitRef.current) return;
    let mounted = true;

    async function initCard() {
      if (!window.Square) {
        if (mounted) setFormError('Square SDK not loaded yet.');
        return;
      }
      try {
        setReady(false);
        const payments = window.Square.payments(appId, locationId);
        const card = await payments.card();
        await card.attach(`#${containerId}`);
        if (mounted) {
          cardRef.current = card;
          cardInitRef.current = true;
          setReady(true);
          setFormError('');
        }
      } catch (e: any) {
        if (mounted) setFormError(e?.message || 'Could not load the Square payment form.');
      }
    }

    initCard();
    return () => {
      mounted = false;
      cardRef.current?.destroy?.().catch(() => undefined);
      cardRef.current = null;
      cardInitRef.current = false;
      setReady(false);
    };
  }, [sdkLoaded, appId, locationId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!cardRef.current) {
      setFormError('Payment form is not ready yet.');
      return;
    }
    try {
      setProcessing(true);
      const tokenResult = await cardRef.current.tokenize();
      if (tokenResult.status !== 'OK' || !tokenResult.token) {
        throw new Error('Card validation failed. Please check your details and try again.');
      }

      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'square',
          sourceId: tokenResult.token,
          amount,
          currency,
          userId,
          userEmail,
          userName,
          itemId,
          itemTitle,
          itemType,
          itemThumbnail: itemThumbnail || '',
          itemVideoUrl: itemVideoUrl || '',
          paymentLabel: paymentLabel || '',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      toast.success('Payment successful!');
      onSuccess(data.orderId, data.receiptUrl);
    } catch (err: any) {
      const msg = err?.message || 'Payment failed';
      setFormError(msg);
      onError(msg);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Script src={scriptSrc} onLoad={() => setSdkLoaded(true)} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="input-label mb-2 block">Card Details</label>
          <div
            id={containerId}
            className="min-h-[220px] rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-colors focus-within:border-accent"
          />
        </div>

        {!sdkLoaded && (
          <div className="flex items-center gap-2 text-sm text-text-light">
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
            Loading secure card form…
          </div>
        )}

        {formError && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {formError}
          </div>
        )}

        <button
          type="submit"
          disabled={!ready || processing}
          id="sq-pay-btn"
          className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Lock className="w-4 h-4" />
          )}
          {processing ? 'Processing…' : `Pay ${formatPrice(amount, currency)} with Card`}
        </button>
      </form>
    </>
  );
}

// ─── PayPal sub-component ─────────────────────────────────────────────────────

function PayPalForm({
  amount,
  currency,
  userId,
  userEmail,
  userName,
  itemId,
  itemTitle,
  itemType,
  itemThumbnail,
  itemVideoUrl,
  paymentLabel,
  onSuccess,
  onError,
}: PaymentFormProps) {
  const [{ isPending }] = usePayPalScriptReducer();
  const [ppError, setPpError] = useState('');

  const createOrder = async () => {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, itemTitle }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create PayPal order');
    return data.orderId as string;
  };

  const onApprove = async (data: { orderID: string }) => {
    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'paypal',
          paypalOrderId: data.orderID,
          amount,
          currency,
          userId,
          userEmail,
          userName,
          itemId,
          itemTitle,
          itemType,
          itemThumbnail: itemThumbnail || '',
          itemVideoUrl: itemVideoUrl || '',
          paymentLabel: paymentLabel || '',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'PayPal payment failed');

      toast.success('PayPal payment successful!');
      onSuccess(result.orderId);
    } catch (err: any) {
      const msg = err?.message || 'PayPal payment failed';
      setPpError(msg);
      onError(msg);
    }
  };

  return (
    <div className="space-y-4">
      {isPending && (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-text-light">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          Loading PayPal…
        </div>
      )}

      {!isPending && (
        <div className="paypal-button-wrapper">
          <PayPalButtons
            style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={(err) => {
              const msg = (err as any)?.message || 'PayPal encountered an error.';
              setPpError(msg);
              onError(msg);
            }}
            onCancel={() => setPpError('Payment cancelled.')}
          />
        </div>
      )}

      {ppError && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-red-700 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          {ppError}
        </div>
      )}

      <p className="text-xs text-text-light text-center">
        You will be redirected to PayPal to complete your payment securely.
      </p>
    </div>
  );
}

// ─── Main PaymentForm export ──────────────────────────────────────────────────

type Tab = 'card' | 'paypal';

export function PaymentForm(props: PaymentFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('card');

  return (
    <div className="space-y-6">
      {/* Security badge */}
      <div className="rounded-xl bg-surface-cream p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
        <p className="text-sm text-text-light">
          Your payment is processed securely. Access is granted immediately upon success and a
          receipt is emailed to you.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden">
        <button
          id="tab-card"
          type="button"
          onClick={() => setActiveTab('card')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
            activeTab === 'card'
              ? 'bg-primary text-white'
              : 'bg-white text-text-light hover:bg-surface-cream'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Credit / Debit Card
        </button>
        <button
          id="tab-paypal"
          type="button"
          onClick={() => setActiveTab('paypal')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-l border-gray-200 ${
            activeTab === 'paypal'
              ? 'bg-[#003087] text-white'
              : 'bg-white text-text-light hover:bg-surface-cream'
          }`}
        >
          {/* PayPal logo text */}
          <span className="font-bold tracking-tight">
            <span className={activeTab === 'paypal' ? 'text-[#009cde]' : 'text-[#003087]'}>Pay</span>
            <span className={activeTab === 'paypal' ? 'text-[#012169]' : 'text-[#009cde]'}>Pal</span>
          </span>
        </button>
      </div>

      {/* Tab panels */}
      <div>
        {activeTab === 'card' ? (
          <SquareCardForm {...props} />
        ) : (
          <PayPalForm {...props} />
        )}
      </div>
    </div>
  );
}
