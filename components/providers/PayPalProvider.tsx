'use client';

/**
 * components/providers/PayPalProvider.tsx
 *
 * Client-side wrapper for @paypal/react-paypal-js PayPalScriptProvider.
 * Must be a 'use client' component because PayPalScriptProvider uses React
 * context internally, which cannot run in Next.js 14 Server Components.
 */

import { PayPalScriptProvider } from '@paypal/react-paypal-js';

export function PayPalProvider({ children }: { children: React.ReactNode }) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {children}
    </PayPalScriptProvider>
  );
}
