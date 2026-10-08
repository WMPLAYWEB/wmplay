"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import JSZip from "jszip";
import {
  Film,
  Tv,
  Music,
  Radio,
  Grid,
  Settings,
  Search,
  Power,
  Play,
  Info,
  ChevronRight,
  ChevronLeft,
  Clock,
  Wifi,
  Sparkles,
  X,
  PlusCircle,
  Download,
  Trash2,
  Layers,
  FolderArchive,
  UploadCloud,
  FileCode,
  CheckCircle,
  AlertCircle,
  Folder,
  ArrowLeft,
  Tv2,
  Clapperboard,
  Flame,
  Sliders,
  ExternalLink,
  RotateCw,
  Loader2,
  MonitorPlay,
  Star,
  Calendar,
  Tag,
  Disc3,
  Headphones,
  Pause,
  Volume2,
  ListMusic,
  Menu
} from "lucide-react";
import { SAMPLE_MEDIA, MediaItem } from "@/data/media";
import { INITIAL_ADDONS, Addon } from "@/data/addons";
import {
  BRAZUCA_ROOT_CATEGORIES,
  BRAZUCA_CHANNELS,
  BrazucaCategoryNode,
  BrazucaChannel
} from "@/data/brazuca_full";
import KodiVideoPlayer from "@/components/KodiVideoPlayer";

type CategoryType = "movies" | "tv" | "music" | "live" | "addons";

interface MenuItem {
  id: CategoryType;
  label: string;
  icon: React.ElementType;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "movies", label: "Filmes (17.8k+)", icon: Film },
  { id: "tv", label: "Séries (13k+)", icon: Tv },
  { id: "music", label: "Música", icon: Music },
  { id: "live", label: "TV ao Vivo (154 ch)", icon: Radio },
  { id: "addons", label: "Add-ons (Brazuca Play)", icon: Grid },
];

export interface CatalogItem {
  id: number;
  type: string;
  title: string;
  original_title: string;
  link: string;
  thumbnail: string;
  fanart: string;
  rating: string;
  genres: string;
  year: string;
  synopsis: string;
  tmdb_id: string;
}

export interface FormattedEpisode {
  number: number;
  title: string;
  link?: string;
  duration?: string;
  streamUrl?: string;
}

export interface FormattedSeason {
  seasonNumber: number;
  seasonTitle: string;
  episodes: FormattedEpisode[];
}

export interface PlayingMediaState {
  title: string;
  info?: string;
  poster?: string;
  servers: { name: string; url: string; type: "video" | "embed" }[];
  activeServerIndex: number;
}

