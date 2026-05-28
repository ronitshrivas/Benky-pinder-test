'use client';

import React, { useState, useCallback } from 'react';
import Cropper, { Point, Area } from 'react-easy-crop';
import { X, Check } from 'lucide-react';
import getCroppedImg from '@/lib/cropUtils';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export function ImageCropper({
  imageSrc,
  onCropComplete,
  onCancel,
  aspectRatio = 16 / 9,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedBlob) {
        // Convert Blob to File
        const file = new File([croppedBlob], `cropped-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCropComplete(file);
      }
    } catch (e) {
      console.error('Error cropping image:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[600px]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-serif text-lg text-primary">Crop Image</h3>
          <button onClick={onCancel} className="text-text-light hover:text-red-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative flex-1 bg-gray-900 w-full">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={handleCropComplete}
            onZoomChange={setZoom}
            objectFit="contain"
          />
        </div>

        {/* Footer / Controls */}
        <div className="p-4 border-t bg-gray-50 flex flex-col sm:flex-row items-center gap-4 justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-sm text-text-light">Zoom:</span>
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full sm:w-32 accent-accent"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="btn-outline flex-1 sm:flex-none justify-center"
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex-1 sm:flex-none justify-center flex items-center gap-2"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Confirm Crop
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
