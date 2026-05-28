import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

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

    // 3. Get the video title from search params
    const { searchParams } = new URL(request.url);
    const videoTitle = (searchParams.get('title') || `Lesson Video - ${Date.now()}`).trim();

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
    const videoId = videoData.guid;

    if (!videoId) {
      throw new Error('Video GUID not returned by Bunny Stream API.');
    }

    // 5. Pipe the incoming client request body stream directly to Bunny Stream PUT upload!
    // This avoids buffering the entire file in RAM, making it super lightweight and fast.
    const uploadRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        method: 'PUT',
        headers: {
          AccessKey: apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: request.body, // Pipes standard readable request stream directly!
        duplex: 'half',
      } as any
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Failed to upload video stream to Bunny CDN:', errText);
      return NextResponse.json(
        { error: 'Failed to stream video to Bunny CDN.' },
        { status: uploadRes.status }
      );
    }

    // 6. Return the secure media embed URL to client
    const bunnyEmbedUrl = `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}`;
    return NextResponse.json({ url: bunnyEmbedUrl });
  } catch (error: any) {
    console.error('Failed to stream video upload:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during streaming proxy.' },
      { status: 500 }
    );
  }
}
