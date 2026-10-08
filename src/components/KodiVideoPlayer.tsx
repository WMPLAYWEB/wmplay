"use client";

import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  ExternalLink,
  RotateCw,
  AlertCircle,
  Loader2,
  Tv2
} from "lucide-react";

export interface ServerOption {
  name: string;
  url: string;
  type: "video" | "embed";
}

interface KodiVideoPlayerProps {
  title: string;
  info?: string;
  poster?: string;
  servers: ServerOption[];
  activeServerIndex: number;
  onSelectServer: (index: number) => void;
  onClose: () => void;
}

export default function KodiVideoPlayer({
  title,
  info,
  poster,
  servers,
  activeServerIndex,
  onSelectServer,
  onClose,
}: KodiVideoPlayerProps) {
  const currentServer = servers[activeServerIndex] || servers[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [antiPopupMode, setAntiPopupMode] = useState(false);

  // Setup Video / Hls playback
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    if (!currentServer) return;

    if (currentServer.type === "video") {
      const video = videoRef.current;
      if (!video) return;

      // Clean up previous HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      const streamUrl = currentServer.url;
      const isHls = streamUrl.includes(".m3u8");

      if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play().catch(() => {
            // Autoplay blocked by browser, user can click play
            setIsPlaying(false);
          });
        });

        let hasRetriedProxy = false;
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (!hasRetriedProxy && !streamUrl.startsWith('/api/proxy-stream') && !streamUrl.includes('proxy-stream')) {
                  hasRetriedProxy = true;
                  console.warn("Falha de rede direta, alternando automaticamente para o Proxy Rápido Local...");
                  const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
                  hls.loadSource(proxyUrl);
                  hls.startLoad();
                } else {
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                setIsLoading(false);
                setHasError(true);
                setErrorMessage("Falha de conexão com a transmissão ao vivo. Tente selecionar outro servidor ao lado.");
                break;
            }
          }
        });
      } else {
        // Native HTML5 video (.mp4 or native HLS support)
        video.src = streamUrl;
        video.load();

        const handleCanPlay = () => {
          setIsLoading(false);
          video.play().catch(() => {
            setIsPlaying(false);
          });
        };

        const handleError = () => {
          setIsLoading(false);
          setHasError(true);
          setErrorMessage("Erro ao carregar o arquivo de vídeo. Tente outro servidor.");
        };

        video.addEventListener("canplay", handleCanPlay);
        video.addEventListener("error", handleError);

        return () => {
          video.removeEventListener("canplay", handleCanPlay);
          video.removeEventListener("error", handleError);
        };
      }
    } else {
      // Embed iframe loading timer
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentServer]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleFullscreen = () => {
    const el = document.getElementById("kodi-player-container");
    if (el) {
      if (!document.fullscreenElement) {
        el.requestFullscreen().catch(console.error);
      } else {
        document.exitFullscreen().catch(console.error);
      }
    }
  };

  const handleOpenExternal = () => {
    if (currentServer?.url) {
      window.open(currentServer.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center backdrop-blur-xl animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="absolute top-0 left-0 right-0 p-2.5 sm:p-4 md:p-6 bg-gradient-to-b from-black/95 via-black/85 to-transparent z-20">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <p className="text-[10px] sm:text-xs text-red-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                WMPLAY · Reprodução
              </p>
              <button
                onClick={() => setAntiPopupMode((prev) => !prev)}
                className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-1 transition-all cursor-pointer ${
                  antiPopupMode
                    ? "text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 hover:bg-emerald-900"
                    : "text-slate-400 bg-black/90 border border-zinc-800 hover:text-white"
                }`}
                title={
                  antiPopupMode
                    ? "Anti-Popup Ativado. Clique para Desativar."
                    : "Modo Compatível Ativo. Clique para ativar Anti-Popup."
                }
              >
                <span className={`w-1.5 h-1.5 rounded-full ${antiPopupMode ? "bg-emerald-400" : "bg-red-500"}`} />
                {antiPopupMode ? "🛡️ Anti-Popup" : "🔓 Compatível"}
              </button>
            </div>
            <h2 className="text-base sm:text-xl md:text-2xl font-black text-white drop-shadow truncate mt-0.5">
              {title}
            </h2>
            {info && (
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 max-w-3xl truncate">
                {info}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
            {/* Server Selector Chips (Desktop) */}
            {servers.length > 1 && (
              <div className="hidden md:flex items-center gap-1 bg-zinc-950/90 border border-zinc-800 p-1 rounded-xl max-w-md overflow-x-auto">
                {servers.map((srv, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectServer(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeServerIndex === idx
                        ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                    }`}
                  >
                    {srv.name}
                  </button>
                ))}
              </div>
            )}

            {/* Reload Current Server */}
            <button
              onClick={() => {
                setIsLoading(true);
                setHasError(false);
                onSelectServer(activeServerIndex);
              }}
              className="p-2 sm:p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Recarregar Servidor"
            >
              <RotateCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Open in Dedicated Window (Bypasses all iframe blocks) */}
            <button
              onClick={handleOpenExternal}
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-red-950/80 border border-zinc-800 hover:border-red-500 text-red-400 text-xs font-bold transition-all shadow-md"
              title="Abrir em Nova Aba"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">Abrir em Nova Aba</span>
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={handleFullscreen}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border border-zinc-800"
              title="Alternar Tela Cheia"
            >
              <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-red-600 text-white transition-colors border border-zinc-800"
              title="Fechar Player"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Server Selector Chips (Mobile & Tablet) */}
        {servers.length > 1 && (
          <div className="flex md:hidden items-center gap-1.5 bg-zinc-950/90 border border-zinc-800 p-1 rounded-xl max-w-full overflow-x-auto scrollbar-none mt-2">
            {servers.map((srv, idx) => (
              <button
                key={idx}
                onClick={() => onSelectServer(idx)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 ${
                  activeServerIndex === idx
                    ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                {srv.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Video Screen Container */}
      <div
        id="kodi-player-container"
        className="w-full max-w-6xl aspect-video relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-red-600/30 bg-black mt-20 sm:mt-16 flex items-center justify-center shadow-red-950/20"
      >
        {/* Loading Indicator Overlay */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center gap-3 backdrop-blur-sm pointer-events-none">
            <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
            <p className="text-sm font-bold text-slate-200">
              Conectando ao stream ({currentServer?.name || "Carregando"})...
            </p>
            <p className="text-xs text-zinc-400">
              Aguarde enquanto o sinal é sincronizado.
            </p>
          </div>
        )}

        {/* Error Fallback Card */}
        {hasError && (
          <div className="absolute inset-0 z-10 bg-black/95 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Falha ao reproduzir este servidor</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md">
                {errorMessage || "O sinal deste servidor pode estar instável ou bloqueado pelo navegador."}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              {servers.length > 1 && (
                <button
                  onClick={() => {
                    const next = (activeServerIndex + 1) % servers.length;
                    onSelectServer(next);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 hover:from-red-500 hover:to-rose-600"
                >
                  <RotateCw className="w-4 h-4" />
                  <span>Tentar Outro Servidor ({servers[(activeServerIndex + 1) % servers.length]?.name})</span>
                </button>
              )}
              <button
                onClick={handleOpenExternal}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-red-400 font-bold text-xs border border-zinc-800 flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir Diretamente</span>
              </button>
            </div>
          </div>
        )}

        {/* Player: Video Stream or Iframe Embed */}
        {currentServer?.type === "video" ? (
          <div className="w-full h-full relative group">
            <video
              ref={videoRef}
              controls
              playsInline
              autoPlay
              poster={poster}
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          </div>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              key={currentServer?.url + (antiPopupMode ? "-sandboxed" : "-direct")}
              src={currentServer?.url}
              title={title}
              referrerPolicy="origin"
              sandbox={
                antiPopupMode
                  ? "allow-scripts allow-same-origin allow-forms allow-presentation"
                  : undefined
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
            />
            {/* Non-intrusive Helper overlay at the bottom */}
            <div className="absolute bottom-2 left-4 right-4 z-10 hidden sm:flex items-center justify-between text-[11px] text-zinc-300 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-zinc-800 pointer-events-none">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>
                  <b>Dica:</b> Para iniciar, clique no botão <b>Play</b> no centro. Caso abra uma propaganda em outra aba, basta fechá-la.
                </span>
              </div>
              <span className="text-zinc-400 font-mono">
                {currentServer?.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Quick Server Switcher for Mobile / Small Screens */}
      {servers.length > 1 && (
        <div className="flex sm:hidden items-center gap-2 mt-3 overflow-x-auto max-w-full px-4">
          {servers.map((srv, idx) => (
            <button
              key={idx}
              onClick={() => onSelectServer(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                activeServerIndex === idx
                  ? "bg-red-600 text-white"
                  : "bg-black border border-zinc-800 text-zinc-400"
              }`}
            >
              {srv.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
