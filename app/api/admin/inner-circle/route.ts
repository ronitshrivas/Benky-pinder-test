import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

async function requireAdmin(req: NextRequest) {
  const auth = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!auth) throw new Error('Unauthorized');
  const decoded = await adminAuth.verifyIdToken(auth);
  const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
  if (userDoc.data()?.role !== 'admin') throw new Error('Forbidden');
}

// GET — fetch current complimentary video doc
export async function GET(req: NextRequest) {
  try {
    const snap = await adminDb.collection('siteContent').doc('complimentaryVideo').get();
    return NextResponse.json({ video: snap.exists ? snap.data() : null });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST — save / overwrite complimentary video doc (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { title, description, videoUrl, published } = body;

    if (!videoUrl) return NextResponse.json({ error: 'videoUrl is required' }, { status: 400 });
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });

    await adminDb.collection('siteContent').doc('complimentaryVideo').set(
      { title, description: description || '', videoUrl, published: Boolean(published), updatedAt: new Date().toISOString() },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.message === 'Unauthorized' ? 401 : 500 });
  }
}
