"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Tv, QrCode, Wifi, Play, Volume2, ShieldCheck, Zap, ArrowLeft } from "lucide-react";
import WmplayLogo from "@/components/WmplayLogo";
import KodiVideoPlayer from "@/components/KodiVideoPlayer";
import Link from "next/link";

export default function TvReceiverPage() {
  const [code, setCode] = useState<string | null>(null);
  const [controllerConnected, setControllerConnected] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{
    title: string;
    synopsis: string;
    thumbnail: string;
    link?: string;
    tmdb_id?: number | string;
    season?: number;
    episode?: number;
  } | null>(null);

  const [activeServerIndex, setActiveServerIndex] = useState(0);
  const [serverList, setServerList] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Inicializar sessão de receptor da TV
  useEffect(() => {
    let isMounted = true;

    async function initReceiver() {
      try {
        const res = await fetch("/api/cast/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", name: "Smart TV Sala" }),
        });
        const data = await res.json();
        if (isMounted && data.success && data.code) {
          setCode(data.code);
        }
      } catch (err) {
        console.error("Erro ao registrar TV:", err);
      }
    }

    initReceiver();

    // BroadcastChannel para sincronização instantânea em rede local / mesmo navegador
    try {
      if ("BroadcastChannel" in window) {
        broadcastRef.current = new BroadcastChannel("wmplay_cast_channel");
        broadcastRef.current.onmessage = (event) => {
          const { type, command, payload } = event.data || {};
          if (type === "COMMAND") {
            handleExecuteCommand(command, payload);
          }
        };
      }
    } catch {
      // Ignore
    }

    return () => {
      isMounted = false;
      broadcastRef.current?.close();
    };
  }, []);

  // Executar comandos recebidos do celular
  const handleExecuteCommand = useCallback(
    (cmdType: string, payload: any) => {
      if (cmdType === "play_media" && payload?.media) {
        const m = payload.media;
        setActiveMedia({
          title: m.title,
          synopsis: m.synopsis || "",
          thumbnail: m.thumbnail || "",
          link: m.link,
          tmdb_id: m.tmdb_id,
          season: m.season,
          episode: m.episode,
        });
        setIsPaused(false);
      } else if (cmdType === "pause") {
        setIsPaused(true);
        const v = document.querySelector("video");
        if (v) v.pause();
      } else if (cmdType === "play") {
        setIsPaused(false);
        const v = document.querySelector("video");
        if (v) v.play().catch(() => {});
      } else if (cmdType === "seek" && payload?.time !== undefined) {
        const v = document.querySelector("video");
        if (v) v.currentTime = payload.time;
      } else if (cmdType === "mute") {
        const v = document.querySelector("video");
        if (v) v.muted = true;
      } else if (cmdType === "unmute") {
        const v = document.querySelector("video");
        if (v) v.muted = false;
      } else if (cmdType === "stop") {
        setActiveMedia(null);
      }
    },
    []
  );

  // Polling de comandos do celular para a TV
  useEffect(() => {
    if (!code) return;

    let active = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cast/session?code=${code}&role=receiver`);
        if (!res.ok) return;
        const data = await res.json();

        if (active && data.success) {
          setControllerConnected(data.controllerConnected);

          if (data.commands && data.commands.length > 0) {
            for (const cmd of data.commands) {
              handleExecuteCommand(cmd.type, cmd.payload);
            }
          }
        }
      } catch {
        // Ignore
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [code, handleExecuteCommand]);

  // Reportar estado de reprodução para a sessão (para o slider do celular atualizar)
  useEffect(() => {
    if (!code || !activeMedia) return;

    const reportInterval = setInterval(async () => {
      const v = document.querySelector("video");
      if (v) {
        const cur = v.currentTime;
        const dur = v.duration || 0;
        const paused = v.paused;

        setCurrentTime(cur);
        setDuration(dur);
        setIsPaused(paused);

        try {
          await fetch("/api/cast/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "sync_state",
              code,
              state: {
                currentTime: cur,
                duration: dur,
                isPaused: paused,
                volume: v.volume,
                isMuted: v.muted,
              },
            }),
          });
        } catch {
          // Ignore
        }
      }
    }, 2000);

    return () => clearInterval(reportInterval);
  }, [code, activeMedia]);

  const pairingUrl = typeof window !== "undefined" ? `${window.location.origin}/?cast=${code || ""}` : "";

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden select-none">
      {/* Luz ambiente de fundo estilo cinema */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-red-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-rose-700/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Topo da Tela da TV */}
      <header className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <WmplayLogo size="lg" isLight={false} showSubtitle={true} />
          <span className="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-600/90 text-white shadow-lg shadow-red-600/30">
            MODO RECEPTOR SMART TV
          </span>
        </div>

        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </header>

      {/* Centro: Painel de Pareamento da TV */}
      <main className="relative z-10 max-w-4xl mx-auto w-full text-center my-auto py-8">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs sm:text-sm font-bold shadow-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Transmissão Direta em 60 FPS · Zero Travamento e Zero Delay</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Transmitir para esta Smart TV
          </h1>

          <p className="text-sm sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Abra o <strong className="text-white">WMPLAY</strong> no celular, toque na aba{" "}
            <strong className="text-red-500">Transmitir</strong> e digite o código abaixo:
          </p>

          {/* CÓDIGO GIGANTE NA TELA DA TV */}
          {code ? (
            <div className="space-y-6">
              <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950/90 border-2 border-red-600/60 shadow-2xl shadow-red-600/20 max-w-xl mx-auto backdrop-blur-xl">
                <span className="text-xs uppercase tracking-widest font-black text-slate-400 block mb-2">
                  CÓDIGO DE PAREAMENTO:
                </span>
                <div className="text-5xl sm:text-7xl md:text-8xl font-mono font-black tracking-widest text-white flex items-center justify-center gap-4 text-glow">
                  <span className="text-red-500">{code.slice(0, 3)}</span>
                  <span className="text-zinc-600">·</span>
                  <span className="text-white">{code.slice(3, 6)}</span>
                </div>
              </div>

              {/* Status de Conexão */}
              <div className="flex items-center justify-center gap-3">
                {controllerConnected ? (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-sm font-bold">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <span>Celular Conectado! Escolha um filme ou série no celular...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-700 text-slate-400 text-sm font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>Aguardando conexão do seu celular...</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              <div className="pt-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-xs text-slate-400">
                  Ou escaneie com a câmera do celular:
                </span>
                <div className="p-3 bg-white rounded-2xl shadow-2xl border border-zinc-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      pairingUrl
                    )}`}
                    alt="QR Code"
                    className="w-32 h-32 sm:w-40 sm:h-40 object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-10 h-10 border-3 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-slate-400 font-bold">
                Gerando código da Smart TV...
              </span>
            </div>
          )}
        </div>
      </main>

      {/* Rodapé Informativo */}
      <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-zinc-900 pt-4 gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-red-500" />
          <span>WMPLAY Direct Hardware Stream 2.0</span>
        </div>
        <div>
          Compatível com Samsung Tizen, LG webOS, Android TV, Fire TV, Roku & Apple TV
        </div>
      </footer>

      {/* PLAYER AUTOMÁTICO QUANDO O COMANDO CHEGAR DO CELULAR */}
      {activeMedia && (
        <KodiVideoPlayer
          title={activeMedia.title}
          info={activeMedia.synopsis}
          poster={activeMedia.thumbnail}
          servers={[
            {
              name: "Servidor Principal WMPLAY (HLS Direto)",
              url: activeMedia.link || "",
              type: "video",
            },
          ]}
          activeServerIndex={0}
          onSelectServer={() => {}}
          onClose={() => setActiveMedia(null)}
          currentSeason={activeMedia.season}
          currentEpisode={activeMedia.episode}
        />
      )}
    </div>
  );
}
