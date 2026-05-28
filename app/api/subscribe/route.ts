import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { sendComplimentaryVideoEmail } from '@/lib/email';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://beckypinder.com.au';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if already subscribed — return friendly message, do NOT resend
    const existing = await adminDb
      .collection('subscribers')
      .where('email', '==', cleanEmail)
      .get();

    if (!existing.empty) {
      return NextResponse.json({ message: 'Already subscribed' });
    }

    // Generate a permanent magic-link token (never expires)
    const accessToken = crypto.randomUUID();

    // Save subscriber with token
    const ref = adminDb.collection('subscribers').doc();
    await ref.set({
      id: ref.id,
      email: cleanEmail,
      subscribedAt: new Date().toISOString(),
      active: true,
      accessToken,
      hasWatched: false,
    });

    // Fetch the current complimentary video title (for personalised email subject)
    let videoTitle = '10-Minute Radiance Boost Morning Practice';
    try {
      const videoSnap = await adminDb
        .collection('siteContent')
        .doc('complimentaryVideo')
        .get();
      if (videoSnap.exists && videoSnap.data()?.title) {
        videoTitle = videoSnap.data()!.title;
      }
    } catch {
      // fall back to default title
    }

    // Build the magic watch URL
    const watchUrl = `${appUrl}/inner-circle/watch/${accessToken}`;

    // Send branded welcome email
    await sendComplimentaryVideoEmail(cleanEmail, watchUrl, videoTitle);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to subscribe' },
      { status: 500 }
    );
  }
}
