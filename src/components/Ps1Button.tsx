"use client";

import React from "react";

export type Ps1ButtonType = "triangle" | "circle" | "cross" | "square";

interface Ps1ButtonProps {
  type: Ps1ButtonType | "▲" | "●" | "✖" | "■";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  glow?: boolean;
}

export default function Ps1Button({
  type,
  size = "sm",
  className = "",
  glow = true,
}: Ps1ButtonProps) {
  // Normalize type
  let normType: Ps1ButtonType = "cross";
  if (type === "triangle" || type === "▲") normType = "triangle";
  else if (type === "circle" || type === "●") normType = "circle";
  else if (type === "cross" || type === "✖") normType = "cross";
  else if (type === "square" || type === "■") normType = "square";

  // Size classes
  const sizeMap = {
    xs: {
      btn: "w-4 h-4 text-[9px]",
      svg: "w-2.5 h-2.5 stroke-[3]",
    },
    sm: {
      btn: "w-5 h-5 text-xs",
      svg: "w-3 h-3 stroke-[3]",
    },
    md: {
      btn: "w-7 h-7 text-sm",
      svg: "w-4 h-4 stroke-[2.75]",
    },
    lg: {
      btn: "w-9 h-9 text-base",
      svg: "w-5 h-5 stroke-[2.5]",
    },
  };

  const currentSize = sizeMap[size] || sizeMap.sm;

  // Colors & Icons for each PS1 button
  const config = {
    triangle: {
      color: "#22c55e",
      glowClass: "shadow-emerald-500/40 border-emerald-500/40 text-emerald-400",
      label: "▲",
    },
    circle: {
      color: "#ef4444",
      glowClass: "shadow-red-500/40 border-red-500/40 text-red-400",
      label: "●",
    },
    cross: {
      color: "#3b82f6",
      glowClass: "shadow-blue-500/40 border-blue-500/40 text-blue-400",
      label: "✖",
    },
    square: {
      color: "#ec4899",
      glowClass: "shadow-pink-500/40 border-pink-500/40 text-pink-400",
      label: "■",
    },
  };

  const item = config[normType];

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 border border-zinc-700 shadow-md transition-transform hover:scale-110 select-none shrink-0 ${
        glow ? item.glowClass : ""
      } ${currentSize.btn} ${className}`}
      style={{
        boxShadow: glow ? `0 0 8px ${item.color}55, inset 0 1px 1px rgba(255,255,255,0.2)` : undefined,
      }}
      title={`Botão PS1: ${normType.toUpperCase()}`}
    >
      {normType === "triangle" && (
        <svg
          viewBox="0 0 24 24"
          className={`${currentSize.svg} fill-none`}
          style={{ stroke: item.color }}
        >
          <polygon points="12,4 21,20 3,20" strokeLinejoin="round" />
        </svg>
      )}

      {normType === "circle" && (
        <svg
          viewBox="0 0 24 24"
          className={`${currentSize.svg} fill-none`}
          style={{ stroke: item.color }}
        >
          <circle cx="12" cy="12" r="8" />
        </svg>
      )}

      {normType === "cross" && (
        <svg
          viewBox="0 0 24 24"
          className={`${currentSize.svg} fill-none`}
          style={{ stroke: item.color }}
        >
          <line x1="5" y1="5" x2="19" y2="19" strokeLinecap="round" />
          <line x1="19" y1="5" x2="5" y2="19" strokeLinecap="round" />
        </svg>
      )}

      {normType === "square" && (
        <svg
          viewBox="0 0 24 24"
          className={`${currentSize.svg} fill-none`}
          style={{ stroke: item.color }}
        >
          <rect x="5" y="5" width="14" height="14" rx="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
