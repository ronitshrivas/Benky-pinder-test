/**
 * lib/paypal.ts
 * Server-side PayPal Orders v2 helper.
 * Uses the REST API directly so there are no edge-runtime conflicts.
 * All secrets stay on the server — never exposed to the browser.
 */

const PAYPAL_ENV = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
const BASE_URL =
  PAYPAL_ENV === 'production'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

console.log(`[PayPal] Initialized in ${PAYPAL_ENV} mode`);

/** Fetch a short-lived OAuth 2.0 access token */
async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET!;

  if (!clientId || !clientSecret) {
    throw new Error(
      'PayPal credentials are missing. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in .env.local.'
    );
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal token error: ${err}`);
  }

  const json = await res.json();
  return json.access_token as string;
}

/**
 * Create a PayPal Order (server-side).
 * Returns the PayPal orderId to pass back to the browser.
 */
export async function createPayPalOrder(
  amount: number,
  currency: string,
  description: string
): Promise<string> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          description,
        },
      ],
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal create-order error: ${err}`);
  }

  const json = await res.json();
  return json.id as string;
}

/**
 * Capture a PayPal Order after the buyer approves it.
 * Returns the full capture details including transaction ID and payer info.
 */
export async function capturePayPalOrder(orderId: string): Promise<{
  captureId: string;
  payerEmail: string;
  status: string;
  amount: string;
  currency: string;
}> {
  const accessToken = await getAccessToken();

  const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `capture-${orderId}-${Date.now()}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal capture error: ${err}`);
  }

  const json = await res.json();

  const capture =
    json.purchase_units?.[0]?.payments?.captures?.[0];

  return {
    captureId: capture?.id ?? json.id,
    payerEmail: json.payer?.email_address ?? '',
    status: json.status ?? 'COMPLETED',
    amount: capture?.amount?.value ?? '0',
    currency: capture?.amount?.currency_code ?? 'USD',
  };
}
