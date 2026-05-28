import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

// GET — return total subscriber count for admin dashboard
export async function GET(_req: NextRequest) {
  try {
    const snap = await adminDb.collection('subscribers').get();
    return NextResponse.json({ count: snap.size });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
