# Deployment Guide: Becky Pinder Yoga & Wellness

This guide explains how to deploy the app end-to-end in a brand-new Firebase account.

The repo uses:
- Firebase App Hosting for the Next.js frontend
- Firestore for app data
- Firebase Storage for media
- Firebase Authentication for sign-in
- Firebase Cloud Functions for server-side Firebase work
- Square for payments
- Gmail or another SMTP provider for email delivery

## 1. What You Need First

Before touching Firebase, make sure you have:
- A Google account with permission to create Firebase projects
- Node.js 22+ installed
- `npm` installed
- The Firebase CLI installed: `npm install -g firebase-tools`
- A Square developer account
- An email account that can send SMTP mail, preferably with an app password

## 2. Create The New Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new Firebase project.
3. Pick the project settings you want for the app.
4. Remember the new project ID. You will use it everywhere in this repo.

If you are moving this repo to a fresh Firebase account, update these project-specific files:
- [`.firebaserc`](/d:/beckypinder/.firebaserc)
- [`firebase.json`](/d:/beckypinder/firebase.json)
- [`apphosting.yaml`](/d:/beckypinder/apphosting.yaml)
- [`scripts/deploy-apphosting.ps1`](/d:/beckypinder/scripts/deploy-apphosting.ps1)
- [`.env.local`](/d:/beckypinder/.env.local) for local development

## 3. Enable Firebase Services

In the Firebase Console, enable:

- Authentication
- Firestore Database
- Storage
- App Hosting
- Cloud Functions support, if prompted

For Authentication:
- Enable Email/Password
- Enable Google sign-in if you want social login
- Add your production domain to the authorized domains list after deploy

For Firestore:
- Create the database
- Choose a region and keep it consistent with the rest of your app

For Storage:
- Create the bucket
- Use the same region or your closest supported region

## 4. Create The Firebase Web App

1. In Project Settings, create a new Web App.
2. Copy the Firebase web config values.
3. Put those values in:
   - [`.env.local`](/d:/beckypinder/.env.local) for local development
   - [`apphosting.yaml`](/d:/beckypinder/apphosting.yaml) for App Hosting runtime/build values

The required client values are:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## 5. Set Up Square

