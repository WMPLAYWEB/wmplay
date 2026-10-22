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
  Zap,
  Gauge,
  FastForward,
  Rewind,
  SkipForward,
  Clock,
  History,
  Ratio,
  Sliders,
  Check,
  ListVideo
} from "lucide-react";

export interface ServerOption {
  name: string;
  url: string;
  type: "video" | "embed";
}

export interface FormattedSeason {
  seasonNumber: number;
  seasonTitle: string;
  episodes: {
    number: number;
    title: string;
    link?: string;
    duration?: string;
    streamUrl?: string;
  }[];
}

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return "00:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
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
  resumeTime?: number;
  onProgressUpdate?: (currentTime: number, duration: number) => void;
  onNextEpisode?: () => void;
  hasNextEpisode?: boolean;
  isTv?: boolean;
  seriesSeasons?: FormattedSeason[];
  currentSeason?: number;
  currentEpisode?: number;
  onSelectEpisode?: (seasonNum: number, epNum: number, episodeTitle: string, episodeLink?: string) => void;
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
  resumeTime = 0,
  onProgressUpdate,
  onNextEpisode,
  hasNextEpisode = false,
  isTv = false,
  seriesSeasons = [],
  currentSeason,
  currentEpisode,
  onSelectEpisode,
}: KodiVideoPlayerProps) {
  const currentServer = servers[activeServerIndex] || servers[0];
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Gaveta de Episódios Dentro do Player
  const [isEpisodeDrawerOpen, setIsEpisodeDrawerOpen] = useState(false);
  const [drawerSeasonTab, setDrawerSeasonTab] = useState<number>(currentSeason || 1);

  useEffect(() => {
    if (currentSeason) setDrawerSeasonTab(currentSeason);
  }, [currentSeason]);

  // Novos Recursos Avançados do Player
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(Boolean(resumeTime && resumeTime > 15));
  const [tapFeedback, setTapFeedback] = useState<{ side: "left" | "right" } | null>(null);
  const [showNextPrompt, setShowNextPrompt] = useState<boolean>(false);
  const [countdownNext, setCountdownNext] = useState<number>(15);

  // 1. Ajuste de Tela / Zoom (Original, Preencher / Zoom, Esticar)
  const [aspectMode, setAspectMode] = useState<"contain" | "cover" | "fill">("contain");
  const [aspectFeedback, setAspectFeedback] = useState<string | null>(null);
  const aspectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const aspectLabels: Record<string, string> = {
    contain: "Original",
    cover: "Preencher",
    fill: "Esticar"
  };

  const cycleAspectMode = () => {
    const next = aspectMode === "contain" ? "cover" : aspectMode === "cover" ? "fill" : "contain";
    setAspectMode(next);
    try {
      localStorage.setItem("wmplay_aspect_mode", next);
    } catch {}
    setAspectFeedback(aspectLabels[next]);
    if (aspectTimeoutRef.current) clearTimeout(aspectTimeoutRef.current);
    aspectTimeoutRef.current = setTimeout(() => setAspectFeedback(null), 1400);
  };

  // 2. Seletor de Qualidade HLS (Live TV & HLS)
  const [qualityLevels, setQualityLevels] = useState<{ index: number; label: string }[]>([]);
  const [currentQualityIndex, setCurrentQualityIndex] = useState<number>(-1);
  const [showQualityMenu, setShowQualityMenu] = useState<boolean>(false);

  const handleSelectQuality = (index: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
      setCurrentQualityIndex(index);
      setShowQualityMenu(false);
    }
  };

  // 3. Amplificador de Áudio / Sound Booster (Web Audio API até 200%)
  const [audioBoost, setAudioBoost] = useState<number>(1);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceConnectedRef = useRef<boolean>(false);

  const initAudioBoost = () => {
    if (!videoRef.current || sourceConnectedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      if (!gainNodeRef.current) {
        gainNodeRef.current = audioCtxRef.current.createGain();
        gainNodeRef.current.connect(audioCtxRef.current.destination);
      }
      const source = audioCtxRef.current.createMediaElementSource(videoRef.current);
      source.connect(gainNodeRef.current);
      sourceConnectedRef.current = true;
    } catch (err) {
      console.warn("Web Audio Booster não inicializado:", err);
    }
  };

  const cycleAudioBoost = () => {
    initAudioBoost();
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    const next = audioBoost === 1 ? 1.5 : audioBoost === 1.5 ? 2.0 : 1.0;
    setAudioBoost(next);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = next;
    }
    try {
      localStorage.setItem("wmplay_audio_boost", String(next));
    } catch {}
    showVolumeIndicator(videoRef.current ? videoRef.current.volume : 1, isMuted, next);
  };

  const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
  const lastProgressReportRef = useRef<number>(0);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastToggleTimeRef = useRef<number>(0);
  const lastNativePauseTimeRef = useRef<number>(0);

  // Estados e Referências de Volume Persistente
  const [currentVolume, setCurrentVolume] = useState<number>(1);
  const [volumeFeedback, setVolumeFeedback] = useState<{ volume: number; muted: boolean; boost?: number } | null>(null);
  const volumeFeedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar configurações de volume, aspect e boost salvas no localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const savedVol = localStorage.getItem("wmplay_player_volume");
      const savedMuted = localStorage.getItem("wmplay_player_muted");
      const savedAspect = localStorage.getItem("wmplay_aspect_mode") as any;
      const savedBoost = localStorage.getItem("wmplay_audio_boost");

      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          setCurrentVolume(val);
        }
      }
      if (savedMuted !== null) {
        setIsMuted(savedMuted === "true");
      }
      if (savedAspect === "contain" || savedAspect === "cover" || savedAspect === "fill") {
        setAspectMode(savedAspect);
      }
      if (savedBoost !== null) {
        const b = parseFloat(savedBoost);
        if (b === 1 || b === 1.5 || b === 2) {
          setAudioBoost(b);
        }
      }
    } catch {}
  }, []);

  // Exibir indicador visual de volume (estilo Smart TV/Kodi)
  const showVolumeIndicator = (vol: number, muted: boolean, boost = audioBoost) => {
    setVolumeFeedback({ volume: vol, muted, boost });
    if (volumeFeedbackTimeoutRef.current) clearTimeout(volumeFeedbackTimeoutRef.current);
    volumeFeedbackTimeoutRef.current = setTimeout(() => {
      setVolumeFeedback(null);
    }, 1400);
  };

  // Aplicar configurações de áudio persistidas a qualquer elemento de vídeo
  const applySavedAudioSettings = (v: HTMLVideoElement) => {
    try {
      const savedVol = localStorage.getItem("wmplay_player_volume");
      const savedMuted = localStorage.getItem("wmplay_player_muted");
      if (savedVol !== null) {
        const val = parseFloat(savedVol);
        if (!isNaN(val) && val >= 0 && val <= 1) {
          v.volume = val;
          setCurrentVolume(val);
        }
      }
      if (savedMuted !== null) {
        const isM = savedMuted === "true";
        v.muted = isM;
        setIsMuted(isM);
      }
    } catch {}
  };

  // Ajustar volume suavemente com persistência
  const handleAdjustVolume = (delta: number) => {
    if (!videoRef.current) return;
    let nextVol = Math.round((videoRef.current.volume + delta) * 10) / 10;
    nextVol = Math.max(0, Math.min(1, nextVol));
    videoRef.current.volume = nextVol;
    if (nextVol > 0 && videoRef.current.muted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
    setCurrentVolume(nextVol);
    try {
      localStorage.setItem("wmplay_player_volume", String(nextVol));
      localStorage.setItem("wmplay_player_muted", String(videoRef.current.muted));
    } catch {}
    showVolumeIndicator(nextVol, videoRef.current.muted);
  };

  // Alternar mudo
  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !videoRef.current.muted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
      try {
        localStorage.setItem("wmplay_player_muted", String(nextMuted));
      } catch {}
      showVolumeIndicator(videoRef.current.volume, nextMuted);
    }
  };

  // Alternar tela cheia nativa
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

  // Alternar reproduzir / pausar com debounce anti-conflito
  const togglePlay = () => {
    const now = Date.now();
    if (now - lastToggleTimeRef.current < 350) return;
    lastToggleTimeRef.current = now;

    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setHasStartedPlaying(true);
          })
          .catch(console.error);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  // Atualizar banner de retorno se resumeTime for fornecido na inicialização do título/servidor
  useEffect(() => {
    if (resumeTime && resumeTime > 15) {
      setShowResumeBanner(true);
    } else {
      setShowResumeBanner(false);
    }
  }, [currentServer]);

  // Função para aplicar retomada
  const handleResumePlayback = () => {
    setShowResumeBanner(false);
    if (videoRef.current && resumeTime) {
      videoRef.current.currentTime = resumeTime;
      videoRef.current.play().catch(() => {});
    }
  };

  // Alternar velocidade de reprodução (1.0x -> 1.25x -> 1.5x -> 2.0x -> 1.0x)
  const handleCycleSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  // Pular 10s para frente ou para trás
  const handleSeekDelta = (delta: number) => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || 999999;
    const newTime = Math.max(0, Math.min(duration, current + delta));
    videoRef.current.currentTime = newTime;

    // Feedback visual
    setTapFeedback({ side: delta < 0 ? "left" : "right" });
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    tapTimeoutRef.current = setTimeout(() => {
      setTapFeedback(null);
    }, 700);
  };

  // Detector de toque duplo na tela (YouTube-style para celulares e tablets)
  const handleVideoTouch = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const now = Date.now();
    const timeDiff = now - lastTapRef.current.time;
    const rect = e.currentTarget.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const isLeftSide = touchX < rect.width / 2;

    if (timeDiff > 40 && timeDiff < 320) {
      // Toque duplo detectado!
      if (isLeftSide) {
        handleSeekDelta(-10);
      } else {
        handleSeekDelta(10);
      }
      lastTapRef.current = { time: 0, x: 0 };
    } else {
      lastTapRef.current = { time: now, x: touchX };
    }
  };

  // Bloqueador de Anúncios Ativo Ultra-Rigoroso (Intercepta pop-ups, abas e links terceiros abusivos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const originalOpen = window.open;
    window.open = function (...args) {
      console.warn("[WMPLAY AdBlock] Tentativa de abertura de pop-up bloqueada:", args[0]);
      return null;
    };

    // Intercepta e previne cliques maliciosos em tags <a> com target="_blank"
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a');
      if (target && target.getAttribute('target') === '_blank') {
        const href = target.getAttribute('href') || '';
        if (!href.startsWith('https://open.spotify.com') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("[WMPLAY AdBlock] Clique em link externo suspenso/bloqueado:", href);
        }
      }
    };

    window.addEventListener('click', handleGlobalClick, true);
    return () => {
      window.open = originalOpen;
      window.removeEventListener('click', handleGlobalClick, true);
    };
  }, []);

  // Suporte Nativo a Controles Remotos de Smart TVs (LG NetCast/webOS, Samsung Tizen/Orsay, Philco) e Teclado
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
        if (isEpisodeDrawerOpen) {
          setIsEpisodeDrawerOpen(false);
          return;
        }
        onClose();
        return;
      }

      // Tecla E para abrir/fechar a Gaveta de Episódios em séries
      if (e.key === "e" || e.key === "E") {
        if (isTv && seriesSeasons && seriesSeasons.length > 0) {
          e.preventDefault();
          setIsEpisodeDrawerOpen((prev) => !prev);
          return;
        }
      }

      // Play / Pause no controle remoto e teclado (Espaço, K, MediaPlayPause)
      if (
        e.key === "MediaPlayPause" ||
        e.keyCode === 179 ||
        e.keyCode === 250 ||
        e.keyCode === 19 ||
        e.code === "Space" ||
        e.key === " " ||
        e.key === "k" ||
        e.key === "K"
      ) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          togglePlay();
          return;
        }
      }

      // Alternar Tela Cheia (Tecla F)
      if (e.key === "f" || e.key === "F") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          handleFullscreen();
          return;
        }
      }

      // Alternar Mudo (Tecla M)
      if (e.key === "m" || e.key === "M") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          toggleMute();
          return;
        }
      }

      // Alternar Proporção / Zoom de Tela (Tecla Z)
      if (e.key === "z" || e.key === "Z") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          cycleAspectMode();
          return;
        }
      }

      // Alternar Amplificador de Som (Tecla B)
      if (e.key === "b" || e.key === "B") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          cycleAudioBoost();
          return;
        }
      }

      // Ajustar Volume nas Setas Cima / Baixo (passo de 10%)
      if (e.key === "ArrowUp") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          handleAdjustVolume(0.1);
          return;
        }
      } else if (e.key === "ArrowDown") {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "input" && tag !== "textarea") {
          e.preventDefault();
          handleAdjustVolume(-0.1);
          return;
        }
      }

      // Avançar / Retroceder 10s nas setas esquerda / direita
      if (e.key === "ArrowLeft") {
        if (videoRef.current && !isMiniPlayer) {
          e.preventDefault();
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        }
      } else if (e.key === "ArrowRight") {
        if (videoRef.current && !isMiniPlayer) {
          e.preventDefault();
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
    setIsPlaying(false);
    setHasStartedPlaying(false);

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

        let initialPlayTriggered = false;
        const handleInitialReady = () => {
          setIsLoading(false);
          applySavedAudioSettings(video);
          if (!initialPlayTriggered) {
            initialPlayTriggered = true;
            video
              .play()
              .then(() => {
                setIsPlaying(true);
                setHasStartedPlaying(true);
              })
              .catch(() => {
                setIsPlaying(false);
                setIsLoading(false);
              });
          }
        };

        const handlePlaying = () => {
          setIsLoading(false);
          setIsPlaying(true);
          setHasStartedPlaying(true);
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

        video.addEventListener("loadedmetadata", handleInitialReady);
        video.addEventListener("canplay", handleInitialReady);
        video.addEventListener("playing", handlePlaying);
        video.addEventListener("error", handleError);

        const fallbackTimer = setTimeout(() => {
          setIsLoading(false);
        }, 1800);

        return () => {
          clearTimeout(fallbackTimer);
          video.removeEventListener("loadedmetadata", handleInitialReady);
          video.removeEventListener("canplay", handleInitialReady);
          video.removeEventListener("playing", handlePlaying);
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
          applySavedAudioSettings(video);
          if (hls.levels && hls.levels.length > 0) {
            const levels = hls.levels.map((lvl, idx) => {
              const height = lvl.height || 0;
              const label = height >= 1080 ? '1080p' : height >= 720 ? '720p' : height >= 480 ? '480p' : height > 0 ? `${height}p` : `Qualidade ${idx + 1}`;
              return { index: idx, label };
            });
            setQualityLevels([{ index: -1, label: 'Auto' }, ...levels]);
          }
          video.play()
            .then(() => {
              setIsPlaying(true);
              setHasStartedPlaying(true);
            })
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

        let initialPlayTriggered = false;
        const handleInitialReady = () => {
          setIsLoading(false);
          applySavedAudioSettings(video);
          if (!initialPlayTriggered) {
            initialPlayTriggered = true;
            video.play()
              .then(() => {
                setIsPlaying(true);
                setHasStartedPlaying(true);
              })
              .catch(() => {
                setIsPlaying(false);
                setIsLoading(false);
              });
          }
        };

        const handlePlaying = () => {
          setIsLoading(false);
          setIsPlaying(true);
          setHasStartedPlaying(true);
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

        video.addEventListener("loadedmetadata", handleInitialReady);
        video.addEventListener("canplay", handleInitialReady);
        video.addEventListener("playing", handlePlaying);
        video.addEventListener("error", handleError);

        // Timer de segurança: libera os controles após 1.5s para garantir que o player nunca trave
        const fallbackTimer = setTimeout(() => {
          setIsLoading(false);
        }, 1500);

        return () => {
          clearTimeout(fallbackTimer);
          video.removeEventListener("loadedmetadata", handleInitialReady);
          video.removeEventListener("canplay", handleInitialReady);
          video.removeEventListener("playing", handlePlaying);
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
        setQualityLevels([]);
        setCurrentQualityIndex(-1);
        setShowQualityMenu(false);
      }
    };
  }, [currentServer]);

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

  return (
    <div
      className={
        isMiniPlayer
          ? "fixed bottom-4 right-4 sm:bottom-5 sm:right-5 z-50 w-[calc(100vw-32px)] max-w-[340px] sm:max-w-[380px] md:max-w-[440px] aspect-video rounded-2xl shadow-2xl border-2 border-red-500/80 bg-black overflow-hidden group animate-in slide-in-from-bottom-5 duration-200 shadow-red-950/60"
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
                <span className="text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full font-mono flex items-center gap-1.5 text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  🛡️ Proteção Sem Anúncios Ativa
                </span>
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

              {/* Botão de Velocidade de Reprodução */}
              {currentServer?.type === "video" && (
                <button
                  onClick={handleCycleSpeed}
                  className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-800 text-xs font-black shadow-md cursor-pointer"
                  title="Alterar Velocidade de Reprodução (1x, 1.25x, 1.5x, 2x)"
                >
                  <Gauge className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                  <span>{playbackSpeed}x</span>
                </button>
              )}

              {/* Botão de Ajuste de Tela / Zoom (Original, Preencher / Zoom, Esticar) */}
              {currentServer?.type === "video" && (
                <button
                  onClick={cycleAspectMode}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-800 text-xs font-bold shadow-md cursor-pointer"
                  title={`Ajuste de Tela: ${aspectLabels[aspectMode]} (Clique para alternar Original/Zoom/Esticar)`}
                >
                  <Ratio className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />
                  <span className="hidden sm:inline">{aspectLabels[aspectMode]}</span>
                </button>
              )}

              {/* Seletor Manual de Qualidade HLS (TV Ao Vivo e Vídeos HLS) */}
              {qualityLevels.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu((prev) => !prev)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-zinc-800 text-xs font-bold shadow-md cursor-pointer"
                    title="Selecionar Resolução / Qualidade"
                  >
                    <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                    <span>
                      {currentQualityIndex === -1
                        ? "Auto"
                        : qualityLevels.find((q) => q.index === currentQualityIndex)?.label.split(" ")[0] || "HD"}
                    </span>
                  </button>
                  {showQualityMenu && (
                    <div className="absolute right-0 top-full mt-2 z-40 bg-zinc-950/95 border border-zinc-800 rounded-2xl shadow-2xl backdrop-blur-xl p-1.5 min-w-[150px] animate-in fade-in-50 zoom-in-95 duration-150">
                      <div className="px-2.5 py-1 text-[10px] font-black uppercase text-zinc-500 tracking-wider">
                        Qualidade
                      </div>
                      {qualityLevels.map((lvl) => (
                        <button
                          key={lvl.index}
                          onClick={() => handleSelectQuality(lvl.index)}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-between cursor-pointer ${
                            currentQualityIndex === lvl.index
                              ? "bg-red-600 text-white"
                              : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
                          }`}
                        >
                          <span>{lvl.label}</span>
                          {currentQualityIndex === lvl.index && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botão de Amplificador de Som (Sound Booster) */}
              {currentServer?.type === "video" && (
                <button
                  onClick={cycleAudioBoost}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl transition-all border text-xs font-bold shadow-md cursor-pointer ${
                    audioBoost > 1
                      ? "bg-amber-600/30 border-amber-500/60 text-amber-300 hover:bg-amber-600/40"
                      : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
                  }`}
                  title={`Amplificador de Áudio: ${Math.round(audioBoost * 100)}% (Clique para amplificar)`}
                >
                  <Volume2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${audioBoost > 1 ? "text-amber-400" : "text-emerald-400"}`} />
                  <span>{audioBoost > 1 ? `Boost ${Math.round(audioBoost * 100)}%` : "Som 100%"}</span>
                </button>
              )}

              {/* Botão Gaveta de Episódios (em séries) */}
              {isTv && seriesSeasons && seriesSeasons.length > 0 && (
                <button
                  onClick={() => setIsEpisodeDrawerOpen((prev) => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl transition-all text-xs font-black shadow-md cursor-pointer ${
                    isEpisodeDrawerOpen
                      ? "bg-red-600 text-white shadow-red-600/40"
                      : "bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-red-500/60"
                  }`}
                  title="Trocar de Episódio sem sair do player (Tecla E)"
                >
                  <ListVideo className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  <span>Episódios</span>
                  {currentSeason && currentEpisode && (
                    <span className="text-[10px] bg-black/60 px-1.5 py-0.5 rounded font-mono text-zinc-300">
                      T{currentSeason}:E{currentEpisode}
                    </span>
                  )}
                </button>
              )}

              {/* Botão Próximo Episódio (quando disponível em séries) */}
              {hasNextEpisode && onNextEpisode && (
                <button
                  onClick={onNextEpisode}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white transition-all text-xs font-black shadow-md shadow-red-600/30 cursor-pointer"
                  title="Assistir Próximo Episódio"
                >
                  <SkipForward className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Próximo</span>
                </button>
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
        <div className="absolute top-0 left-0 right-0 p-2 sm:p-2.5 bg-gradient-to-b from-black/95 via-black/80 to-transparent z-40 flex items-center justify-between gap-1.5 shadow-md pointer-events-auto">
          <div
            onClick={() => setIsMiniPlayer(false)}
            className="flex items-center gap-1.5 min-w-0 pr-1 cursor-pointer hover:opacity-90 transition-opacity"
            title="Clique para Maximizar"
          >
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0" />
            <p className="text-[11px] sm:text-xs font-bold text-white truncate drop-shadow">{title}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Botão de Maximizar Sempre Visível e em Destaque */}
            <button
              type="button"
              onClick={() => setIsMiniPlayer(false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-black shadow-lg shadow-red-600/40 transition-all cursor-pointer hover:scale-105"
              title="Maximizar Vídeo (Voltar para Tela Cheia)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Maximizar</span>
            </button>

            {currentServer?.type === "video" && (
              <button
                type="button"
                onClick={handleToggleNativePip}
                className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
                title="Picture-in-Picture Externo"
              >
                <PictureInPicture2 className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900/90 hover:bg-red-600 text-zinc-300 hover:text-white border border-zinc-700 transition-colors cursor-pointer"
              title="Fechar Player"
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
                  onClick={() => {
                    setIsLoading(true);
                    setHasError(false);
                    onSelectServer(activeServerIndex);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs border border-zinc-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCw className="w-3.5 h-3.5 text-red-400" />
                  <span>Tentar Novamente</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Player: Stream de Vídeo Direto ou Iframe Embed */}
        {currentServer?.type === "video" ? (
          <div
            className="w-full h-full relative group flex items-center justify-center"
            onTouchStart={handleVideoTouch}
          >
            {/* Banner de Retomada de Reprodução */}
            {showResumeBanner && !isMiniPlayer && (
              <div className="absolute top-4 sm:top-6 z-30 flex items-center gap-2.5 sm:gap-3 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl bg-black/90 backdrop-blur-md border border-red-500/60 shadow-2xl animate-in slide-in-from-top-4 duration-300">
                <History className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                <div className="text-left">
                  <p className="text-xs sm:text-sm font-bold text-white">
                    Continuar assistindo de <span className="text-red-400 font-mono">{formatSeconds(resumeTime)}</span>?
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <button
                    type="button"
                    onClick={handleResumePlayback}
                    className="px-3 py-1 sm:py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
                  >
                    Retomar
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResumeBanner(false)}
                    className="px-2.5 py-1 sm:py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold cursor-pointer transition-all"
                  >
                    Do Início
                  </button>
                </div>
              </div>
            )}

            {/* Feedback Visual de Toque Duplo (-10s / +10s) */}
            {tapFeedback && (
              <div
                className={`absolute z-30 pointer-events-none flex flex-col items-center justify-center p-4 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-2xl animate-in zoom-in-75 duration-150 ${
                  tapFeedback.side === "left" ? "left-10 sm:left-24" : "right-10 sm:right-24"
                }`}
              >
                {tapFeedback.side === "left" ? (
                  <>
                    <Rewind className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
                    <span className="text-xs font-black mt-1 text-amber-300">-10s</span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-8 h-8 text-amber-400 fill-amber-400 animate-pulse" />
                    <span className="text-xs font-black mt-1 text-amber-300">+10s</span>
                  </>
                )}
              </div>
            )}

            {/* Prompt de Próximo Episódio */}
            {showNextPrompt && hasNextEpisode && onNextEpisode && !isMiniPlayer && (
              <div className="absolute bottom-20 right-4 sm:right-6 z-30 flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-zinc-950/95 backdrop-blur-md border border-red-500/50 shadow-2xl animate-in slide-in-from-right-4 duration-300">
                <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                  <SkipForward className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Próximo Episódio em {countdownNext}s</p>
                  <p className="text-[10px] text-zinc-400">A reprodução começará automaticamente</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowNextPrompt(false);
                    onNextEpisode();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition-all cursor-pointer whitespace-nowrap"
                >
                  Assistir Agora
                </button>
              </div>
            )}

            {/* Feedback Visual de Volume / Mudo / Sound Boost */}
            {volumeFeedback && !isMiniPlayer && (
              <div className="absolute top-16 sm:top-20 z-30 pointer-events-none flex items-center gap-3 px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-2xl animate-in zoom-in-75 duration-150">
                {volumeFeedback.muted || volumeFeedback.volume === 0 ? (
                  <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 shrink-0" />
                ) : (
                  <Volume2 className={`w-5 h-5 sm:w-6 sm:h-6 shrink-0 ${(volumeFeedback.boost || 1) > 1 ? "text-amber-400" : "text-white"}`} />
                )}
                <div className="flex flex-col min-w-[90px]">
                  <span className="text-[11px] sm:text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <span>{volumeFeedback.muted ? "Áudio Mudo" : `Volume: ${Math.round(volumeFeedback.volume * 100)}%`}</span>
                    {(volumeFeedback.boost || 1) > 1 && !volumeFeedback.muted && (
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-black">
                        BOOST {Math.round((volumeFeedback.boost || 1) * 100)}%
                      </span>
                    )}
                  </span>
                  <div className="w-full h-1.5 bg-zinc-700/80 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-150 ${
                        volumeFeedback.muted
                          ? "bg-red-500"
                          : (volumeFeedback.boost || 1) > 1
                          ? "bg-gradient-to-r from-red-600 to-amber-500"
                          : "bg-red-600"
                      }`}
                      style={{
                        width: volumeFeedback.muted ? "0%" : `${Math.round(volumeFeedback.volume * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Feedback Visual de Ajuste de Tela */}
            {aspectFeedback && !isMiniPlayer && (
              <div className="absolute top-16 sm:top-20 z-30 pointer-events-none flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/20 text-white shadow-2xl animate-in zoom-in-75 duration-150">
                <Ratio className="w-5 h-5 text-sky-400 shrink-0" />
                <span className="text-xs sm:text-sm font-black">
                  Ajuste de Tela: {aspectFeedback}
                </span>
              </div>
            )}

            <video
              ref={videoRef}
              controls={!isMiniPlayer}
              playsInline
              poster={poster}
              className={`w-full h-full ${
                aspectMode === "cover"
                  ? "object-cover"
                  : aspectMode === "fill"
                  ? "object-fill"
                  : "object-contain"
              } cursor-pointer`}
              onVolumeChange={(e) => {
                const v = e.currentTarget;
                try {
                  localStorage.setItem("wmplay_player_volume", String(v.volume));
                  localStorage.setItem("wmplay_player_muted", String(v.muted));
                } catch {}
                setCurrentVolume(v.volume);
                setIsMuted(v.muted);
              }}
              onClick={(e) => {
                const now = Date.now();
                // Se o vídeo foi pausado pelos controles nativos nos últimos 400ms, não desfazer a pausa!
                if (now - lastNativePauseTimeRef.current < 400) {
                  return;
                }
                // Em tela com controles nativos, ignorar cliques nos últimos 95px (barra de controle nativa)
                // para não anular o clique no botão nativo de Pause/Play e na barra de progresso
                if (!isMiniPlayer) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const clickFromBottom = rect.bottom - e.clientY;
                  if (clickFromBottom <= 95) {
                    return;
                  }
                }
                togglePlay();
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                const ct = v.currentTime;
                const dur = v.duration;
                if (dur > 0 && Math.abs(ct - lastProgressReportRef.current) >= 3) {
                  lastProgressReportRef.current = ct;
                  if (onProgressUpdate) {
                    onProgressUpdate(ct, dur);
                  }
                }
                if (hasNextEpisode && dur > 60 && dur - ct <= 25 && dur - ct > 1) {
                  setShowNextPrompt(true);
                  setCountdownNext(Math.max(0, Math.ceil(dur - ct)));
                } else if (showNextPrompt && dur - ct > 25) {
                  setShowNextPrompt(false);
                }
              }}
              onEnded={() => {
                if (videoRef.current && onProgressUpdate) {
                  onProgressUpdate(videoRef.current.duration, videoRef.current.duration);
                }
                if (hasNextEpisode && onNextEpisode) {
                  onNextEpisode();
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setIsLoading(false);
                setHasStartedPlaying(true);
              }}
              onPause={() => {
                lastNativePauseTimeRef.current = Date.now();
                setIsPlaying(false);
              }}
              onWaiting={() => {
                if (videoRef.current && !videoRef.current.paused) {
                  setIsLoading(true);
                }
              }}
              onPlaying={() => {
                setIsPlaying(true);
                setIsLoading(false);
                setHasStartedPlaying(true);
              }}
            />

            {/* Controles de Sobreposição no Mini Player ao passar o mouse ou tocar */}
            {isMiniPlayer && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 pointer-events-none z-30">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlay();
                  }}
                  className="pointer-events-auto p-2.5 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-xl transition-transform hover:scale-110 cursor-pointer"
                  title={isPlaying ? "Pausar" : "Reproduzir"}
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMiniPlayer(false);
                  }}
                  className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900/95 hover:bg-zinc-800 text-white border border-zinc-700 shadow-xl transition-transform hover:scale-105 cursor-pointer text-xs font-black"
                  title="Maximizar Tela"
                >
                  <Maximize2 className="w-4 h-4 text-red-400" />
                  <span>Maximizar</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute();
                  }}
                  className="pointer-events-auto p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 text-white border border-zinc-700 shadow-xl transition-transform hover:scale-110 cursor-pointer"
                  title={isMuted ? "Ativar Áudio" : "Mudo"}
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
            )}

            {/* Botão Central de Retomar Reprodução quando o usuário pausou */}
            {hasStartedPlaying && !isPlaying && !isLoading && !hasError && !isMiniPlayer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
                className="absolute z-10 w-20 h-20 rounded-full bg-black/60 hover:bg-red-600/90 text-white flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/20 transition-all hover:scale-110 cursor-pointer pointer-events-auto group/btn"
                title="Continuar Assistindo (Play)"
              >
                <Play className="w-10 h-10 fill-white text-white ml-1 group-hover/btn:scale-110 transition-transform" />
              </button>
            )}

            {/* Botão Central de Início de Reprodução quando o autoplay foi bloqueado pelo navegador antes de iniciar */}
            {!hasStartedPlaying && !isPlaying && !isLoading && !hasError && !isMiniPlayer && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay();
                }}
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
          <div className="w-full h-full relative flex flex-col items-center justify-center p-6 text-center bg-zinc-950">
            <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 mb-4 shadow-lg shadow-red-600/20">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-white mb-2">
              🛡️ Servidor Externo Bloqueado por Segurança
            </h3>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
              O WMPLAY protege sua navegação contra anúncios desrespeitosos e bloqueou este reprodutor de terceiros.
              Apenas transmissões 100% diretas e limpas são permitidas.
            </p>
            {servers.length > 1 && (
              <button
                onClick={() => {
                  const nextIdx = (activeServerIndex + 1) % servers.length;
                  onSelectServer(nextIdx);
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 cursor-pointer transition-all"
              >
                <RotateCw className="w-4 h-4" />
                <span>Testar Outro Servidor Direto</span>
              </button>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* GAVETA DE EPISÓDIOS DENTRO DO PLAYER (TROCA RÁPIDA)             */}
        {/* ============================================================== */}
        {isEpisodeDrawerOpen && isTv && seriesSeasons && seriesSeasons.length > 0 && !isMiniPlayer && (
          <div className="absolute inset-y-0 right-0 w-80 sm:w-96 max-w-[85vw] bg-black/95 backdrop-blur-2xl border-l border-zinc-800 z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Header da Gaveta */}
            <div className="p-3.5 sm:p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 shrink-0">
                  <ListVideo className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                    <span>Episódios</span>
                    <span className="text-[10px] text-red-400 font-mono bg-red-950/80 px-1.5 py-0.5 rounded border border-red-600/30">
                      T{drawerSeasonTab}
                    </span>
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">{title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEpisodeDrawerOpen(false)}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Fechar Gaveta"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Abas de Temporada */}
            {seriesSeasons.length > 1 && (
              <div className="px-3.5 py-2 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                {seriesSeasons.map((s) => (
                  <button
                    key={s.seasonNumber}
                    onClick={() => setDrawerSeasonTab(s.seasonNumber)}
                    className={`px-3 py-1 rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer ${
                      drawerSeasonTab === s.seasonNumber
                        ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                        : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                    }`}
                  >
                    T{s.seasonNumber}
                  </button>
                ))}
              </div>
            )}

            {/* Lista de Episódios */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(seriesSeasons.find((s) => s.seasonNumber === drawerSeasonTab)?.episodes || []).map((ep) => {
                const isCurrent = drawerSeasonTab === currentSeason && ep.number === currentEpisode;
                return (
                  <div
                    key={ep.number}
                    onClick={() => {
                      if (onSelectEpisode) {
                        onSelectEpisode(drawerSeasonTab, ep.number, ep.title, ep.link);
                      }
                      setIsEpisodeDrawerOpen(false);
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isCurrent
                        ? "bg-red-950/80 border-red-500 text-white shadow-lg shadow-red-600/30"
                        : "bg-zinc-900/70 hover:bg-zinc-850/90 border-zinc-800 hover:border-red-500/40 text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center font-mono font-black text-xs shrink-0 ${
                          isCurrent ? "bg-red-600 text-white shadow-md shadow-red-600/50" : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : ep.number}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isCurrent ? "text-red-400 font-black" : "text-zinc-200"}`}>
                          Episódio {ep.number}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-zinc-400 truncate">{ep.title || `Episódio ${ep.number}`}</p>
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="text-[9px] font-bold text-red-300 bg-red-950/90 border border-red-500/50 px-2 py-0.5 rounded-full shrink-0">
                        Tocando
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
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
