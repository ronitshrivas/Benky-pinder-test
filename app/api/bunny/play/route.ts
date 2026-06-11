import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const libraryId = searchParams.get('libraryId')?.trim();
  const videoId = searchParams.get('videoId')?.trim();

  if (!libraryId || !videoId) {
    return NextResponse.json({ error: 'libraryId and videoId are required.' }, { status: 400 });
  }

  try {
    const apiKey = process.env.BUNNY_API_KEY || '';
    const response = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/play`, {
      headers: apiKey ? { AccessKey: apiKey } : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Unable to load Bunny playback data.' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      fallbackUrl: toStringValue(data?.fallbackUrl),
      videoPlaylistUrl: toStringValue(data?.videoPlaylistUrl),
      originalUrl: toStringValue(data?.originalUrl),
      thumbnailUrl: toStringValue(data?.thumbnailUrl),
      isPlayable: Boolean(data?.isPlayable),
      isPlaylistPlayable: Boolean(data?.isPlaylistPlayable),
      hasMP4Fallback: Boolean(data?.enableMP4Fallback || data?.video?.hasMP4Fallback),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Bunny playback data.' },
      { status: 500 }
    );
  }
}
