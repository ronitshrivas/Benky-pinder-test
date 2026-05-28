'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

function getStreamingEmbedUrl(url: string): { embedUrl: string; provider: 'youtube' | 'vimeo' | 'wistia' | 'bunny' | null } {
  if (!url) return { embedUrl: '', provider: null };
  const lowercaseUrl = url.toLowerCase();

  // 1. Bunny.net Stream (mediadelivery.net, bunny.net, b-cdn.net)
  if (lowercaseUrl.includes('mediadelivery.net') || lowercaseUrl.includes('bunny.net') || lowercaseUrl.includes('b-cdn.net')) {
    if (lowercaseUrl.includes('/embed/')) {
      return { embedUrl: url, provider: 'bunny' };
    }
    const match = url.match(/mediadelivery\.net\/play\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)/);
    if (match) {
      const libraryId = match[1];
      const videoId = match[2];
      return {
        embedUrl: `https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?autoplay=false&loop=false`,
        provider: 'bunny',
      };
    }
    return { embedUrl: url, provider: 'bunny' };
  }

  // 2. YouTube Parsing (Supports shorts, watch, embed, and youtu.be)
  if (lowercaseUrl.includes('youtube.com') || lowercaseUrl.includes('youtu.be')) {
    let videoId = '';
    if (lowercaseUrl.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (lowercaseUrl.includes('embed/')) {
      videoId = url.split('embed/')[1]?.split(/[?#]/)[0] || '';
    } else if (lowercaseUrl.includes('shorts/')) {
      videoId = url.split('shorts/')[1]?.split(/[?#]/)[0] || '';
    } else if (lowercaseUrl.includes('v=')) {
      videoId = url.split('v=')[1]?.split('&')[0]?.split(/[?#]/)[0] || '';
    }
    return {
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=0&enablejsapi=1` : url,
      provider: 'youtube',
    };
  }

  // 3. Vimeo Parsing (Supports standard, player, and private/unlisted with secure hashes)
  if (lowercaseUrl.includes('vimeo.com')) {
    const match = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)(?:\/([a-zA-Z0-9]+))?/);
    if (match) {
      const videoId = match[1];
      const hash = match[2] ? `?h=${match[2]}` : '';
      return {
        embedUrl: `https://player.vimeo.com/video/${videoId}${hash}${hash ? '&' : '?'}dnt=1&title=0&byline=0&portrait=0`,
        provider: 'vimeo',
      };
    }
    if (lowercaseUrl.includes('player.vimeo.com/video/')) {
      return { embedUrl: url, provider: 'vimeo' };
    }
  }

  // 4. Wistia Parsing
  if (lowercaseUrl.includes('wistia.com') || lowercaseUrl.includes('wistia.net')) {
    const match = url.match(/(?:medias|iframe)\/([a-zA-Z0-9]+)/);
    if (match) {
      const videoId = match[1];
      return {
        embedUrl: `https://fast.wistia.net/embed/iframe/${videoId}?videoFoam=true`,
        provider: 'wistia',
      };
    }
    if (lowercaseUrl.includes('fast.wistia.net/embed/iframe/')) {
      return { embedUrl: url, provider: 'wistia' };
    }
  }

  return { embedUrl: '', provider: null };
}

interface VideoPlayerProps {
  src: string;
  lessonId: string;
  userId?: string;
  nextVideoUrl?: string;
  onEnded?: () => void;
  poster?: string;
}

export default function VideoPlayer({
  src,
  lessonId,
  userId = 'default',
  nextVideoUrl,
  onEnded,
  poster,
}: VideoPlayerProps) {
  // Early return for third-party streaming hosts for zero-lag and adaptive bitrates
  const { embedUrl, provider } = getStreamingEmbedUrl(src);

  if (provider) {
    return (
      <div className="relative w-full h-full bg-black rounded-lg overflow-hidden shadow-xl border border-white/5 aspect-video">
        <iframe
          src={embedUrl}
          className="absolute inset-0 w-full h-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
          title="Course Lesson Video Player"
        />
      </div>
    );
  }

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Core Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Buffer and Seeking State
  const [isBuffering, setIsBuffering] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false); // Debounced buffer spinner
  const [bufferedRanges, setBufferedRanges] = useState<{ start: number; end: number }[]>([]);

  // Smooth Seeker Decoupling
  const [isDraggingSeek, setIsDraggingSeek] = useState(false);
  const [draggedTime, setDraggedTime] = useState(0);

  // Controls UI state
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `becky_pinder_lesson_progress_${userId}_${lessonId}`;

  // 1. Mouse movement timer to auto-hide control overlay
  const resetControlsTimer = () => {
    setIsControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setIsControlsVisible(false);
        setShowSpeedMenu(false);
      }, 2500);
    }
  };

  useEffect(() => {
    resetControlsTimer();
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  // 1b. Listen to standard and vendor-specific fullscreen changes to sync UI state
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // 1c. Listen to iOS webkitbeginfullscreen / webkitendfullscreen directly on video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleWebkitBegin = () => {
      setIsFullscreen(true);
    };
    const handleWebkitEnd = () => {
      setIsFullscreen(false);
      setIsControlsVisible(true);
    };

    video.addEventListener('webkitbeginfullscreen', handleWebkitBegin);
    video.addEventListener('webkitendfullscreen', handleWebkitEnd);

    return () => {
      video.removeEventListener('webkitbeginfullscreen', handleWebkitBegin);
      video.removeEventListener('webkitendfullscreen', handleWebkitEnd);
    };
  }, []);

  // 1d. Stall Recovery Watchdog: nudge video forward slightly if it stays stuck buffering (fast 1.8s trigger)
  useEffect(() => {
    let stallTimer: NodeJS.Timeout;
    if (isBuffering && isPlaying) {
      stallTimer = setTimeout(() => {
        const video = videoRef.current;
        if (video && !video.paused) {
          console.log('Video stall detected, attempting auto-recovery...');
          // Nudge video currentTime slightly to kickstart the buffer/decoder pipeline
          video.currentTime = Math.min(video.duration, video.currentTime + 0.15);
          video.play().catch(() => {});
        }
      }, 1800);
    }
    return () => clearTimeout(stallTimer);
  }, [isBuffering, isPlaying]);

  // 1e. Debounce buffer spinner to prevent micro-flickering during sub-second buffer adjustments
  useEffect(() => {
    let spinnerTimer: NodeJS.Timeout;
    if (isBuffering || isSeeking) {
      spinnerTimer = setTimeout(() => {
        setShowSpinner(true);
      }, 700); // 700ms debounce window is perfect
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(spinnerTimer);
  }, [isBuffering, isSeeking]);

  // 2. Playback state watchers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Reset player states when source changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setBufferedRanges([]);
    setIsDraggingSeek(false);
    setShowResumeBanner(false);

    // Read saved playback position
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsedTime = parseFloat(saved);
      // Only prompt if progress is significant (> 5s) and not near completion
      if (parsedTime > 5) {
        setSavedResumeTime(parsedTime);
        setShowResumeBanner(true);
        // Automatically hide resume banner after 7 seconds
        const timer = setTimeout(() => {
          setShowResumeBanner(false);
        }, 7000);
        return () => clearTimeout(timer);
      }
    }
  }, [src, lessonId, storageKey]);

  // 3. Keep localStorage updated (throttled)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let lastSavedTime = 0;
    const handleTimeUpdate = () => {
      const time = video.currentTime;
      setCurrentTime(time);

      // Save every 3 seconds to preserve write-cycles
      if (Math.abs(time - lastSavedTime) > 3) {
        if (video.duration && time < video.duration - 8) {
          localStorage.setItem(storageKey, time.toString());
        } else if (time >= video.duration - 8) {
          // Near the end: remove so they can re-watch from start next time
          localStorage.removeItem(storageKey);
        }
        lastSavedTime = time;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [src, storageKey]);

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept keybinds if user is in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'arrowleft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'arrowright':
          e.preventDefault();
          skipTime(10);
          break;
        case 'arrowup':
          e.preventDefault();
          adjustVolume(0.05);
          break;
        case 'arrowdown':
          e.preventDefault();
          adjustVolume(-0.05);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isMuted, volume]);

  // Player Operations
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // Fallback for autoplay/browser restrictions
        setIsPlaying(false);
      });
    }
    resetControlsTimer();
  };

  const skipTime = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + amount));
    resetControlsTimer();
    toast.success(amount > 0 ? `Forward ${amount}s` : `Back ${Math.abs(amount)}s`, {
      id: 'seek-toast',
      duration: 1000,
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    if (val === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMute = !isMuted;
    video.muted = nextMute;
    setIsMuted(nextMute);
    if (!nextMute && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  const adjustVolume = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.max(0, Math.min(1, volume + amount));
    video.volume = newVol;
    setVolume(newVol);
    if (newVol === 0) {
      video.muted = true;
      setIsMuted(true);
    } else {
      video.muted = false;
      setIsMuted(false);
    }
    toast.success(`Volume ${Math.round(newVol * 100)}%`, { id: 'volume-toast', duration: 1000 });
  };

  const handleSpeedChange = (rate: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackSpeed(rate);
    setShowSpeedMenu(false);
    resetControlsTimer();
    toast.success(`Playback Speed: ${rate}x`, { id: 'speed-toast', duration: 1200 });
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isCurrentlyFullscreen) {
      // Enter fullscreen
      if (container.requestFullscreen) {
        container.requestFullscreen().catch((err) => {
          // Fallback to video element (e.g. iOS Safari)
          if (video.requestFullscreen) {
            video.requestFullscreen();
          } else if ((video as any).webkitEnterFullscreen) {
            (video as any).webkitEnterFullscreen();
          }
        });
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      } else if ((container as any).mozRequestFullScreen) {
        (container as any).mozRequestFullScreen();
      } else if ((container as any).msRequestFullscreen) {
        (container as any).msRequestFullscreen();
      } else if ((video as any).webkitEnterFullscreen) {
        // Crucial for iOS iPhones
        try {
          (video as any).webkitEnterFullscreen();
        } catch (e) {
          toast.error('Fullscreen not supported on this device');
        }
      } else {
        toast.error('Fullscreen not supported on this device');
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen();
      }
    }
  };

  const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const rect = video.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;

    // e.detail gives click count (1 for single, 2 for double click)
    if (e.detail === 2) {
      // Cancel pending single tap toggle
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }

      if (x < width * 0.35) {
        skipTime(-10);
      } else if (x > width * 0.65) {
        skipTime(10);
      } else {
        toggleFullscreen();
      }
    } else if (e.detail === 1) {
      // Wait slightly to verify it is not a double click
      clickTimeoutRef.current = setTimeout(() => {
        togglePlay();
        clickTimeoutRef.current = null;
      }, 220);
    }
  };

  // Seeker actions
  const handleSeekStart = () => {
    setIsDraggingSeek(true);
    setDraggedTime(currentTime);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setDraggedTime(val);
  };

  const handleSeekEnd = () => {
    const video = videoRef.current;
    if (video) {
      setIsSeeking(true);
      video.currentTime = draggedTime;
      setCurrentTime(draggedTime);
    }
    setIsDraggingSeek(false);
  };

  // Time formatter
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);

    const formattedSecs = seconds < 10 ? `0${seconds}` : seconds;
    if (hours > 0) {
      const formattedMins = minutes < 10 ? `0${minutes}` : minutes;
      return `${hours}:${formattedMins}:${formattedSecs}`;
    }
    return `${minutes}:${formattedSecs}`;
  };

  // Buffer updates
  const updateBufferedRanges = () => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({
        start: video.buffered.start(i),
        end: video.buffered.end(i),
      });
    }
    setBufferedRanges(ranges);
  };

  const handleResumePlayback = () => {
    const video = videoRef.current;
    if (video && savedResumeTime > 0) {
      video.currentTime = savedResumeTime;
      setCurrentTime(savedResumeTime);
      setShowResumeBanner(false);
      video.play().then(() => {
        setIsPlaying(true);
      });
      toast.success('Resumed playback!');
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    localStorage.removeItem(storageKey);
    if (onEnded) {
      onEnded();
    }
  };

  // Progress Bar styling values
  const activePercentage = duration ? ((isDraggingSeek ? draggedTime : currentTime) / duration) * 100 : 0;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={resetControlsTimer}
      onMouseLeave={() => isPlaying && setIsControlsVisible(false)}
      className="relative w-full h-full bg-black flex items-center justify-center select-none overflow-hidden group shadow-xl border border-white/5 rounded-lg"
    >
      {/* 1. Actual Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="auto"
        controlsList="nodownload"
        playsInline
        webkit-playsinline="true"
        onClick={handleVideoClick}
        className="w-full h-full object-contain cursor-pointer"
        style={{
          transform: 'translate3d(0, 0, 0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
        }}
        onSeeking={() => setIsSeeking(true)}
        onSeeked={() => {
          setIsSeeking(false);
          setIsBuffering(false);
        }}
        onPause={() => setIsPlaying(false)}
        onProgress={updateBufferedRanges}
        onEnded={handleVideoEnded}
        onError={() => toast.error('This video could not be loaded. Please check format/network.')}
      />

      {/* 2. Background Preloader for the NEXT Video (Bandwidth Optimization) */}
      {nextVideoUrl && (
        <video
          src={nextVideoUrl}
          preload="metadata"
          className="hidden"
          muted
          playsInline
        />
      )}

      {/* 3. Center Buffering / Seeking Spinner Overlay */}
      {showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] pointer-events-none transition-all duration-300">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-accent animate-spin" />
            <span className="text-white/80 font-sans text-xs tracking-wider uppercase bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm">
              Optimizing Playback...
            </span>
          </div>
        </div>
      )}

      {/* 4. Auto-Resume Playback Toast / Banner */}
      {showResumeBanner && savedResumeTime > 0 && (
        <div className="absolute top-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md bg-[#1B2A4A]/95 backdrop-blur-md text-white border border-[#C9A84C]/30 p-4 rounded-lg shadow-2xl flex items-center justify-between gap-4 animate-fade-in z-20">
          <div className="flex-1">
            <h4 className="font-serif text-sm text-[#C9A84C]">Welcome Back!</h4>
            <p className="text-white/70 text-xs mt-1">
              You watched this lesson up to <span className="font-semibold text-white">{formatTime(savedResumeTime)}</span>. Resume?
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResumePlayback}
              className="bg-accent hover:bg-accent-light text-primary text-xs font-semibold px-3 py-1.5 rounded transition-all"
            >
              Resume
            </button>
            <button
              onClick={() => setShowResumeBanner(false)}
              className="text-white/60 hover:text-white text-xs px-2.5 py-1.5 rounded"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 5. Custom Control Bar Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/25 flex flex-col justify-between p-4 md:p-6 transition-all duration-300 ${
          isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Top spacer to preserve layout centering */}
        <div className="w-full flex justify-between" />

        {/* Center Play Button Overlay (visible on pause) */}
        {!isPlaying && !isBuffering && !isSeeking && (
          <button
            onClick={togglePlay}
            className="self-center w-16 h-16 rounded-full bg-accent text-primary flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl shadow-accent/20 group-hover:scale-105"
          >
            <Play className="w-8 h-8 fill-primary stroke-primary ml-1" />
          </button>
        )}
        {isPlaying && !isBuffering && !isSeeking && <div className="h-16 self-center" />}

        {/* Bottom controls panel */}
        <div className="w-full space-y-4">
          {/* Custom Decoupled Timeline (Progress Bar) */}
          <div className="flex items-center gap-3 w-full group/timeline">
            <span className="text-white/95 text-xs font-mono select-none w-11 text-right">
              {formatTime(isDraggingSeek ? draggedTime : currentTime)}
            </span>

            <div 
              className="relative flex-1 h-1.5 flex items-center cursor-pointer touch-none" 
              style={{ touchAction: 'none' }}
            >
              {/* Backing Track */}
              <div className="absolute inset-0 bg-white/20 rounded-full w-full h-full" />

              {/* Buffered segments */}
              {bufferedRanges.map((range, idx) => {
                const left = (range.start / duration) * 100;
                const width = ((range.end - range.start) / duration) * 100;
                if (isNaN(left) || isNaN(width)) return null;
                return (
                  <div
                    key={idx}
                    className="absolute h-full bg-white/35 rounded-full"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}

              {/* Played timeline (Accent Gold) */}
              <div
                className="absolute h-full bg-accent rounded-full pointer-events-none"
                style={{ width: `${activePercentage}%` }}
              />

              {/* Glowing scrubber handle */}
              <div
                className={`absolute w-3.5 h-3.5 rounded-full bg-accent-light shadow-md shadow-black/40 border border-white pointer-events-none transform -translate-x-1/2 transition-transform duration-100 ${
                  isDraggingSeek ? 'scale-125' : 'scale-0 group-hover/timeline:scale-100'
                }`}
                style={{ left: `${activePercentage}%` }}
              />

              {/* Invisible range inputs overlaying everything for robust scrubbing */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={isDraggingSeek ? draggedTime : currentTime}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekChange}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer touch-none"
                style={{ touchAction: 'none' }}
              />
            </div>

            <span className="text-white/90 text-xs font-mono select-none w-11 text-left">
              {formatTime(duration)}
            </span>
          </div>

          {/* Buttons controls row */}
          <div className="flex items-center justify-between w-full">
            {/* Left side actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="text-white hover:text-accent transition-colors"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              <button
                onClick={() => skipTime(-10)}
                className="text-white/80 hover:text-accent transition-colors"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => skipTime(10)}
                className="text-white/80 hover:text-accent transition-colors"
                title="Forward 10s (Right Arrow)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Volume and Slider */}
              <div className="flex items-center gap-2 group/volume relative">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-accent transition-colors"
                  title="Toggle Mute (M)"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 overflow-hidden opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 h-1 cursor-pointer bg-white/30 accent-accent rounded-full"
                />
              </div>
            </div>

            {/* Right side settings */}
            <div className="flex items-center gap-4 relative">
              {/* Playback speed dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="text-white hover:text-accent text-xs font-semibold px-2 py-1 rounded bg-white/10 hover:bg-white/20 transition-all flex items-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>{playbackSpeed}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-28 bg-[#1B2A4A] border border-white/10 rounded shadow-xl overflow-hidden py-1 z-30 animate-slide-up text-left">
                    <div className="px-2.5 py-1 text-[10px] text-white/40 uppercase font-sans tracking-widest font-semibold border-b border-white/5 mb-1">
                      Speed
                    </div>
                    {[0.5, 1, 1.25, 1.5, 1.75, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#C9A84C] hover:text-primary transition-colors flex items-center justify-between ${
                          playbackSpeed === speed ? 'text-accent font-semibold' : 'text-white/80'
                        }`}
                      >
                        <span>{speed}x</span>
                        {playbackSpeed === speed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Fullscreen control */}
              <button
                onClick={toggleFullscreen}
                className="text-white hover:text-accent transition-colors"
                title="Toggle Fullscreen (F)"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" />
                ) : (
                  <Maximize className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
