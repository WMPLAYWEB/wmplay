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
  Minimize2,
  PictureInPicture2,
  ExternalLink,
  RotateCw,
  AlertCircle,
  Loader2,
  Tv2,
  Zap
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
  isLiteMode?: boolean;
}

export default function KodiVideoPlayer({
  title,
  info,
  poster,
  servers,
  activeServerIndex,
  onSelectServer,
  onClose,
  isLiteMode = false,
}: KodiVideoPlayerProps) {
  const currentServer = servers[activeServerIndex] || servers[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [antiPopupMode, setAntiPopupMode] = useState(true);

  // Bloqueador de Anúncios Ativo (Intercepta pop-ups e abas abertas por scripts terceiros)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalOpen = window.open;
    window.open = function (...args) {
      console.warn("[WMPLAY AdBlock] Anúncio em nova janela/aba bloqueado:", args[0]);
      return null;
    };
    return () => {
      window.open = originalOpen;
    };
  }, []);

  // Suporte Nativo a Controles Remotos de Smart TVs (LG NetCast/webOS, Samsung Tizen/Orsay, Philco)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTvRemote = (e: KeyboardEvent) => {
      // Teclas de Voltar da TV:
      // 461 = LG webOS / NetCast Back
      // 10009 = Samsung Tizen / Orsay Return
      // 27 = Escape
      // 8 = Backspace
      if (
        e.keyCode === 461 ||
        e.keyCode === 10009 ||
        e.key === "Escape" ||
        e.key === "GoBack" ||
        e.key === "Back"
      ) {
        e.preventDefault();
        onClose();
        return;
      }

      // Play / Pause no controle remoto (179 = MediaPlayPause, 250 = Play, 19 = Pause)
      if (
        e.key === "MediaPlayPause" ||
        e.keyCode === 179 ||
        e.keyCode === 250 ||
        e.keyCode === 19
      ) {
        e.preventDefault();
        togglePlay();
        return;
      }

      // Avançar / Retroceder 10s nas setas do controle
      if (e.key === "ArrowLeft") {
        if (videoRef.current && !isMiniPlayer) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        }
      } else if (e.key === "ArrowRight") {
        if (videoRef.current && !isMiniPlayer) {
          videoRef.current.currentTime = Math.min(
            videoRef.current.duration || 999999,
            videoRef.current.currentTime + 10
          );
        }
      }
    };

    window.addEventListener("keydown", handleTvRemote);
    return () => window.removeEventListener("keydown", handleTvRemote);
  }, [onClose, isMiniPlayer]);

  // Setup Video / Hls playback
  useEffect(() => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");

    if (!currentServer) return;

    if (!currentServer.url || currentServer.url === "ERROR_UNAVAILABLE") {
      if (currentServer.url === "ERROR_UNAVAILABLE") {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Este título está temporariamente fora de sinal no servidor principal do Brazuca Play.");
        return;
      }
      setIsLoading(true);
      const timeoutId = setTimeout(() => {
        setIsLoading(false);
        setHasError(true);
        setErrorMessage("Não foi possível sincronizar o sinal deste título no momento. Tente outro servidor.");
      }, 5000);
      return () => clearTimeout(timeoutId);
    }

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
      const canNativeHls = Boolean(
        video.canPlayType && video.canPlayType("application/vnd.apple.mpegurl")
      );

      // Em Smart TVs antigas (LG webOS, NetCast, Philco, Samsung), usar hardware nativo sem Web Workers
      if (isHls && isLiteMode && canNativeHls) {
        console.log("[WMPLAY TV Lite] Usando decodificador nativo de hardware da Smart TV...");
        try {
          (video as any).referrerPolicy = "no-referrer";
        } catch {}
        video.src = streamUrl;
        video.load();

        const handleReady = () => {
          setIsLoading(false);
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
        };

        const handleError = () => {
          if (servers.length > 1 && activeServerIndex + 1 < servers.length) {
            onSelectServer(activeServerIndex + 1);
            return;
          }
          setIsLoading(false);
          setHasError(true);
          setErrorMessage("Erro ao decodificar sinal no player nativo da TV.");
        };

        video.addEventListener("loadedmetadata", handleReady);
        video.addEventListener("canplay", handleReady);
        video.addEventListener("playing", handleReady);
        video.addEventListener("error", handleError);

        const fallbackTimer = setTimeout(() => {
          setIsLoading(false);
        }, 1800);

        return () => {
          clearTimeout(fallbackTimer);
          video.removeEventListener("loadedmetadata", handleReady);
          video.removeEventListener("canplay", handleReady);
          video.removeEventListener("playing", handleReady);
          video.removeEventListener("error", handleError);
        };
      } else if (isHls && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: !isLiteMode, // Desativa Web Workers pesados em TVs com pouca RAM
          lowLatencyMode: false,
          liveSyncDurationCount: isLiteMode ? 2 : 3,
          liveMaxLatencyDurationCount: isLiteMode ? 5 : 8,
          maxBufferLength: isLiteMode ? 10 : 30, // TV Lite: buffer de 10s para não estourar memória RAM da TV
          maxMaxBufferLength: isLiteMode ? 20 : 60,
          backBufferLength: isLiteMode ? 10 : 30,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 5,
        });
        hlsRef.current = hls;

        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
        });

        let hasRetriedProxy = false;
        hls.on(Hls.Events.ERROR, (_, data) => {
          // Recuperação automática contra travamentos de buffer (Buffer Stalled)
          if (
            data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR ||
            data.details === Hls.ErrorDetails.BUFFER_NUDGE_ON_STALL
          ) {
            console.warn("[WMPLAY] Buffer stall detectado, normalizando vídeo para reprodução contínua...");
            if (video && !video.paused) {
              video.currentTime += 0.1;
              hls.startLoad();
            }
            return;
          }

          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                if (!hasRetriedProxy && !streamUrl.startsWith('/api/proxy-stream') && !streamUrl.includes('proxy-stream')) {
                  hasRetriedProxy = true;
                  console.warn("[WMPLAY] Falha de rede direta, alternando automaticamente para o Proxy Rápido Local...");
                  const proxyUrl = `/api/proxy-stream?url=${encodeURIComponent(streamUrl)}`;
                  hls.loadSource(proxyUrl);
                  hls.startLoad();
                } else {
                  hls.startLoad();
                }
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.warn("[WMPLAY] Recuperando erro de mídia HLS...");
                hls.recoverMediaError();
                break;
              default:
                hls.destroy();
                if (servers.length > 1 && activeServerIndex + 1 < servers.length) {
                  console.warn(`[WMPLAY] Falha crítica, alternando para servidor reserva: ${servers[activeServerIndex + 1]?.name}`);
                  onSelectServer(activeServerIndex + 1);
                } else {
                  setIsLoading(false);
                  setHasError(true);
                  setErrorMessage("Falha de conexão com a transmissão ao vivo. Tente selecionar outro servidor ao lado.");
                }
                break;
            }
          }
        });
      } else {
        // Native HTML5 video (.mp4 or native HLS support)
        try {
          (video as any).referrerPolicy = "no-referrer";
        } catch {}
        video.src = streamUrl;
        video.load();

        const handleReady = () => {
          setIsLoading(false);
          video.play()
            .then(() => setIsPlaying(true))
            .catch(() => {
              setIsPlaying(false);
              setIsLoading(false);
            });
        };

        const handleError = () => {
          if (servers.length > 1 && activeServerIndex + 1 < servers.length) {
            console.warn(
              `[WMPLAY] Falha no servidor ${activeServerIndex + 1}, alternando automaticamente para o servidor reserva: ${
                servers[activeServerIndex + 1]?.name
              }`
            );
            onSelectServer(activeServerIndex + 1);
            return;
          }
          setIsLoading(false);
          setHasError(true);
          setErrorMessage("Erro ao carregar o arquivo de vídeo. Tente outro servidor.");
        };

        video.addEventListener("loadedmetadata", handleReady);
        video.addEventListener("loadeddata", handleReady);
        video.addEventListener("canplay", handleReady);
        video.addEventListener("play", handleReady);
        video.addEventListener("playing", handleReady);
        video.addEventListener("timeupdate", handleReady);
        video.addEventListener("error", handleError);

        // Timer de segurança: libera os controles após 1.5s para garantir que o player nunca trave
        const fallbackTimer = setTimeout(() => {
          setIsLoading(false);
        }, 1500);

        return () => {
          clearTimeout(fallbackTimer);
          video.removeEventListener("loadedmetadata", handleReady);
          video.removeEventListener("loadeddata", handleReady);
          video.removeEventListener("canplay", handleReady);
          video.removeEventListener("play", handleReady);
          video.removeEventListener("playing", handleReady);
          video.removeEventListener("timeupdate", handleReady);
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

  const handleToggleNativePip = async () => {
    if (videoRef.current) {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
        } else if (document.pictureInPictureEnabled) {
          await videoRef.current.requestPictureInPicture();
        }
      } catch (err) {
        console.warn("[WMPLAY] Picture-in-Picture nativo indisponível ou bloqueado:", err);
      }
    }
  };

  const handleOpenExternal = () => {
    if (currentServer?.url) {
      window.open(currentServer.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className={
        isMiniPlayer
          ? "fixed bottom-5 right-5 z-50 w-[320px] sm:w-[380px] md:w-[420px] aspect-video rounded-2xl shadow-2xl border-2 border-red-500/80 bg-black overflow-hidden group animate-in slide-in-from-bottom-5 duration-200 shadow-red-950/60"
          : `fixed inset-0 z-50 bg-black flex flex-col items-center justify-center ${
              isLiteMode ? "" : "backdrop-blur-xl animate-in fade-in duration-200"
            }`
      }
    >
      {/* ============================================================== */}
      {/* CABEÇALHO DO MODO TELA CHEIA / MODAL COMPLETO                  */}
      {/* ============================================================== */}
      {!isMiniPlayer && (
        <div className="absolute top-0 left-0 right-0 p-2.5 sm:p-4 md:p-6 bg-gradient-to-b from-black/95 via-black/85 to-transparent z-20">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <p className="text-[10px] sm:text-xs text-red-500 uppercase tracking-widest font-black flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                  WMPLAY · Reprodução
                </p>
                {isLiteMode && (
                  <span className="text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 text-amber-300 bg-amber-950/80 border border-amber-500/50">
                    <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ⚡ Modo TV Lite (Acelerado)
                  </span>
                )}
                {currentServer?.type === "video" ? (
                  <span className="text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 text-emerald-300 bg-emerald-950/80 border border-emerald-500/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    🛡️ Transmissão Direta (100% Sem Anúncios · Padrão Kodi)
                  </span>
                ) : (
                  <button
                    onClick={() => setAntiPopupMode((prev) => !prev)}
                    className={`text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
                      antiPopupMode
                        ? "text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 hover:bg-emerald-900"
                        : "text-amber-300 bg-amber-950/80 border border-amber-500/50 hover:bg-amber-900"
                    }`}
                    title={
                      antiPopupMode
                        ? "Bloqueador de Anúncios Ativado: Pop-ups e abas são bloqueados automaticamente. Clique para desativar."
                        : "Modo Aberto: Clique para reativar o Bloqueador de Anúncios."
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${antiPopupMode ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {antiPopupMode ? "🛡️ Sem Anúncios (Ativo)" : "⚠️ Anúncios Permitidos"}
                  </button>
                )}
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

            {/* Ações do Topo */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 shrink-0">
              {/* Seletor de Servidores (Desktop) */}
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

              {/* Botão Mini Player Flutuante */}
              <button
                onClick={() => setIsMiniPlayer(true)}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-800 shadow-md"
                title="Minimizar (Modo Mini Player Flutuante)"
              >
                <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400" />
                <span className="hidden lg:inline text-xs font-bold">Mini Player</span>
              </button>

              {/* Botão Picture-in-Picture Nativo */}
              {currentServer?.type === "video" && (
                <button
                  onClick={handleToggleNativePip}
                  className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors border border-zinc-800"
                  title="Picture-in-Picture Externo"
                >
                  <PictureInPicture2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {/* Recarregar Servidor Atual */}
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

              {/* Abrir em Nova Aba */}
              <button
                onClick={handleOpenExternal}
                className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-red-950/80 border border-zinc-800 hover:border-red-500 text-red-400 text-xs font-bold transition-all shadow-md"
                title="Abrir em Nova Aba"
              >
                <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline">Abrir em Nova Aba</span>
              </button>

              {/* Tela Cheia Nativa */}
              <button
                onClick={handleFullscreen}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white transition-colors border border-zinc-800"
                title="Alternar Tela Cheia"
              >
                <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>

              {/* Fechar Player */}
              <button
                onClick={onClose}
                className="p-2 sm:p-2.5 rounded-xl bg-zinc-900 hover:bg-red-600 text-white transition-colors border border-zinc-800"
                title="Fechar Player"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Seletor de Servidores (Mobile & Tablet) */}
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
      )}

      {/* ============================================================== */}
      {/* CABEÇALHO COMPACTO NO MODO MINI PLAYER FLUTUANTE               */}
      {/* ============================================================== */}
      {isMiniPlayer && (
        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/90 via-black/60 to-transparent z-30 flex items-center justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
            <p className="text-[11px] font-bold text-white truncate drop-shadow">{title}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {currentServer?.type === "video" && (
              <button
                onClick={handleToggleNativePip}
                className="p-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                title="Picture-in-Picture Externo"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setIsMiniPlayer(false)}
              className="p-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
              title="Restaurar Tela Cheia"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg bg-zinc-900/90 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RECIPIENTE PRINCIPAL DO VÍDEO (PERMANECE MONTADO EM AMBOS OS MODOS) */}
      {/* ============================================================== */}
      <div
        id="kodi-player-container"
        className={
          isMiniPlayer
            ? "w-full h-full relative bg-black flex items-center justify-center"
            : "w-full max-w-6xl aspect-video relative rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-red-600/30 bg-black mt-20 sm:mt-16 flex items-center justify-center shadow-red-950/20"
        }
      >
        {/* Indicador de Carregamento */}
        {isLoading && (
          <div className="absolute inset-0 z-10 bg-black/85 flex flex-col items-center justify-center gap-3 backdrop-blur-sm pointer-events-none">
            <Loader2 className={isMiniPlayer ? "w-7 h-7 text-red-500 animate-spin" : "w-12 h-12 text-red-500 animate-spin"} />
            {!isMiniPlayer && (
              <>
                <p className="text-sm font-bold text-slate-200">
                  Conectando ao stream ({currentServer?.name || "Carregando"})...
                </p>
                <p className="text-xs text-zinc-400">
                  Aguarde enquanto o sinal é sincronizado.
                </p>
              </>
            )}
          </div>
        )}

        {/* Fallback de Erro */}
        {hasError && (
          <div className="absolute inset-0 z-10 bg-black/95 flex flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Falha ao reproduzir este servidor</h3>
              {!isMiniPlayer && (
                <p className="text-xs text-zinc-400 mt-1 max-w-md">
                  {errorMessage || "O sinal deste servidor pode estar instável ou bloqueado pelo navegador."}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              {servers.length > 1 && (
                <button
                  onClick={() => {
                    const next = (activeServerIndex + 1) % servers.length;
                    onSelectServer(next);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-1.5 hover:from-red-500 hover:to-rose-600"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Alternar Servidor</span>
                </button>
              )}
              {!isMiniPlayer && (
                <button
                  onClick={handleOpenExternal}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-red-400 font-bold text-xs border border-zinc-800 flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir Diretamente</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Player: Stream de Vídeo Direto ou Iframe Embed */}
        {currentServer?.type === "video" ? (
          <div className="w-full h-full relative group flex items-center justify-center">
            <video
              ref={videoRef}
              controls={!isMiniPlayer}
              playsInline
              autoPlay
              poster={poster}
              className="w-full h-full object-contain cursor-pointer"
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Controles de Sobreposição no Mini Player ao passar o mouse */}
            {isMiniPlayer && (
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="pointer-events-auto p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl transition-transform hover:scale-110"
                  title={isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="pointer-events-auto p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700 shadow-xl transition-transform hover:scale-110"
                  title={isMuted ? "Ativar Áudio" : "Mudo"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Botão Central de Início de Reprodução quando pausado/aguardando clique */}
            {!isPlaying && !isLoading && !hasError && !isMiniPlayer && (
              <button
                type="button"
                onClick={togglePlay}
                className="absolute z-10 flex flex-col items-center justify-center gap-3 p-5 sm:p-7 rounded-2xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 transition-all hover:scale-105 cursor-pointer shadow-2xl group/playbtn"
                title="Clique para Iniciar Reprodução"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-red-600 group-hover/playbtn:bg-red-500 flex items-center justify-center shadow-lg shadow-red-600/50 transition-transform">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white fill-white ml-1" />
                </div>
                <div className="text-center">
                  <p className="text-sm sm:text-base font-black text-white tracking-wide uppercase">
                    Clique para Assistir
                  </p>
                  <p className="text-[11px] sm:text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    100% Dublado PT-BR · Sem Anúncios
                  </p>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div className="w-full h-full relative">
            <iframe
              key={currentServer?.url + (antiPopupMode ? "-sandboxed" : "-direct")}
              src={currentServer?.url}
              title={title}
              referrerPolicy="no-referrer"
              sandbox={
                antiPopupMode
                  ? "allow-scripts allow-forms allow-presentation allow-encrypted-media"
                  : undefined
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              className="w-full h-full border-0"
              onLoad={() => setIsLoading(false)}
            />
            {/* Aviso protetor no rodapé para modo tela cheia */}
            {!isMiniPlayer && (
              <div className="absolute bottom-2 left-4 right-4 z-10 hidden sm:flex items-center justify-between text-[11px] text-zinc-300 bg-black/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-zinc-800 pointer-events-none">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    <b>🛡️ WMPLAY Protegido:</b> Pop-ups e abas bloqueadas automaticamente. Use os botões acima para alternar entre servidores Dublados.
                  </span>
                </div>
                <span className="text-zinc-400 font-mono">
                  {currentServer?.name}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Seletor rápido inferior em telas móveis quando em tela cheia */}
      {!isMiniPlayer && servers.length > 1 && (
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
