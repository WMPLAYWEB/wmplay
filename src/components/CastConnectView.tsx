"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Cast,
  Tv,
  Smartphone,
  Wifi,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize2,
  SkipForward,
  Square,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Search,
  Star,
  Film,
  Radio,
  ExternalLink,
  QrCode,
  Zap,
  ShieldCheck,
  Share2,
  Clock,
  Sparkles,
} from "lucide-react";
import WmplayLogo from "./WmplayLogo";

export interface CastMediaItem {
  title: string;
  synopsis?: string;
  thumbnail?: string;
  link?: string;
  tmdb_id?: number | string;
  season?: number;
  episode?: number;
}

interface CastConnectViewProps {
  isLight?: boolean;
  playingMedia?: CastMediaItem | null;
  favoriteCatalogItems?: any[];
  catalogItems?: any[];
  onPlayMediaOnLocal?: (
    title: string,
    synopsis: string,
    thumbnail: string,
    tmdb_id?: number | string,
    link?: string,
    season?: number,
    episode?: number
  ) => void;
}

interface SavedTv {
  code: string;
  name: string;
  lastConnected: number;
}

export default function CastConnectView({
  isLight = false,
  playingMedia,
  favoriteCatalogItems = [],
  catalogItems = [],
  onPlayMediaOnLocal,
}: CastConnectViewProps) {
  // Modo atual: "sender" (celular controlando) ou "receiver" (esta tela é a TV)
  const [activeMode, setActiveMode] = useState<"sender" | "receiver" | "guide">("sender");

  // Código digitado pelo usuário (Modo Celular)
  const [inputCode, setInputCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Estado da conexão ativa
  const [connectedTv, setConnectedTv] = useState<{
    code: string;
    name: string;
  } | null>(null);

  // Mídia atualmente tocando na TV
  const [remoteMedia, setRemoteMedia] = useState<CastMediaItem | null>(null);
  const [remoteState, setRemoteState] = useState<{
    currentTime: number;
    duration: number;
    isPaused: boolean;
    volume: number;
    isMuted: boolean;
    aspectRatio: string;
  }>({
    currentTime: 0,
    duration: 0,
    isPaused: true,
    volume: 1,
    isMuted: false,
    aspectRatio: "16:9",
  });

  // Histórico de TVs salvas no localStorage
  const [savedTvs, setSavedTvs] = useState<SavedTv[]>([]);

  // Busca rápida de mídia dentro da aba Transmitir
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "favorites" | "movies" | "series">("favorites");

  // Estado do Modo Receptor (quando o usuário escolhe transformar esta tela em TV)
  const [receiverCode, setReceiverCode] = useState<string | null>(null);
  const [receiverName, setReceiverName] = useState("Smart TV WMPLAY");
  const [receiverStatus, setReceiverStatus] = useState<"ready" | "playing" | "disconnected">("ready");
  const [receiverConnectedController, setReceiverConnectedController] = useState(false);

  // BroadcastChannel para sincronização instantânea sem delay na mesma máquina/rede
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Carregar histórico de TVs salvas
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("wmplay_saved_tvs");
      if (saved) {
        setSavedTvs(JSON.parse(saved));
      }
      const lastCode = localStorage.getItem("wmplay_last_tv_code");
      if (lastCode && !connectedTv) {
        setInputCode(lastCode);
      }
    } catch {
      // Ignora erro de storage
    }

    // Inicializa BroadcastChannel para comunicação direta 0ms se suportado
    try {
      if ("BroadcastChannel" in window) {
        broadcastRef.current = new BroadcastChannel("wmplay_cast_channel");
        broadcastRef.current.onmessage = (event) => {
          const { type, data } = event.data || {};
          if (type === "STATE_UPDATE" && data) {
            setRemoteState((prev) => ({ ...prev, ...data.state }));
            if (data.media) setRemoteMedia(data.media);
          }
        };
      }
    } catch {
      // Fallback para HTTP polling
    }

    return () => {
      broadcastRef.current?.close();
    };
  }, []);

  // Salvar TV conectada no histórico
  const saveTvToHistory = (code: string, name: string) => {
    try {
      const updated = [
        { code, name, lastConnected: Date.now() },
        ...savedTvs.filter((t) => t.code !== code),
      ].slice(0, 5);
      setSavedTvs(updated);
      localStorage.setItem("wmplay_saved_tvs", JSON.stringify(updated));
      localStorage.setItem("wmplay_last_tv_code", code);
    } catch {
      // Ignore
    }
  };

  // Conectar a uma TV pelo código de 6 dígitos
  const handleConnectToTv = async (codeToConnect?: string) => {
    const targetCode = (codeToConnect || inputCode).trim().replace(/\D/g, "");
    if (targetCode.length < 5) {
      setConnectionError("Digite o código de 6 dígitos exibido na tela da sua TV.");
      return;
    }

    setConnecting(true);
    setConnectionError(null);

    try {
      const res = await fetch("/api/cast/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", code: targetCode }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "TV não encontrada. Verifique o código exibido na TV.");
      }

      setConnectedTv({ code: targetCode, name: data.name || "Smart TV" });
      saveTvToHistory(targetCode, data.name || "Smart TV");

      if (data.media) setRemoteMedia(data.media);
      if (data.state) setRemoteState((prev) => ({ ...prev, ...data.state }));

      // Vibração tátil no celular ao conectar com sucesso
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate([40, 60, 40]);
      }
    } catch (err: any) {
      setConnectionError(err.message || "Não foi possível conectar à TV.");
    } finally {
      setConnecting(false);
    }
  };

  // Desconectar da TV
  const handleDisconnect = async () => {
    if (connectedTv) {
      try {
        await fetch("/api/cast/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "disconnect", code: connectedTv.code, role: "controller" }),
        });
      } catch {
        // Ignore
      }
    }
    setConnectedTv(null);
    setRemoteMedia(null);
  };

  // Enviar comando para a TV (Play, Pause, Seek, Volume, etc.)
  const sendCommand = async (command: string, payload: any = {}) => {
    if (!connectedTv) return;

    // Feedback tátil imediato no celular
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(20);
    }

    // Broadcast imediato para 0ms de latência caso na mesma máquina
    try {
      broadcastRef.current?.postMessage({
        type: "COMMAND",
        code: connectedTv.code,
        command,
        payload,
      });
    } catch {
      // Ignore
    }

    // Envia para o servidor HTTP
    try {
      await fetch("/api/cast/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "command",
          code: connectedTv.code,
          command,
          payload,
        }),
      });
    } catch (err) {
      console.error("Erro ao enviar comando de cast:", err);
    }
  };

  // Transmitir um filme/série/canal diretamente para a TV
  const handleTransmitMediaToTv = async (media: CastMediaItem) => {
    if (!connectedTv) {
      // Se não estiver conectado, sugere conectar ou alerta
      setConnectionError("Conecte-se à sua TV primeiro digitando o código acima.");
      return;
    }

    setRemoteMedia(media);
    setRemoteState((prev) => ({ ...prev, isPaused: false, currentTime: 0 }));

    await sendCommand("play_media", {
      media: {
        title: media.title,
        synopsis: media.synopsis,
        thumbnail: media.thumbnail,
        link: media.link,
        tmdb_id: media.tmdb_id,
        season: media.season,
        episode: media.episode,
      },
    });
  };

  // Polling de sincronização com a TV (quando conectado como celular)
  useEffect(() => {
    if (!connectedTv) return;

    let active = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/cast/session?code=${connectedTv.code}&role=controller`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.success) {
          if (data.media) setRemoteMedia(data.media);
          if (data.state) setRemoteState((prev) => ({ ...prev, ...data.state }));
        }
      } catch {
        // Ignore polling error
      }
    }, 1200);

    return () => {
      active = false;
      clearInterval(pollInterval);
    };
  }, [connectedTv]);

  // Modo Receptor (Esta tela vira a TV)
  const handleStartReceiver = async () => {
    setActiveMode("receiver");
    try {
      const res = await fetch("/api/cast/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name: receiverName }),
      });
      const data = await res.json();
      if (data.success && data.code) {
        setReceiverCode(data.code);
        setReceiverStatus("ready");
      }
    } catch (err) {
      console.error("Erro ao iniciar receptor TV:", err);
    }
  };

  // Polling de comandos do Modo Receptor (escuta comandos do celular)
  useEffect(() => {
    if (activeMode !== "receiver" || !receiverCode) return;

    let active = true;
    const pollReceiver = setInterval(async () => {
      try {
        const res = await fetch(`/api/cast/session?code=${receiverCode}&role=receiver`);
        if (!res.ok) return;
        const data = await res.json();

        if (active && data.success) {
          setReceiverConnectedController(data.controllerConnected);

          if (data.commands && data.commands.length > 0) {
            for (const cmd of data.commands) {
              if (cmd.type === "play_media" && cmd.payload?.media) {
                const m = cmd.payload.media;
                if (onPlayMediaOnLocal) {
                  onPlayMediaOnLocal(
                    m.title,
                    m.synopsis || "",
                    m.thumbnail || "",
                    m.tmdb_id,
                    m.link,
                    m.season,
                    m.episode
                  );
                }
              }
            }
          }
        }
      } catch {
        // Ignore error
      }
    }, 1000);

    return () => {
      active = false;
      clearInterval(pollReceiver);
    };
  }, [activeMode, receiverCode, onPlayMediaOnLocal]);

  // Formatar tempo em mm:ss ou hh:mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Filtragem de catálogo para transmissão rápida
  const filteredMediaList = (() => {
    if (filterType === "favorites") {
      return favoriteCatalogItems;
    }
    const list = catalogItems || [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return list.filter((item) => item.title.toLowerCase().includes(q));
    }
    if (filterType === "movies") {
      return list.filter((item) => item.type === "movie" || item.type === "movies");
    }
    if (filterType === "series") {
      return list.filter(
        (item) => item.type === "series" || item.type === "animes" || item.type === "novelas"
      );
    }
    return list.slice(0, 30);
  })();

  // Gerar URL de pareamento rápido via QR Code
  const getPairingUrl = () => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/tv?code=${receiverCode || ""}`;
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-6 animate-in fade-in duration-300">
      {/* ============================================================== */}
      {/* CABEÇALHO COM BADGE DE QUALIDADE E TROCA DE MODO                */}
      {/* ============================================================== */}
      <div
        className={`p-5 sm:p-6 rounded-3xl border shadow-xl relative overflow-hidden backdrop-blur-xl transition-all ${
          isLight
            ? "bg-gradient-to-br from-white via-red-50/20 to-white border-zinc-200"
            : "bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 border-zinc-800"
        }`}
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider bg-red-600 text-white shadow-md shadow-red-600/30 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                TRANSMISSÃO DIRETA SEM DELAY
              </span>
              <span
                className={`px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border flex items-center gap-1.5 ${
                  isLight
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                    : "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zero Travamento · Hardware TV Nativo
              </span>
            </div>

            <h1
              className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight ${
                isLight ? "text-zinc-900" : "text-white"
              }`}
            >
              Transmitir do Celular para a TV
            </h1>
            <p
              className={`text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed ${
                isLight ? "text-zinc-600" : "text-slate-400"
              }`}
            >
              Diferente do espelhamento de tela comum que esquenta o aparelho e trava o Wi-Fi, o{" "}
              <strong className="text-red-500">WMPLAY Connect</strong> envia o fluxo Full HD/4K diretamente
              para a Smart TV. O celular funciona como controle remoto instantâneo, com bateria poupada e 0
              atraso.
            </p>
          </div>

          {/* Abas Superiores de Alternância de Modo */}
          <div
            className={`flex items-center p-1.5 rounded-2xl border self-start md:self-center shrink-0 ${
              isLight ? "bg-zinc-100 border-zinc-200" : "bg-zinc-900 border-zinc-800"
            }`}
          >
            <button
              onClick={() => setActiveMode("sender")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeMode === "sender"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : isLight
                  ? "text-zinc-600 hover:text-zinc-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>Estou no Celular</span>
            </button>

            <button
              onClick={handleStartReceiver}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeMode === "receiver"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : isLight
                  ? "text-zinc-600 hover:text-zinc-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Modo TV (Receptor)</span>
            </button>

            <button
              onClick={() => setActiveMode("guide")}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                activeMode === "guide"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : isLight
                  ? "text-zinc-600 hover:text-zinc-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Dicas</span>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODO 1: ESTOU NO CELULAR (CONTROLE REMOTO & TRANSMISSÃO)        */}
      {/* ============================================================== */}
      {activeMode === "sender" && (
        <div className="space-y-6">
          {/* Se NÃO estiver conectado à TV: Painel de Conexão */}
          {!connectedTv ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Formulário de Conexão com Código */}
              <div
                className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border shadow-xl flex flex-col justify-between ${
                  isLight ? "bg-white border-zinc-200" : "bg-zinc-950/90 border-zinc-800"
                }`}
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div>
                      <h2
                        className={`text-lg sm:text-xl font-black ${
                          isLight ? "text-zinc-900" : "text-white"
                        }`}
                      >
                        Conectar à sua Smart TV
                      </h2>
                      <p
                        className={`text-xs ${
                          isLight ? "text-zinc-500" : "text-slate-400"
                        }`}
                      >
                        Digite o código de 6 dígitos que está aparecendo na TV.
                      </p>
                    </div>
                  </div>

                  {/* Input Grande de Código com Formatação */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <label
                        className={`block text-xs font-black uppercase tracking-wider mb-2 ${
                          isLight ? "text-zinc-700" : "text-slate-300"
                        }`}
                      >
                        Código da TV (6 Dígitos)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={inputCode}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, "");
                            setInputCode(val);
                            setConnectionError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConnectToTv();
                          }}
                          placeholder="Ex: 489210"
                          className={`w-full py-4 px-5 text-2xl sm:text-3xl font-mono font-black tracking-widest text-center rounded-2xl border transition-all outline-none ${
                            isLight
                              ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-red-500 focus:bg-white"
                              : "bg-zinc-900/90 border-zinc-700 text-white focus:border-red-500 focus:bg-zinc-900"
                          }`}
                        />
                      </div>
                    </div>

                    {connectionError && (
                      <div className="p-3.5 rounded-2xl bg-red-600/10 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{connectionError}</span>
                      </div>
                    )}

                    <button
                      onClick={() => handleConnectToTv()}
                      disabled={connecting || inputCode.trim().length < 5}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {connecting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Conectando à TV...</span>
                        </>
                      ) : (
                        <>
                          <Wifi className="w-5 h-5" />
                          <span>Conectar à Smart TV</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* TVs Salvas Recentemente */}
                  {savedTvs.length > 0 && (
                    <div className="mt-6 pt-5 border-t border-zinc-800/60">
                      <span
                        className={`text-xs font-bold uppercase tracking-wider block mb-2.5 ${
                          isLight ? "text-zinc-600" : "text-zinc-400"
                        }`}
                      >
                        TVs Conectadas Recentemente:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {savedTvs.map((tv) => (
                          <button
                            key={tv.code}
                            onClick={() => {
                              setInputCode(tv.code);
                              handleConnectToTv(tv.code);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isLight
                                ? "bg-zinc-100 hover:bg-zinc-200 border-zinc-300 text-zinc-800"
                                : "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-slate-300"
                            }`}
                          >
                            <Tv className="w-3.5 h-3.5 text-red-500" />
                            <span>{tv.name}</span>
                            <span className="font-mono text-[10px] text-zinc-400">
                              (#{tv.code})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Passo a Passo Rápido */}
                <div
                  className={`mt-6 p-4 rounded-2xl border text-xs space-y-2 ${
                    isLight
                      ? "bg-zinc-50 border-zinc-200 text-zinc-700"
                      : "bg-zinc-900/50 border-zinc-800/80 text-slate-300"
                  }`}
                >
                  <p className="font-black text-red-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Como funciona em 3 passos simples:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-400">
                    <li>Abra o WMPLAY no navegador da sua TV (Samsung, LG, Android TV, Fire TV).</li>
                    <li>
                      Clique em <strong>"Modo TV (Receptor)"</strong> na tela da TV para ver o código.
                    </li>
                    <li>Digite o código aqui no celular e dê o play no que quiser assistir!</li>
                  </ol>
                </div>
              </div>

              {/* Métodos Alternativos Nativos (Chromecast / AirPlay / DLNA) */}
              <div className="lg:col-span-5 space-y-4">
                <div
                  className={`p-6 rounded-3xl border shadow-xl ${
                    isLight ? "bg-white border-zinc-200" : "bg-zinc-950/90 border-zinc-800"
                  }`}
                >
                  <h3
                    className={`text-base font-black flex items-center gap-2 mb-2 ${
                      isLight ? "text-zinc-900" : "text-white"
                    }`}
                  >
                    <Cast className="w-5 h-5 text-red-500" />
                    Outras Formas de Transmitir
                  </h3>
                  <p
                    className={`text-xs mb-4 leading-relaxed ${
                      isLight ? "text-zinc-600" : "text-slate-400"
                    }`}
                  >
                    Se o seu dispositivo possui suporte nativo a Chromecast ou AirPlay, você pode
                    transmitir com 1 toque:
                  </p>

                  <div className="space-y-2.5">
                    {/* Botão Google Cast */}
                    <button
                      onClick={() => {
                        if (typeof window !== "undefined" && (window as any).cast?.framework) {
                          try {
                            (window as any).cast.framework.CastContext.getInstance().requestSession();
                          } catch {
                            alert("Buscando dispositivos Google Cast / Chromecast na sua rede Wi-Fi...");
                          }
                        } else {
                          alert(
                            "Para transmitir via Chromecast nativo, certifique-se de que a Smart TV ou Chromecast está ligado na mesma rede Wi-Fi e use o navegador Google Chrome."
                          );
                        }
                      }}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:border-red-500 ${
                        isLight
                          ? "bg-zinc-50 border-zinc-200 text-zinc-900 hover:bg-red-50/50"
                          : "bg-zinc-900 border-zinc-700/80 text-white hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
                          <Cast className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-black">Google Cast / Chromecast</h4>
                          <p className="text-[11px] text-zinc-400">Android TV, Mi Box, Chromecast</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </button>

                    {/* Botão Apple AirPlay */}
                    <button
                      onClick={() => {
                        const videoEl = document.querySelector("video");
                        if (videoEl && (videoEl as any).webkitShowPlaybackTargetPicker) {
                          (videoEl as any).webkitShowPlaybackTargetPicker();
                        } else {
                          alert(
                            "O Apple AirPlay está disponível em dispositivos Apple (iPhone, iPad, Mac) via navegador Safari para Smart TVs compatíveis com AirPlay 2."
                          );
                        }
                      }}
                      className={`w-full p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer hover:border-red-500 ${
                        isLight
                          ? "bg-zinc-50 border-zinc-200 text-zinc-900 hover:bg-red-50/50"
                          : "bg-zinc-900 border-zinc-700/80 text-white hover:bg-zinc-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-600/20 text-slate-300 flex items-center justify-center font-bold">
                          <Tv className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                          <h4 className="text-xs font-black">Apple AirPlay 2</h4>
                          <p className="text-[11px] text-zinc-400">iPhone / iPad para Apple TV, LG ou Samsung</p>
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-zinc-500" />
                    </button>

                    {/* Web Video Caster / Apps Externos */}
                    <div
                      className={`p-3.5 rounded-2xl border text-xs ${
                        isLight
                          ? "bg-amber-50/60 border-amber-200 text-amber-900"
                          : "bg-amber-950/20 border-amber-500/30 text-amber-300"
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        Dica: Web Video Caster (WVC)
                      </p>
                      <p className="text-[11px] leading-relaxed">
                        Se sua TV for antiga (sem navegador moderno), você pode usar o app grátis{" "}
                        <strong>Web Video Caster</strong> no celular para transmitir diretamente via DLNA/Roku
                        com aceleração total.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================== */
            /* QUANDO ESTIVER CONECTADO: CONTROLE REMOTO VIRTUAL TOUCH    */
            /* ========================================================== */
            <div className="space-y-6">
              {/* Barra de Status da Conexão Ativa */}
              <div
                className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between flex-wrap gap-3 ${
                  isLight
                    ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                    : "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute inset-0" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500 relative" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">
                      CONECTADO À TV COM SUCESSO
                    </span>
                    <span className="text-sm font-bold flex items-center gap-2">
                      <Tv className="w-4 h-4 text-emerald-400" />
                      {connectedTv.name}
                      <span className="font-mono text-xs text-emerald-400 font-normal">
                        (Código #{connectedTv.code})
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDisconnect}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-red-600 text-white text-xs font-bold transition-colors cursor-pointer border border-zinc-700"
                  >
                    Desconectar TV
                  </button>
                </div>
              </div>

              {/* CARD DE MÍDIA EM REPRODUÇÃO NA TV */}
              {remoteMedia ? (
                <div
                  className={`p-6 rounded-3xl border shadow-2xl relative overflow-hidden ${
                    isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="flex flex-col md:flex-row gap-6 items-center">
                    {/* Poster */}
                    <div className="w-32 sm:w-40 h-48 sm:h-56 rounded-2xl overflow-hidden bg-zinc-900 shrink-0 shadow-xl border border-zinc-800">
                      {remoteMedia.thumbnail ? (
                        <img
                          src={remoteMedia.thumbnail}
                          alt={remoteMedia.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <Film className="w-12 h-12" />
                        </div>
                      )}
                    </div>

                    {/* Detalhes e Controles */}
                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500 block mb-1">
                          REPRODUZINDO AGORA NA TV
                        </span>
                        <h2
                          className={`text-xl sm:text-2xl font-black ${
                            isLight ? "text-zinc-900" : "text-white"
                          }`}
                        >
                          {remoteMedia.title}
                        </h2>
                        {remoteMedia.synopsis && (
                          <p
                            className={`text-xs mt-1 line-clamp-2 ${
                              isLight ? "text-zinc-600" : "text-slate-400"
                            }`}
                          >
                            {remoteMedia.synopsis}
                          </p>
                        )}
                      </div>

                      {/* Barra de Progresso com Arraste */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-mono font-bold text-zinc-400">
                          <span>{formatTime(remoteState.currentTime)}</span>
                          <span>{formatTime(remoteState.duration)}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={remoteState.duration || 100}
                          value={remoteState.currentTime}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setRemoteState((prev) => ({ ...prev, currentTime: val }));
                            sendCommand("seek", { time: val });
                          }}
                          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                        />
                      </div>

                      {/* Botões do Controle Remoto Touch */}
                      <div className="flex items-center justify-center sm:justify-start gap-4 flex-wrap pt-2">
                        {/* Voltar 10s */}
                        <button
                          onClick={() => {
                            const newTime = Math.max(0, remoteState.currentTime - 10);
                            sendCommand("seek", { time: newTime });
                          }}
                          className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-transform active:scale-90 cursor-pointer shadow-md"
                          title="Voltar 10 segundos na TV"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>

                        {/* Play / Pause Principal */}
                        <button
                          onClick={() => {
                            const nextPaused = !remoteState.isPaused;
                            setRemoteState((prev) => ({ ...prev, isPaused: nextPaused }));
                            sendCommand(nextPaused ? "pause" : "play");
                          }}
                          className="p-5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white shadow-xl shadow-red-600/40 transition-transform active:scale-95 cursor-pointer"
                          title={remoteState.isPaused ? "Continuar na TV" : "Pausar na TV"}
                        >
                          {remoteState.isPaused ? (
                            <Play className="w-7 h-7 fill-current ml-0.5" />
                          ) : (
                            <Pause className="w-7 h-7 fill-current" />
                          )}
                        </button>

                        {/* Avançar 10s */}
                        <button
                          onClick={() => {
                            const newTime = Math.min(
                              remoteState.duration || Infinity,
                              remoteState.currentTime + 10
                            );
                            sendCommand("seek", { time: newTime });
                          }}
                          className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700 transition-transform active:scale-90 cursor-pointer shadow-md"
                          title="Avançar 10 segundos na TV"
                        >
                          <RotateCw className="w-5 h-5" />
                        </button>

                        {/* Volume Mudo / Desmudo */}
                        <button
                          onClick={() => {
                            const nextMuted = !remoteState.isMuted;
                            setRemoteState((prev) => ({ ...prev, isMuted: nextMuted }));
                            sendCommand(nextMuted ? "mute" : "unmute");
                          }}
                          className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                            remoteState.isMuted
                              ? "bg-red-600 text-white border-red-500 shadow-md shadow-red-600/40"
                              : "bg-zinc-900 hover:bg-zinc-800 text-white border-zinc-700"
                          }`}
                          title="Alternar Mudo na TV"
                        >
                          {remoteState.isMuted ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>

                        {/* Parar Reprodução */}
                        <button
                          onClick={() => {
                            sendCommand("stop");
                            setRemoteMedia(null);
                          }}
                          className="p-3.5 rounded-2xl bg-zinc-900 hover:bg-red-600/80 text-white border border-zinc-700 transition-transform active:scale-90 cursor-pointer"
                          title="Parar de Assistir na TV"
                        >
                          <Square className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Nenhuma mídia tocando ainda na TV conectada */
                <div
                  className={`p-8 rounded-3xl border shadow-xl text-center space-y-4 ${
                    isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"
                  }`}
                >
                  <div className="w-16 h-16 rounded-3xl bg-red-600/10 text-red-500 mx-auto flex items-center justify-center">
                    <Tv className="w-8 h-8" />
                  </div>
                  <div>
                    <h3
                      className={`text-lg sm:text-xl font-black ${
                        isLight ? "text-zinc-900" : "text-white"
                      }`}
                    >
                      A TV está pronta e conectada!
                    </h3>
                    <p
                      className={`text-xs sm:text-sm mt-1 max-w-md mx-auto ${
                        isLight ? "text-zinc-600" : "text-slate-400"
                      }`}
                    >
                      Escolha qualquer filme, série ou canal abaixo no seu celular para começar a
                      reprodução na tela grande com aceleração de hardware.
                    </p>
                  </div>

                  {/* Se o usuário já tiver uma mídia aberta no player do celular */}
                  {playingMedia && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-red-600/20 to-rose-600/20 border border-red-500/40 max-w-lg mx-auto flex items-center justify-between gap-3 text-left">
                      <div className="truncate">
                        <span className="text-[10px] font-black uppercase text-red-400 block">
                          VOCÊ ESTAVA ASSISTINDO NO CELULAR:
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">
                          {playingMedia.title}
                        </h4>
                      </div>
                      <button
                        onClick={() => handleTransmitMediaToTv(playingMedia)}
                        className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/40 shrink-0 transition-transform hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Continuar na TV</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SELETOR RÁPIDO DE CONTEÚDO PARA ENVIAR PRA TV */}
              <div
                className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
                  isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3
                      className={`text-lg font-black flex items-center gap-2 ${
                        isLight ? "text-zinc-900" : "text-white"
                      }`}
                    >
                      <Sparkles className="w-5 h-5 text-red-500" />
                      O que você quer assistir na TV agora?
                    </h3>
                    <p
                      className={`text-xs ${
                        isLight ? "text-zinc-500" : "text-slate-400"
                      }`}
                    >
                      Toque em qualquer título para começar na Smart TV sem engasgos.
                    </p>
                  </div>

                  {/* Filtro Rápido */}
                  <div
                    className={`flex items-center p-1 rounded-xl border text-xs font-bold ${
                      isLight ? "bg-zinc-100 border-zinc-200" : "bg-zinc-900 border-zinc-800"
                    }`}
                  >
                    <button
                      onClick={() => setFilterType("favorites")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                        filterType === "favorites"
                          ? "bg-red-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      <Star className="w-3 h-3 fill-current" />
                      <span>Favoritos ({favoriteCatalogItems.length})</span>
                    </button>
                    <button
                      onClick={() => setFilterType("movies")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        filterType === "movies"
                          ? "bg-red-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Filmes
                    </button>
                    <button
                      onClick={() => setFilterType("series")}
                      className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                        filterType === "series"
                          ? "bg-red-600 text-white"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Séries
                    </button>
                  </div>
                </div>

                {/* Campo de Busca Rápida */}
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar filme, série ou canal para tocar na TV..."
                    className={`w-full py-2.5 pl-10 pr-4 rounded-xl text-xs sm:text-sm border outline-none transition-colors ${
                      isLight
                        ? "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-red-500"
                        : "bg-zinc-900 border-zinc-800 text-white focus:border-red-500"
                    }`}
                  />
                </div>

                {/* Grid de Itens Rápidos */}
                {filteredMediaList.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500 text-xs">
                    Nenhum item encontrado nesta categoria.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                    {filteredMediaList.slice(0, 18).map((item, idx) => (
                      <div
                        key={item.id || idx}
                        onClick={() =>
                          handleTransmitMediaToTv({
                            title: item.title,
                            synopsis: item.synopsis,
                            thumbnail: item.thumbnail,
                            link: item.link,
                            tmdb_id: item.tmdb_id,
                          })
                        }
                        className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-xl hover:border-red-500 ${
                          isLight
                            ? "bg-zinc-100 border-zinc-200"
                            : "bg-zinc-900/90 border-zinc-800"
                        }`}
                      >
                        <div className="aspect-[2/3] w-full bg-zinc-800 overflow-hidden relative">
                          {item.thumbnail ? (
                            <img
                              src={item.thumbnail}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <Film className="w-8 h-8" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5">
                            <span className="text-[10px] font-black text-white flex items-center gap-1">
                              <Play className="w-3 h-3 fill-current text-red-500" />
                              Tocar na TV
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          <h4
                            className={`text-xs font-bold truncate ${
                              isLight ? "text-zinc-900" : "text-white"
                            }`}
                          >
                            {item.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 2: ESTA TELA É A TV (MODO RECEPTOR)                        */}
      {/* ============================================================== */}
      {activeMode === "receiver" && (
        <div
          className={`p-8 sm:p-12 rounded-3xl border shadow-2xl text-center space-y-8 relative overflow-hidden backdrop-blur-2xl ${
            isLight
              ? "bg-white/95 border-zinc-300 text-zinc-900"
              : "bg-zinc-950/95 border-zinc-850 text-white"
          }`}
        >
          <div className="max-w-xl mx-auto space-y-2">
            <WmplayLogo size="lg" isLight={isLight} showSubtitle={true} className="justify-center" />
            <span className="px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest bg-red-600 text-white inline-flex items-center gap-1.5 shadow-md shadow-red-600/30">
              <Tv className="w-3.5 h-3.5" />
              TELA RECEPTORA DA SMART TV ATIVA
            </span>
          </div>

          {/* Código de Pareamento Gigante para a TV */}
          {receiverCode ? (
            <div className="space-y-4 max-w-lg mx-auto">
              <p
                className={`text-xs sm:text-sm uppercase tracking-widest font-black ${
                  isLight ? "text-zinc-600" : "text-slate-400"
                }`}
              >
                DIGITE ESTE CÓDIGO NO SEU CELULAR:
              </p>

              <div
                className={`p-6 sm:p-8 rounded-3xl border shadow-2xl flex items-center justify-center gap-2 sm:gap-4 font-mono font-black text-4xl sm:text-6xl tracking-widest text-red-500 select-all ${
                  isLight
                    ? "bg-zinc-50 border-zinc-300 shadow-zinc-300/50"
                    : "bg-zinc-900/90 border-zinc-700/80 shadow-black/80"
                }`}
              >
                <span>{receiverCode.slice(0, 3)}</span>
                <span className="text-zinc-600">·</span>
                <span>{receiverCode.slice(3, 6)}</span>
              </div>

              {/* Status de Conexão com o Celular */}
              <div className="flex items-center justify-center gap-2 text-xs font-bold">
                {receiverConnectedController ? (
                  <span className="text-emerald-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    Celular conectado! Aguardando o filme que você escolher...
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    Aguardando você digitar o código no celular...
                  </span>
                )}
              </div>

              {/* QR Code Opcional de Pareamento Rápido */}
              <div className="pt-4 flex flex-col items-center justify-center space-y-2">
                <span className="text-[11px] text-zinc-400">
                  Ou aponte a câmera do celular para este QR Code:
                </span>
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-zinc-300">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                      getPairingUrl()
                    )}`}
                    alt="QR Code de Conexão WMPLAY"
                    className="w-36 h-36 sm:w-44 sm:h-44 object-contain"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-zinc-400 font-bold">
                Gerando código de conexão com a TV...
              </span>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800/60 max-w-md mx-auto">
            <button
              onClick={() => setActiveMode("sender")}
              className="text-xs text-zinc-400 hover:text-white underline cursor-pointer"
            >
              Voltar para o modo celular
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODO 3: GUIA & DICAS PARA ZERO TRAVAMENTO                       */}
      {/* ============================================================== */}
      {activeMode === "guide" && (
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"
          }`}
        >
          <div className="max-w-3xl">
            <h2
              className={`text-xl sm:text-2xl font-black ${
                isLight ? "text-zinc-900" : "text-white"
              }`}
            >
              Por que o WMPLAY Connect não trava nem tem delay?
            </h2>
            <p
              className={`text-xs sm:text-sm mt-1 leading-relaxed ${
                isLight ? "text-zinc-600" : "text-slate-400"
              }`}
            >
              Entenda a diferença técnica entre o espelhamento de tela tradicional e a transmissão direta do
              WMPLAY.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card Ruim: Espelhamento Comum */}
            <div className="p-5 rounded-2xl bg-red-950/20 border border-red-500/30 space-y-3">
              <span className="text-xs font-black text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                Espelhamento Comum (Miracast / Smart View)
              </span>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-black">✕</span>
                  <span>
                    <strong>Delay de 1 a 3 segundos:</strong> O celular precisa recodificar o vídeo antes de
                    enviar via Wi-Fi.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-black">✕</span>
                  <span>
                    <strong>Travamentos e engasgos:</strong> O processador do celular aquece e reduz a taxa de
                    quadros (FPS).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-black">✕</span>
                  <span>
                    <strong>Bateria esgotada rápido:</strong> O celular precisa manter a tela acesa 100% do
                    tempo.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 font-black">✕</span>
                  <span>
                    <strong>Notificações na TV:</strong> Mensagens de WhatsApp e chamadas aparecem para todo
                    mundo na sala.
                  </span>
                </li>
              </ul>
            </div>

            {/* Card Bom: WMPLAY Connect Direto */}
            <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
              <span className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                WMPLAY Connect Direto (Recomendado)
              </span>
              <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <strong>Zero Delay (Tempo Real):</strong> A TV reproduz o fluxo de vídeo direto do servidor
                    usando sua GPU nativa.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <strong>Qualidade Máxima Full HD / 4K:</strong> Sem compressão do celular, com taxa máxima
                    de bits e som surround.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <strong>Economia Total de Bateria:</strong> O celular envia apenas o comando de play e vira
                    um controle remoto. A tela pode ser desligada!
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-black">✓</span>
                  <span>
                    <strong>Privacidade Total:</strong> Você pode usar o celular normalmente para conversar no
                    WhatsApp ou jogar enquanto o filme passa na TV.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
