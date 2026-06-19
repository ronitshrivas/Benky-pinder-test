import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { sendPasswordResetOTPEmail } from '@/lib/email';

const COLLECTION = 'passwordResetOtps';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, action, otp, password } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'send') {
      try {
        await adminAuth.getUserByEmail(email);
      } catch {
        return NextResponse.json(
          { error: 'No account found with this email.' },
          { status: 404 },
        );
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      await adminDb.collection(COLLECTION).doc(email).set({
        otp: code,
        email,
        expiresAt,
        createdAt: new Date().toISOString(),
      });

      await sendPasswordResetOTPEmail(email, code);
      return NextResponse.json({ success: true, message: 'OTP sent to your email' });
    }

    if (action === 'reset') {
      if (!otp || !password) {
        return NextResponse.json(
          { error: 'OTP and new password are required' },
          { status: 400 },
        );
      }

      const otpDoc = await adminDb.collection(COLLECTION).doc(email).get();

      if (!otpDoc.exists) {
        return NextResponse.json(
          { error: 'No OTP found. Please request a new one.' },
          { status: 400 },
        );
      }

      const otpData = otpDoc.data()!;
      if (new Date(otpData.expiresAt) < new Date()) {
        return NextResponse.json(
          { error: 'OTP expired. Please request a new one.' },
          { status: 400 },
        );
      }

      if (otpData.otp !== otp) {
        return NextResponse.json(
          { error: 'Invalid OTP. Please try again.' },
          { status: 400 },
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters' },
          { status: 400 },
        );
      }

      const userRecord = await adminAuth.getUserByEmail(email);
      await adminAuth.updateUser(userRecord.uid, { password });
      await adminDb.collection(COLLECTION).doc(email).delete();

      return NextResponse.json({ success: true, message: 'Password updated successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return NextResponse.json(
      { error: error.message || 'Password reset failed' },
      { status: 500 },
    );
  }
}
