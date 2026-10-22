"use client";

import React from "react";

interface WmplayLogoProps {
  size?: "sm" | "md" | "lg";
  isLight?: boolean;
  showSubtitle?: boolean;
  iconOnly?: boolean;
  className?: string;
}

export default function WmplayLogo({
  size = "md",
  isLight = false,
  showSubtitle = true,
  iconOnly = false,
  className = "",
}: WmplayLogoProps) {
  // Dimensions for emblem
  const emblemSizes = {
    sm: "w-8 h-8 rounded-xl",
    md: "w-10 h-10 rounded-2xl",
    lg: "w-14 h-14 rounded-2xl",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const subtitleSizes = {
    sm: "text-[8px] tracking-[0.2em]",
    md: "text-[10px] tracking-[0.25em]",
    lg: "text-xs tracking-[0.3em]",
  };

  return (
    <div className={`flex items-center gap-2.5 sm:gap-3 select-none ${className}`}>
      {/* Dynamic Luminous WMPLAY Emblem */}
      <div
        className={`relative shrink-0 ${emblemSizes[size]} bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border border-red-500/50 shadow-lg shadow-red-600/30 flex items-center justify-center overflow-hidden group`}
      >
        {/* Subtle red ambient glow inside */}
        <div className="absolute inset-0 bg-radial from-red-600/20 via-transparent to-transparent pointer-events-none" />

        {/* Vector Stylized "WM" + Play Icon */}
        <svg
          viewBox="0 0 40 40"
          className="w-[72%] h-[72%] drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Stylized 'W' Wing in dark crimson */}
          <path
            d="M8 12 L13 28 L17 17 L21 24 L19 28 L15 28 L10 12 Z"
            fill="#991b1b"
            opacity="0.9"
          />
          {/* Dynamic Play Triangle */}
          <polygon
            points="16,11 32,20 16,29"
            fill="url(#playGrad)"
          />
          {/* Highlight Shimmer */}
          <polygon
            points="16,11 26,16.5 16,20"
            fill="#ffffff"
            opacity="0.35"
          />

          <defs>
            <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Typography Wordmark (unless iconOnly) */}
      {!iconOnly && (
        <div className="flex flex-col justify-center leading-none">
          <div className={`font-black tracking-wider flex items-center ${textSizes[size]}`}>
            <span className={isLight ? "text-zinc-950" : "text-white"}>WM</span>
            <span className="text-red-600 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">PLAY</span>
          </div>
          {showSubtitle && (
            <p className={`font-black uppercase text-red-600 mt-0.5 sm:mt-1 ${subtitleSizes[size]}`}>
              Streaming &amp; TV
            </p>
          )}
        </div>
      )}
    </div>
  );
}
