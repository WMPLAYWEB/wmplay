"use client";

import React from "react";
import Ps1Button from "./Ps1Button";

interface Ps1ControllerHudProps {
  mode?: "catalog" | "player" | "episodes";
  onCross?: () => void;
  onCircle?: () => void;
  onTriangle?: () => void;
  onSquare?: () => void;
  isLight?: boolean;
  focusedTitle?: string;
  className?: string;
}

export default function Ps1ControllerHud({
  mode = "catalog",
  onCross,
  onCircle,
  onTriangle,
  onSquare,
  isLight = false,
  focusedTitle,
  className = "",
}: Ps1ControllerHudProps) {
  // Define action labels according to mode
  const actions = {
    catalog: {
      cross: "Assistir / Abrir",
      circle: "Voltar / Fechar",
      triangle: "Buscar / Menu",
      square: "Salvar Favorito",
    },
    episodes: {
      cross: "Reproduzir Ep.",
      circle: "Fechar Série",
      triangle: "Trocar Temp.",
      square: "Minha Lista",
    },
    player: {
      cross: "Play / Pausar",
      circle: "Sair do Player",
      triangle: "Gaveta Episódios",
      square: "Ajustar Tela",
    },
  }[mode];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 max-w-[95vw] px-4 py-2 rounded-2xl border backdrop-blur-xl shadow-2xl transition-all duration-300 flex items-center gap-3 sm:gap-6 flex-wrap justify-center animate-in slide-in-from-bottom-3 ${
        isLight
          ? "bg-white/95 border-zinc-300 text-zinc-900 shadow-zinc-400/40"
          : "bg-zinc-950/95 border-zinc-800 text-slate-200 shadow-black/80"
      } ${className}`}
    >
      {/* Indicador PS1 Logo Mini */}
      <div className="flex items-center gap-1.5 border-r pr-3 border-zinc-700/60 shrink-0">
        <span className="text-[10px] font-black tracking-widest text-zinc-400 uppercase font-mono">
          CONTROLE PS1
        </span>
      </div>

      {/* Botão ✖ Cross (Confirmar / Assistir) */}
      <button
        onClick={onCross}
        type="button"
        className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
        title="Botão Cruz (X) - Confirmar / Assistir (ou tecla Enter)"
      >
        <Ps1Button type="cross" size="sm" />
        <span className="text-xs font-black text-blue-400 group-hover:text-blue-300">
          {actions.cross}
        </span>
      </button>

      {/* Botão ● Circle (Voltar / Cancelar) */}
      <button
        onClick={onCircle}
        type="button"
        className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
        title="Botão Círculo - Voltar / Cancelar (ou tecla Esc)"
      >
        <Ps1Button type="circle" size="sm" />
        <span className="text-xs font-black text-red-400 group-hover:text-red-300">
          {actions.circle}
        </span>
      </button>

      {/* Botão ▲ Triangle (Menu / Gaveta / Busca) */}
      <button
        onClick={onTriangle}
        type="button"
        className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
        title="Botão Triângulo - Buscar / Menu / Episódios (ou tecla E)"
      >
        <Ps1Button type="triangle" size="sm" />
        <span className="text-xs font-black text-emerald-400 group-hover:text-emerald-300">
          {actions.triangle}
        </span>
      </button>

      {/* Botão ■ Square (Favoritos / Minha Lista) */}
      <button
        onClick={onSquare}
        type="button"
        className="flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-transform cursor-pointer group"
        title="Botão Quadrado - Favoritar / Minha Lista (ou tecla F)"
      >
        <Ps1Button type="square" size="sm" />
        <span className="text-xs font-black text-pink-400 group-hover:text-pink-300">
          {actions.square}
        </span>
      </button>

      {/* Título Selecionado */}
      {focusedTitle && (
        <div className="hidden lg:flex items-center pl-3 border-l border-zinc-700/60 max-w-[200px] truncate text-[11px] text-zinc-400 font-medium">
          <span className="truncate">{focusedTitle}</span>
        </div>
      )}
    </div>
  );
}
