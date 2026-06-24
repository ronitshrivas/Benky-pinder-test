import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isMp4Url(url: string): boolean {
  return url.split('?')[0].toLowerCase().endsWith('.mp4');
}

async function resolveMp4FallbackUrl(
  fallbackUrl: string,
  libraryId: string,
  videoId: string,
  apiKey: string
): Promise<string> {
  // Some Bunny libraries return the complete MP4 URL; use it directly.
  if (isMp4Url(fallbackUrl)) return fallbackUrl;

  // Other libraries return a base path ending in "play_". The actual MP4
  // fallback files are named play_{ResolutionHeight}p.mp4 (e.g. play_720p.mp4).
  // We ask Bunny for the available resolutions so we can build the correct URL.
  if (!fallbackUrl.endsWith('play_')) return '';

  try {
    const detailsRes = await fetch(
      `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
      {
        headers: apiKey ? { AccessKey: apiKey } : undefined,
      }
    );

    if (!detailsRes.ok) return '';

    const details = await detailsRes.json();
    const resolutions = String(details?.availableResolutions || '')
      .split(',')
      .map((s) => parseInt(s.replace(/\D/g, ''), 10))
      .filter((n) => !isNaN(n) && n > 0)
      .sort((a, b) => b - a);

    if (!resolutions.length) return '';

    // AirPlay / Chromecast to laptops and older TVs often buffers or stutters
    // on 1080p MP4 files. Prefer a 480p fallback for smooth playback; fall back
    // to 720p or the highest available resolution if 480p is not encoded.
    const preferred = resolutions.includes(480)
      ? 480
      : resolutions.includes(720)
        ? 720
        : resolutions[0];
    return `${fallbackUrl}${preferred}p.mp4`;
  } catch {
    return '';
  }
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
    const playUrl = `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}/play`;

    // The Bunny "play" endpoint is normally called publicly by the iframe player.
    // Sending the management API key can sometimes return URLs that are tied to the
    // server session and then 403 on the client. Try public first, then authenticated.
    let response = await fetch(playUrl);
    if (!response.ok && apiKey) {
      response = await fetch(playUrl, {
        headers: { AccessKey: apiKey },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'Unable to load Bunny playback data.' },
        { status: response.status }
      );
    }

    const data = await response.json();
    const fallbackUrl = toStringValue(data?.fallbackUrl);
    const originalUrl = toStringValue(data?.originalUrl);
    const playlistUrl = toStringValue(data?.videoPlaylistUrl);
    const hasMp4 = Boolean(data?.enableMP4Fallback || data?.video?.hasMP4Fallback);

    // AirPlay / Chromecast receivers need a direct MP4 file. Many receivers
    // (e.g. 5KPlayer, older TVs) only play audio from HLS playlists.
    const mp4Url = hasMp4
      ? await resolveMp4FallbackUrl(fallbackUrl, libraryId, videoId, apiKey)
      : '';

    return NextResponse.json({
      fallbackUrl,
      videoPlaylistUrl: playlistUrl,
      originalUrl,
      thumbnailUrl: toStringValue(data?.thumbnailUrl),
      isPlayable: Boolean(data?.isPlayable),
      isPlaylistPlayable: Boolean(data?.isPlaylistPlayable),
      hasMP4Fallback: hasMp4,
      mp4Url,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch Bunny playback data.' },
      { status: 500 }
    );
  }
}
