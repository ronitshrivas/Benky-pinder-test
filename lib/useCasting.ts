'use client';

import { useEffect, useRef, useState, useCallback, RefObject } from 'react';

function inferMimeType(url: string): string {
  const cleanUrl = url.split('?')[0].toLowerCase();
  if (cleanUrl.endsWith('.m3u8')) return 'application/x-mpegURL';
  if (cleanUrl.endsWith('.mpd')) return 'application/dash+xml';
  if (cleanUrl.endsWith('.webm')) return 'video/webm';
  if (cleanUrl.endsWith('.mov')) return 'video/quicktime';
  return 'video/mp4';
}

/**
 * useCasting
 *
 * Wires up two completely separate native casting systems against one
 * <video> element:
 *
 *  1. AirPlay (iPhone/iPad/Mac/Safari)
 *     - No SDK needed. WebKit exposes `webkitShowPlaybackTargetPicker()`
 *       directly on the HTMLVideoElement.
 *     - Only appears in Safari/WebKit-based browsers. Chrome on iOS still
 *       uses WebKit under the hood, so it generally works there too.
 *     - Requires the video to be playable inline and served over HTTPS.
 *
 *  2. Google Cast (Android/Chrome/desktop Chrome)
 *     - Requires the Cast SDK script (loaded in layout.tsx) and the
 *       `window.__onGCastApiAvailable` global callback.
 *     - You request a session, then load media onto the receiver by URL.
 *       The TV/Chromecast fetches the video directly — your phone is just
 *       a remote control. This means the video URL must be a direct,
 *       public, HTTPS-reachable file (mp4/webm/hls), not a blob: or
 *       file: URL, and not something behind auth headers.
 */
export function useCasting(
  videoRef: RefObject<HTMLVideoElement>,
  videoSrc: string,
  videoTitle?: string,
  mimeType?: string
) {
  const [airplaySupported, setAirplaySupported] = useState(false);
  const [castAvailable, setCastAvailable] = useState(false);
  const [castSession, setCastSession] = useState<any>(null);
  const [castState, setCastState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const castContextRef = useRef<any>(null);

  // ---------- AirPlay setup ----------
  // Re-run whenever the source changes so the hook can re-detect the picker
  // on the (possibly newly mounted) <video> element.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      setAirplaySupported(false);
      return;
    }

    // webkitShowPlaybackTargetPicker exists only in Safari/WebKit.
    const supported = typeof (video as any).webkitShowPlaybackTargetPicker === 'function';
    setAirplaySupported(supported);

    if (!supported) return;

    const onAvailabilityChange = (e: any) => {
      // e.availability is a boolean: whether AirPlay targets exist nearby.
      // We keep the button visible regardless, since detection isn't
      // reliable on all iOS versions and the system picker handles the
      // "no devices found" case itself.
    };

    video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvailabilityChange as EventListener);
    return () =>
      video.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvailabilityChange as EventListener);
  }, [videoRef, videoSrc]);

  const openAirplayPicker = useCallback(() => {
    const video = videoRef.current;
    if (video && typeof (video as any).webkitShowPlaybackTargetPicker === 'function') {
      (video as any).webkitShowPlaybackTargetPicker();
    }
  }, [videoRef]);

  // ---------- Google Cast setup ----------
  useEffect(() => {
    let cancelled = false;
    let pollId: number | null = null;

    const initCast = () => {
      const w = window as any;
      if (!w.cast?.framework || !w.chrome?.cast?.media || !w.chrome?.cast?.AutoJoinPolicy) {
        return false;
      }
      if (castContextRef.current) return true; // already initialized

      const context = w.cast.framework.CastContext.getInstance();
      context.setOptions({
        receiverApplicationId: w.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: w.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });

      castContextRef.current = context;
      if (!cancelled) setCastAvailable(true);

      context.addEventListener(
        w.cast.framework.CastContextEventType.SESSION_STATE_CHANGED,
        (event: any) => {
          const State = w.cast.framework.SessionState;
          switch (event.sessionState) {
            case State.SESSION_STARTED:
            case State.SESSION_RESUMED:
              setCastSession(context.getCurrentSession());
              setCastState('connected');
              break;
            case State.SESSION_ENDED:
              setCastSession(null);
              setCastState('idle');
              break;
            default:
              break;
          }
        }
      );
      return true;
    };

    // Always register the callback, in case the script loads/reloads later.
    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) initCast();
    };

    // Don't just wait for the callback — poll directly too, in case the
    // script already called __onGCastApiAvailable before this effect ran
    // (e.g. on fast reloads, or if React mounted after the script fired).
    if (!initCast()) {
      pollId = window.setInterval(() => {
        if (initCast() || cancelled) window.clearInterval(pollId!);
      }, 150);
      window.setTimeout(() => pollId && window.clearInterval(pollId), 10000);
    }

    return () => {
      cancelled = true;
      if (pollId) window.clearInterval(pollId);
    };
  }, []);

  const startCast = useCallback(async () => {
    const context = castContextRef.current;
    if (!context) return;
    setCastState('connecting');
    try {
      await context.requestSession();
      const session = context.getCurrentSession();
      if (session && videoSrc) {
        const w = window as any;
        const castMimeType = mimeType || inferMimeType(videoSrc);
        const mediaInfo = new w.chrome.cast.media.MediaInfo(videoSrc, castMimeType);
        mediaInfo.streamType = w.chrome.cast.media.StreamType.BUFFERED;
        mediaInfo.metadata = new w.chrome.cast.media.GenericMediaMetadata();
        mediaInfo.metadata.title = videoTitle || 'Video';

        const request = new w.chrome.cast.media.LoadRequest(mediaInfo);
        // Resume from current playback position on the local player.
        const video = videoRef.current;
        if (video && video.currentTime > 0) {
          request.currentTime = video.currentTime;
        }
        await session.loadMedia(request);
        // Pause local playback since the TV is now the active screen.
        video?.pause();
        setCastState('connected');
      }
    } catch (err: any) {
      // err is "cancel" if the user just closes the device picker — not
      // a real error, so don't surface it as one.
      if (err !== 'cancel') {
        console.error('Cast session failed:', err);
        setCastState('error');
      } else {
        setCastState('idle');
      }
    }
  }, [videoSrc, videoTitle, mimeType, videoRef]);

  const stopCast = useCallback(() => {
    const context = castContextRef.current;
    const session = context?.getCurrentSession();
    if (session) {
      session.endSession(true);
    }
    setCastSession(null);
    setCastState('idle');
  }, []);

  return {
    airplaySupported,
    openAirplayPicker,
    castAvailable,
    castState,
    castSession,
    startCast,
    stopCast,
  };
}
