import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ valid: false, reason: 'No token provided' }, { status: 400 });
    }

    // Look up subscriber by token
    const snap = await adminDb
      .collection('subscribers')
      .where('accessToken', '==', token)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ valid: false, reason: 'Invalid link' }, { status: 404 });
    }

    const subscriberDoc = snap.docs[0];
    const subscriber = subscriberDoc.data();

    if (!subscriber.active) {
      return NextResponse.json({ valid: false, reason: 'This link is no longer active' }, { status: 403 });
    }

    // Mark as watched (fire-and-forget — don't block video playback)
    subscriberDoc.ref.update({ hasWatched: true }).catch(() => {});

    // Fetch the complimentary video
    const videoSnap = await adminDb.collection('siteContent').doc('complimentaryVideo').get();

    if (!videoSnap.exists || !videoSnap.data()?.videoUrl) {
      return NextResponse.json(
        { valid: false, reason: 'No complimentary video has been set up yet.' },
        { status: 404 }
      );
    }

    const video = videoSnap.data()!;

    if (!video.published) {
      return NextResponse.json(
        { valid: false, reason: 'The complimentary video is not yet available. Please check back soon.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      videoUrl: video.videoUrl,
      title: video.title || 'Your Complimentary Practice',
      description: video.description || '',
    });
  } catch (error: any) {
    console.error('Inner Circle validate error:', error);
    return NextResponse.json(
      { valid: false, reason: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
