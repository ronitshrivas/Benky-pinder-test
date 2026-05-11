import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Check if already subscribed
    const existing = await adminDb.collection('subscribers').where('email', '==', email).get();
    if (!existing.empty) {
      return NextResponse.json({ message: 'Already subscribed' });
    }

    // Add subscriber
    const ref = adminDb.collection('subscribers').doc();
    await ref.set({
      id: ref.id,
      email,
      subscribedAt: new Date().toISOString(),
      active: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    return NextResponse.json({ error: error.message || 'Failed to subscribe' }, { status: 500 });
  }
}