export default function KodiApp() {
  const [activeCategory, setActiveCategory] = useState<CategoryType>("movies");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(SAMPLE_MEDIA[0]);
  const [playingMedia, setPlayingMedia] = useState<PlayingMediaState | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [musicSearchQuery, setMusicSearchQuery] = useState("");
  const [musicSearchTrigger, setMusicSearchTrigger] = useState(0);
  const [currentTime, setCurrentTime] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Addons State
  const [addons, setAddons] = useState<Addon[]>(INITIAL_ADDONS);
  const [addonFilter, setAddonFilter] = useState<"all" | "installed" | "available">("all");

  // Brazuca Play Navigation State
  const [activeAddonView, setActiveAddonView] = useState<string | null>(null);
  const [activeBrazucaCategory, setActiveBrazucaCategory] = useState<BrazucaCategoryNode | null>(null);
  const [channelSubFilter, setChannelSubFilter] = useState<string>("todos");

  // Dynamic Catalog State (SQLite 38,676 real items)
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState<boolean>(false);
  const [catalogPage, setCatalogPage] = useState<number>(1);
  const [catalogTotalPages, setCatalogTotalPages] = useState<number>(1);
  const [catalogTotalCount, setCatalogTotalCount] = useState<number>(0);
  const [catalogGenre, setCatalogGenre] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  // Series Episodes Modal / View State
  const [selectedSeriesItem, setSelectedSeriesItem] = useState<CatalogItem | null>(null);
  const [seriesSeasons, setSeriesSeasons] = useState<FormattedSeason[]>([]);
  const [activeSeasonTab, setActiveSeasonTab] = useState<number>(1);
  const [loadingEpisodes, setLoadingEpisodes] = useState<boolean>(false);

  // Modal ZIP
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [isProcessingZip, setIsProcessingZip] = useState(false);
  const [zipStatusMessage, setZipStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [parsedZipFiles, setParsedZipFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Relógio do sistema Kodi
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Determine current active catalog type
  const getCurrentCatalogType = useCallback((): string => {
    if (activeAddonView === "brazucaplay" && activeBrazucaCategory) {
      if (activeBrazucaCategory.type === "movies") return "filmes";
      if (activeBrazucaCategory.type === "lancamentos") return "lancamentos";
      if (activeBrazucaCategory.type === "series") return "series";
      if (activeBrazucaCategory.type === "animes") return "animes";
      if (activeBrazucaCategory.type === "doramas") return "doramas";
      if (activeBrazucaCategory.type === "kids") return "desenhos";
      if (activeBrazucaCategory.type === "novelas") return "novelas";
      return "";
    }
    if (activeCategory === "movies") return "filmes";
    if (activeCategory === "tv") return "series";
    return "";
  }, [activeAddonView, activeBrazucaCategory, activeCategory]);

  // Fetch Catalog Items from API
  const fetchCatalogData = useCallback(async (type: string, page: number, search: string, genre: string) => {
    if (!type) return;
    setCatalogLoading(true);
    try {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: "48",
      });
      if (search) params.set("search", search);
      if (genre) params.set("genre", genre);

      const res = await fetch(`/api/catalog?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setCatalogItems(data.items || []);
        setCatalogTotalPages(data.totalPages || 1);
        setCatalogTotalCount(data.total || 0);
        setCatalogPage(data.page || 1);
      }
    } catch (err) {
      console.error("Failed to fetch catalog:", err);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Trigger catalog fetch when category / view changes
  useEffect(() => {
    const type = getCurrentCatalogType();
    if (type) {
      setCatalogPage(1);
      setCatalogGenre("");
      setCatalogSearch("");
      setJumpPageInput("");
      fetchCatalogData(type, 1, "", "");
    }
  }, [getCurrentCatalogType, fetchCatalogData]);

  // Load Episodes for a Series/Anime/Novela/Dorama
  const handleOpenSeriesEpisodes = async (item: CatalogItem) => {
    setSelectedSeriesItem(item);
    setLoadingEpisodes(true);
    setSeriesSeasons([]);
    setActiveSeasonTab(1);

    try {
      const params = new URLSearchParams({
        link: item.link,
        tmdbId: item.tmdb_id || "",
        title: item.title,
      });
      const res = await fetch(`/api/episodes?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.seasons && data.seasons.length > 0) {
        setSeriesSeasons(data.seasons);
        setActiveSeasonTab(data.seasons[0].seasonNumber);
        if (data.tmdbId && !item.tmdb_id) {
          setSelectedSeriesItem((prev) => (prev ? { ...prev, tmdb_id: data.tmdbId } : prev));
        }
      } else {
        // Fallback season
        setSeriesSeasons([
          {
            seasonNumber: 1,
            seasonTitle: "1ª Temporada",
            episodes: Array.from({ length: 12 }, (_, i) => ({
              number: i + 1,
              title: `Episódio ${i + 1}`,
              duration: "45m",
            })),
          },
        ]);
        setActiveSeasonTab(1);
      }
    } catch (err) {
      console.error("Error loading episodes:", err);
    } finally {
      setLoadingEpisodes(false);
    }
  };

  // Start Playback for a Movie or Episode with Multi-Server Redundancy
  const handlePlayMedia = (
    title: string,
    info: string,
    poster: string,
    tmdbId?: string,
    directUrl?: string,
    seasonNum?: number,
    epNum?: number
  ) => {
    const servers: { name: string; url: string; type: "video" | "embed" }[] = [];

    // 1. Direct stream if available and valid (e.g. Live TV or MP4)
    if (directUrl && (directUrl.includes(".m3u8") || directUrl.endsWith(".mp4") || directUrl.includes(".mp4?"))) {
      const isLiveHls = directUrl.includes(".m3u8");
      servers.push({
        name: isLiveHls ? "Sinal Ao Vivo 1 (Direto HD)" : "Transmissão Direta Dublada (MP4)",
        url: directUrl,
        type: "video",
      });

      if (isLiveHls) {
        // Servidor 2: Proxy rápido local (Elimina bloqueios de CORS e quedas)
        servers.push({
          name: "Sinal Ao Vivo 2 (Proxy Rápido Sem Travamentos)",
          url: `/api/proxy-stream?url=${encodeURIComponent(directUrl)}`,
          type: "video",
        });

        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes("cartoon")) {
          servers.push({
            name: "Sinal Ao Vivo 3 (Cartoon Network HD Reserva 1)",
            url: "http://170.83.16.50/CARTOON/index.m3u8",
            type: "video",
          });
          servers.push({
            name: "Sinal Ao Vivo 4 (Cartoon Network HD Reserva 2)",
            url: "http://170.83.49.66:8083/CARTOONHD/index.m3u8",
            type: "video",
          });
          servers.push({
            name: "Sinal Ao Vivo 5 (Cartoon Network HD Reserva 3)",
            url: "http://45.162.64.114/CARTOON_NETWORK/index.m3u8",
            type: "video",
          });
        } else if (lowerTitle.includes("discovery") || lowerTitle.includes("animal planet")) {
          servers.push({
            name: "Sinal Ao Vivo 3 (Fonte Alternativa 1)",
            url: "http://170.83.16.50/DISCOVERY_CHANNEL/index.m3u8",
            type: "video",
          });
        } else if (lowerTitle.includes("tnt") || lowerTitle.includes("space")) {
          servers.push({
            name: "Sinal Ao Vivo 3 (Fonte Alternativa TNT/Space)",
            url: "http://170.83.16.50/TNT/index.m3u8",
            type: "video",
          });
        }
      }
    } else if (directUrl && directUrl.startsWith("http") && !directUrl.includes("vidsrc.sh")) {
      servers.push({
        name: "Servidor Principal (Brazuca Stream)",
        url: directUrl,
        type: "embed",
      });
    }

    // 2. Provedores com Suporte a Áudio PT-BR e Legendas
    if (tmdbId) {
      if (seasonNum && epNum) {
        servers.push({
          name: "MultiEmbed (Áudio PT-BR / Legendas)",
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${seasonNum}&e=${epNum}`,
          type: "embed",
        });
        servers.push({
          name: "AutoEmbed Backup HD",
          url: `https://player.autoembed.cc/embed/tv/${tmdbId}/${seasonNum}/${epNum}`,
          type: "embed",
        });
        servers.push({
          name: "VidSrc HD",
          url: `https://vidsrc.sh/embed/tv?tmdb=${tmdbId}&season=${seasonNum}&episode=${epNum}`,
          type: "embed",
        });
        servers.push({
          name: "2Embed Skin",
          url: `https://www.2embed.skin/embedtv/${tmdbId}&s=${seasonNum}&e=${epNum}`,
          type: "embed",
        });
      } else {
        servers.push({
          name: "MultiEmbed (Áudio PT-BR / Legendas)",
          url: `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1`,
          type: "embed",
        });
        servers.push({
          name: "AutoEmbed Backup HD",
          url: `https://player.autoembed.cc/embed/movie/${tmdbId}`,
          type: "embed",
        });
        servers.push({
          name: "VidSrc HD",
          url: `https://vidsrc.sh/embed/movie?tmdb=${tmdbId}`,
          type: "embed",
        });
        servers.push({
          name: "2Embed Skin",
          url: `https://www.2embed.skin/embed/${tmdbId}`,
          type: "embed",
        });
      }
    }

    // 3. Fallback reliable video streams if nothing added (Live Brazilian streams)
    if (servers.length === 0) {
      servers.push({
        name: "Sinal Ao Vivo 1 (TV Cultura)",
        url: directUrl || "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8",
        type: "video",
      });
      servers.push({
        name: "Sinal Ao Vivo 2 (Record News)",
        url: "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
        type: "video",
      });
    }

    setPlayingMedia({
      title,
      info,
      poster,
      servers,
      activeServerIndex: 0,
    });

    // 4. Carregamento em tempo real de Servidores Nacionais Dublados (Overflix / Streamtape / Mixdrop)
    if (!directUrl?.includes(".m3u8") && (directUrl || tmdbId)) {
      const isTv = Boolean(seasonNum && epNum);
      const params = new URLSearchParams({
        link: directUrl || "",
        tmdbId: tmdbId || "",
        type: isTv ? "tv" : "movie",
        season: String(seasonNum || 1),
        episode: String(epNum || 1),
      });

      fetch(`/api/resolve-stream?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.servers) && data.servers.length > 0) {
            setPlayingMedia((prev) => {
              if (!prev || prev.title !== title) return prev;
              const newServers = [...data.servers];
              prev.servers.forEach((s) => {
                if (!newServers.some((ns) => ns.url === s.url)) {
                  newServers.push(s);
                }
              });
              return {
                ...prev,
                servers: newServers,
                activeServerIndex: 0, // Prioriza imediatamente o primeiro servidor Dublado PT-BR
              };
            });
          }
        })
        .catch((err) => console.error("Erro ao resolver servidores dublados:", err));
    }
  };

  // Filtragem dos Add-ons
  const filteredAddons = addons.filter((addon) => {
    const matchesSearch =
      searchQuery.trim() === "" ||
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (addonFilter === "installed") return addon.installed;
    if (addonFilter === "available") return !addon.installed;
    return true;
  });

  // Canais filtrados dentro do Brazuca Play
  const filteredBrazucaChannels = BRAZUCA_CHANNELS.filter((ch) => {
    const matchesFilter =
      channelSubFilter === "todos" || ch.category === channelSubFilter;
    if (!matchesFilter) return false;
    if (searchQuery.trim() === "") return true;
    return (
      ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ch.epg && ch.epg.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const toggleInstallAddon = (addonId: string) => {
    setAddons((prev) =>
      prev.map((addon) =>
        addon.id === addonId ? { ...addon, installed: !addon.installed } : addon
      )
    );
  };

  // Manipulação de Upload e Extração do arquivo .ZIP (Kodi Add-on)
  const handleZipFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessingZip(true);
    setZipStatusMessage({ type: "info", text: `Lendo arquivo: ${file.name}...` });
    setParsedZipFiles([]);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const fileList: string[] = [];
      let addonXmlFound = false;
      let addonId = "";
      let addonName = file.name.replace(".zip", "");
      let addonVersion = "1.0.0";
      let addonAuthor = "Desconhecido";
      let addonDescription = "Instalado via arquivo .ZIP local";
      let addonIcon = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80";

      zipContent.forEach((relativePath) => {
        fileList.push(relativePath);
        if (relativePath.toLowerCase().endsWith("addon.xml")) {
          addonXmlFound = true;
        }
      });

      if (addonXmlFound) {
        const addonXmlFile = Object.values(zipContent.files).find((f) =>
          f.name.toLowerCase().endsWith("addon.xml")
        );
        if (addonXmlFile) {
          const xmlText = await addonXmlFile.async("text");
          const idMatch = xmlText.match(/id=["']([^"']+)["']/);
          const nameMatch = xmlText.match(/name=["']([^"']+)["']/);
          const versionMatch = xmlText.match(/version=["']([^"']+)["']/);
          const providerMatch = xmlText.match(/provider-name=["']([^"']+)["']/);
          const descMatch = xmlText.match(/<description[^>]*>([\s\S]*?)<\/description>/);

          if (idMatch) addonId = idMatch[1];
          if (nameMatch) addonName = nameMatch[1];
          if (versionMatch) addonVersion = versionMatch[1];
          if (providerMatch) addonAuthor = providerMatch[1];
          if (descMatch) addonDescription = descMatch[1].trim();
        }
      }

      if (!addonId) {
        addonId = `plugin.custom.${Date.now()}`;
      }

      setParsedZipFiles(fileList.slice(0, 8));

      const newAddon: Addon = {
        id: addonId,
        name: addonName,
        version: addonVersion,
        author: addonAuthor,
        description: addonDescription,
        icon: addonIcon,
        fanart: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&auto=format&fit=crop&q=80",
        installed: true,
        type: "repository",
        category: "video",
        repoUrl: file.name,
      };

      setAddons((prev) => {
        const exists = prev.some((a) => a.id === newAddon.id);
        if (exists) {
          return prev.map((a) => (a.id === newAddon.id ? newAddon : a));
        }
        return [newAddon, ...prev];
      });

      setZipStatusMessage({
        type: "success",
        text: `Add-on "${addonName} v${addonVersion}" instalado com sucesso no repositório local!`,
      });
    } catch (err: any) {
      console.error(err);
      setZipStatusMessage({
        type: "error",
        text: `Erro ao descompactar arquivo ZIP: ${err.message || "Arquivo inválido ou corrompido."}`,
      });
    } finally {
      setIsProcessingZip(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isBrowsingCatalog =
    activeCategory === "movies" ||
    activeCategory === "tv" ||
    (activeAddonView === "brazucaplay" &&
      activeBrazucaCategory &&
      activeBrazucaCategory.type !== "channels" &&
      activeBrazucaCategory.type !== "settings");

  const currentCatalogType = getCurrentCatalogType();

  const GENRES_LIST = [
    "Todos",
    "Ação",
    "Comédia",
    "Drama",
    "Ficção",
    "Terror",
    "Suspense",
    "Aventura",
    "Animação",
    "Romance",
    "Documentário",
  ];

  return (
    <div className="flex h-screen w-screen bg-black text-slate-100 font-sans overflow-hidden select-none">
      {/* Background Fanart */}
      <div
        className="fixed inset-0 bg-cover bg-center transition-all duration-700 opacity-25 filter blur-sm transform scale-105 pointer-events-none"
        style={{
          backgroundImage: `url(${
            activeAddonView === "brazucaplay"
              ? "/brazuca_fanart.jpg"
              : selectedMedia.backdrop
          })`,
        }}
      />
      <div className="fixed inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40 pointer-events-none" />

      {/* Kodi Estuary Sidebar (Desktop) */}
      <aside className="hidden md:flex relative z-20 w-64 bg-zinc-950/95 border-r border-zinc-850 backdrop-blur-md flex-col justify-between shrink-0 shadow-2xl">
        <div>
          {/* Logo / Header */}
          <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                <Tv2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-wider text-white">WM<span className="text-red-500">PLAY</span></h1>
                <p className="text-[10px] text-red-500 font-bold tracking-widest uppercase">
                  Streaming & TV ao Vivo
                </p>
              </div>
            </div>
          </div>

          {/* Menu de Navegação Kodi */}
          <nav className="p-3 space-y-1">
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeCategory === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveCategory(item.id);
                    setActiveAddonView(null);
                    setActiveBrazucaCategory(null);
                    setSelectedSeriesItem(null);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30 font-bold"
                      : "text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-red-300" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Barra Lateral */}
        <div className="p-4 border-t border-zinc-800/60 space-y-3">
          <div className="flex items-center justify-between px-2 text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              Online (38.6k DB)
            </span>
            <span className="font-mono text-red-500 font-bold">{currentTime}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveCategory("addons");
                setActiveAddonView("brazucaplay");
                setActiveBrazucaCategory(null);
                setSelectedSeriesItem(null);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-rose-800 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold py-2.5 rounded-lg shadow-md transition-all"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Brazuca Play</span>
            </button>
            <button
              onClick={() => setIsZipModalOpen(true)}
              className="p-2.5 rounded-lg bg-slate-800 hover:bg-zinc-800 text-slate-300 hover:text-white transition-colors"
              title="Instalar via ZIP"
            >
              <UploadCloud className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Overlay (Menu Lateral Deslizante para Celular) */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between shadow-2xl p-5 animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header do Drawer */}
              <div className="pb-4 border-b border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                    <Tv2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-wider text-white">WM<span className="text-red-500">PLAY</span></h1>
                    <p className="text-[10px] text-red-500 font-bold tracking-widest uppercase">
                      Streaming & TV
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Menu de Navegação Mobile */}
              <nav className="py-4 space-y-1.5">
                {MENU_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveCategory(item.id);
                        setActiveAddonView(null);
                        setActiveBrazucaCategory(null);
                        setSelectedSeriesItem(null);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30 font-bold"
                          : "text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-red-300" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé do Drawer Mobile */}
            <div className="pt-4 border-t border-zinc-800/80 space-y-3">
              <div className="flex items-center justify-between px-2 text-xs text-slate-400">
                <span className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  Online (38.6k DB)
                </span>
                <span className="font-mono text-red-500 font-bold">{currentTime}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setActiveCategory("addons");
                    setActiveAddonView("brazucaplay");
                    setActiveBrazucaCategory(null);
                    setSelectedSeriesItem(null);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-rose-800 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-bold py-2.5 rounded-xl shadow-md transition-all"
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Brazuca Play</span>
                </button>
                <button
                  onClick={() => {
                    setIsZipModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-zinc-800 text-slate-300 hover:text-white transition-colors"
                  title="Instalar via ZIP"
                >
                  <UploadCloud className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Principal do Kodi */}
      <main className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {/* Barra Superior Responsiva */}
        <header className="h-14 sm:h-16 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md px-3 sm:px-6 md:px-8 flex items-center justify-between shrink-0 gap-2 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-2xl min-w-0">
            {/* Botão Hambúrguer Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-slate-300 hover:text-white shrink-0"
              title="Abrir Menu WMPLAY"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo Mobile */}
            <div className="md:hidden flex items-center gap-1.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-red-600 to-rose-600 flex items-center justify-center shadow-md shadow-red-600/30">
                <Tv2 className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm tracking-wider text-white">WM<span className="text-red-500">PLAY</span></span>
            </div>

            {activeAddonView && (
              <button
                onClick={() => {
                  if (selectedSeriesItem) {
                    setSelectedSeriesItem(null);
                  } else if (activeBrazucaCategory) {
                    setActiveBrazucaCategory(null);
                  } else {
                    setActiveAddonView(null);
                  }
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-zinc-800 text-red-500 text-xs font-bold transition-colors shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}

            {/* Input de Busca Dinâmica */}
            <div className="relative w-full min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={
                  isBrowsingCatalog
                    ? catalogSearch
                    : activeCategory === "music"
                    ? musicSearchQuery
                    : searchQuery
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (isBrowsingCatalog) {
                    setCatalogSearch(val);
                  } else if (activeCategory === "music") {
                    setMusicSearchQuery(val);
                  } else {
                    setSearchQuery(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (isBrowsingCatalog) {
                      setCatalogPage(1);
                      fetchCatalogData(currentCatalogType, 1, catalogSearch, catalogGenre);
                    } else if (activeCategory === "music") {
                      setMusicSearchTrigger((prev) => prev + 1);
                    }
                  }
                }}
                placeholder={
                  isBrowsingCatalog
                    ? `Pesquisar 38.600+ títulos (Enter)...`
                    : activeCategory === "music"
                    ? "Pesquisar YouTube, Spotify, SoundCloud..."
                    : "Filtrar por nome ou canal..."
                }
                className="w-full bg-zinc-950/90 border border-zinc-700/80 rounded-xl pl-10 pr-9 sm:pr-10 py-1.5 sm:py-2 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 transition-all"
              />
              {isBrowsingCatalog && catalogSearch ? (
                <button
                  onClick={() => {
                    setCatalogSearch("");
                    setCatalogPage(1);
                    fetchCatalogData(currentCatalogType, 1, "", catalogGenre);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : activeCategory === "music" && musicSearchQuery ? (
                <button
                  onClick={() => {
                    setMusicSearchQuery("");
                    setMusicSearchTrigger((prev) => prev + 1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              onClick={() => setIsZipModalOpen(true)}
              className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-red-950/80 border border-red-600/30 hover:border-red-500 text-red-400 text-xs font-semibold px-4 py-2 rounded-xl transition-all"
            >
              <UploadCloud className="w-4 h-4 text-red-500" />
              <span>Instalar ZIP (WinRAR)</span>
            </button>
            <div className="hidden sm:block h-6 w-px bg-slate-800" />
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400">
              <Clock className="w-4 h-4 text-red-500" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* Área de Visualização Principal Responsiva */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-8 space-y-4 sm:space-y-6 pb-24 md:pb-8">
          {/* ============================================================== */}
          {/* SEÇÃO 1: VISUALIZAÇÃO INTERNA DO ADD-ON BRAZUCA PLAY           */}
          {/* ============================================================== */}
          {activeAddonView === "brazucaplay" ? (
            <div className="space-y-6">
              {/* Header Oficial do Brazuca Play */}
              <div className="relative rounded-2xl overflow-hidden border border-red-600/30 bg-zinc-950/90 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-red-500/50 shadow-xl bg-black flex items-center justify-center shrink-0">
                    <img
                      src="/brazuca_icon.png"
                      alt="Brazuca Play"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-white">Brazuca Play</h2>
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-500/50 px-2.5 py-0.5 rounded-full font-mono">
                        v2.1.4 OFICIAL
                      </span>
                      <span className="text-xs font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/50 px-2.5 py-0.5 rounded-full">
                        38.676 Títulos
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Repositório oficial descompactado: Todos os 154 canais de TV ao vivo, mais de 17.800 filmes, 13.000 séries, animes e desenhos com episódios completos!
                    </p>
                  </div>
                </div>

                {activeBrazucaCategory && (
                  <button
                    onClick={() => {
                      setSelectedSeriesItem(null);
                      setActiveBrazucaCategory(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/30 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white text-xs font-bold transition-all shadow-md"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Menu Raiz</span>
                  </button>
                )}
              </div>

              {/* TELA 1: MENU RAIZ DO BRAZUCA PLAY */}
              {!activeBrazucaCategory ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 pb-12">
                  {BRAZUCA_ROOT_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setActiveBrazucaCategory(cat);
                        setSelectedSeriesItem(null);
                      }}
                      className="group relative rounded-2xl overflow-hidden border border-red-600/20 bg-zinc-950/70 hover:border-red-500 transition-all duration-300 cursor-pointer p-6 flex flex-col justify-between hover:scale-[1.02] shadow-xl hover:shadow-red-600/20"
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-35 transition-opacity duration-500"
                        style={{ backgroundImage: `url(${cat.banner})` }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600/40 to-blue-500/30 border border-red-500/40 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                            <Folder className="w-6 h-6 fill-red-500/20 text-red-400" />
                          </div>
                          {cat.badge && (
                            <span className="text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
                              {cat.badge}
                            </span>
                          )}
                        </div>

                        <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                          {cat.title}
                        </h3>
                        <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                          {cat.description}
                        </p>
                      </div>

                      <div className="relative z-10 mt-6 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs font-semibold text-red-500">
                        <span>Abrir Categoria</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeBrazucaCategory.type === "channels" ? (
                /* TELA 2: CANAIS DE TV AO VIVO (154 CANAIS OFICIAIS) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Grade Oficial de Canais</span>
                      <span className="text-xs text-red-400 bg-red-950/60 border border-red-600/30 px-2.5 py-0.5 rounded-full font-mono">
                        {filteredBrazucaChannels.length} canais ao vivo
                      </span>
                    </h3>

                    {/* Subfiltros de Canais */}
                    <div className="flex items-center gap-1.5 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 text-xs">
                      {[
                        { id: "todos", label: "Todos (154)" },
                        { id: "aberta", label: "TV Aberta" },
                        { id: "esportes", label: "Esportes" },
                        { id: "filmes_series", label: "Filmes & Séries" },
                        { id: "infantil", label: "Infantil" },
                        { id: "noticias_docs", label: "Notícias" },
                        { id: "variedades", label: "Variedades" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setChannelSubFilter(tab.id)}
                          className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                            channelSubFilter === tab.id
                              ? "bg-red-600 text-white font-bold"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
                    {filteredBrazucaChannels.map((ch) => (
                      <div
                        key={ch.id}
                        onClick={() =>
                          handlePlayMedia(
                            ch.name,
                            ch.epg || "Transmissão Ao Vivo",
                            ch.logo,
                            undefined,
                            ch.streamUrl
                          )
                        }
                        className="group p-4 rounded-2xl border border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:scale-105 shadow-lg hover:shadow-red-600/20"
                      >
                        <div className="aspect-video w-full rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-center p-3 relative overflow-hidden group-hover:border-red-600/40">
                          <img
                            src={ch.logo}
                            alt={ch.name}
                            className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 fill-red-500 text-red-500 filter drop-shadow" />
                          </div>
                        </div>

                        <div className="mt-3">
                          <h4 className="font-bold text-sm text-slate-100 truncate group-hover:text-red-400 transition-colors">
                            {ch.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {ch.epg || "Transmissão Ao Vivo"}
                          </p>
                        </div>

                        <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px]">
                          <span className="text-red-500 font-mono uppercase font-bold">
                            {ch.category}
                          </span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            AO VIVO
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedSeriesItem ? (
                /* TELA 3: EPISÓDIOS DA SÉRIE / ANIME / NOVELA SELECIONADA */
                <div className="space-y-6 pb-12">
                  <div className="relative rounded-2xl overflow-hidden border border-red-600/25 bg-zinc-950/80 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start backdrop-blur-md shadow-2xl">
                    <div className="relative w-44 h-64 rounded-xl overflow-hidden shadow-2xl border border-red-500/30 shrink-0 bg-black">
                      <img
                        src={selectedSeriesItem.thumbnail || "/brazuca_icon.png"}
                        alt={selectedSeriesItem.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="bg-red-600/20 text-red-400 font-bold px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase font-mono">
                          {selectedSeriesItem.type}
                        </span>
                        {selectedSeriesItem.year && (
                          <span className="text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-red-500" />
                            {selectedSeriesItem.year}
                          </span>
                        )}
                        {selectedSeriesItem.rating && (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {selectedSeriesItem.rating}
                          </span>
                        )}
                        {selectedSeriesItem.genres && (
                          <span className="text-slate-400">· {selectedSeriesItem.genres}</span>
                        )}
                      </div>
                      <h2 className="text-3xl font-black text-white">{selectedSeriesItem.title}</h2>
                      <p className="text-slate-300 text-sm leading-relaxed max-w-4xl line-clamp-4">
                        {selectedSeriesItem.synopsis || "Sinopse não informada pelo repositório."}
                      </p>
                      <div className="pt-2 flex items-center gap-3">
                        <button
                          onClick={() => setSelectedSeriesItem(null)}
                          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-zinc-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Voltar para lista de títulos</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seletor de Temporadas e Grade de Episódios */}
                  {loadingEpisodes ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-red-500">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <p className="text-sm font-semibold">Carregando temporadas e episódios sincronizados...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Abas de Temporada */}
                      {seriesSeasons.length > 0 && (
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
                          {seriesSeasons.map((s) => (
                            <button
                              key={s.seasonNumber}
                              onClick={() => setActiveSeasonTab(s.seasonNumber)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                                activeSeasonTab === s.seasonNumber
                                  ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/20"
                                  : "bg-zinc-950/90 text-slate-400 hover:text-white border border-zinc-800"
                              }`}
                            >
                              {s.seasonTitle} ({s.episodes.length} eps)
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Lista de Episódios da Temporada Ativa */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(
                          seriesSeasons.find((s) => s.seasonNumber === activeSeasonTab)?.episodes || []
                        ).map((ep) => (
                          <div
                            key={ep.number}
                            onClick={() =>
                              handlePlayMedia(
                                `${selectedSeriesItem.title} - T${activeSeasonTab}E${ep.number}: ${ep.title}`,
                                selectedSeriesItem.synopsis,
                                selectedSeriesItem.thumbnail,
                                selectedSeriesItem.tmdb_id,
                                ep.link || selectedSeriesItem.link || ep.streamUrl,
                                activeSeasonTab,
                                ep.number
                              )
                            }
                            className="group p-4 rounded-xl border border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 cursor-pointer transition-all duration-200 flex items-center justify-between hover:scale-[1.01] shadow-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-600/30 flex items-center justify-center font-mono font-bold text-red-400 text-sm shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                {ep.number}
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-slate-100 group-hover:text-red-400 truncate">
                                  {ep.title}
                                </h4>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {ep.duration || "45m"} · Full HD
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shrink-0 ml-2">
                              <Play className="w-4 h-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* TELA 4: CATÁLOGO GIGANTE DE VÍDEOS (FILMES, LANÇAMENTOS, SÉRIES, ANIMES, DORAMAS, DESENHOS) */
                <CatalogBrowseView
                  title={activeBrazucaCategory.title}
                  badge={activeBrazucaCategory.badge}
                  catalogLoading={catalogLoading}
                  catalogItems={catalogItems}
                  catalogPage={catalogPage}
                  catalogTotalPages={catalogTotalPages}
                  catalogTotalCount={catalogTotalCount}
                  catalogGenre={catalogGenre}
                  catalogSearch={catalogSearch}
                  jumpPageInput={jumpPageInput}
                  genresList={GENRES_LIST}
                  onSelectGenre={(g) => {
                    const newGenre = g === "Todos" ? "" : g;
                    setCatalogGenre(newGenre);
                    setCatalogPage(1);
                    fetchCatalogData(currentCatalogType, 1, catalogSearch, newGenre);
                  }}
                  onPageChange={(newPage) => {
                    if (newPage < 1 || newPage > catalogTotalPages) return;
                    setCatalogPage(newPage);
                    fetchCatalogData(currentCatalogType, newPage, catalogSearch, catalogGenre);
                  }}
                  onJumpPageSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(jumpPageInput, 10);
                    if (!isNaN(p) && p >= 1 && p <= catalogTotalPages) {
                      setCatalogPage(p);
                      fetchCatalogData(currentCatalogType, p, catalogSearch, catalogGenre);
                    }
                  }}
                  setJumpPageInput={setJumpPageInput}
                  onItemClick={(item) => {
                    if (
                      item.type === "series" ||
                      item.type === "animes" ||
                      item.type === "doramas" ||
                      item.type === "desenhos" ||
                      item.type === "novelas"
                    ) {
                      handleOpenSeriesEpisodes(item);
                    } else {
                      handlePlayMedia(
                        item.title,
                        item.synopsis,
                        item.thumbnail,
                        item.tmdb_id,
                        item.link
                      );
                    }
                  }}
                />
              )}
            </div>
          ) : activeCategory === "movies" || activeCategory === "tv" ? (
            /* ============================================================== */
            /* SEÇÃO 2: CATÁLOGO DIRETO VIA MENU LATERAL DO KODI              */
            /* ============================================================== */
            selectedSeriesItem ? (
              <div className="space-y-6 pb-12">
                <div className="relative rounded-2xl overflow-hidden border border-red-600/25 bg-zinc-950/80 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start backdrop-blur-md shadow-2xl">
                  <div className="relative w-44 h-64 rounded-xl overflow-hidden shadow-2xl border border-red-500/30 shrink-0 bg-black">
                    <img
                      src={selectedSeriesItem.thumbnail || "/brazuca_icon.png"}
                      alt={selectedSeriesItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className="bg-red-600/20 text-red-400 font-bold px-2.5 py-0.5 rounded-full border border-red-500/30 uppercase font-mono">
                        {selectedSeriesItem.type}
                      </span>
                      {selectedSeriesItem.year && (
                        <span className="text-slate-300 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          {selectedSeriesItem.year}
                        </span>
                      )}
                      {selectedSeriesItem.rating && (
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {selectedSeriesItem.rating}
                        </span>
                      )}
                      {selectedSeriesItem.genres && (
                        <span className="text-slate-400">· {selectedSeriesItem.genres}</span>
                      )}
                    </div>
                    <h2 className="text-3xl font-black text-white">{selectedSeriesItem.title}</h2>
                    <p className="text-slate-300 text-sm leading-relaxed max-w-4xl line-clamp-4">
                      {selectedSeriesItem.synopsis || "Sinopse não informada pelo repositório."}
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <button
                        onClick={() => setSelectedSeriesItem(null)}
                        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-zinc-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar para lista de títulos</span>
                      </button>
                    </div>
                  </div>
                </div>

                {loadingEpisodes ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-3 text-red-500">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className="text-sm font-semibold">Carregando temporadas e episódios sincronizados...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {seriesSeasons.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
                        {seriesSeasons.map((s) => (
                          <button
                            key={s.seasonNumber}
                            onClick={() => setActiveSeasonTab(s.seasonNumber)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                              activeSeasonTab === s.seasonNumber
                                ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/20"
                                : "bg-zinc-950/90 text-slate-400 hover:text-white border border-zinc-800"
                            }`}
                          >
                            {s.seasonTitle} ({s.episodes.length} eps)
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {(
                        seriesSeasons.find((s) => s.seasonNumber === activeSeasonTab)?.episodes || []
                      ).map((ep) => (
                        <div
                          key={ep.number}
                          onClick={() =>
                            handlePlayMedia(
                              `${selectedSeriesItem.title} - T${activeSeasonTab}E${ep.number}: ${ep.title}`,
                              selectedSeriesItem.synopsis,
                              selectedSeriesItem.thumbnail,
                              selectedSeriesItem.tmdb_id,
                              ep.link || selectedSeriesItem.link || ep.streamUrl,
                              activeSeasonTab,
                              ep.number
                            )
                          }
                          className="group p-4 rounded-xl border border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 cursor-pointer transition-all duration-200 flex items-center justify-between hover:scale-[1.01] shadow-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-600/30 flex items-center justify-center font-mono font-bold text-red-400 text-sm shrink-0 group-hover:bg-red-600 group-hover:text-white transition-colors">
                              {ep.number}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-slate-100 group-hover:text-red-400 truncate">
                                {ep.title}
                              </h4>
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {ep.duration || "45m"} · Full HD
                              </p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-red-600/30 border border-red-500/30 flex items-center justify-center text-red-400 group-hover:bg-red-600 group-hover:text-white transition-all shrink-0 ml-2">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <CatalogBrowseView
                title={activeCategory === "movies" ? "Filmes do Catálogo" : "Séries de TV"}
                badge={activeCategory === "movies" ? "17.857 Filmes" : "13.075 Séries"}
                catalogLoading={catalogLoading}
                catalogItems={catalogItems}
                catalogPage={catalogPage}
                catalogTotalPages={catalogTotalPages}
                catalogTotalCount={catalogTotalCount}
                catalogGenre={catalogGenre}
                catalogSearch={catalogSearch}
                jumpPageInput={jumpPageInput}
                genresList={GENRES_LIST}
                onSelectGenre={(g) => {
                  const newGenre = g === "Todos" ? "" : g;
                  setCatalogGenre(newGenre);
                  setCatalogPage(1);
                  fetchCatalogData(currentCatalogType, 1, catalogSearch, newGenre);
                }}
                onPageChange={(newPage) => {
                  if (newPage < 1 || newPage > catalogTotalPages) return;
                  setCatalogPage(newPage);
                  fetchCatalogData(currentCatalogType, newPage, catalogSearch, catalogGenre);
                }}
                onJumpPageSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(jumpPageInput, 10);
                  if (!isNaN(p) && p >= 1 && p <= catalogTotalPages) {
                    setCatalogPage(p);
                    fetchCatalogData(currentCatalogType, p, catalogSearch, catalogGenre);
                  }
                }}
                setJumpPageInput={setJumpPageInput}
                onItemClick={(item) => {
                  if (item.type === "series") {
                    handleOpenSeriesEpisodes(item);
                  } else {
                    handlePlayMedia(
                      item.title,
                      item.synopsis,
                      item.thumbnail,
                      item.tmdb_id,
                      item.link
                    );
                  }
                }}
              />
            )
          ) : activeCategory === "live" ? (
            /* ============================================================== */
            /* SEÇÃO 3: TV AO VIVO (154 CANAIS OFICIAIS)                      */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Radio className="w-6 h-6 text-red-500" />
                  <span>Canais de TV ao Vivo</span>
                  <span className="text-xs text-red-400 bg-red-950/60 border border-red-600/30 px-2.5 py-0.5 rounded-full font-mono">
                    {filteredBrazucaChannels.length} canais
                  </span>
                </h3>

                <div className="flex items-center gap-1.5 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 text-xs">
                  {[
                    { id: "todos", label: "Todos (154)" },
                    { id: "aberta", label: "TV Aberta" },
                    { id: "esportes", label: "Esportes" },
                    { id: "filmes_series", label: "Filmes & Séries" },
                    { id: "infantil", label: "Infantil" },
                    { id: "noticias_docs", label: "Notícias" },
                    { id: "variedades", label: "Variedades" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setChannelSubFilter(tab.id)}
                      className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
                        channelSubFilter === tab.id
                          ? "bg-red-600 text-white font-bold"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
                {filteredBrazucaChannels.map((ch) => (
                  <div
                    key={ch.id}
                    onClick={() =>
                      handlePlayMedia(
                        ch.name,
                        ch.epg || "Transmissão Ao Vivo",
                        ch.logo,
                        undefined,
                        ch.streamUrl
                      )
                    }
                    className="group p-4 rounded-2xl border border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 cursor-pointer transition-all duration-200 flex flex-col justify-between hover:scale-105 shadow-lg hover:shadow-red-600/20"
                  >
                    <div className="aspect-video w-full rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-center p-3 relative overflow-hidden group-hover:border-red-600/40">
                      <img
                        src={ch.logo}
                        alt={ch.name}
                        className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-8 h-8 fill-red-500 text-red-500 filter drop-shadow" />
                      </div>
                    </div>

                    <div className="mt-3">
                      <h4 className="font-bold text-sm text-slate-100 truncate group-hover:text-red-400 transition-colors">
                        {ch.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {ch.epg || "Transmissão Ao Vivo"}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between text-[11px]">
                      <span className="text-red-500 font-mono uppercase font-bold">
                        {ch.category}
                      </span>
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        AO VIVO
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeCategory === "music" ? (
            /* ============================================================== */
            /* SEÇÃO 4: CENTRAL DE MÚSICA WMPLAY (YOUTUBE, SPOTIFY, SOUNDCLOUD)*/
            /* ============================================================== */
            <MusicHubView
              externalQuery={musicSearchQuery}
              externalTrigger={musicSearchTrigger}
              onQueryChange={setMusicSearchQuery}
            />
          ) : activeCategory === "addons" ? (
            /* ============================================================== */
            /* SEÇÃO 5: GERENCIADOR DE COMPLEMENTOS / ADDONS                  */
            /* ============================================================== */
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Grid className="w-6 h-6 text-red-500" />
                    <span>Navegador de Complementos (Addons)</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Repositórios oficiais, addons de streaming e instalador de ZIP.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex bg-zinc-950/90 p-1 rounded-xl border border-zinc-800 text-xs">
                    {(["all", "installed", "available"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAddonFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg transition-colors font-medium capitalize ${
                          addonFilter === filter
                            ? "bg-red-600 text-white font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {filter === "all" ? "Todos" : filter === "installed" ? "Instalados" : "Disponíveis"}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsZipModalOpen(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-rose-700 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-red-600/30 transition-all hover:scale-105"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Instalar via ZIP</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAddons.map((addon) => (
                  <div
                    key={addon.id}
                    className="group relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/70 hover:border-red-600/50 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-zinc-700 bg-black shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                        <img
                          src={addon.icon}
                          alt={addon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base text-white truncate group-hover:text-red-400 transition-colors">
                            {addon.name}
                          </h3>
                          <span className="text-[10px] font-mono text-red-500 bg-red-950/60 border border-red-800/40 px-2 py-0.5 rounded-full">
                            v{addon.version}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">por {addon.author}</p>
                        <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                          {addon.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-zinc-850 flex items-center justify-between">
                      {addon.id === "plugin.video.brazucaplay" ? (
                        <button
                          onClick={() => {
                            setActiveAddonView("brazucaplay");
                            setActiveBrazucaCategory(null);
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-rose-800 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs py-2 rounded-xl shadow-md transition-all hover:scale-[1.02]"
                        >
                          <Flame className="w-4 h-4" />
                          <span>Abrir Brazuca Play</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleInstallAddon(addon.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            addon.installed
                              ? "bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-300 border border-zinc-700 hover:border-red-500/40"
                              : "bg-red-600 hover:bg-red-600 text-white shadow-md shadow-red-600/30"
                          }`}
                        >
                          {addon.installed ? "Desinstalar" : "Instalar Complemento"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Fallback Mídia Padrão */
            <div className="text-center py-20 text-slate-400">
              <p>Selecione uma categoria válida no menu lateral do WMPLAY.</p>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR PARA CELULARES (MOBILE BOTTOM NAV) */}
      {/* ============================================================== */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 border-t border-zinc-800 backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeCategory === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveCategory(item.id);
                setActiveAddonView(null);
                setActiveBrazucaCategory(null);
                setSelectedSeriesItem(null);
              }}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all min-w-[56px] ${
                isActive
                  ? "text-red-500 font-bold scale-105"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? "bg-red-600/20 text-red-500 shadow-sm shadow-red-600/30" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ============================================================== */}
      {/* MODAL PLAYER DE VÍDEO UNIVERSAL COM HLS.JS + SERVIDORES AUTO   */}
      {/* ============================================================== */}
      {playingMedia && (
        <KodiVideoPlayer
          title={playingMedia.title}
          info={playingMedia.info}
          poster={playingMedia.poster}
          servers={playingMedia.servers}
          activeServerIndex={playingMedia.activeServerIndex}
          onSelectServer={(idx) =>
            setPlayingMedia((prev) =>
              prev ? { ...prev, activeServerIndex: idx } : null
            )
          }
          onClose={() => setPlayingMedia(null)}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL DE INSTALAÇÃO VIA ZIP                                    */}
      {/* ============================================================== */}
      {isZipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-zinc-950 border border-zinc-700 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center text-red-500">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Instalar a partir de arquivo ZIP</h3>
                  <p className="text-xs text-zinc-400">Suporte a pacotes de streaming (.zip) e complementos</p>
                </div>
              </div>
              <button
                onClick={() => setIsZipModalOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-900 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-red-600/30 hover:border-red-500 bg-black/40 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all hover:bg-black/70 text-center"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleZipFileUpload}
              />
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Clique para selecionar o arquivo .ZIP</p>
                <p className="text-xs text-slate-400 mt-1">
                  Exemplo: plugin.video.BrazucaPlay-2.1.4.zip
                </p>
              </div>
            </div>

            {zipStatusMessage && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${
                  zipStatusMessage.type === "success"
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                    : zipStatusMessage.type === "error"
                    ? "bg-red-950/60 border-red-500/40 text-red-300"
                    : "bg-red-950/60 border-red-600/40 text-red-400"
                }`}
              >
                {zipStatusMessage.type === "success" ? (
                  <CheckCircle className="w-5 h-5 shrink-0" />
                ) : zipStatusMessage.type === "error" ? (
                  <AlertCircle className="w-5 h-5 shrink-0" />
                ) : (
                  <Loader2 className="w-5 h-5 shrink-0 animate-spin" />
                )}
                <span>{zipStatusMessage.text}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsZipModalOpen(false)}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-zinc-800 text-slate-200 text-xs font-semibold"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponente de Navegação no Catálogo Gigante (Filmes & Séries com Paginação de Alta Velocidade)
function CatalogBrowseView({
  title,
  badge,
  catalogLoading,
  catalogItems,
  catalogPage,
  catalogTotalPages,
  catalogTotalCount,
  catalogGenre,
  catalogSearch,
  jumpPageInput,
  genresList,
  onSelectGenre,
  onPageChange,
  onJumpPageSubmit,
  setJumpPageInput,
  onItemClick,
}: {
  title: string;
  badge?: string;
  catalogLoading: boolean;
  catalogItems: CatalogItem[];
  catalogPage: number;
  catalogTotalPages: number;
  catalogTotalCount: number;
  catalogGenre: string;
  catalogSearch: string;
  jumpPageInput: string;
  genresList: string[];
  onSelectGenre: (genre: string) => void;
  onPageChange: (newPage: number) => void;
  onJumpPageSubmit: (e: React.FormEvent) => void;
  setJumpPageInput: (val: string) => void;
  onItemClick: (item: CatalogItem) => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* Cabeçalho da Lista Responsivo */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 sm:gap-3 flex-wrap">
            <span>{title}</span>
            {badge && (
              <span className="text-[10px] sm:text-xs font-bold text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2 sm:px-2.5 py-0.5 rounded-full font-mono">
                {badge}
              </span>
            )}
            <span className="text-[10px] sm:text-xs font-semibold text-red-400 bg-red-950/60 border border-red-600/30 px-2 sm:px-2.5 py-0.5 rounded-full font-mono">
              {catalogTotalCount.toLocaleString("pt-BR")} títulos
            </span>
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Pág. <span className="font-bold text-white">{catalogPage}</span> de{" "}
            <span className="font-bold text-white">{catalogTotalPages}</span> · 48 títulos por página
          </p>
        </div>

        {/* Paginação Compacta Superior */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => onPageChange(catalogPage - 1)}
            disabled={catalogPage <= 1 || catalogLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-red-500 disabled:opacity-40 text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>
          <span className="text-xs font-mono font-bold text-red-400 px-1 sm:px-2">
            {catalogPage} / {catalogTotalPages}
          </span>
          <button
            onClick={() => onPageChange(catalogPage + 1)}
            disabled={catalogPage >= catalogTotalPages || catalogLoading}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 hover:border-red-500 disabled:opacity-40 text-xs font-bold text-slate-300 hover:text-white transition-all"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chips de Gênero Responsivos com Swipe */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
        {genresList.map((g) => {
          const isSelected = (g === "Todos" && !catalogGenre) || catalogGenre === g;
          return (
            <button
              key={g}
              onClick={() => onSelectGenre(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isSelected
                  ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                  : "bg-zinc-950/90 border border-zinc-800 text-slate-400 hover:text-white hover:border-zinc-700"
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>

      {/* Grade de Vídeos (2 colunas em celulares, escalonando em telas maiores) */}
      {catalogLoading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-red-500">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
          <p className="text-xs sm:text-sm font-bold text-slate-300">Consultando catálogo de 38.600+ títulos...</p>
        </div>
      ) : catalogItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-zinc-950/50 rounded-2xl border border-zinc-800">
          <p className="text-sm sm:text-base text-slate-300 font-bold">Nenhum título encontrado.</p>
          <p className="text-xs text-slate-400 mt-1">Tente remover os filtros ou buscar por outro termo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
          {catalogItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onItemClick(item)}
              className="group rounded-xl sm:rounded-2xl overflow-hidden border border-red-600/20 bg-zinc-950/70 hover:border-red-500 cursor-pointer transition-all duration-300 flex flex-col hover:scale-[1.02] shadow-xl hover:shadow-red-600/20"
            >
              <div className="aspect-[2/3] w-full overflow-hidden relative bg-black">
                <img
                  src={item.thumbnail || "/brazuca_icon.png"}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* Badges superiores (Ano / Avaliação) */}
                <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 flex items-center justify-between pointer-events-none">
                  {item.rating ? (
                    <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-500/30">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  ) : <span />}
                  {item.year && (
                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-zinc-700">
                      {item.year.slice(0, 4)}
                    </span>
                  )}
                </div>

                {/* Overlay de Ação no Hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 sm:p-3">
                  <p className="text-[10px] sm:text-[11px] text-slate-300 line-clamp-3 mb-2 leading-relaxed">
                    {item.synopsis || "Clique para assistir ou ver episódios."}
                  </p>
                  <button className="w-full py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors">
                    {item.type === "series" || item.type === "animes" || item.type === "doramas" || item.type === "desenhos" || item.type === "novelas" ? (
                      <>
                        <Folder className="w-3.5 h-3.5" />
                        <span>Episódios</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Assistir</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2 sm:p-3 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-white truncate group-hover:text-red-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mt-0.5">
                    {item.genres || item.type}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Controles de Paginação Inferior Completa */}
      {catalogTotalPages > 1 && (
        <div className="pt-8 border-t border-zinc-850 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(1)}
              disabled={catalogPage <= 1 || catalogLoading}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 disabled:opacity-30 text-xs font-bold text-slate-300 hover:text-white"
            >
              Primeira
            </button>
            <button
              onClick={() => onPageChange(catalogPage - 1)}
              disabled={catalogPage <= 1 || catalogLoading}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 disabled:opacity-30 text-xs font-bold text-slate-300 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            {/* Páginas Adjacentes */}
            <div className="hidden md:flex items-center gap-1">
              {[
                Math.max(1, catalogPage - 2),
                Math.max(1, catalogPage - 1),
                catalogPage,
                Math.min(catalogTotalPages, catalogPage + 1),
                Math.min(catalogTotalPages, catalogPage + 2),
              ]
                .filter((val, idx, arr) => arr.indexOf(val) === idx)
                .map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                      catalogPage === pageNum
                        ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30"
                        : "bg-zinc-950 border border-zinc-800 text-slate-400 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
            </div>

            <button
              onClick={() => onPageChange(catalogPage + 1)}
              disabled={catalogPage >= catalogTotalPages || catalogLoading}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 disabled:opacity-30 text-xs font-bold text-slate-300 hover:text-white"
            >
              <span>Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(catalogTotalPages)}
              disabled={catalogPage >= catalogTotalPages || catalogLoading}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-red-500 disabled:opacity-30 text-xs font-bold text-slate-300 hover:text-white"
            >
              Última ({catalogTotalPages})
            </button>
          </div>

          {/* Pular para Página */}
          <form onSubmit={onJumpPageSubmit} className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Ir para página:</span>
            <input
              type="number"
              min={1}
              max={catalogTotalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder={catalogPage.toString()}
              className="w-16 bg-zinc-950 border border-zinc-700 rounded-xl px-2.5 py-1.5 text-xs text-center text-white focus:outline-none focus:border-red-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-600 text-white text-xs font-bold transition-colors"
            >
              Ir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ==============================================================
// SUB-COMPONENTE CENTRAL DE MÚSICA WMPLAY (YOUTUBE, SPOTIFY, SOUNDCLOUD)
// ==============================================================
interface YouTubeResultItem {
  id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
}

interface SoundCloudResultItem {
  title: string;
  artist: string;
  url: string;
  embedUrl: string;
}

interface SpotifyResultItem {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  preview: string;
  link: string;
}

function MusicHubView({
  externalQuery = "",
  externalTrigger = 0,
  onQueryChange,
}: {
  externalQuery?: string;
  externalTrigger?: number;
  onQueryChange?: (val: string) => void;
}) {
  const [activePlatform, setActivePlatform] = useState<"youtube" | "spotify" | "soundcloud">("youtube");

  // Search States
  const [platformQuery, setPlatformQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [lastSearchedQuery, setLastSearchedQuery] = useState<string>("");

  // Results State
  const [youtubeResults, setYoutubeResults] = useState<YouTubeResultItem[]>([]);
  const [soundcloudResults, setSoundcloudResults] = useState<SoundCloudResultItem[]>([]);
  const [spotifyResults, setSpotifyResults] = useState<SpotifyResultItem[]>([]);

  // YouTube Player State
  const [activeYoutubeUrl, setActiveYoutubeUrl] = useState("https://www.youtube-nocookie.com/embed/jfKfPfyJRdk?autoplay=1");
  const [activeYoutubeTitle, setActiveYoutubeTitle] = useState("Lofi Girl 24/7 - Beats to Relax/Study (Ao Vivo)");

  // Spotify Player State
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState("https://open.spotify.com/embed/playlist/37i9dQZF1DX0FOF1IUWK1W?utm_source=generator&theme=0");
  const [activeSpotifyTitle, setActiveSpotifyTitle] = useState("Top 50 - Brasil (Mais Tocadas)");

  // SoundCloud Player State
  const [soundcloudEmbedUrl, setSoundcloudEmbedUrl] = useState(
    "https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/spinninrecords/sets/spinnin-records-top-100&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"
  );
  const [activeSoundcloudTitle, setActiveSoundcloudTitle] = useState("Spinnin' Records - Top 100 Dance & EDM Hits");

  // Preview Audio Player (para faixas do Spotify/Deezer)
  const [activePreviewTrack, setActivePreviewTrack] = useState<SpotifyResultItem | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // Sync external header query if changed
  useEffect(() => {
    if (externalQuery && externalQuery !== platformQuery) {
      setPlatformQuery(externalQuery);
    }
  }, [externalQuery]);

  // Sync external header trigger (User pressed Enter in the top header)
  useEffect(() => {
    if (externalTrigger > 0 && externalQuery.trim()) {
      executeSearch(externalQuery.trim(), activePlatform);
    }
  }, [externalTrigger]);

  // Central search execution
  const executeSearch = async (queryText: string, platform: "youtube" | "spotify" | "soundcloud") => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setSearchError(null);
    setLastSearchedQuery(q);

    // Direct link detection
    if (platform === "youtube") {
      if (q.includes("youtube.com/watch?v=")) {
        const vId = q.split("v=")[1]?.split("&")[0];
        if (vId) {
          setActiveYoutubeUrl(`https://www.youtube-nocookie.com/embed/${vId}?autoplay=1`);
          setActiveYoutubeTitle(`Vídeo do YouTube (${vId})`);
          setIsSearching(false);
          return;
        }
      } else if (q.includes("youtu.be/")) {
        const vId = q.split("youtu.be/")[1]?.split("?")[0];
        if (vId) {
          setActiveYoutubeUrl(`https://www.youtube-nocookie.com/embed/${vId}?autoplay=1`);
          setActiveYoutubeTitle(`Vídeo do YouTube (${vId})`);
          setIsSearching(false);
          return;
        }
      }
    } else if (platform === "spotify") {
      if (q.includes("open.spotify.com/")) {
        const part = q.split("open.spotify.com/")[1]?.split("?")[0];
        setSpotifyEmbedUrl(`https://open.spotify.com/embed/${part}?utm_source=generator&theme=0`);
        setActiveSpotifyTitle(`Link Personalizado do Spotify`);
        setIsSearching(false);
        return;
      }
    } else if (platform === "soundcloud") {
      if (q.includes("soundcloud.com/")) {
        const embed = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          q
        )}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
        setSoundcloudEmbedUrl(embed);
        setActiveSoundcloudTitle(`Link Personalizado do SoundCloud`);
        setIsSearching(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/music-search?platform=${platform}&q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || "Erro ao realizar busca musical.");
      }

      if (platform === "youtube") {
        const items: YouTubeResultItem[] = data.items || [];
        setYoutubeResults(items);
        if (items.length > 0) {
          setActiveYoutubeUrl(`https://www.youtube-nocookie.com/embed/${items[0].id}?autoplay=1`);
          setActiveYoutubeTitle(items[0].title);
        } else {
          setSearchError("Nenhum vídeo encontrado para este termo no YouTube.");
        }
      } else if (platform === "soundcloud") {
        const items: SoundCloudResultItem[] = data.items || [];
        setSoundcloudResults(items);
        if (items.length > 0) {
          setSoundcloudEmbedUrl(items[0].embedUrl);
          setActiveSoundcloudTitle(items[0].title);
        } else {
          setSearchError("Nenhuma faixa ou set encontrado no SoundCloud.");
        }
      } else if (platform === "spotify") {
        const items: SpotifyResultItem[] = data.items || [];
        setSpotifyResults(items);
        if (data.spotifyArtistEmbed) {
          setSpotifyEmbedUrl(data.spotifyArtistEmbed);
          setActiveSpotifyTitle(`Discografia Oficial: ${data.spotifyArtistName}`);
        }
        if (items.length === 0 && !data.spotifyArtistEmbed) {
          setSearchError("Nenhuma música encontrada no catálogo.");
        }
      }
    } catch (err: any) {
      console.error("Erro na busca de música:", err);
      setSearchError(err.message || "Erro de conexão ao buscar música.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(platformQuery, activePlatform);
  };

  const handleClearSearch = () => {
    setPlatformQuery("");
    setLastSearchedQuery("");
    setSearchError(null);
    if (onQueryChange) onQueryChange("");
    if (activePlatform === "youtube") setYoutubeResults([]);
    if (activePlatform === "soundcloud") setSoundcloudResults([]);
    if (activePlatform === "spotify") setSpotifyResults([]);
  };

  // Preview Audio Player Handler
  const togglePlayAudioPreview = (track: SpotifyResultItem) => {
    if (!track.preview) return;

    if (activePreviewTrack?.id === track.id && isPlayingPreview) {
      audioPreviewRef.current?.pause();
      setIsPlayingPreview(false);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(track.preview);
      audioPreviewRef.current = audio;
      audio.play();
      setActivePreviewTrack(track);
      setIsPlayingPreview(true);

      audio.onended = () => {
        setIsPlayingPreview(false);
        setActivePreviewTrack(null);
      };
      audio.onerror = () => {
        setIsPlayingPreview(false);
        setActivePreviewTrack(null);
      };
    }
  };

  // Curadoria YouTube
  const YOUTUBE_CURATION = [
    {
      title: "Lofi Girl 24/7 (Ao Vivo)",
      channel: "Lofi Girl",
      desc: "Beats relaxantes instrumentais para foco, estudo e trabalho",
      id: "jfKfPfyJRdk",
      badge: "AO VIVO 24H",
      cover: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Alok Live Set Tomorrowland",
      channel: "Alok Oficial",
      desc: "As melhores músicas e drops do maior DJ do Brasil",
      id: "QBC0KZ7ZQro",
      badge: "ELETRÔNICA",
      cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Henrique & Juliano - Manifesto Musical",
      channel: "Henrique e Juliano",
      desc: "Última Saudade, Arranhão e os maiores hinos do sertanejo",
      id: "iLq3K6hDkU4",
      badge: "SERTANEJO",
      cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Coldplay - Live in São Paulo & River Plate",
      channel: "Coldplay Oficial",
      desc: "Viva La Vida, Yellow, Fix You e os clássicos da banda",
      id: "RB-RcX5DS5A",
      badge: "ROCK / POP",
      cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Trap Brasil & Funk Mandelão Explosão",
      channel: "KondZilla / GR6",
      desc: "Os maiores sucessos do trap e do funk consciente e mandelão",
      id: "7V2x7v5Qc4E",
      badge: "FUNK / TRAP",
      cover: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Rock Clássico 70s, 80s & 90s",
      channel: "Classic Rock Radio",
      desc: "Queen, AC/DC, Guns N' Roses, Pink Floyd, Aerosmith",
      id: "fJ9rUzIMcZQ",
      badge: "ROCK CLÁSSICO",
      cover: "https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Pop Internacional Billboard Hot 100",
      channel: "Billboard Top Hits",
      desc: "The Weeknd, Taylor Swift, Bruno Mars, Dua Lipa e Billie Eilish",
      id: "4NRXx6U8ABQ",
      badge: "POP GLOBAL",
      cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&auto=format&fit=crop&q=80",
    },
    {
      title: "Bossa Nova & MPB Relaxante Acústico",
      channel: "MPB Acústico",
      desc: "Tom Jobim, Caetano Veloso, Gilberto Gil, Djavan e Chico Buarque",
      id: "kJQP7kiw5Fk",
      badge: "MPB / BOSSA",
      cover: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=600&auto=format&fit=crop&q=80",
    },
  ];

  // Curadoria Spotify
  const SPOTIFY_CURATION = [
    {
      id: "playlist/37i9dQZF1DX0FOF1IUWK1W",
      title: "Top 50 - Brasil",
      desc: "O termômetro diário das músicas mais tocadas em todo o território nacional.",
      badge: "TOP BRASIL",
      color: "from-green-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DXcBWIGoYBM5M",
      title: "Today's Top Hits",
      desc: "As maiores canções e fenômenos musicais do planeta hoje.",
      badge: "GLOBAL HITS",
      color: "from-blue-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DX4sW3vDiGoUm",
      title: "Esquenta Sertanejo",
      desc: "Os lançamentos do sertanejo e as músicas que agitam os rodeios.",
      badge: "SERTANEJO",
      color: "from-amber-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DX9uKNf5jGX6m",
      title: "Funk Hits Brasil",
      desc: "Os graves mais pesados do funk carioca e mandelão de SP.",
      badge: "FUNK BRASIL",
      color: "from-purple-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DWWQRwui0ExPn",
      title: "Lo-Fi Cafe",
      desc: "Melodias reconfortantes de jazz e hip-hop instrumental.",
      badge: "CHILL / RELAX",
      color: "from-emerald-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DX10zKzsJ2jva",
      title: "Viva Latino",
      desc: "Reggaeton, Pop Urbano e os sucessos mais quentes da América Latina.",
      badge: "LATINO",
      color: "from-rose-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DX3YSRoSdA634",
      title: "Rock Classics",
      desc: "Hinos eternos das maiores lendas da história do rock n' roll.",
      badge: "ROCK",
      color: "from-red-600/30 to-zinc-950",
    },
    {
      id: "playlist/37i9dQZF1DXdLEN7aqioXM",
      title: "Modo Treino / Workout",
      desc: "Batidas estimulantes para manter o ritmo e energia máxima.",
      badge: "TREINO / FOCO",
      color: "from-orange-600/30 to-zinc-950",
    },
  ];

  // Curadoria SoundCloud
  const SOUNDCLOUD_CURATION = [
    {
      url: "https://soundcloud.com/spinninrecords/sets/spinnin-records-top-100",
      title: "Spinnin' Records Top 100",
      genre: "EDM & House",
      desc: "Os maiores sucessos das pistas mundiais da maior gravadora de eletrônica.",
      badge: "EDM TOP 100",
    },
    {
      url: "https://soundcloud.com/chilledcow/sets/lofi-hip-hop-radio-beats-to",
      title: "Lo-Fi Hip Hop Sessions",
      genre: "Chillhop",
      desc: "Batidas calmas e melodias nostálgicas para relaxar e descontrair.",
      badge: "LO-FI RELAX",
    },
    {
      url: "https://soundcloud.com/vintageculturemusic/sets/vintage-culture-radio",
      title: "Vintage Culture - Live Sets",
      genre: "Brazilian Bass",
      desc: "Sets ao vivo e tracks exclusivas do produtor número 1 do Brasil.",
      badge: "VINTAGE CULTURE",
    },
    {
      url: "https://soundcloud.com/alok/sets/alok-podcasts",
      title: "Alok - Controvérsia Sets",
      genre: "Electro / House",
      desc: "Músicas e sets que rodam nos maiores palcos do mundo.",
      badge: "ALOK EXCLUSIVO",
    },
    {
      url: "https://soundcloud.com/trapbrasil/sets/trap-brasil-2024",
      title: "Trap Brasil Top Tracks",
      genre: "Trap Nacional",
      desc: "Os maiores lançamentos da cena nacional independente.",
      badge: "TRAP BRASIL",
    },
    {
      url: "https://soundcloud.com/deephouseamsterdam/sets/dha-mix-series",
      title: "Deep House Sunset Sessions",
      genre: "Deep House",
      desc: "Mixagens suaves perfeitas para finais de tarde e confraternizações.",
      badge: "DEEP HOUSE",
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* Cabeçalho da Central de Música Responsivo */}
      <div className="relative rounded-2xl overflow-hidden border border-red-600/30 bg-zinc-950/90 p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-red-600 to-rose-700 border border-red-500/50 shadow-xl flex items-center justify-center text-white shrink-0">
            <Music className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-black text-white">Central de Música WMPLAY</h2>
              <span className="text-[10px] sm:text-xs font-bold text-red-400 bg-red-950/80 border border-red-600/40 px-2 sm:px-2.5 py-0.5 rounded-full font-mono">
                UNIVERSAL
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-1 max-w-xl">
              Pesquise qualquer artista, música ou playlist no YouTube, Spotify e SoundCloud com reprodução instantânea.
            </p>
          </div>
        </div>

        {/* Seletor de Plataforma Musical em Grade para Celular */}
        <div className="grid grid-cols-3 sm:flex items-center bg-black/60 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-zinc-800 gap-1 w-full sm:w-auto">
          <button
            onClick={() => {
              setActivePlatform("youtube");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
              activePlatform === "youtube"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-slate-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className="truncate">YouTube</span>
          </button>

          <button
            onClick={() => {
              setActivePlatform("spotify");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
              activePlatform === "spotify"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : "text-slate-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Disc3 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Spotify</span>
          </button>

          <button
            onClick={() => {
              setActivePlatform("soundcloud");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center ${
              activePlatform === "soundcloud"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                : "text-slate-400 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">SoundCloud</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* BARRA DE PESQUISA DEDICADA DA PLATAFORMA ATIVA                 */}
      {/* ============================================================== */}
      <div className="space-y-3">
        <form onSubmit={handleFormSubmit} className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
            <Search
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${
                activePlatform === "youtube"
                  ? "text-red-500"
                  : activePlatform === "spotify"
                  ? "text-emerald-500"
                  : "text-orange-500"
              }`}
            />
            <input
              type="text"
              value={platformQuery}
              onChange={(e) => {
                setPlatformQuery(e.target.value);
                if (onQueryChange) onQueryChange(e.target.value);
              }}
              placeholder={
                activePlatform === "youtube"
                  ? "Pesquise vídeos, clipes, músicas ou cole link do YouTube..."
                  : activePlatform === "spotify"
                  ? "Pesquise por música, artista ou cole link do Spotify..."
                  : "Pesquise faixas, sets de DJ ou cole link do SoundCloud..."
              }
              className={`w-full bg-zinc-950/95 border rounded-xl pl-11 pr-12 py-3 sm:py-3.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none transition-all shadow-inner ${
                activePlatform === "youtube"
                  ? "border-zinc-800 focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : activePlatform === "spotify"
                  ? "border-zinc-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                  : "border-zinc-800 focus:border-orange-600 focus:ring-1 focus:ring-orange-500"
              }`}
            />
            {platformQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSearching || !platformQuery.trim()}
            className={`px-5 py-3 sm:px-6 sm:py-3.5 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 ${
              activePlatform === "youtube"
                ? "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 shadow-red-600/25"
                : activePlatform === "spotify"
                ? "bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 shadow-emerald-600/25"
                : "bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 shadow-orange-600/25"
            }`}
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Buscando...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Pesquisar</span>
              </>
            )}
          </button>
        </form>

        {/* Chips de Sugestão Rápida com Rolagem Horizontal */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none text-xs -mx-1 px-1 sm:mx-0 sm:px-0">
          <span className="text-slate-400 font-semibold shrink-0">Sugestões:</span>
          {(activePlatform === "youtube"
            ? ["Alok", "Coldplay", "Henrique e Juliano", "Top Brasil 2026", "Lofi Beats", "Sertanejo", "Funk Mandelão", "Rock Clássico"]
            : activePlatform === "spotify"
            ? ["Top 50 Brasil", "Alok", "Coldplay", "Henrique e Juliano", "Vintage Culture", "Marília Mendonça", "Rock Classics", "Modo Treino"]
            : ["Spinnin Records", "Alok Sets", "Vintage Culture", "Deep House", "Lo-Fi Hip Hop", "Trap Brasil"]
          ).map((chip) => (
            <button
              key={chip}
              onClick={() => {
                setPlatformQuery(chip);
                if (onQueryChange) onQueryChange(chip);
                executeSearch(chip, activePlatform);
              }}
              className="px-3 py-1 rounded-full bg-zinc-950 border border-zinc-800 hover:border-red-500 text-slate-300 hover:text-white transition-all shrink-0 font-medium"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Alerta de Erro caso a busca falhe */}
      {searchError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/40 text-red-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{searchError}</span>
          </div>
          <button
            onClick={() => setSearchError(null)}
            className="text-red-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 1: YOUTUBE MUSIC & VÍDEOS                                  */}
      {/* ============================================================== */}
      {activePlatform === "youtube" && (
        <div className="space-y-6">
          {/* Player YouTube Embutido Ativo */}
          <div className="rounded-2xl overflow-hidden border border-red-600/30 bg-black/95 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span className="flex items-center gap-2 font-bold text-white truncate max-w-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                Tocando Agora: <span className="text-red-400 truncate">{activeYoutubeTitle}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">YouTube Player HD</span>
            </div>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black shadow-inner border border-zinc-800">
              <iframe
                src={activeYoutubeUrl}
                title={activeYoutubeTitle}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>

          {/* RESULTADOS DA PESQUISA NO YOUTUBE */}
          {youtubeResults.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Play className="w-5 h-5 fill-red-500 text-red-500" />
                  <span>Resultados da Pesquisa no YouTube</span>
                  <span className="text-xs font-bold text-red-400 bg-red-950/80 border border-red-600/30 px-2.5 py-0.5 rounded-full font-mono">
                    {youtubeResults.length} vídeos encontrados
                  </span>
                </h3>
                <button
                  onClick={() => setYoutubeResults([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Fechar resultados
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {youtubeResults.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveYoutubeUrl(`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1`);
                      setActiveYoutubeTitle(item.title);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/80 hover:border-red-500 p-3.5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-red-600/20 flex flex-col justify-between"
                  >
                    <div className="aspect-video w-full rounded-xl overflow-hidden relative mb-2.5 bg-black">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {item.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/85 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-white border border-zinc-700">
                          {item.duration}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-10 h-10 fill-red-500 text-red-500 filter drop-shadow" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white group-hover:text-red-400 transition-colors line-clamp-2 leading-tight">
                        {item.title}
                      </h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                        <span className="truncate max-w-[130px]">{item.channel}</span>
                        {item.views && <span className="font-mono text-slate-500 shrink-0">{item.views}</span>}
                      </div>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between text-xs text-red-500 font-bold">
                      <span>Assistir Vídeo</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Curadoria Musical de Destaque */}
          <div className="pt-2">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-500" />
              <span>Destaques & Playlists Recomendadas</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {YOUTUBE_CURATION.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setActiveYoutubeUrl(`https://www.youtube-nocookie.com/embed/${item.id}?autoplay=1`);
                    setActiveYoutubeTitle(item.title);
                  }}
                  className="group rounded-2xl overflow-hidden border border-red-600/20 bg-zinc-950/70 hover:border-red-500 p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-red-600/20 flex flex-col justify-between"
                >
                  <div className="aspect-video w-full rounded-xl overflow-hidden relative mb-3 bg-black">
                    <img
                      src={item.cover}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="text-[10px] font-bold text-white bg-red-600/90 px-2 py-0.5 rounded-full font-mono">
                        {item.badge}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play className="w-10 h-10 fill-red-500 text-red-500 filter drop-shadow" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-red-400 transition-colors truncate">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{item.channel}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-2 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-zinc-850 flex items-center justify-between text-xs text-red-500 font-bold">
                    <span>Ouvir Música</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 2: SPOTIFY PLAYLISTS & BUSCA MUSICAL                       */}
      {/* ============================================================== */}
      {activePlatform === "spotify" && (
        <div className="space-y-6">
          {/* Player Embutido Oficial Spotify */}
          <div className="rounded-2xl overflow-hidden border border-emerald-600/30 bg-zinc-950 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span className="flex items-center gap-2 font-bold text-white truncate max-w-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                Player Spotify: <span className="text-emerald-400 truncate">{activeSpotifyTitle}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">Spotify Web Embed</span>
            </div>
            <div className="h-[380px] w-full rounded-xl overflow-hidden bg-black shadow-inner">
              <iframe
                src={spotifyEmbedUrl}
                title="Spotify Embed Player"
                className="w-full h-full border-0"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy"
              />
            </div>
          </div>

          {/* RESULTADOS DA PESQUISA MUSICAL / SPOTIFY */}
          {spotifyResults.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Disc3 className="w-5 h-5 text-emerald-500" />
                  <span>Resultados da Busca Musical</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-600/30 px-2.5 py-0.5 rounded-full font-mono">
                    {spotifyResults.length} faixas encontradas
                  </span>
                </h3>
                <button
                  onClick={() => setSpotifyResults([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Fechar resultados
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                {spotifyResults.map((track) => (
                  <div
                    key={track.id}
                    className="group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/80 hover:border-emerald-500 p-3.5 transition-all hover:scale-[1.02] shadow-xl hover:shadow-emerald-600/20 flex flex-col justify-between"
                  >
                    <div>
                      <div className="aspect-square w-full rounded-xl overflow-hidden relative mb-2.5 bg-black">
                        <img
                          src={track.cover || "/default_poster.png"}
                          alt={track.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                        {track.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/85 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold text-white border border-zinc-700">
                            {track.duration}
                          </div>
                        )}
                        {track.preview && (
                          <button
                            onClick={() => togglePlayAudioPreview(track)}
                            className="absolute inset-0 bg-emerald-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          >
                            {activePreviewTrack?.id === track.id && isPlayingPreview ? (
                              <Pause className="w-10 h-10 text-emerald-400 fill-emerald-400 filter drop-shadow" />
                            ) : (
                              <Play className="w-10 h-10 text-emerald-400 fill-emerald-400 filter drop-shadow" />
                            )}
                          </button>
                        )}
                      </div>

                      <h4 className="font-bold text-xs text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {track.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">{track.artist}</p>
                      {track.album && (
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">{track.album}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-850 flex items-center justify-between gap-1">
                      {track.preview ? (
                        <button
                          onClick={() => togglePlayAudioPreview(track)}
                          className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:text-emerald-300"
                        >
                          {activePreviewTrack?.id === track.id && isPlayingPreview ? (
                            <>
                              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Prévia Áudio</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500">Áudio Completo</span>
                      )}

                      <a
                        href={track.link || `https://open.spotify.com/search/${encodeURIComponent(track.title + " " + track.artist)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-1"
                        title="Ouvir no Spotify Web"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Abrir</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade de Playlists Oficiais do Spotify */}
          <div className="pt-2">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Disc3 className="w-5 h-5 text-emerald-500" />
              <span>Playlists Recomendadas do Spotify</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SPOTIFY_CURATION.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setSpotifyEmbedUrl(`https://open.spotify.com/embed/${item.id}?utm_source=generator&theme=0`);
                    setActiveSpotifyTitle(item.title);
                  }}
                  className={`group rounded-2xl overflow-hidden border border-emerald-600/20 bg-gradient-to-b ${item.color} hover:border-emerald-500 p-5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-emerald-600/20 flex flex-col justify-between`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <Disc3 className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white group-hover:text-emerald-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>Ouvir no Player</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ABA 3: SOUNDCLOUD TRACKS & SETS                                */}
      {/* ============================================================== */}
      {activePlatform === "soundcloud" && (
        <div className="space-y-6">
          {/* Player Embutido Oficial SoundCloud */}
          <div className="rounded-2xl overflow-hidden border border-orange-600/30 bg-zinc-950 shadow-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <span className="flex items-center gap-2 font-bold text-white truncate max-w-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-ping" />
                Player SoundCloud: <span className="text-orange-400 truncate">{activeSoundcloudTitle}</span>
              </span>
              <span className="text-[11px] font-mono text-slate-500 shrink-0">SoundCloud HTML5 Widget</span>
            </div>
            <div className="h-[220px] w-full rounded-xl overflow-hidden bg-black shadow-inner">
              <iframe
                src={soundcloudEmbedUrl}
                title="SoundCloud Embed Player"
                className="w-full h-full border-0"
                allow="autoplay"
                loading="lazy"
              />
            </div>
          </div>

          {/* RESULTADOS DA PESQUISA NO SOUNDCLOUD */}
          {soundcloudResults.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Radio className="w-5 h-5 text-orange-500" />
                  <span>Resultados da Pesquisa no SoundCloud</span>
                  <span className="text-xs font-bold text-orange-400 bg-orange-950/80 border border-orange-600/30 px-2.5 py-0.5 rounded-full font-mono">
                    {soundcloudResults.length} faixas encontradas
                  </span>
                </h3>
                <button
                  onClick={() => setSoundcloudResults([])}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Fechar resultados
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {soundcloudResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSoundcloudEmbedUrl(item.embedUrl);
                      setActiveSoundcloudTitle(item.title);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="group rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950/80 hover:border-orange-500 p-4 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-orange-600/20 flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0 group-hover:scale-110 transition-transform">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs text-white group-hover:text-orange-400 transition-colors line-clamp-2 leading-tight">
                          {item.title}
                        </h4>
                        <p className="text-[11px] text-orange-400/80 font-medium truncate mt-1">
                          {item.artist}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-2 border-t border-zinc-850 flex items-center justify-between text-xs text-orange-400 font-bold">
                      <span>Tocar no Player</span>
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grade de Sets e Estilos do SoundCloud */}
          <div className="pt-2">
            <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
              <Radio className="w-5 h-5 text-orange-500" />
              <span>Sets Exclusivos & Tendências no SoundCloud</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SOUNDCLOUD_CURATION.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const embed = `https://w.soundcloud.com/player/?url=${encodeURIComponent(
                      item.url
                    )}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`;
                    setSoundcloudEmbedUrl(embed);
                    setActiveSoundcloudTitle(item.title);
                  }}
                  className="group rounded-2xl overflow-hidden border border-orange-600/20 bg-zinc-950/70 hover:border-orange-500 p-5 cursor-pointer transition-all hover:scale-[1.02] shadow-xl hover:shadow-orange-600/20 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 group-hover:scale-110 transition-transform">
                        <Radio className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-orange-300 bg-orange-950/80 border border-orange-500/40 px-2 py-0.5 rounded-full font-mono">
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-white group-hover:text-orange-400 transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-orange-400/80 font-medium mt-0.5">{item.genre}</p>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">
                      {item.desc}
                    </p>
                  </div>
                  <div className="mt-5 pt-3 border-t border-zinc-850 flex items-center justify-between text-xs text-orange-400 font-bold">
                    <span>Carregar Set</span>
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
