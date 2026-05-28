import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

const DEFAULT_BIO = [
  'As a dedicated practitioner of Yoga for 35 years and a teacher of Yoga for 15 years I have come to experience first-hand the transformative potency of Yoga both in my own life and in the lives of others.',
  'The unique gift of Yoga is that the benefits trickle down through every layer of our being, physical, mental, emotional and spiritual.',
  'Over the decades I have been very fortunate to have practiced with many wonderful Yoga, meditation and movement teachers in extensive trainings both in Australia and internationally. My own approach to teaching is grounded in the simple aspiration to feel great in the body. I have come to understand that there is a strong connection between how we move and hold ourselves. I have come to understand that there is a strong connection between how we move and express in our bodies to the energy we broadcast out to the world.',
  'My professional life also includes decades of experience as a hair and makeup artist where I worked both in the commercial and event world as well as in some of Sydneys most prestigious salons. With a client list that includes women from all walks of life from working mums to CEOs and entrepreneurs to film and television personalities.',
  'Through both Yoga and my experience in the beauty world I have come to learn that true radiance is not something you apply or put on it is something you embody. My intention for the retreat and travel experiences I offer along with my online classes is to share distilled empowering practices in an environment where the qualities of self-acceptance and self-confidence can thrive. Whether in some far flung location or virtually.',
  'I flavour everything with the ethos that life is to be lived fully, abundantly and with as much joy as we can squeeze in!',
].join('\n\n');

function normalizeBio(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || DEFAULT_BIO;
}

async function resolveAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const decoded = await adminAuth.verifyIdToken(match[1]);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;

  return decoded.uid;
}

export async function GET() {
  const snap = await adminDb.collection('siteContent').doc('becky').get();
  const data = snap.exists ? snap.data() : null;
  return NextResponse.json({
    bioContent: normalizeBio(data?.bioContent),
  });
}

export async function POST(request: NextRequest) {
  try {
    const adminUid = await resolveAdminUser(request);
    if (!adminUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const bioContent = normalizeBio(body?.bioContent);

    await adminDb.collection('siteContent').doc('becky').set({
      bioContent,
      updatedAt: new Date().toISOString(),
      updatedBy: adminUid,
    }, { merge: true });

    return NextResponse.json({ bioContent });
  } catch (error) {
    console.error('Failed to update Becky bio:', error);
    return NextResponse.json(
      { error: 'Failed to update Becky bio' },
      { status: 500 },
    );
  }
}
