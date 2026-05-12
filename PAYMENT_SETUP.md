# Payment Setup Guide

## Becky Pinder Yoga — Square + PayPal Dual Integration

This document explains exactly how to configure both Square and PayPal for **sandbox testing** and how to switch to **production** when you're ready to go live.

---

## 1. Environment Variables Reference

Add these to your `.env.local` (local dev) **and** to your Firebase App Hosting secrets (production).

| Variable | Scope | Description |
|---|---|---|
| `NEXT_PUBLIC_SQUARE_APP_ID` | Public (browser) | Square application ID |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | Public (browser) | Square location ID |
| `SQUARE_ACCESS_TOKEN` | Server only | Square API access token |
| `SQUARE_ENVIRONMENT` | Server only | `sandbox` or `production` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public (browser) | PayPal client ID (loads PayPal JS SDK) |
| `PAYPAL_CLIENT_SECRET` | Server only | PayPal client secret (never sent to browser) |
| `PAYPAL_ENVIRONMENT` | Server only | `sandbox` or `production` |

> **Security rule:** Variables prefixed `NEXT_PUBLIC_` are bundled into the browser build. All secrets (`SQUARE_ACCESS_TOKEN`, `PAYPAL_CLIENT_SECRET`) are server-only and never exposed to the client.

---

## 2. PayPal Setup (Step-by-Step)

### Step 1 — Create a PayPal Developer Account

