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
  const [castErrorMessage, setCastErrorMessage] = useState<string | null>(null);
  const castContextRef = useRef<any>(null);


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

    (window as any).__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable) initCast();
    };

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
    if (!context) {
      setCastErrorMessage('Cast SDK not ready. Please refresh the page and try again in a few seconds.');
      setCastState('error');
      return;
    }
    setCastState('connecting');
    setCastErrorMessage(null);
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
        setCastErrorMessage(null);
      } else if (!videoSrc) {
        setCastErrorMessage('No video URL available to cast.');
        setCastState('error');
      } else {
        setCastErrorMessage('Could not start cast session. Make sure your Chromecast is powered on and on the same Wi-Fi network.');
        setCastState('error');
      }
    } catch (err: any) {

      if (err !== 'cancel') {
        console.error('Cast session failed:', err);
        const msg =
          typeof err === 'string'
            ? err
            : err?.description || err?.message || 'Cast failed. Make sure your Chromecast is on the same Wi-Fi network as this device.';
        setCastErrorMessage(msg);
        setCastState('error');
      } else {
        setCastState('idle');
        setCastErrorMessage(null);
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
    castErrorMessage,
    castSession,
    startCast,
    stopCast,
  };
}
