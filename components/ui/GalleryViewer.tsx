'use client';
import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { GalleryItem } from '@/types';

interface GalleryViewerProps {
  items: GalleryItem[];
  initialIndex: number;
  onClose: () => void;
}

export function GalleryViewer({ items, initialIndex, onClose }: GalleryViewerProps) {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const minSwipeDistance = 50;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
    else if (event.key === 'ArrowLeft') goToPrevious();
    else if (event.key === 'ArrowRight') goToNext();
  }, [items.length]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const goToPrevious = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((current) => (current - 1 + items.length) % items.length);
  }, [items.length]);

  const goToNext = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIndex((current) => (current + 1) % items.length);
  }, [items.length]);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndHandler = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) goToNext();
    else if (isRightSwipe) goToPrevious();
  };

  const selectedItem = items[selectedIndex];
  if (!selectedItem || !mounted) return null;

  const isVideoItem = (item: GalleryItem) =>
    item.type === 'video' ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.url || '') ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.thumbnailUrl || '') ||
    /\.(mp4|mov|webm|m4v)(\?|#|$)/i.test(item.thumbnail || '');

  const selectedIsVideo = isVideoItem(selectedItem);
  const selectedImageUrl =
    selectedItem.url ||
    selectedItem.thumbnailUrl ||
    selectedItem.thumbnail ||
    selectedItem.thumbnail ||
    '/images/gallery1.jpg';

  const content = (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-label="Gallery viewer"
      onClick={onClose}
    >
      <div
        className="relative flex-1 w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEndHandler}
      >
        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-4 bg-black/50 px-4 py-4 backdrop-blur-sm sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">Gallery Viewer</p>
            <h3 className="font-serif text-2xl text-white truncate">
              {selectedItem.title || 'Gallery Moment'}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
              {selectedItem.location ? <span>{selectedItem.location}</span> : null}
              <span className="text-white/40">{selectedIndex + 1} / {items.length}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Close gallery"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 min-w-0 flex items-center justify-center relative px-4 sm:px-12 pt-24 pb-20">
          {selectedIsVideo ? (
            <video
              key={selectedItem.id || selectedIndex}
              controls
              autoPlay
              muted
              loop
              playsInline
              className="block max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-300"
              poster={selectedItem.thumbnailUrl || selectedItem.thumbnail || undefined}
              src={selectedItem.url}
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <img
              key={selectedItem.id || selectedIndex}
              src={selectedImageUrl}
              alt={selectedItem.title || 'Gallery'}
              className="block max-h-full max-w-full object-contain shadow-2xl animate-fade-in"
              loading="lazy"
            />
          )}

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-md transition-colors hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white z-10"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6 sm:h-8 sm:w-8" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails Footer */}
        {items.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 border-t border-white/10 px-4 py-3 backdrop-blur-md">
            <div className="flex gap-2 overflow-x-auto snap-x hide-scrollbar max-w-screen-xl mx-auto items-center">
              {items.map((item, index) => {
                const isSelected = selectedIndex === index;
                const isVid = isVideoItem(item);
                const thumbUrl = item.thumbnailUrl || item.thumbnail || item.url || '/images/gallery1.jpg';
                return (
                  <button
                    key={item.id || index}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedIndex(index);
                    }}
                    className={`relative h-14 w-20 sm:h-16 sm:w-24 flex-shrink-0 overflow-hidden rounded-md transition-all snap-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${isSelected ? 'ring-2 ring-accent opacity-100 scale-105' : 'opacity-50 hover:opacity-100 border border-white/10'
                      }`}
                    aria-label={`View ${item.title || 'gallery item'}`}
                    aria-current={isSelected}
                  >
                    {isVid ? (
                      <div className="flex h-full w-full items-center justify-center bg-white/10 text-white">
                        <Play className="h-5 w-5" />
                      </div>
                    ) : (
                      <img
                        src={thumbUrl}
                        alt={item.title || 'Gallery thumbnail'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );

  return createPortal(content, document.body);
}