1. Go to **https://developer.paypal.com**
2. Log in with your PayPal business account (or create one — it's free).
3. Click **"Log into Dashboard"** in the top right.

### Step 2 — Create a Sandbox App

1. In the Developer Dashboard, click **"My Apps & Credentials"** in the left sidebar.
2. Make sure the tab is set to **Sandbox** (not Live).
3. Click **"Create App"**.
4. Give it a name (e.g. `BeckyPinderYoga-Sandbox`), select **Merchant** as the account type.
5. Click **"Create App"**.

### Step 3 — Copy Your Credentials

After creating the app you will see:
- **Client ID** (starts with `AW…` or `AY…`) → copy this
- **Client Secret** (click "Show") → copy this

Add them to `.env.local`:
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AW...your_sandbox_client_id...
PAYPAL_CLIENT_SECRET=EL...your_sandbox_secret...
PAYPAL_ENVIRONMENT=sandbox
```

### Step 4 — Get a Sandbox Buyer Account

1. In the Developer Dashboard sidebar, click **"Sandbox → Accounts"**.
2. You will see auto-generated sandbox accounts. Find one with type **Personal** (this is the buyer).
3. Click the **⋮** menu on that account → **"View/Edit Account"**.
4. Note the email and password — you will use these to log in during testing.

---

## 3. Square Setup (Step-by-Step)

Your Square sandbox is already configured. Here's a reminder of where to find things.

### Finding Your Square Sandbox Credentials

1. Go to **https://developer.squareup.com/apps**
2. Open your application.
3. Click the **Sandbox** tab.
4. Copy:
   - **Sandbox Application ID** → `NEXT_PUBLIC_SQUARE_APP_ID`
   - **Sandbox Access Token** → `SQUARE_ACCESS_TOKEN`
5. Click **"Locations"** in the left menu, then copy your Location ID → `NEXT_PUBLIC_SQUARE_LOCATION_ID`

---

## 4. Testing Payments (Sandbox)

### Test Card Numbers (Square Sandbox)

| Card | Number | CVV | Expiry | Zip |
|---|---|---|---|---|
| Visa (success) | `4111 1111 1111 1111` | `111` | Any future | Any 5-digit |
| Mastercard (success) | `5105 1051 0510 5100` | `111` | Any future | Any 5-digit |
| Declined | `4000 0000 0000 0002` | `111` | Any future | Any 5-digit |

### Test PayPal (Sandbox Buyer Account)

1. On the checkout page, click the **PayPal** tab.
2. The PayPal button will appear — click it.
3. A PayPal popup will open. **Log in with your sandbox Personal account** (email + password from Step 2.4 above).
4. Approve the payment.
5. The popup closes and the page redirects to the dashboard — success!

### Verify in Firestore

After a successful test payment, open Firebase Console → **Firestore** → `orders` collection.
You should see a new document with:
```json
{
  "provider": "paypal",   // or "square"
  "status": "completed",
  "paypalOrderId": "...",
  "paypalCaptureId": "..."
}
```

---

## 5. Going Live — Production Checklist

### Square (Production)

1. Go to **https://developer.squareup.com/apps** → switch to the **Production** tab.
2. Copy production credentials into your secrets:

```
NEXT_PUBLIC_SQUARE_APP_ID=sq0idp-...your_production_app_id...
NEXT_PUBLIC_SQUARE_LOCATION_ID=...your_production_location_id...
SQUARE_ACCESS_TOKEN=EAAAlXXXX...your_production_access_token...
SQUARE_ENVIRONMENT=production
```

### PayPal (Production)

1. In the PayPal Developer Dashboard, switch the tab from **Sandbox → Live**.
2. Click **"Create App"** (or use your existing Live app).
3. Copy the **Live Client ID** and **Live Client Secret**:

```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=AW...your_live_client_id...
PAYPAL_CLIENT_SECRET=EL...your_live_secret...
PAYPAL_ENVIRONMENT=production
```

### Firebase App Hosting Secrets

For production, set each secret via the Firebase CLI (repeat for each variable):

```powershell
firebase apphosting:secrets:set SQUARE_ACCESS_TOKEN
firebase apphosting:secrets:set SQUARE_ENVIRONMENT
firebase apphosting:secrets:set PAYPAL_CLIENT_SECRET
firebase apphosting:secrets:set PAYPAL_ENVIRONMENT
firebase apphosting:secrets:set NEXT_PUBLIC_PAYPAL_CLIENT_ID
firebase apphosting:secrets:set NEXT_PUBLIC_SQUARE_APP_ID
firebase apphosting:secrets:set NEXT_PUBLIC_SQUARE_LOCATION_ID
```

Then redeploy:
```powershell
firebase deploy
```

---

## 6. Architecture Overview

```
Browser
  ├── Square tab  →  Square Web Payments SDK (loads from squarecdn.com)
  │                  tokenize card → POST /api/payment { provider: "square", sourceId }
  │
  └── PayPal tab  →  @paypal/react-paypal-js PayPalButtons
                     createOrder  → POST /api/paypal/create-order (server fetches PayPal token)
                     onApprove    → POST /api/payment { provider: "paypal", paypalOrderId }

Server (/api/payment)
  ├── Square path  → Square Node SDK → createPayment → Firestore order → email
  └── PayPal path  → capturePayPalOrder (REST v2) → Firestore order → email
```

---

## 7. Troubleshooting

### PayPal button doesn't appear
- Check `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is set in `.env.local` and the dev server was restarted after adding it.
- Open browser DevTools → Console. If you see `paypal is not defined`, the SDK failed to load. Ensure `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is not empty.

### "PayPal credentials are missing" server error
- `PAYPAL_CLIENT_SECRET` is not set. It is a server-only variable — it must be in `.env.local` (no `NEXT_PUBLIC_` prefix).

### Square card form shows blank / doesn't load
- Confirm `NEXT_PUBLIC_SQUARE_APP_ID` starts with `sandbox-` for sandbox or `sq0idp-` for production.
- Confirm `NEXT_PUBLIC_SQUARE_LOCATION_ID` is correct.

### Payment succeeds but course/retreat access not granted
- Check Firebase Admin credentials (`FIREBASE_ADMIN_PRIVATE_KEY`, `FIREBASE_ADMIN_CLIENT_EMAIL`).
- Look at the server logs — the order write happens before the access grant.

### Email not received after payment
- Email delivery is non-fatal; a payment success won't be reversed if email fails.
- Check `EMAIL_USER`, `EMAIL_PASSWORD` and that your Gmail App Password is current.
- Check the server console for `Customer invoice email failed:` or `Admin notification email failed:`.
