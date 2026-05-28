import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { createHash } from 'crypto';

export const dynamic = 'force-dynamic';

async function resolveAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(match[1]);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') return null;
    return decoded.uid;
  } catch (err) {
    console.error('Auth verification failed:', err);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and authorize admin user
    const adminUid = await resolveAdminUser(request);
    if (!adminUid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch Bunny Stream config from env vars
    const libraryId = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '';
    const apiKey = process.env.BUNNY_API_KEY || '';

    if (!libraryId || !apiKey) {
      console.error('Missing Bunny Stream configuration in environment variables.');
      return NextResponse.json(
        { error: 'Bunny Stream integration is not fully configured on the server.' },
        { status: 500 }
      );
    }

    // 3. Parse request payload
    const body = await request.json().catch(() => ({}));
    const videoTitle = (body.title || `Lesson Video - ${Date.now()}`).trim();

    // 4. Create a video placeholder in Bunny Stream
    const createRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos`,
      {
        method: 'POST',
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: videoTitle }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      console.error('Failed to create video placeholder in Bunny Stream:', errText);
      return NextResponse.json(
        { error: 'Failed to initialize video with Bunny Stream.' },
        { status: createRes.status }
      );
    }

    const videoData = await createRes.json();
    const videoId = videoData.guid; // The unique Video ID (GUID)

    if (!videoId) {
      throw new Error('Video GUID not returned by Bunny Stream API.');
    }

    // 5. Generate secure direct upload signature
    // Expiration is standard Unix timestamp (seconds), valid for 1 hour
    const expirationTime = Math.floor(Date.now() / 1000) + 3600;
    
    // Bunny signature standard: sha256(libraryId + apiKey + expirationTime + videoId) in lowercase hex
    const stringToSign = `${libraryId}${apiKey}${expirationTime}${videoId}`;
    const signature = createHash('sha256').update(stringToSign).digest('hex');

    // 6. Return response to browser
    return NextResponse.json({
      libraryId,
      videoId,
      expirationTime,
      signature,
    });
  } catch (error: any) {
    console.error('Failed to generate upload signature:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
