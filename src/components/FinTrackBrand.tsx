'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

interface FinTrackBrandProps {
  size?: 'sm' | 'md' | 'lg';
  showBadge?: boolean;
  href?: string;
  className?: string;
  showWordmark?: boolean;
}

export function FinTrackLogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-9 h-9 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
  }[size];

  const fontSizeClasses = {
    sm: 'text-sm font-black',
    md: 'text-base font-black',
    lg: 'text-xl font-black',
  }[size];

  return (
    <div
      className={`relative ${sizeClasses} flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 shadow-sm shadow-blue-500/20 border border-blue-400/25 transition-all duration-200 ease-out group-hover:scale-[1.04] group-hover:shadow-md group-hover:shadow-blue-500/30 group-active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none select-none`}
    >
      {/* Background Micro Security & Data Circuit Accent */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="20" cy="20" r="15" stroke="white" strokeWidth="0.8" strokeDasharray="3 3" />
        <path d="M4 20H8M32 20H36M20 4V8M20 32V36" stroke="white" strokeWidth="1" strokeLinecap="round" />
        <circle cx="20" cy="20" r="2.5" fill="white" fillOpacity="0.4" />
      </svg>

      {/* Smooth Highlight Sweep / Light Reflection on Hover */}
      <div
        className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none motion-reduce:hidden"
        aria-hidden="true"
      />

      {/* Core 'F' Mark with Crisp Contrast & Hover Glow */}
      <span
        className={`relative z-10 text-white tracking-tight ${fontSizeClasses} transition-all duration-200 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]`}
      >
        F
      </span>

      {/* Subtle Inner Highlight Ring */}
      <div
        className="absolute inset-0 rounded-inherit ring-1 ring-inset ring-white/20 pointer-events-none"
        aria-hidden="true"
      />
    </div>
  );
}

export default function FinTrackBrand({
  size = 'md',
  showBadge = true,
  href = '/dashboard',
  className = '',
  showWordmark = true,
}: FinTrackBrandProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Link
        href={href}
        className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-xl transition"
        aria-label="FinTrack Home"
      >
        <FinTrackLogoMark size={size} />

        {showWordmark && (
          <div className="flex flex-col justify-center">
            <span className="font-extrabold text-xl text-slate-900 tracking-tight transition-colors duration-150 group-hover:text-blue-600">
              FinTrack
            </span>
          </div>
        )}
      </Link>

      {showBadge && (
        <span
          title="Financial records protected using AES-256-GCM encryption"
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold bg-emerald-50/90 text-emerald-800 border border-emerald-200/70 px-2.5 py-0.5 rounded-full shadow-2xs transition-all duration-200 hover:bg-emerald-100 hover:border-emerald-300 hover:shadow-xs cursor-default select-none"
        >
          <ShieldCheck size={13} className="text-emerald-600 stroke-[2.2]" />
          <span>AES-256 Secured</span>
        </span>
      )}
    </div>
  );
}