1. Go to the [Square Developer Dashboard](https://developer.squareup.com/apps).
2. Create a Square application.
3. Copy the following values:
   - Application ID
   - Location ID
   - Access Token
4. Decide whether you are deploying sandbox or production.

Update these values in your repo:
- `NEXT_PUBLIC_SQUARE_APP_ID`
- `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- `SQUARE_ACCESS_TOKEN`
- `SQUARE_ENVIRONMENT`

Important:
- `SQUARE_ACCESS_TOKEN` must be stored as a Firebase App Hosting secret, not as a plain text env var.

## 6. Set Up Email

The app sends invoice and notification emails using Nodemailer.

Recommended Gmail setup:
1. Turn on 2-step verification in Google Account security.
2. Create an app password for Mail.
3. Use that password as your SMTP secret.

Update these values:
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_FROM`
- `ADMIN_EMAIL`
- `EMAIL_PASSWORD`

Important:
- `EMAIL_PASSWORD` must be stored as a Firebase App Hosting secret.

## 7. Local Development Setup

Create or update [`.env.local`](/d:/beckypinder/.env.local) with:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

NEXT_PUBLIC_SQUARE_APP_ID=...
NEXT_PUBLIC_SQUARE_LOCATION_ID=...
SQUARE_ACCESS_TOKEN=...
SQUARE_ENVIRONMENT=sandbox

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=...
EMAIL_PASSWORD=...
EMAIL_FROM="Becky Pinder Yoga <...>"
ADMIN_EMAIL=...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For local Firebase Admin access, this repo can read either:
- A service account JSON file path through `FIREBASE_ADMIN_CREDENTIALS_PATH`, or
- The triplet:
  - `FIREBASE_ADMIN_PROJECT_ID`
  - `FIREBASE_ADMIN_CLIENT_EMAIL`
  - `FIREBASE_ADMIN_PRIVATE_KEY`

For App Hosting deployment, those admin-key values are not required and should not be configured in the backend.

## 8. Install Dependencies

From the repo root:

```powershell
npm install
```

If you are on Windows PowerShell and `npm` is blocked by execution policy, use:

```powershell
npm.cmd install
```

## 9. Authenticate Firebase CLI

Run:

```powershell
firebase login
```

Make sure the signed-in Google account has access to the new Firebase project.

Then point the CLI at the new project:

```powershell
firebase use --add
```

Or update [`.firebaserc`](/d:/beckypinder/.firebaserc) directly so the default project matches the new account.

## 10. Configure App Hosting

This repo uses Firebase App Hosting for the Next.js app.

The App Hosting backend is defined in [`firebase.json`](/d:/beckypinder/firebase.json), and the runtime env values are defined in [`apphosting.yaml`](/d:/beckypinder/apphosting.yaml).

Make sure these values are correct for the new project:
- Backend ID
- Region
- Firebase web config values
- Square application values
- Email values

Current App Hosting secrets:
- `squareAccessToken`
- `emailPassword`

Do not add the Firebase Admin private key to App Hosting. The app uses Application Default Credentials on the backend instead.

## 11. Provision App Hosting Secrets

From the repo root, run the deploy helper:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-apphosting.ps1
```

That script:
- Reads `SQUARE_ACCESS_TOKEN` and `EMAIL_PASSWORD` from `.env.local`
- Creates or updates the matching App Hosting secrets
- Grants the backend access to those secrets
- Runs `firebase deploy`

If you prefer to do it manually, the equivalent secret commands are:

```powershell
firebase apphosting:secrets:set squareAccessToken --project <project-id> --location <region> -f
firebase apphosting:secrets:set emailPassword --project <project-id> --location <region> -f
```

## 12. Deploy Everything

From the repo root:

```powershell
firebase deploy
```

This deploys the resources defined in `firebase.json`:
- Firestore rules
- Firestore indexes
- Storage rules
- Cloud Functions
- App Hosting

If you only want the frontend/backend web app:

```powershell
firebase deploy --only apphosting
```

## 13. What The App Needs In App Hosting

The App Hosting backend should include:
- Public Firebase client config
- Square public values
- `SQUARE_ACCESS_TOKEN` as a secret
- `EMAIL_PASSWORD` as a secret
- SMTP host/user/from/admin values

It should not include:
- A raw Firebase Admin private key
- A Windows file path to a service account JSON file
- Any local development-only `.env.local` paths

## 14. After Deploy

When the deploy finishes:
1. Open the App Hosting URL shown by Firebase.
2. Sign up with the first account you want to use as admin.
3. In Firestore, open the `users` collection.
4. Change that user's `role` field to `admin`.
5. Refresh the site and confirm the `/admin` pages load.

If your app uses an absolute production URL, update `NEXT_PUBLIC_APP_URL` in `apphosting.yaml` and redeploy.

## 15. Updating Secrets Later

If Square or email credentials change, update the secret and redeploy:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy-apphosting.ps1
```

If you rotate secrets, remember:
- Square access token changes should be followed by a new App Hosting secret version
- Email app password changes should be followed by a new App Hosting secret version

## 16. Troubleshooting

If the deploy fails with a missing secret error:
- Confirm the secret exists in Firebase App Hosting
- Confirm the backend has access to it
- Re-run the helper script

If the deploy fails with a multiline private-key or env parsing error:
- Remove any Firebase Admin private-key env vars from App Hosting
- Use the backend service account / ADC instead

If the Firebase CLI says you are not authenticated:
- Run `firebase login`
- Make sure the CLI is reading the same config store as your normal terminal session

If App Hosting still serves stale config after a change:
- Redeploy the backend
- Confirm the backend `overrideEnv` in the Firebase Console or via `firebase apphosting:backends:get`

## 17. Recommended New-Account Checklist

1. Create a new Firebase project.
2. Create a Firebase web app and copy its config.
3. Update `.firebaserc`, `firebase.json`, `apphosting.yaml`, `scripts/deploy-apphosting.ps1`, and `.env.local`.
4. Set up Square sandbox or production.
5. Set up SMTP credentials.
6. Log in with `firebase login`.
7. Run the App Hosting secret helper script.
8. Run `firebase deploy`.
9. Set the first admin user in Firestore.
10. Rotate any credentials that were exposed anywhere else.



// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDN-9fzzw9deCv8XxgBtmlVG1MOxN0fhkA",
  authDomain: "beckypinder-bcb30.firebaseapp.com",
  projectId: "beckypinder-bcb30",
  storageBucket: "beckypinder-bcb30.firebasestorage.app",
  messagingSenderId: "659065020849",
  appId: "1:659065020849:web:ba1631b9a51e2f654f5d90",
  measurementId: "G-5GR7TS40PV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);