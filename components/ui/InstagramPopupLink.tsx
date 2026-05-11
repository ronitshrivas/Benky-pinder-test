'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  className?: string;
  placement?: 'top' | 'bottom';
}

export function InstagramPopupLink({ className, placement = 'top' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const positionClass = placement === 'top' 
    ? 'bottom-full mb-2 left-0 md:-left-4' 
    : 'top-full mt-2 left-0';

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={className}
        type="button"
      >
        Instagram
      </button>
      
      {isOpen && (
        <div className={`absolute ${positionClass} w-40 bg-white rounded-lg shadow-xl border border-gray-100 p-1.5 z-50 animate-fade-in`}>
          <a 
            href="http://instagram.com/reel/DXCBXr_Rrbr/?igsh=dTc1ZGltZnZobzA=" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block px-3 py-2 text-sm text-text hover:bg-surface-cream hover:text-accent rounded-md transition-colors text-left"
            onClick={() => setIsOpen(false)}
          >
            Video 1
          </a>
          <a 
            href="http://instagram.com/reel/DXCDWLEDTq9/?igsh=MWthNG40NWpudDI0eQ==" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block px-3 py-2 text-sm text-text hover:bg-surface-cream hover:text-accent rounded-md transition-colors text-left"
            onClick={() => setIsOpen(false)}
          >
            Video 2
          </a>
        </div>
      )}
    </div>
  );
}
