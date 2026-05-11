import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendOTPEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, otp } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'send') {
      try {
        await adminAuth.getUserByEmail(email);
        return NextResponse.json({ error: 'Email already in use. Please sign in instead.' }, { status: 409 });
      } catch {
        // No existing auth user, so we can send the OTP.
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await adminDb.collection('otps').doc(email).set({
        otp: code,
        email,
        expiresAt,
        verified: false,
        createdAt: new Date().toISOString(),
      });

      await sendOTPEmail(email, code);
      return NextResponse.json({ success: true, message: 'OTP sent to your email' });
    }

    if (action === 'verify') {
      const otpDoc = await adminDb.collection('otps').doc(email).get();

      if (!otpDoc.exists) {
        return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
      }

      const otpData = otpDoc.data()!;
      if (new Date(otpData.expiresAt) < new Date()) {
        return NextResponse.json({ error: 'OTP expired. Please request a new one.' }, { status: 400 });
      }

      if (otpData.otp !== otp) {
        return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
      }

      await adminDb.collection('otps').doc(email).update({ verified: true });

      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        await adminAuth.updateUser(userRecord.uid, { emailVerified: true });
        await adminDb.collection('users').doc(userRecord.uid).update({ emailVerified: true });
      } catch {
        // User may not exist yet during registration.
      }

      return NextResponse.json({ success: true, verified: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('OTP error:', error);
    return NextResponse.json({ error: error.message || 'OTP verification failed' }, { status: 500 });
  }
}
