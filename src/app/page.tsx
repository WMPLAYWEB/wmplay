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
  Menu,
  Sun,
  Moon,
  Zap,
  History,
  Cast,
  Heart
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
import WmplayLogo from "@/components/WmplayLogo";
import Ps1Button from "@/components/Ps1Button";
import Ps1ControllerHud from "@/components/Ps1ControllerHud";
import CastConnectView from "@/components/CastConnectView";

type CategoryType = "movies" | "tv" | "releases" | "novelas" | "music" | "live" | "addons" | "cast";

interface MenuItem {
  id: CategoryType;
  label: string;
  icon: React.ElementType;
}

const MENU_ITEMS: MenuItem[] = [
  { id: "movies", label: "Filmes (17.8k+)", icon: Film },
  { id: "tv", label: "Séries (13k+)", icon: Tv },
  { id: "releases", label: "Lançamentos (1.1k+)", icon: Sparkles },
  { id: "novelas", label: "Novelas (450+)", icon: Heart },
  { id: "music", label: "Música", icon: Music },
  { id: "live", label: "TV ao Vivo (156 ch)", icon: Radio },
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
  mediaId?: string;
  tmdbId?: string;
  directUrl?: string;
  seasonNum?: number;
  epNum?: number;
  isTv?: boolean;
  initialResumeTime?: number;
}

export interface WatchProgressItem {
  id: string;
  title: string;
  info?: string;
  poster?: string;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
  directUrl?: string;
  tmdbId?: string;
  seasonNum?: number;
  epNum?: number;
  isTv?: boolean;
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

  // Histórico de Reprodução & Favoritos
  const [watchHistory, setWatchHistory] = useState<WatchProgressItem[]>([]);
  const [favoriteChannels, setFavoriteChannels] = useState<string[]>([]);
  const [favoriteCatalogItems, setFavoriteCatalogItems] = useState<CatalogItem[]>([]);

  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("wmplay_watch_progress");
      if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
      const savedFavCh = localStorage.getItem("wmplay_fav_channels");
      if (savedFavCh) setFavoriteChannels(JSON.parse(savedFavCh));
      const savedFavCat = localStorage.getItem("wmplay_fav_catalog_items");
      if (savedFavCat) setFavoriteCatalogItems(JSON.parse(savedFavCat));
      const savedRecent = localStorage.getItem("wmplay_recent_searches");
      if (savedRecent) setRecentSearches(JSON.parse(savedRecent));

      // Verificar se o usuário acessou via QR Code ou link de pareamento ?cast=...
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const castCode = urlParams.get("cast");
        if (castCode) {
          localStorage.setItem("wmplay_last_tv_code", castCode);
          setActiveCategory("cast");
        }
      }
    } catch {}
  }, []);

  // Fechar dropdown de buscas recentes ao clicar fora
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowRecentDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const saveRecentSearch = (term: string) => {
    const clean = term?.trim();
    if (!clean || clean.length < 2) return;
    setRecentSearches((prev) => {
      const next = [clean, ...prev.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(0, 8);
      try {
        localStorage.setItem("wmplay_recent_searches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem("wmplay_recent_searches");
    } catch {}
  };

  const toggleFavoriteChannel = (channelId: string) => {
    setFavoriteChannels((prev) => {
      const isFav = prev.includes(channelId);
      const next = isFav ? prev.filter((id) => id !== channelId) : [...prev, channelId];
      try {
        localStorage.setItem("wmplay_fav_channels", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const toggleFavoriteCatalog = (item: CatalogItem) => {
    setFavoriteCatalogItems((prev) => {
      const exists = prev.some((x) => x.id === item.id);
      let next: CatalogItem[];
      if (exists) {
        next = prev.filter((x) => x.id !== item.id);
      } else {
        next = [item, ...prev];
      }
      try {
        localStorage.setItem("wmplay_fav_catalog_items", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearWatchHistory = () => {
    setWatchHistory([]);
    try {
      localStorage.removeItem("wmplay_watch_progress");
    } catch {}
  };

  const formatTimeMinutes = (sec?: number) => {
    if (!sec || isNaN(sec)) return "0 min";
    const mins = Math.floor(sec / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  // Theme State (Default Off-White com detalhes vermelhos para teste)
  const [theme, setTheme] = useState<"offwhite" | "dark">("offwhite");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("wmplay_theme");
      if (saved === "dark" || saved === "offwhite") {
        setTheme(saved);
      }
    } catch {}
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "offwhite" ? "dark" : "offwhite";
      try {
        localStorage.setItem("wmplay_theme", next);
      } catch {}
      return next;
    });
  };

  // Modo TV Lite para Smart TVs Antigas (LG NetCast/webOS 1-3, Philco Linux, Samsung Orsay, etc.)
  const [isLiteMode, setIsLiteMode] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedLite = localStorage.getItem("wmplay_lite_mode");
      if (savedLite !== null) {
        setIsLiteMode(savedLite === "true");
      } else {
        // Auto-detectar navegadores de Smart TVs antigas
        const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").toLowerCase();
        const isTv =
          ua.includes("webos") ||
          ua.includes("netcast") ||
          ua.includes("philco") ||
          ua.includes("smart-tv") ||
          ua.includes("smarttv") ||
          ua.includes("tizen") ||
          ua.includes("hbbtv") ||
          ua.includes("viera");
        if (isTv) {
          setIsLiteMode(true);
        }
      }
    } catch {}
  }, []);

  const toggleLiteMode = () => {
    setIsLiteMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("wmplay_lite_mode", String(next));
      } catch {}
      return next;
    });
  };

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
  const [catalogPlatform, setCatalogPlatform] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [jumpPageInput, setJumpPageInput] = useState<string>("");

  // Smart TV D-Pad Remote Navigation State
  const [tvFocusIndex, setTvFocusIndex] = useState<number | null>(null);
  const [isTvModeActive, setIsTvModeActive] = useState<boolean>(false);

  // Histórico de Buscas Recentes
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showRecentDropdown, setShowRecentDropdown] = useState<boolean>(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  // Bloqueador Global Ultra-Rigoroso de Pop-ups e Anúncios Indesejados
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Desativa completamente window.open para scripts maliciosos de terceiros
    const originalOpen = window.open;
    window.open = function (...args) {
      console.warn("[WMPLAY AdBlock Global] Pop-up bloqueado:", args[0]);
      return null;
    };

    // 2. Intercepta cliques em tags <a> com target="_blank"
    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (target && target.getAttribute("target") === "_blank") {
        const href = target.getAttribute("href") || "";
        if (
          !href.startsWith("https://open.spotify.com") &&
          !href.startsWith("mailto:") &&
          !href.startsWith("tel:")
        ) {
          e.preventDefault();
          e.stopPropagation();
          console.warn("[WMPLAY AdBlock Global] Link externo não autorizado bloqueado:", href);
        }
      }
    };

    window.addEventListener("click", handleGlobalClick, true);
    return () => {
      window.open = originalOpen;
      window.removeEventListener("click", handleGlobalClick, true);
    };
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
    if (activeCategory === "releases") return "lancamentos";
    if (activeCategory === "novelas") return "novelas";
    return "";
  }, [activeAddonView, activeBrazucaCategory, activeCategory]);

  // Refs para manter valores atualizados sem causar re-render em cascata
  const catalogPlatformRef = useRef(catalogPlatform);
  catalogPlatformRef.current = catalogPlatform;
  const catalogGenreRef = useRef(catalogGenre);
  catalogGenreRef.current = catalogGenre;
  const catalogSearchRef = useRef(catalogSearch);
  catalogSearchRef.current = catalogSearch;

  // Fetch Catalog Items from API
  const fetchCatalogData = useCallback(async (
    type: string,
    page: number,
    search?: string,
    genre?: string,
    customLimit?: number,
    platform?: string
  ) => {
    if (!type) return;
    setCatalogLoading(true);
    try {
      const pageLimit = customLimit ? customLimit.toString() : (isLiteMode ? "24" : "48");
      const effectiveSearch = search !== undefined ? search : catalogSearchRef.current;
      const effectiveGenre = genre !== undefined ? genre : catalogGenreRef.current;
      const effectivePlatform = platform !== undefined ? platform : catalogPlatformRef.current;

      const params = new URLSearchParams({
        type,
        page: page.toString(),
        limit: pageLimit,
      });
      if (effectiveSearch) params.set("search", effectiveSearch);
      if (effectiveGenre && effectiveGenre !== "Todos" && effectiveGenre !== "favoritos") params.set("genre", effectiveGenre);
      if (effectivePlatform) params.set("platform", effectivePlatform);

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
  }, [isLiteMode]);

  // Trigger catalog fetch APENAS quando a categoria ou menu principal mudar
  useEffect(() => {
    const type = getCurrentCatalogType();
    if (type) {
      setCatalogPage(1);
      setCatalogGenre("");
      setCatalogPlatform("");
      setCatalogSearch("");
      setJumpPageInput("");
      setTvFocusIndex(null);
      fetchCatalogData(type, 1, "", "", undefined, "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeAddonView, activeBrazucaCategory]);

  // Auto-debounce catalog search when typing
  useEffect(() => {
    if (!catalogSearch.trim()) return;
    const isSearchingCatalog =
      activeCategory === "movies" ||
      activeCategory === "tv" ||
      activeCategory === "releases" ||
      activeCategory === "novelas" ||
      (activeAddonView === "brazucaplay" &&
        activeBrazucaCategory?.type !== "channels" &&
        activeBrazucaCategory?.type !== "settings");

    if (!isSearchingCatalog) return;

    const timer = setTimeout(() => {
      // Se estiver pesquisando por termo, buscar em 'all' caso esteja em movies ou tv para não limitar filmes/séries
      const type = (activeCategory === "movies" || activeCategory === "tv" || activeCategory === "releases" || activeCategory === "novelas" || isBrazucaRootSearching)
        ? "all"
        : (getCurrentCatalogType() || "all");
      setCatalogPage(1);
      fetchCatalogData(type, 1, catalogSearch, catalogGenre);
      saveRecentSearch(catalogSearch);
    }, 450);

    return () => clearTimeout(timer);
  }, [catalogSearch, getCurrentCatalogType, fetchCatalogData, catalogGenre, activeCategory, activeAddonView, activeBrazucaCategory]);

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

    const isTv = Boolean(seasonNum && epNum);
    const mediaId = isTv
      ? `series_${tmdbId || title}_s${seasonNum}e${epNum}`
      : `media_${tmdbId || directUrl || title}`;

    // Capturar tempo de retomada inicial estavelmente sem causar re-renders periódicos
    const initialResumeTime = (() => {
      const found = watchHistory.find((w) => w.id === mediaId);
      if (found && found.currentTime > 15 && found.percentage < 95) {
        return found.currentTime;
      }
      return 0;
    })();

    const isDirectStream =
      !isTv &&
      Boolean(directUrl) &&
      (directUrl!.startsWith("http://") || directUrl!.startsWith("https://")) &&
      !directUrl!.includes("resolver") &&
      !directUrl!.includes("serie3") &&
      !directUrl!.includes("movie2") &&
      !directUrl!.includes("doramas") &&
      !directUrl!.includes("source.apperror404") &&
      !directUrl!.includes("#") &&
      (directUrl!.includes(".m3u8") || directUrl!.endsWith(".mp4") || directUrl!.includes(".mp4?"));

    // 1. Stream direto já fornecido (Ex.: TV ao Vivo .m3u8 ou MP4 direto)
    if (isDirectStream && directUrl) {
      const isLiveHls = directUrl.includes(".m3u8");
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      const needsProxyFirst = isHttps && directUrl.startsWith("http://");

      if (needsProxyFirst) {
        // Em conexão HTTPS, usar o proxy seguro como Servidor 1 para evitar bloqueio de Mixed Content do navegador
        servers.push({
          name: isLiveHls ? "Sinal Ao Vivo 1 (Seguro Sem Bloqueio)" : "Transmissão Segura Full HD",
          url: `/api/proxy-stream?url=${encodeURIComponent(directUrl)}`,
          type: "video",
        });
        servers.push({
          name: isLiveHls ? "Sinal Ao Vivo 2 (Direto)" : "Transmissão Direta (MP4)",
          url: directUrl,
          type: "video",
        });
      } else {
        servers.push({
          name: isLiveHls ? "Sinal Ao Vivo 1 (Direto HD)" : "Transmissão Direta Full HD Dublado (MP4)",
          url: directUrl,
          type: "video",
        });
        if (isLiveHls) {
          servers.push({
            name: "Sinal Ao Vivo 2 (Proxy Rápido Sem Travamentos)",
            url: `/api/proxy-stream?url=${encodeURIComponent(directUrl)}`,
            type: "video",
          });
        }
      }

      // Adicionar espelho apenas se for exatamente o mesmo canal
      if (isLiveHls && title.toLowerCase() === "cartoon network hd") {
        servers.push({
          name: "Sinal Ao Vivo 3 (Cartoon Network Backup HD)",
          url: `/api/proxy-stream?url=${encodeURIComponent("http://170.83.49.66:8083/CARTOONHD/index.m3u8")}`,
          type: "video",
        });
      }

      setPlayingMedia({
        title,
        info,
        poster,
        servers,
        activeServerIndex: 0,
        mediaId,
        tmdbId,
        directUrl,
        seasonNum,
        epNum,
        isTv,
        initialResumeTime,
      });
      return;
    }

    // 2. Filmes & Séries do Catálogo Nativo Brazuca Play (100% Dublado em Português)
    setPlayingMedia({
      title,
      info,
      poster,
      servers: [
        {
          name: "Conectando ao Repositório Brazuca Play (Dublado PT-BR)...",
          url: "",
          type: "video",
        },
      ],
      activeServerIndex: 0,
      mediaId,
      tmdbId,
      directUrl,
      seasonNum,
      epNum,
      isTv,
      initialResumeTime,
    });

    if (isTv && directUrl) {
      fetch(`/api/episodes?link=${encodeURIComponent(directUrl)}&tmdbId=${encodeURIComponent(tmdbId || '')}&title=${encodeURIComponent(title || '')}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.seasons) && data.seasons.length > 0) {
            setSeriesSeasons(data.seasons);
          }
        })
        .catch(() => {});
    }

    const params = new URLSearchParams({
      link: directUrl || "",
      title: title || "",
      tmdbId: tmdbId || "",
      type: isTv ? "tv" : "movie",
      season: String(seasonNum || 1),
      episode: String(epNum || 1),
    });

    fetch(`/api/resolve-stream?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const validDirectServers = (data.success && Array.isArray(data.servers))
          ? data.servers.filter((s: any) => (s.type === "video" || s.type === "embed") && s.url && s.url !== "ERROR_UNAVAILABLE")
          : [];

        // Priorizar streams diretos de vídeo no topo, seguidos de embeds de backup
        validDirectServers.sort((a: any, b: any) => {
          if (a.type === "video" && b.type !== "video") return -1;
          if (a.type !== "video" && b.type === "video") return 1;
          return 0;
        });

        if (validDirectServers.length > 0) {
          setPlayingMedia((prev) => {
            if (!prev || prev.title !== title) return prev;
            return {
              ...prev,
              servers: validDirectServers,
              activeServerIndex: 0,
            };
          });
        } else {
          setPlayingMedia((prev) => {
            if (!prev || prev.title !== title) return prev;
            return {
              ...prev,
              servers: [
                {
                  name: "Sinal Temporariamente Fora do Ar (Brazuca Play)",
                  url: "ERROR_UNAVAILABLE",
                  type: "video",
                },
              ],
              activeServerIndex: 0,
            };
          });
        }
      })
      .catch((err) => {
        console.error("Erro ao resolver servidores Brazuca Play:", err);
        setPlayingMedia((prev) => {
          if (!prev || prev.title !== title) return prev;
          return {
            ...prev,
            servers: [
              {
                name: "Falha de Conexão com o Repositório Brazuca Play",
                url: "ERROR_UNAVAILABLE",
                type: "video",
              },
            ],
            activeServerIndex: 0,
          };
        });
      });
  };

  // Retomada e Próximo Episódio
  const handleResumeItem = (item: WatchProgressItem) => {
    if (item.isTv && item.seasonNum && item.epNum) {
      handlePlayMedia(
        item.title,
        item.info || "",
        item.poster || "",
        item.tmdbId,
        item.directUrl,
        item.seasonNum,
        item.epNum
      );
    } else {
      handlePlayMedia(
        item.title,
        item.info || "",
        item.poster || "",
        item.tmdbId,
        item.directUrl
      );
    }
  };

  const currentResumeTime = React.useMemo(() => {
    if (!playingMedia?.mediaId) return 0;
    const found = watchHistory.find((w) => w.id === playingMedia.mediaId);
    if (found && found.currentTime > 15 && found.percentage < 95) {
      return found.currentTime;
    }
    return 0;
  }, [playingMedia?.mediaId, watchHistory]);

  const currentSeason = React.useMemo(() => {
    if (!playingMedia?.isTv || !playingMedia.seasonNum) return null;
    return seriesSeasons.find((s) => s.seasonNumber === playingMedia.seasonNum) || null;
  }, [playingMedia?.isTv, playingMedia?.seasonNum, seriesSeasons]);

  const nextEpisodeInfo = React.useMemo(() => {
    if (!playingMedia?.isTv || !playingMedia.seasonNum || !playingMedia.epNum || seriesSeasons.length === 0) {
      return null;
    }
    const thisSeason = seriesSeasons.find((s) => s.seasonNumber === playingMedia.seasonNum);
    if (thisSeason) {
      const nextInSame = thisSeason.episodes.find((ep) => ep.number === playingMedia.epNum! + 1);
      if (nextInSame) {
        return {
          seasonNum: playingMedia.seasonNum,
          epNum: nextInSame.number,
          title: nextInSame.title,
          link: nextInSame.link || nextInSame.streamUrl,
        };
      }
    }
    // Verificar se existe a próxima temporada (Ex: Fim da Temp 1 -> Início da Temp 2)
    const nextSeason = seriesSeasons.find((s) => s.seasonNumber === playingMedia.seasonNum! + 1);
    if (nextSeason && nextSeason.episodes && nextSeason.episodes.length > 0) {
      const firstEp = nextSeason.episodes[0];
      return {
        seasonNum: nextSeason.seasonNumber,
        epNum: firstEp.number,
        title: firstEp.title,
        link: firstEp.link || firstEp.streamUrl,
      };
    }
    return null;
  }, [playingMedia?.isTv, playingMedia?.seasonNum, playingMedia?.epNum, seriesSeasons]);

  const hasNextEpisode = Boolean(nextEpisodeInfo);

  const handleNextEpisode = useCallback(() => {
    if (!nextEpisodeInfo) return;
    const baseTitle = selectedSeriesItem?.title || playingMedia?.title.split(" - T")[0] || "Série";
    const synopsis = selectedSeriesItem?.synopsis || playingMedia?.info;
    const thumbnail = selectedSeriesItem?.thumbnail || playingMedia?.poster;
    const tmdbId = selectedSeriesItem?.tmdb_id || playingMedia?.tmdbId;
    const link = nextEpisodeInfo.link || selectedSeriesItem?.link || playingMedia?.directUrl;

    handlePlayMedia(
      `${baseTitle} - T${nextEpisodeInfo.seasonNum}E${nextEpisodeInfo.epNum}: ${nextEpisodeInfo.title}`,
      synopsis || "",
      thumbnail || "",
      tmdbId || "",
      link || "",
      nextEpisodeInfo.seasonNum,
      nextEpisodeInfo.epNum
    );
  }, [nextEpisodeInfo, selectedSeriesItem, playingMedia, handlePlayMedia]);

  const handleSelectEpisodeInPlayer = useCallback(
    (seasonNum: number, epNum: number, episodeTitle: string, episodeLink?: string) => {
      if (selectedSeriesItem) {
        const linkToUse = episodeLink || selectedSeriesItem.link;
        const fullTitle = `${selectedSeriesItem.title} - T${seasonNum}E${epNum}: ${episodeTitle}`;
        handlePlayMedia(
          fullTitle,
          selectedSeriesItem.synopsis,
          selectedSeriesItem.thumbnail,
          selectedSeriesItem.tmdb_id,
          linkToUse,
          seasonNum,
          epNum
        );
      } else if (playingMedia) {
        const baseTitle = playingMedia.title.split(" - T")[0];
        const fullTitle = `${baseTitle} - T${seasonNum}E${epNum}: ${episodeTitle}`;
        handlePlayMedia(
          fullTitle,
          playingMedia.info || "",
          playingMedia.poster || "",
          playingMedia.tmdbId,
          episodeLink || playingMedia.directUrl,
          seasonNum,
          epNum
        );
      }
    },
    [selectedSeriesItem, playingMedia, handlePlayMedia]
  );

  const handleProgressUpdate = useCallback(
    (currentTime: number, duration: number) => {
      if (!playingMedia?.mediaId || duration <= 0) return;
      const percentage = Math.round((currentTime / duration) * 100);

      setWatchHistory((prev) => {
        const existingIdx = prev.findIndex((w) => w.id === playingMedia.mediaId);
        const updated: WatchProgressItem = {
          id: playingMedia.mediaId!,
          title: playingMedia.title,
          info: playingMedia.info,
          poster: playingMedia.poster,
          currentTime,
          duration,
          percentage,
          updatedAt: Date.now(),
          directUrl: playingMedia.directUrl,
          tmdbId: playingMedia.tmdbId,
          seasonNum: playingMedia.seasonNum,
          epNum: playingMedia.epNum,
          isTv: playingMedia.isTv,
        };

        let nextList: WatchProgressItem[];
        if (existingIdx >= 0) {
          nextList = [...prev];
          nextList[existingIdx] = updated;
        } else {
          nextList = [updated, ...prev];
        }

        nextList.sort((a, b) => b.updatedAt - a.updatedAt);
        const trimmed = nextList.slice(0, 30);
        try {
          localStorage.setItem("wmplay_watch_progress", JSON.stringify(trimmed));
        } catch {}
        return trimmed;
      });
    },
    [playingMedia]
  );

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

  // Canais filtrados dentro do Brazuca Play e TV Ao Vivo
  const filteredBrazucaChannels = BRAZUCA_CHANNELS.filter((ch) => {
    const matchesFilter =
      channelSubFilter === "todos"
        ? true
        : channelSubFilter === "favoritos"
        ? favoriteChannels.includes(ch.id)
        : ch.category === channelSubFilter;
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

  const isBrazucaRootSearching =
    activeAddonView === "brazucaplay" &&
    !activeBrazucaCategory &&
    Boolean(catalogSearch.trim());

  const isBrowsingCatalog =
    activeCategory === "movies" ||
    activeCategory === "tv" ||
    activeCategory === "releases" ||
    activeCategory === "novelas" ||
    isBrazucaRootSearching ||
    (activeAddonView === "brazucaplay" &&
      activeBrazucaCategory &&
      activeBrazucaCategory.type !== "channels" &&
      activeBrazucaCategory.type !== "settings");

  const currentCatalogType = (catalogSearch.trim() && (activeCategory === "movies" || activeCategory === "tv" || activeCategory === "releases" || activeCategory === "novelas" || isBrazucaRootSearching))
    ? "all"
    : (getCurrentCatalogType() || (isBrazucaRootSearching ? "all" : ""));
  const isLight = theme === "offwhite";

  const PLATFORMS_LIST = [
    { id: "", name: "Todas Plataformas", badge: "" },
    { id: "netflix", name: "Netflix", badge: "N" },
    { id: "max", name: "HBO Max", badge: "MAX" },
    { id: "disney", name: "Disney+", badge: "D+" },
    { id: "prime", name: "Prime Video", badge: "PRIME" },
    { id: "apple", name: "Apple TV+", badge: "APPLE" },
    { id: "globo", name: "Globoplay", badge: "GLOBO" },
  ];

  // Suporte à Navegação D-Pad / Controle Remoto de Smart TV e Teclado
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTvDpad = (e: KeyboardEvent) => {
      // Se o player de vídeo estiver aberto, o player já cuida do controle remoto
      if (playingMedia) return;

      // Se o usuário estiver digitando em um input de busca ou campo de texto, não interceptar setas
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        return;
      }

      const key = e.key;
      const keyCode = e.keyCode;

      // Teclas de controle remoto (Samsung Tizen/Orsay, LG webOS, Android TV, Fire TV, Teclado)
      const isLeft = key === "ArrowLeft" || keyCode === 37;
      const isUp = key === "ArrowUp" || keyCode === 38;
      const isRight = key === "ArrowRight" || keyCode === 39;
      const isDown = key === "ArrowDown" || keyCode === 40;
      const isBack =
        key === "Escape" ||
        key === "Backspace" ||
        keyCode === 27 ||
        keyCode === 8 ||
        keyCode === 461 ||
        keyCode === 10009;

      // Botões do PS1:
      // ✖ Cruz (Azul): Confirmar / Assistir / Abrir
      // ● Círculo (Vermelho): Voltar / Fechar
      // ■ Quadrado (Rosa): Favoritar / Minha Lista
      // ▲ Triângulo (Verde): Episódios / Alternar Temporada / Menu
      const isCross = key === "Enter" || key === "x" || key === "X" || keyCode === 13;
      const isCircle = isBack || key === "c" || key === "C";
      const isSquare = key === "f" || key === "F" || key === "s" || key === "S" || keyCode === 70 || keyCode === 83;
      const isTriangle = key === "e" || key === "E" || key === "t" || key === "T" || keyCode === 69 || keyCode === 84;

      if (isCircle) {
        if (selectedSeriesItem) {
          e.preventDefault();
          setSelectedSeriesItem(null);
          setTvFocusIndex(null);
          return;
        }
        if (tvFocusIndex !== null) {
          setTvFocusIndex(null);
          return;
        }
      }

      if (isSquare) {
        if (selectedSeriesItem) {
          e.preventDefault();
          toggleFavoriteCatalog(selectedSeriesItem);
          return;
        }
        const items = catalogGenre === "favoritos" ? favoriteCatalogItems : catalogItems;
        if (tvFocusIndex !== null && items[tvFocusIndex]) {
          e.preventDefault();
          toggleFavoriteCatalog(items[tvFocusIndex]);
          return;
        }
      }

      if (isTriangle) {
        if (selectedSeriesItem && seriesSeasons.length > 0) {
          e.preventDefault();
          setActiveSeasonTab((prev) => (prev >= seriesSeasons.length ? 1 : prev + 1));
          return;
        }
      }

      if (!isLeft && !isRight && !isUp && !isDown && !isCross) return;

      // Navegação dentro do Modal de Episódios de Série
      if (selectedSeriesItem) {
        const episodes = seriesSeasons.find((s) => s.seasonNumber === activeSeasonTab)?.episodes || [];
        if (episodes.length === 0) return;
        e.preventDefault();
        setIsTvModeActive(true);

        if (isCross) {
          if (tvFocusIndex !== null && episodes[tvFocusIndex]) {
            const ep = episodes[tvFocusIndex];
            handlePlayMedia(
              `${selectedSeriesItem.title} - T${activeSeasonTab}E${ep.number}: ${ep.title}`,
              selectedSeriesItem.synopsis,
              selectedSeriesItem.thumbnail,
              selectedSeriesItem.tmdb_id,
              ep.link || selectedSeriesItem.link,
              activeSeasonTab,
              ep.number
            );
          }
          return;
        }

        const cols = window.innerWidth >= 1280 ? 4 : window.innerWidth >= 1024 ? 3 : window.innerWidth >= 768 ? 2 : 1;
        setTvFocusIndex((prev) => {
          let next = prev === null ? 0 : prev;
          if (isRight) next = Math.min(episodes.length - 1, next + 1);
          if (isLeft) next = Math.max(0, next - 1);
          if (isDown) next = Math.min(episodes.length - 1, next + cols);
          if (isUp) next = Math.max(0, next - cols);
          return next;
        });
        return;
      }

      // Navegação no Catálogo Principal
      const isFavs = catalogGenre === "favoritos";
      const items = isFavs ? favoriteCatalogItems : catalogItems;
      if (!items || items.length === 0) return;

      e.preventDefault();
      setIsTvModeActive(true);

      if (isCross) {
        if (tvFocusIndex !== null && items[tvFocusIndex]) {
          const item = items[tvFocusIndex];
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
        }
        return;
      }

      const width = window.innerWidth;
      const cols = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : width >= 640 ? 3 : 2;

      setTvFocusIndex((prev) => {
        let next = prev === null ? 0 : prev;
        if (isRight) next = Math.min(items.length - 1, next + 1);
        if (isLeft) next = Math.max(0, next - 1);
        if (isDown) next = Math.min(items.length - 1, next + cols);
        if (isUp) next = Math.max(0, next - cols);
        return next;
      });
    };

    window.addEventListener("keydown", handleTvDpad);
    return () => window.removeEventListener("keydown", handleTvDpad);
  }, [
    playingMedia,
    selectedSeriesItem,
    seriesSeasons,
    activeSeasonTab,
    catalogItems,
    favoriteCatalogItems,
    catalogGenre,
    tvFocusIndex,
    handlePlayMedia,
    handleOpenSeriesEpisodes
  ]);

  // Auto-scroll do card focado pelo controle remoto da Smart TV
  useEffect(() => {
    if (tvFocusIndex !== null) {
      const el =
        document.getElementById(`catalog-card-${tvFocusIndex}`) ||
        document.getElementById(`episode-card-${tvFocusIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [tvFocusIndex]);

  // Suporte Nativo a Controles Físicos (PlayStation 1/4/5 USB, Gamepad Bluetooth, etc.)
  useEffect(() => {
    if (typeof window === "undefined") return;

    let animId: number;
    let lastButtonTime = 0;

    const pollGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = Array.from(gamepads).find((g) => g && g.connected);

      if (gp) {
        const now = Date.now();
        if (now - lastButtonTime > 200) {
          // Mapeamento dos botões clássicos do PS1:
          // Botão 0: ✖ Cruz (Enter / Selecionar)
          // Botão 1: ● Círculo (Escape / Voltar)
          // Botão 2: ■ Quadrado (F / Favoritar)
          // Botão 3: ▲ Triângulo (E / Episódios / Menu)
          const btnCross = gp.buttons[0]?.pressed;
          const btnCircle = gp.buttons[1]?.pressed;
          const btnSquare = gp.buttons[2]?.pressed;
          const btnTriangle = gp.buttons[3]?.pressed;

          // D-Pad e Analógico Esquerdo
          const dpadUp = gp.buttons[12]?.pressed || (gp.axes[1] !== undefined && gp.axes[1] < -0.5);
          const dpadDown = gp.buttons[13]?.pressed || (gp.axes[1] !== undefined && gp.axes[1] > 0.5);
          const dpadLeft = gp.buttons[14]?.pressed || (gp.axes[0] !== undefined && gp.axes[0] < -0.5);
          const dpadRight = gp.buttons[15]?.pressed || (gp.axes[0] !== undefined && gp.axes[0] > 0.5);

          if (btnCross) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
          } else if (btnCircle) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
          } else if (btnSquare) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "f", keyCode: 70, bubbles: true }));
          } else if (btnTriangle) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "e", keyCode: 69, bubbles: true }));
          } else if (dpadUp) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", keyCode: 38, bubbles: true }));
          } else if (dpadDown) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", keyCode: 40, bubbles: true }));
          } else if (dpadLeft) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", keyCode: 37, bubbles: true }));
          } else if (dpadRight) {
            lastButtonTime = now;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", keyCode: 39, bubbles: true }));
          }
        }
      }

      animId = requestAnimationFrame(pollGamepads);
    };

    animId = requestAnimationFrame(pollGamepads);
    return () => cancelAnimationFrame(animId);
  }, []);

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
    <div
      className={`flex h-screen w-screen font-sans overflow-hidden select-none transition-colors duration-300 ${
        theme === "offwhite"
          ? "theme-offwhite bg-[#f4f4f6] text-[#111827]"
          : "theme-dark bg-black text-slate-100"
      } ${isLiteMode ? "mode-tv-lite" : ""}`}
    >
      {/* Background Fanart (Desativado em Modo TV Lite para evitar travamentos de GPU em TVs antigas) */}
      {!isLiteMode && (
        <>
          <div
            className={`fixed inset-0 bg-cover bg-center transition-all duration-700 filter blur-sm transform scale-105 pointer-events-none ${
              isLight ? "opacity-10" : "opacity-25"
            }`}
            style={{
              backgroundImage: `url(${
                activeAddonView === "brazucaplay"
                  ? "/brazuca_fanart.jpg"
                  : selectedMedia.backdrop
              })`,
            }}
          />
          <div
            className={`fixed inset-0 pointer-events-none transition-colors duration-500 ${
              isLight
                ? "bg-gradient-to-t from-[#f4f4f6] via-[#f4f4f6]/85 to-[#f4f4f6]/40"
                : "bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40"
            }`}
          />
        </>
      )}

      {/* Kodi Estuary Sidebar (Desktop) */}
      <aside className={`hidden md:flex relative z-20 w-64 border-r backdrop-blur-md flex-col justify-between shrink-0 shadow-2xl transition-colors ${
        isLight ? "bg-white border-zinc-200" : "bg-zinc-950/95 border-zinc-850"
      }`}>
        <div>
          {/* Logo / Header */}
          <div className={`p-5 border-b flex items-center justify-between ${isLight ? "border-zinc-200" : "border-zinc-800/60"}`}>
            <WmplayLogo size="md" isLight={isLight} showSubtitle={true} />
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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30"
                      : isLight
                      ? "text-zinc-800 hover:text-red-600 hover:bg-red-50/80"
                      : "text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : isLight ? "text-zinc-700" : "text-slate-400"}`} />
                    <span className={isActive ? "text-white" : isLight ? "text-zinc-900 font-bold" : "text-slate-300"}>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-red-300" />}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Rodapé da Barra Lateral */}
        <div className={`p-4 border-t space-y-2.5 ${isLight ? "border-zinc-200" : "border-zinc-800/60"}`}>
          {/* Botão de Alternar Tema */}
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
              theme === "offwhite"
                ? "bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 shadow-red-500/10"
                : "bg-zinc-900 border-zinc-700 text-slate-200 hover:bg-zinc-800"
            }`}
            title="Alternar entre Modo Claro e Modo Escuro"
          >
            {theme === "offwhite" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="text-red-600 font-black">Tema: Modo Claro (Ativo)</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                <span className="text-slate-200 font-bold">Tema: Modo Escuro</span>
              </>
            )}
          </button>

          {/* Botão: Modo Lite para Smart TVs Antigas */}
          <button
            onClick={toggleLiteMode}
            className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
              isLiteMode
                ? "bg-amber-500 border-2 border-amber-600 text-black shadow-amber-500/20"
                : isLight
                ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50 shadow-sm"
                : "bg-zinc-900 border-zinc-700 text-slate-200 hover:text-amber-400 hover:bg-zinc-850"
            }`}
            title="Modo Lite para Smart TVs Antigas (LG, Philco, Samsung, etc.): Remove efeitos pesados, acelera a reprodução e reduz consumo de memória."
          >
            <Zap className={`w-3.5 h-3.5 ${isLiteMode ? "fill-black text-black" : "text-amber-500"}`} />
            <span>{isLiteMode ? "Modo TV Antiga: Ativo ⚡" : "Ativar Modo TV Lite"}</span>
          </button>

          <div className={`flex items-center justify-between px-2 text-xs font-bold ${isLight ? "text-zinc-700" : "text-slate-400"}`}>
            <span className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-emerald-600 font-bold" />
              <span className={isLight ? "text-zinc-800 font-bold" : ""}>Online (38.6k DB)</span>
            </span>
            <span className="font-mono text-red-600 font-black">{currentTime}</span>
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
              className={`p-2.5 rounded-lg border transition-colors ${
                isLight
                  ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-zinc-800 hover:text-red-600 shadow-sm"
                  : "bg-slate-800 hover:bg-zinc-800 border-transparent text-slate-300 hover:text-white"
              }`}
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
            className={`w-72 max-w-[85vw] h-full border-r flex flex-col justify-between shadow-2xl p-5 animate-in slide-in-from-left duration-200 ${
              isLight ? "bg-white border-zinc-200" : "bg-zinc-950 border-zinc-800"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              {/* Header do Drawer */}
              <div className={`pb-4 border-b flex items-center justify-between ${isLight ? "border-zinc-200" : "border-zinc-800/80"}`}>
                <WmplayLogo size="sm" isLight={isLight} showSubtitle={true} />
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`p-2 rounded-xl border ${
                    isLight ? "bg-zinc-100 border-zinc-300 text-zinc-800 hover:text-red-600" : "bg-zinc-900 border-zinc-800 text-slate-400 hover:text-white"
                  }`}
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
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30"
                          : isLight
                          ? "text-zinc-800 hover:text-red-600 hover:bg-red-50/80"
                          : "text-slate-400 hover:text-slate-200 hover:bg-zinc-900/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${isActive ? "text-white" : isLight ? "text-zinc-700" : "text-slate-400"}`} />
                        <span className={isActive ? "text-white" : isLight ? "text-zinc-900 font-bold" : "text-slate-300"}>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 text-red-300" />}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Rodapé do Drawer Mobile */}
            <div className={`pt-4 border-t space-y-2.5 ${isLight ? "border-zinc-200" : "border-zinc-800/80"}`}>
              {/* Botão de Alternar Tema */}
              <button
                onClick={toggleTheme}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
                  theme === "offwhite"
                    ? "bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 shadow-red-500/10"
                    : "bg-zinc-900 border-zinc-700 text-slate-200 hover:bg-zinc-800"
                }`}
                title="Alternar entre Modo Claro e Modo Escuro"
              >
                {theme === "offwhite" ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="text-red-600 font-black">Tema: Modo Claro (Ativo)</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400" />
                    <span className="text-slate-200 font-bold">Tema: Modo Escuro</span>
                  </>
                )}
              </button>

              {/* Botão: Modo Lite para Smart TVs Antigas */}
              <button
                onClick={toggleLiteMode}
                className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
                  isLiteMode
                    ? "bg-amber-500 border-2 border-amber-600 text-black shadow-amber-500/20"
                    : isLight
                    ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50 shadow-sm"
                    : "bg-zinc-900 border-zinc-700 text-slate-200 hover:text-amber-400 hover:bg-zinc-850"
                }`}
                title="Modo Lite para Smart TVs Antigas (LG, Philco, Samsung, etc.): Remove efeitos pesados, acelera a reprodução e reduz consumo de memória."
              >
                <Zap className={`w-3.5 h-3.5 ${isLiteMode ? "fill-black text-black" : "text-amber-500"}`} />
                <span>{isLiteMode ? "Modo TV Antiga: Ativo ⚡" : "Ativar Modo TV Lite"}</span>
              </button>

              <div className={`flex items-center justify-between px-2 text-xs font-bold ${
                isLight ? "text-zinc-700" : "text-slate-400"
              }`}>
                <span className="flex items-center gap-2">
                  <Wifi className="w-3.5 h-3.5 text-emerald-500 font-bold" />
                  <span className={isLight ? "text-zinc-800 font-bold" : ""}>Online (38.6k DB)</span>
                </span>
                <span className="font-mono text-red-600 font-black">{currentTime}</span>
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
                  className={`p-2.5 rounded-xl border transition-colors ${
                    isLight
                      ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-zinc-800 hover:text-red-600 shadow-sm"
                      : "bg-slate-800 hover:bg-zinc-800 border-transparent text-slate-300 hover:text-white"
                  }`}
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
        <header className={`h-14 sm:h-16 border-b px-3 sm:px-6 md:px-8 flex items-center justify-between shrink-0 gap-2 sm:gap-4 backdrop-blur-md transition-colors ${
          isLight
            ? "bg-white/95 border-zinc-200 shadow-sm"
            : "bg-zinc-950/80 border-zinc-800/60"
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-2xl min-w-0">
            {/* Botão Hambúrguer Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className={`md:hidden p-2 rounded-xl border shrink-0 transition-colors ${
                isLight
                  ? "bg-zinc-100 border-zinc-300 text-zinc-800 hover:text-red-600"
                  : "bg-zinc-900 border-zinc-800 text-slate-300 hover:text-white"
              }`}
              title="Abrir Menu WMPLAY"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo Mobile */}
            <div className="md:hidden shrink-0">
              <WmplayLogo size="sm" isLight={isLight} showSubtitle={false} />
            </div>

            {activeAddonView && (
              <button
                onClick={() => {
                  if (selectedSeriesItem) {
                    setSelectedSeriesItem(null);
                  } else if (catalogSearch && !activeBrazucaCategory) {
                    setCatalogSearch("");
                  } else if (activeBrazucaCategory) {
                    setActiveBrazucaCategory(null);
                  } else {
                    setActiveAddonView(null);
                  }
                }}
                className={`flex items-center gap-1 p-2 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-bold transition-colors shrink-0 ${
                  isLight
                    ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-red-600 shadow-sm"
                    : "bg-slate-800 hover:bg-zinc-800 border-transparent text-red-500"
                }`}
                title="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}

            {/* Input de Busca Dinâmica */}
            <div className="relative w-full min-w-0" ref={searchContainerRef}>
              <button
                type="button"
                onClick={() => {
                  const queryToSave = catalogSearch || musicSearchQuery || searchQuery;
                  saveRecentSearch(queryToSave);
                  setShowRecentDropdown(false);
                  if (isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings")) {
                    setCatalogPage(1);
                    fetchCatalogData(currentCatalogType || "all", 1, catalogSearch, catalogGenre);
                  } else if (activeCategory === "music") {
                    setMusicSearchTrigger((prev) => prev + 1);
                  }
                }}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 cursor-pointer z-10"
                title="Pesquisar"
              >
                <Search className={`w-4 h-4 ${
                  isLight ? "text-zinc-600 hover:text-red-600" : "text-slate-400 hover:text-red-500"
                }`} />
              </button>
              <input
                type="text"
                onFocus={() => setShowRecentDropdown(true)}
                value={
                  (isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings"))
                    ? catalogSearch
                    : activeCategory === "music"
                    ? musicSearchQuery
                    : searchQuery
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings")) {
                    setCatalogSearch(val);
                  } else if (activeCategory === "music") {
                    setMusicSearchQuery(val);
                  } else {
                    setSearchQuery(val);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const queryToSave = catalogSearch || musicSearchQuery || searchQuery;
                    saveRecentSearch(queryToSave);
                    setShowRecentDropdown(false);
                    if (isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings")) {
                      setCatalogPage(1);
                      fetchCatalogData(currentCatalogType || "all", 1, catalogSearch, catalogGenre);
                    } else if (activeCategory === "music") {
                      setMusicSearchTrigger((prev) => prev + 1);
                    }
                  }
                }}
                placeholder={
                  (isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings"))
                    ? "Pesquisar filmes, séries..."
                    : activeCategory === "music"
                    ? "Pesquisar músicas..."
                    : activeCategory === "live" || activeBrazucaCategory?.type === "channels"
                    ? "Filtrar por canal..."
                    : "Filtrar por nome..."
                }
                className={`w-full rounded-xl pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 text-base sm:text-base font-bold transition-all ${
                  isLight
                    ? "bg-white border-2 border-zinc-300 text-zinc-950 placeholder:text-zinc-500 focus:border-red-600 focus:ring-2 focus:ring-red-500/20 shadow-sm"
                    : "bg-zinc-950/90 border border-zinc-700/80 text-white placeholder-slate-400 focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-500/20"
                }`}
              />
              {((isBrowsingCatalog || (activeAddonView === "brazucaplay" && activeBrazucaCategory?.type !== "channels" && activeBrazucaCategory?.type !== "settings")) && catalogSearch) ? (
                <button
                  onClick={() => {
                    setCatalogSearch("");
                    setCatalogPage(1);
                    if (currentCatalogType) {
                      fetchCatalogData(currentCatalogType, 1, "", catalogGenre);
                    }
                  }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isLight ? "text-zinc-500 hover:text-zinc-950" : "text-slate-400 hover:text-white"
                  }`}
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : activeCategory === "music" && musicSearchQuery ? (
                <button
                  onClick={() => {
                    setMusicSearchQuery("");
                    setMusicSearchTrigger((prev) => prev + 1);
                  }}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 ${
                    isLight ? "text-zinc-500 hover:text-zinc-950" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}

              {/* Dropdown de Buscas Recentes (1 Toque) */}
              {showRecentDropdown && recentSearches.length > 0 && (
                <div
                  className={`absolute top-full left-0 right-0 mt-2 z-50 p-3 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-xl border animate-in fade-in-50 zoom-in-95 duration-150 ${
                    isLight
                      ? "bg-white/95 border-zinc-200 text-zinc-950 shadow-xl"
                      : "bg-zinc-950/95 border-zinc-800 text-white shadow-2xl"
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-700/40">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-red-500" />
                      <span>Buscas Recentes</span>
                    </div>
                    <button
                      type="button"
                      onClick={clearRecentSearches}
                      className="text-[11px] font-bold text-zinc-400 hover:text-red-500 transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {recentSearches.map((term, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          if (
                            isBrowsingCatalog ||
                            (activeAddonView === "brazucaplay" &&
                              activeBrazucaCategory?.type !== "channels" &&
                              activeBrazucaCategory?.type !== "settings")
                          ) {
                            setCatalogSearch(term);
                            setCatalogPage(1);
                            fetchCatalogData(currentCatalogType || "all", 1, term, catalogGenre);
                          } else if (activeCategory === "music") {
                            setMusicSearchQuery(term);
                            setMusicSearchTrigger((p) => p + 1);
                          } else {
                            setSearchQuery(term);
                          }
                          saveRecentSearch(term);
                          setShowRecentDropdown(false);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isLight
                            ? "bg-zinc-100 hover:bg-red-50 border-zinc-200 text-zinc-800 hover:text-red-600 hover:border-red-300"
                            : "bg-zinc-900/90 hover:bg-red-950/40 border-zinc-800 hover:border-red-500/40 text-zinc-200 hover:text-red-400"
                        }`}
                      >
                        <Search className="w-3 h-3 opacity-60" />
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Botão: Alternador de Tema Modo Claro / Escuro */}
            <button
              onClick={toggleTheme}
              className={`flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
                theme === "offwhite"
                  ? "bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 shadow-red-500/10"
                  : "bg-zinc-900 border-zinc-700 text-slate-200 hover:bg-zinc-800"
              }`}
              title="Clique para alternar entre Modo Claro e Modo Escuro"
            >
              {theme === "offwhite" ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="font-black text-red-600 hidden sm:inline ml-1.5">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-400 fill-indigo-400 shrink-0" />
                  <span className="font-bold text-slate-200 hidden sm:inline ml-1.5">Modo Escuro</span>
                </>
              )}
            </button>

            {/* Botão: Modo TV Lite (Otimizado para Smart TVs antigas: LG, Philco, Samsung, etc.) */}
            <button
              onClick={toggleLiteMode}
              className={`flex items-center justify-center p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-black transition-all shadow-sm cursor-pointer ${
                isLiteMode
                  ? "bg-amber-500 border-2 border-amber-600 text-black shadow-amber-500/20"
                  : isLight
                  ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50 shadow-sm"
                  : "bg-zinc-900 border-zinc-700 text-slate-200 hover:text-amber-400 hover:bg-zinc-800"
              }`}
              title="Modo Lite para Smart TVs Antigas (LG, Philco, Samsung, etc.): Remove efeitos pesados, acelera a reprodução e reduz consumo de memória."
            >
              <Zap className={`w-4 h-4 shrink-0 ${isLiteMode ? "fill-black text-black" : "text-amber-500"}`} />
              <span className="font-black hidden sm:inline ml-1.5">{isLiteMode ? "TV Lite (Ativo)" : "Modo TV Lite"}</span>
            </button>

            <button
              onClick={() => setIsZipModalOpen(true)}
              className={`hidden md:flex items-center gap-2 border text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                isLight
                  ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 hover:border-red-500 text-zinc-800 hover:text-red-600 shadow-sm"
                  : "bg-slate-800 hover:bg-red-950/80 border-red-600/30 hover:border-red-500 text-red-400 font-semibold"
              }`}
            >
              <UploadCloud className="w-4 h-4 text-red-500" />
              <span>Instalar ZIP</span>
            </button>
            <div className={`hidden sm:block h-6 w-px ${isLight ? "bg-zinc-300" : "bg-slate-800"}`} />
            <div className={`hidden sm:flex items-center gap-2 text-xs font-mono font-bold ${
              isLight ? "text-zinc-800" : "text-slate-400"
            }`}>
              <Clock className="w-4 h-4 text-red-600" />
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
              <div className={`relative rounded-2xl overflow-hidden border p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl backdrop-blur-md transition-colors ${
                isLight ? "bg-white border-zinc-300 shadow-sm" : "border-red-600/30 bg-zinc-950/90"
              }`}>
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border border-red-500/50 shadow-xl bg-black flex items-center justify-center shrink-0">
                    <img
                      src="/wmplay_icon.png"
                      alt="WMPLAY"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className={`text-2xl font-black ${isLight ? "text-zinc-950" : "text-white"}`}>WM<span className="text-red-600">PLAY</span></h2>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full font-mono ${
                        isLight ? "text-amber-800 bg-amber-100 border border-amber-300" : "text-amber-300 bg-amber-950/80 border border-amber-500/50"
                      }`}>
                        v2.1.4 OFICIAL
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        isLight ? "text-emerald-800 bg-emerald-100 border border-emerald-300" : "text-emerald-300 bg-emerald-950/80 border border-emerald-500/50"
                      }`}>
                        38.676 Títulos
                      </span>
                    </div>
                    <p className={`text-xs mt-1 max-w-xl ${isLight ? "text-zinc-700 font-semibold" : "text-slate-300"}`}>
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                      isLight
                        ? "bg-zinc-100 hover:bg-red-50 border border-zinc-300 text-red-600"
                        : "bg-red-600/30 border border-red-500/40 text-red-400 hover:bg-red-600 hover:text-white"
                    }`}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Menu Raiz</span>
                  </button>
                )}
              </div>

              {/* TELA 1: MENU RAIZ DO BRAZUCA PLAY OU BUSCA GLOBAL */}
              {!activeBrazucaCategory ? (
                catalogSearch.trim() ? (
                  <CatalogBrowseView
                    title={`Busca: "${catalogSearch}"`}
                    badge={`${catalogTotalCount.toLocaleString("pt-BR")} títulos`}
                    catalogLoading={catalogLoading}
                    catalogItems={catalogItems}
                    catalogPage={catalogPage}
                    catalogTotalPages={catalogTotalPages}
                    catalogTotalCount={catalogTotalCount}
                    catalogGenre={catalogGenre}
                    catalogPlatform={catalogPlatform}
                    platformsList={PLATFORMS_LIST}
                    onSelectPlatform={(p) => {
                      const nextPlat = (catalogPlatform === p && p !== "") ? "" : p;
                      setCatalogPlatform(nextPlat);
                      setCatalogPage(1);
                      fetchCatalogData("all", 1, catalogSearch, catalogGenre, undefined, nextPlat);
                    }}
                    tvFocusIndex={tvFocusIndex}
                    isTvModeActive={isTvModeActive}
                    onToggleTvMode={() => {
                      setIsTvModeActive((prev) => !prev);
                      setTvFocusIndex((prev) => (prev === null ? 0 : null));
                    }}
                    catalogSearch={catalogSearch}
                    jumpPageInput={jumpPageInput}
                    genresList={GENRES_LIST}
                    isLight={isLight}
                    isLiteMode={isLiteMode}
                    favoriteCatalogItems={favoriteCatalogItems}
                    onToggleFavoriteCatalog={toggleFavoriteCatalog}
                    onSelectGenre={(g) => {
                      const newGenre = g === "Todos" ? "" : g;
                      setCatalogGenre(newGenre);
                      setCatalogPage(1);
                      fetchCatalogData("all", 1, catalogSearch, newGenre, undefined, catalogPlatform);
                    }}
                    onPageChange={(newPage) => {
                      if (newPage < 1 || newPage > catalogTotalPages) return;
                      setCatalogPage(newPage);
                      fetchCatalogData("all", newPage, catalogSearch, catalogGenre, undefined, catalogPlatform);
                    }}
                    onJumpPageSubmit={(e) => {
                      e.preventDefault();
                      const p = parseInt(jumpPageInput, 10);
                      if (!isNaN(p) && p >= 1 && p <= catalogTotalPages) {
                        setCatalogPage(p);
                        fetchCatalogData("all", p, catalogSearch, catalogGenre, undefined, catalogPlatform);
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
                ) : (
                <div className="space-y-8 pb-12">
                  {/* SEÇÃO CONTINUAR ASSISTINDO (Histórico com Progresso Salvo) */}
                  {watchHistory.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-5 h-5 text-red-600" />
                          <h3 className={`text-base sm:text-lg font-black ${isLight ? "text-zinc-950" : "text-white"}`}>
                            Continuar Assistindo
                          </h3>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                            isLight ? "bg-red-100 text-red-700 border border-red-200" : "bg-red-950/80 text-red-400 border border-red-600/30"
                          }`}>
                            {watchHistory.length}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={clearWatchHistory}
                          className="text-xs font-bold text-zinc-500 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          Limpar Histórico
                        </button>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto pb-3 pt-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
                        {watchHistory.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => handleResumeItem(item)}
                            className={`group relative shrink-0 w-48 sm:w-56 rounded-xl sm:rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 hover:scale-[1.03] shadow-xl ${
                              isLight
                                ? "border-zinc-300 bg-white hover:border-red-500 hover:shadow-red-500/10"
                                : "border-red-600/25 bg-zinc-950/80 hover:border-red-500 hover:shadow-red-600/20"
                            }`}
                          >
                            <div className="aspect-video w-full overflow-hidden relative bg-black">
                              <img
                                src={item.poster || "/wmplay_icon.png"}
                                alt={item.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/wmplay_icon.png";
                                }}
                              />
                              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                  <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                </div>
                              </div>
                              <span className="absolute bottom-1.5 right-1.5 text-[10px] font-mono font-bold text-white bg-black/80 px-1.5 py-0.5 rounded backdrop-blur-sm">
                                {formatTimeMinutes(item.currentTime)} / {formatTimeMinutes(item.duration)}
                              </span>
                            </div>

                            {/* Barra de Progresso Vermelha */}
                            <div className="w-full bg-zinc-800 h-1.5 overflow-hidden">
                              <div
                                className="bg-red-600 h-full transition-all duration-300 shadow-sm shadow-red-500"
                                style={{ width: `${Math.min(100, Math.max(5, item.percentage))}%` }}
                              />
                            </div>

                            <div className="p-2.5 sm:p-3">
                              <h4 className={`font-black text-xs sm:text-sm truncate ${
                                isLight ? "text-zinc-950 group-hover:text-red-600" : "text-white group-hover:text-red-400"
                              }`}>
                                {item.title}
                              </h4>
                              <p className="text-[10px] sm:text-[11px] text-zinc-500 truncate mt-0.5">
                                {item.info || (item.percentage >= 95 ? "Concluído" : `${item.percentage}% assistido`)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GRID DAS 9 CATEGORIAS OFICIAIS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {BRAZUCA_ROOT_CATEGORIES.map((cat) => (
                    <div
                      key={cat.id}
                      onClick={() => {
                        setActiveBrazucaCategory(cat);
                        setSelectedSeriesItem(null);
                      }}
                      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer p-6 flex flex-col justify-between hover:scale-[1.02] shadow-xl ${
                        isLight
                          ? "border-zinc-300 bg-white hover:border-red-500 hover:shadow-red-500/10"
                          : "border-red-600/20 bg-zinc-950/70 hover:border-red-500 hover:shadow-red-600/20"
                      }`}
                    >
                      <div
                        className="absolute inset-0 bg-cover bg-center opacity-20 group-hover:opacity-35 transition-opacity duration-500"
                        style={{ backgroundImage: `url(${cat.banner})` }}
                      />
                      <div className={`absolute inset-0 ${
                        isLight
                          ? "bg-gradient-to-t from-white via-white/85 to-white/40"
                          : "bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent"
                      }`} />

                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-110 ${
                            isLight
                              ? "bg-red-50 border-red-200 text-red-600"
                              : "bg-gradient-to-tr from-cyan-600/40 to-blue-500/30 border-red-500/40 text-red-400"
                          }`}>
                            <Folder className={`w-6 h-6 ${isLight ? "text-red-600 fill-red-100" : "fill-red-500/20 text-red-400"}`} />
                          </div>
                          {cat.badge && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider font-mono ${
                              isLight ? "text-amber-800 bg-amber-100 border border-amber-300" : "text-amber-300 bg-amber-950/60 border border-amber-500/40"
                            }`}>
                              {cat.badge}
                            </span>
                          )}
                        </div>

                        <h3 className={`text-lg font-black transition-colors ${
                          isLight ? "text-zinc-950 group-hover:text-red-600" : "text-white group-hover:text-red-400"
                        }`}>
                          {cat.title}
                        </h3>
                        <p className={`text-xs mt-2 line-clamp-2 leading-relaxed ${
                          isLight ? "text-zinc-700 font-semibold" : "text-slate-300"
                        }`}>
                          {cat.description}
                        </p>
                      </div>

                      <div className={`relative z-10 mt-6 pt-3 border-t flex items-center justify-between text-xs font-bold text-red-600 ${
                        isLight ? "border-zinc-200" : "border-zinc-800"
                      }`}>
                        <span>Abrir Categoria</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  ))}
                  </div>
                </div>
              )) : activeBrazucaCategory.type === "channels" ? (
                /* TELA 2: CANAIS DE TV AO VIVO (154 CANAIS OFICIAIS) */
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <h3 className={`text-lg font-bold flex items-center gap-2 ${isLight ? "text-zinc-950" : "text-white"}`}>
                      <span>Grade Oficial de Canais</span>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                        isLight ? "text-red-700 bg-red-100 border border-red-300" : "text-red-400 bg-red-950/60 border border-red-600/30"
                      }`}>
                        {filteredBrazucaChannels.length} canais ao vivo
                      </span>
                    </h3>

                    {/* Subfiltros de Canais */}
                    <div className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs overflow-x-auto ${
                      isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/90 border-zinc-800"
                    }`}>
                      {[
                        { id: "todos", label: `Todos (${BRAZUCA_CHANNELS.length})` },
                        { id: "favoritos", label: `⭐ Favoritos (${favoriteChannels.length})` },
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
                          className={`px-3 py-1.5 rounded-lg transition-colors font-bold shrink-0 cursor-pointer ${
                            channelSubFilter === tab.id
                              ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20"
                              : isLight
                              ? "text-zinc-950 hover:text-red-600 hover:bg-red-50 bg-zinc-100/80 border border-zinc-200"
                              : "text-slate-300 hover:text-white hover:bg-zinc-900"
                          }`}
                        >
                          <span className={channelSubFilter === tab.id ? "text-white font-black" : isLight ? "text-zinc-950 font-black hover:text-red-600" : "text-slate-300 font-bold"}>
                            {tab.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredBrazucaChannels.length === 0 ? (
                    <div className={`p-12 text-center rounded-2xl border ${
                      isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/50 border-zinc-800"
                    }`}>
                      <p className={`text-base font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
                        {channelSubFilter === "favoritos"
                          ? "Nenhum canal favoritado ainda."
                          : "Nenhum canal encontrado."}
                      </p>
                      <p className={`text-xs mt-1 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                        {channelSubFilter === "favoritos"
                          ? "Clique na estrela (⭐) de qualquer canal para salvá-lo nos seus favoritos."
                          : "Tente selecionar outra categoria ou buscar por outro canal."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
                      {filteredBrazucaChannels.map((ch) => {
                        const isFav = favoriteChannels.includes(ch.id);
                        return (
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
                            className={`group p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between hover:scale-105 shadow-lg relative ${
                              isLight
                                ? "border-zinc-300 bg-white hover:bg-red-50/40 hover:border-red-500 hover:shadow-red-500/10"
                                : "border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 hover:shadow-red-600/20"
                            }`}
                          >
                            <div className={`aspect-video w-full rounded-xl border flex items-center justify-center p-3 relative overflow-hidden ${
                              isLight ? "bg-zinc-100 border-zinc-200" : "bg-black/60 border-zinc-800 group-hover:border-red-600/40"
                            }`}>
                              {/* Botão de Favoritar Canal */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  toggleFavoriteChannel(ch.id);
                                }}
                                className={`absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer pointer-events-auto shadow-md ${
                                  isFav
                                    ? "bg-amber-500 text-white shadow-amber-500/50 scale-105"
                                    : "bg-black/75 hover:bg-black/95 text-zinc-300 hover:text-amber-400 border border-white/10"
                                }`}
                                title={isFav ? "Remover dos Favoritos" : "Favoritar Canal"}
                              >
                                <Star className={`w-4 h-4 ${isFav ? "fill-white text-white" : ""}`} />
                              </button>

                              <img
                                src={ch.logo || "/wmplay_icon.png"}
                                alt={ch.name}
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = "/wmplay_icon.png";
                                }}
                                className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-8 h-8 fill-red-500 text-red-500 filter drop-shadow" />
                              </div>
                            </div>

                            <div className="mt-3">
                              <h4 className={`font-bold text-sm truncate transition-colors ${
                                isLight ? "text-zinc-950 group-hover:text-red-600" : "text-slate-100 group-hover:text-red-400"
                              }`}>
                                {ch.name}
                              </h4>
                              <p className={`text-[11px] truncate mt-0.5 ${
                                isLight ? "text-zinc-600 font-semibold" : "text-slate-400"
                              }`}>
                                {ch.epg || "Transmissão Ao Vivo"}
                              </p>
                            </div>

                            <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] ${
                              isLight ? "border-zinc-200" : "border-zinc-850"
                            }`}>
                              <span className="text-red-600 font-mono uppercase font-black">
                                {ch.category}
                              </span>
                              <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                AO VIVO
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : selectedSeriesItem ? (
                /* TELA 3: EPISÓDIOS DA SÉRIE / ANIME / NOVELA SELECIONADA */
                <div className="space-y-6 pb-12">
                  <div className={`relative rounded-2xl overflow-hidden border p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start backdrop-blur-md shadow-2xl ${
                    isLight ? "bg-white border-zinc-300 shadow-sm" : "border-red-600/25 bg-zinc-950/80"
                  }`}>
                    <div className="relative w-44 h-64 rounded-xl overflow-hidden shadow-2xl border border-red-500/30 shrink-0 bg-black">
                      <img
                        src={selectedSeriesItem.thumbnail || "/wmplay_icon.png"}
                        alt={selectedSeriesItem.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className={`font-bold px-2.5 py-0.5 rounded-full border uppercase font-mono ${
                          isLight ? "bg-red-50 text-red-700 border-red-300" : "bg-red-600/20 text-red-400 border-red-500/30"
                        }`}>
                          {selectedSeriesItem.type}
                        </span>
                        {selectedSeriesItem.year && (
                          <span className={`flex items-center gap-1 font-semibold ${isLight ? "text-zinc-700" : "text-slate-300"}`}>
                            <Calendar className="w-3.5 h-3.5 text-red-600" />
                            {selectedSeriesItem.year}
                          </span>
                        )}
                        {selectedSeriesItem.rating && (
                          <span className="text-amber-500 font-bold flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            {selectedSeriesItem.rating}
                          </span>
                        )}
                        {selectedSeriesItem.genres && (
                          <span className={`font-semibold ${isLight ? "text-zinc-600" : "text-slate-400"}`}>· {selectedSeriesItem.genres}</span>
                        )}
                      </div>
                      <h2 className={`text-3xl font-black ${isLight ? "text-zinc-950" : "text-white"}`}>{selectedSeriesItem.title}</h2>
                      <p className={`text-sm leading-relaxed max-w-4xl line-clamp-4 ${isLight ? "text-zinc-700 font-semibold" : "text-slate-300"}`}>
                        {selectedSeriesItem.synopsis || "Sinopse não informada pelo repositório."}
                      </p>
                      <div className="pt-2 flex items-center gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleFavoriteCatalog(selectedSeriesItem)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm border ${
                            favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id)
                              ? "bg-amber-500 text-white border-amber-400 shadow-amber-500/30"
                              : isLight
                              ? "bg-zinc-100 hover:bg-amber-50 border-zinc-300 text-zinc-800 hover:text-amber-600"
                              : "bg-slate-800 hover:bg-zinc-800 border-zinc-700 text-slate-300 hover:text-amber-400"
                          }`}
                        >
                          <Star className={`w-4 h-4 ${favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id) ? "fill-white text-white" : "text-amber-400 fill-amber-400"}`} />
                          <span>{favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id) ? "Salvo na Minha Lista" : "Salvar nos Favoritos"}</span>
                        </button>
                        <button
                          onClick={() => setSelectedSeriesItem(null)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border ${
                            isLight
                              ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-zinc-800 hover:text-red-600 shadow-sm"
                              : "bg-slate-800 hover:bg-zinc-800 border-transparent text-slate-300 hover:text-white"
                          }`}
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Voltar para lista de títulos</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Seletor de Temporadas e Grade de Episódios */}
                  {loadingEpisodes ? (
                    <div className="p-12 flex flex-col items-center justify-center gap-3 text-red-600">
                      <Loader2 className="w-10 h-10 animate-spin" />
                      <p className={`text-sm font-bold ${isLight ? "text-zinc-800" : "text-slate-300"}`}>Carregando temporadas e episódios sincronizados...</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Abas de Temporada (Subfiltros de Temporadas) */}
                      {seriesSeasons.length > 0 && (
                        <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${
                          isLight ? "border-zinc-200" : "border-zinc-800"
                        }`}>
                          {seriesSeasons.map((s) => (
                            <button
                              key={s.seasonNumber}
                              onClick={() => setActiveSeasonTab(s.seasonNumber)}
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                                activeSeasonTab === s.seasonNumber
                                  ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/20"
                                  : isLight
                                  ? "bg-white text-zinc-950 hover:text-red-600 hover:bg-red-50 border-2 border-zinc-300 shadow-sm"
                                  : "bg-zinc-950/90 text-slate-300 hover:text-white border border-zinc-800"
                              }`}
                            >
                              <span className={activeSeasonTab === s.seasonNumber ? "text-white font-black" : isLight ? "text-zinc-950 font-black hover:text-red-600" : "text-slate-300 font-bold"}>
                                {s.seasonTitle} ({s.episodes.length} eps)
                              </span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Lista de Episódios da Temporada Ativa */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {(
                          seriesSeasons.find((s) => s.seasonNumber === activeSeasonTab)?.episodes || []
                        ).map((ep, epIdx) => {
                          const isEpTvFocused = tvFocusIndex === epIdx;
                          return (
                            <div
                              id={`episode-card-${epIdx}`}
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
                              className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-md ${
                                isEpTvFocused
                                  ? "ring-4 ring-red-500 scale-[1.03] shadow-2xl z-20 shadow-red-600/70 border-red-500 bg-red-950/50"
                                  : isLight
                                  ? "border-zinc-300 bg-white hover:bg-red-50/50 hover:border-red-500 hover:scale-[1.01]"
                                  : "border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 hover:scale-[1.01]"
                              }`}
                            >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${
                                isLight
                                  ? "bg-red-50 border-red-200 text-red-600 group-hover:bg-red-600 group-hover:text-white"
                                  : "bg-red-950/80 border-red-600/30 text-red-400 group-hover:bg-red-600 group-hover:text-white"
                              }`}>
                                {ep.number}
                              </div>
                              <div className="min-w-0">
                                <h4 className={`font-bold text-sm truncate ${
                                  isLight ? "text-zinc-950 group-hover:text-red-600" : "text-slate-100 group-hover:text-red-400"
                                }`}>
                                  {ep.title}
                                </h4>
                                <p className={`text-xs truncate mt-0.5 ${
                                  isLight ? "text-zinc-600 font-semibold" : "text-slate-400"
                                }`}>
                                  {ep.duration || "45m"} · Full HD
                                </p>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 ml-2">
                              {isEpTvFocused ? (
                                <Ps1Button type="cross" size="sm" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all">
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
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
                  catalogPlatform={catalogPlatform}
                  platformsList={PLATFORMS_LIST}
                  onSelectPlatform={(p) => {
                    const nextPlat = (catalogPlatform === p && p !== "") ? "" : p;
                    setCatalogPlatform(nextPlat);
                    setCatalogPage(1);
                    fetchCatalogData(currentCatalogType, 1, catalogSearch, catalogGenre, undefined, nextPlat);
                  }}
                  tvFocusIndex={tvFocusIndex}
                  isTvModeActive={isTvModeActive}
                  onToggleTvMode={() => {
                    setIsTvModeActive((prev) => !prev);
                    setTvFocusIndex((prev) => (prev === null ? 0 : null));
                  }}
                  catalogSearch={catalogSearch}
                  jumpPageInput={jumpPageInput}
                  genresList={GENRES_LIST}
                  isLight={isLight}
                  isLiteMode={isLiteMode}
                  favoriteCatalogItems={favoriteCatalogItems}
                  onToggleFavoriteCatalog={toggleFavoriteCatalog}
                  onSelectGenre={(g) => {
                    const newGenre = g === "Todos" ? "" : g;
                    setCatalogGenre(newGenre);
                    setCatalogPage(1);
                    fetchCatalogData(currentCatalogType, 1, catalogSearch, newGenre, undefined, catalogPlatform);
                  }}
                  onPageChange={(newPage) => {
                    if (newPage < 1 || newPage > catalogTotalPages) return;
                    setCatalogPage(newPage);
                    fetchCatalogData(currentCatalogType, newPage, catalogSearch, catalogGenre, undefined, catalogPlatform);
                  }}
                  onJumpPageSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(jumpPageInput, 10);
                    if (!isNaN(p) && p >= 1 && p <= catalogTotalPages) {
                      setCatalogPage(p);
                      fetchCatalogData(currentCatalogType, p, catalogSearch, catalogGenre, undefined, catalogPlatform);
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
          ) : activeCategory === "movies" || activeCategory === "tv" || activeCategory === "releases" || activeCategory === "novelas" ? (
            /* ============================================================== */
            /* SEÇÃO 2: CATÁLOGO DIRETO VIA MENU LATERAL DO KODI              */
            /* ============================================================== */
            selectedSeriesItem ? (
              <div className="space-y-6 pb-12">
                <div className={`relative rounded-2xl overflow-hidden border p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start backdrop-blur-md shadow-2xl ${
                  isLight ? "bg-white border-zinc-300 shadow-sm" : "border-red-600/25 bg-zinc-950/80"
                }`}>
                  <div className="relative w-44 h-64 rounded-xl overflow-hidden shadow-2xl border border-red-500/30 shrink-0 bg-black">
                    <img
                      src={selectedSeriesItem.thumbnail || "/wmplay_icon.png"}
                      alt={selectedSeriesItem.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <span className={`font-bold px-2.5 py-0.5 rounded-full border uppercase font-mono ${
                        isLight ? "bg-red-50 text-red-700 border-red-300" : "bg-red-600/20 text-red-400 border-red-500/30"
                      }`}>
                        {selectedSeriesItem.type}
                      </span>
                      {selectedSeriesItem.year && (
                        <span className={`flex items-center gap-1 font-semibold ${isLight ? "text-zinc-700" : "text-slate-300"}`}>
                          <Calendar className="w-3.5 h-3.5 text-red-600" />
                          {selectedSeriesItem.year}
                        </span>
                      )}
                      {selectedSeriesItem.rating && (
                        <span className="text-amber-500 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-current" />
                          {selectedSeriesItem.rating}
                        </span>
                      )}
                      {selectedSeriesItem.genres && (
                        <span className={`font-semibold ${isLight ? "text-zinc-600" : "text-slate-400"}`}>· {selectedSeriesItem.genres}</span>
                      )}
                    </div>
                    <h2 className={`text-3xl font-black ${isLight ? "text-zinc-950" : "text-white"}`}>{selectedSeriesItem.title}</h2>
                    <p className={`text-sm leading-relaxed max-w-4xl line-clamp-4 ${isLight ? "text-zinc-700 font-semibold" : "text-slate-300"}`}>
                      {selectedSeriesItem.synopsis || "Sinopse não informada pelo repositório."}
                    </p>
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => toggleFavoriteCatalog(selectedSeriesItem)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm border ${
                          favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id)
                            ? "bg-amber-500 text-white border-amber-400 shadow-amber-500/30"
                            : isLight
                            ? "bg-zinc-100 hover:bg-amber-50 border-zinc-300 text-zinc-800 hover:text-amber-600"
                            : "bg-slate-800 hover:bg-zinc-800 border-zinc-700 text-slate-300 hover:text-amber-400"
                        }`}
                      >
                        <Star className={`w-4 h-4 ${favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id) ? "fill-white text-white" : "text-amber-400 fill-amber-400"}`} />
                        <span>{favoriteCatalogItems.some((x) => x.id === selectedSeriesItem.id) ? "Salvo na Minha Lista" : "Salvar nos Favoritos"}</span>
                      </button>
                      <button
                        onClick={() => setSelectedSeriesItem(null)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors border ${
                          isLight
                            ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-zinc-800 hover:text-red-600 shadow-sm"
                            : "bg-slate-800 hover:bg-zinc-800 border-transparent text-slate-300 hover:text-white"
                        }`}
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Voltar para lista de títulos</span>
                      </button>
                    </div>
                  </div>
                </div>

                {loadingEpisodes ? (
                  <div className="p-12 flex flex-col items-center justify-center gap-3 text-red-600">
                    <Loader2 className="w-10 h-10 animate-spin" />
                    <p className={`text-sm font-bold ${isLight ? "text-zinc-800" : "text-slate-300"}`}>Carregando temporadas e episódios sincronizados...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Abas de Temporada (Subfiltros de Temporadas) */}
                    {seriesSeasons.length > 0 && (
                      <div className={`flex items-center gap-2 overflow-x-auto pb-2 border-b ${
                        isLight ? "border-zinc-200" : "border-zinc-800"
                      }`}>
                        {seriesSeasons.map((s) => (
                          <button
                            key={s.seasonNumber}
                            onClick={() => setActiveSeasonTab(s.seasonNumber)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                              activeSeasonTab === s.seasonNumber
                                ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/20"
                                : isLight
                                ? "bg-white text-zinc-800 hover:text-red-600 hover:bg-red-50 border border-zinc-300 shadow-sm"
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
                      ).map((ep, epIdx) => {
                        const isEpTvFocused = tvFocusIndex === epIdx;
                        return (
                          <div
                            id={`episode-card-${epIdx}`}
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
                            className={`group p-4 rounded-xl border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-md ${
                              isEpTvFocused
                                ? "ring-4 ring-red-500 scale-[1.03] shadow-2xl z-20 shadow-red-600/70 border-red-500 bg-red-950/50"
                                : isLight
                                ? "border-zinc-300 bg-white hover:bg-red-50/50 hover:border-red-500 hover:scale-[1.01]"
                                : "border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 hover:scale-[1.01]"
                            }`}
                          >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-lg border flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors ${
                              isLight
                                ? "bg-red-50 border-red-200 text-red-600 group-hover:bg-red-600 group-hover:text-white"
                                : "bg-red-950/80 border-red-600/30 text-red-400 group-hover:bg-red-600 group-hover:text-white"
                            }`}>
                              {ep.number}
                            </div>
                            <div className="min-w-0">
                              <h4 className={`font-bold text-sm truncate ${
                                isLight ? "text-zinc-950 group-hover:text-red-600" : "text-slate-100 group-hover:text-red-400"
                              }`}>
                                {ep.title}
                              </h4>
                              <p className={`text-xs truncate mt-0.5 ${
                                isLight ? "text-zinc-600 font-semibold" : "text-slate-400"
                              }`}>
                                {ep.duration || "45m"} · Full HD
                              </p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-600 group-hover:bg-red-600 group-hover:text-white transition-all shrink-0 ml-2">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  </div>
                )}
              </div>
            ) : (
              <CatalogBrowseView
                title={
                  catalogSearch.trim()
                    ? `Resultados para "${catalogSearch}"`
                    : activeCategory === "movies"
                    ? "Filmes do Catálogo"
                    : activeCategory === "tv"
                    ? "Séries de TV"
                    : activeCategory === "releases"
                    ? "Lançamentos no Cinema e Streaming"
                    : "Novelas Brasileiras & Internacionais"
                }
                badge={
                  catalogSearch.trim()
                    ? "Busca Global"
                    : activeCategory === "movies"
                    ? "17.857 Filmes"
                    : activeCategory === "tv"
                    ? "13.075 Séries"
                    : activeCategory === "releases"
                    ? "1.137 Lançamentos"
                    : "453 Novelas"
                }
                catalogLoading={catalogLoading}
                catalogItems={catalogItems}
                catalogPage={catalogPage}
                catalogTotalPages={catalogTotalPages}
                catalogTotalCount={catalogTotalCount}
                catalogGenre={catalogGenre}
                catalogPlatform={catalogPlatform}
                platformsList={PLATFORMS_LIST}
                onSelectPlatform={(p) => {
                  const nextPlat = (catalogPlatform === p && p !== "") ? "" : p;
                  setCatalogPlatform(nextPlat);
                  setCatalogPage(1);
                  fetchCatalogData(currentCatalogType, 1, catalogSearch, catalogGenre, undefined, nextPlat);
                }}
                tvFocusIndex={tvFocusIndex}
                isTvModeActive={isTvModeActive}
                onToggleTvMode={() => {
                  setIsTvModeActive((prev) => !prev);
                  setTvFocusIndex((prev) => (prev === null ? 0 : null));
                }}
                catalogSearch={catalogSearch}
                jumpPageInput={jumpPageInput}
                genresList={GENRES_LIST}
                isLight={isLight}
                isLiteMode={isLiteMode}
                favoriteCatalogItems={favoriteCatalogItems}
                onToggleFavoriteCatalog={toggleFavoriteCatalog}
                onSelectGenre={(g) => {
                  const newGenre = g === "Todos" ? "" : g;
                  setCatalogGenre(newGenre);
                  setCatalogPage(1);
                  fetchCatalogData(currentCatalogType, 1, catalogSearch, newGenre, undefined, catalogPlatform);
                }}
                onPageChange={(newPage) => {
                  if (newPage < 1 || newPage > catalogTotalPages) return;
                  setCatalogPage(newPage);
                  fetchCatalogData(currentCatalogType, newPage, catalogSearch, catalogGenre, undefined, catalogPlatform);
                }}
                onJumpPageSubmit={(e) => {
                  e.preventDefault();
                  const p = parseInt(jumpPageInput, 10);
                  if (!isNaN(p) && p >= 1 && p <= catalogTotalPages) {
                    setCatalogPage(p);
                    fetchCatalogData(currentCatalogType, p, catalogSearch, catalogGenre, undefined, catalogPlatform);
                  }
                }}
                setJumpPageInput={setJumpPageInput}
                onItemClick={(item) => {
                  if (
                    item.type === "series" ||
                    item.type === "animes" ||
                    item.type === "doramas" ||
                    item.type === "novelas" ||
                    item.type === "desenhos"
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
            )
          ) : activeCategory === "live" ? (
            /* ============================================================== */
            /* SEÇÃO 3: TV AO VIVO (154 CANAIS OFICIAIS)                      */
            /* ============================================================== */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <h3 className={`text-xl font-bold flex items-center gap-2 ${isLight ? "text-zinc-950" : "text-white"}`}>
                  <Radio className="w-6 h-6 text-red-600" />
                  <span>Canais de TV ao Vivo</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    isLight ? "text-red-700 bg-red-100 border border-red-300" : "text-red-400 bg-red-950/60 border border-red-600/30"
                  }`}>
                    {filteredBrazucaChannels.length} canais
                  </span>
                </h3>

                {/* Subfiltros de Canais */}
                <div className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs overflow-x-auto ${
                  isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/90 border-zinc-800"
                }`}>
                  {[
                    { id: "todos", label: `Todos (${BRAZUCA_CHANNELS.length})` },
                    { id: "favoritos", label: `⭐ Favoritos (${favoriteChannels.length})` },
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
                      className={`px-3 py-1.5 rounded-lg transition-colors font-bold shrink-0 cursor-pointer ${
                        channelSubFilter === tab.id
                          ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/20"
                          : isLight
                          ? "text-zinc-950 hover:text-red-600 hover:bg-red-50 bg-zinc-100/80 border border-zinc-200"
                          : "text-slate-300 hover:text-white hover:bg-zinc-900"
                      }`}
                    >
                      <span className={channelSubFilter === tab.id ? "text-white font-black" : isLight ? "text-zinc-950 font-black hover:text-red-600" : "text-slate-300 font-bold"}>
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {filteredBrazucaChannels.length === 0 ? (
                <div className={`p-12 text-center rounded-2xl border ${
                  isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/50 border-zinc-800"
                }`}>
                  <p className={`text-base font-bold ${isLight ? "text-zinc-900" : "text-white"}`}>
                    {channelSubFilter === "favoritos"
                      ? "Nenhum canal favoritado ainda."
                      : "Nenhum canal encontrado."}
                  </p>
                  <p className={`text-xs mt-1 ${isLight ? "text-zinc-600" : "text-zinc-400"}`}>
                    {channelSubFilter === "favoritos"
                      ? "Clique na estrela (⭐) de qualquer canal para salvá-lo nos seus favoritos."
                      : "Tente selecionar outra categoria ou buscar por outro canal."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-12">
                  {filteredBrazucaChannels.map((ch) => {
                    const isFav = favoriteChannels.includes(ch.id);
                    return (
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
                        className={`group p-4 rounded-2xl border cursor-pointer transition-all duration-200 flex flex-col justify-between hover:scale-105 shadow-lg relative ${
                          isLight
                            ? "border-zinc-300 bg-white hover:bg-red-50/40 hover:border-red-500 hover:shadow-red-500/10"
                            : "border-red-600/15 bg-zinc-950/70 hover:bg-zinc-900/80 hover:border-red-500 hover:shadow-red-600/20"
                        }`}
                      >
                        <div className={`aspect-video w-full rounded-xl border flex items-center justify-center p-3 relative overflow-hidden ${
                          isLight ? "bg-zinc-100 border-zinc-200" : "bg-black/60 border-zinc-800 group-hover:border-red-600/40"
                        }`}>
                          {/* Botão de Favoritar Canal */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              toggleFavoriteChannel(ch.id);
                            }}
                            className={`absolute top-2 right-2 z-20 p-2 rounded-full backdrop-blur-md transition-all cursor-pointer pointer-events-auto shadow-md ${
                              isFav
                                ? "bg-amber-500 text-white shadow-amber-500/50 scale-105"
                                : "bg-black/75 hover:bg-black/95 text-zinc-300 hover:text-amber-400 border border-white/10"
                            }`}
                            title={isFav ? "Remover dos Favoritos" : "Favoritar Canal"}
                          >
                            <Star className={`w-4 h-4 ${isFav ? "fill-white text-white" : ""}`} />
                          </button>

                          <img
                            src={ch.logo || "/wmplay_icon.png"}
                            alt={ch.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = "/wmplay_icon.png";
                            }}
                            className="max-h-full max-w-full object-contain filter drop-shadow group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-red-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Play className="w-8 h-8 fill-red-500 text-red-500 filter drop-shadow" />
                          </div>
                        </div>

                        <div className="mt-3">
                          <h4 className={`font-bold text-sm truncate transition-colors ${
                            isLight ? "text-zinc-950 group-hover:text-red-600" : "text-slate-100 group-hover:text-red-400"
                          }`}>
                            {ch.name}
                          </h4>
                          <p className={`text-[11px] truncate mt-0.5 ${
                            isLight ? "text-zinc-600 font-semibold" : "text-slate-400"
                          }`}>
                            {ch.epg || "Transmissão Ao Vivo"}
                          </p>
                        </div>

                        <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[11px] ${
                          isLight ? "border-zinc-200" : "border-zinc-850"
                        }`}>
                          <span className="text-red-600 font-mono uppercase font-black">
                            {ch.category}
                          </span>
                          <span className="text-emerald-700 flex items-center gap-1 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            AO VIVO
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : activeCategory === "music" ? (
            /* ============================================================== */
            /* SEÇÃO 4: CENTRAL DE MÚSICA WMPLAY (YOUTUBE, SPOTIFY, SOUNDCLOUD)*/
            /* ============================================================== */
            <MusicHubView
              externalQuery={musicSearchQuery}
              externalTrigger={musicSearchTrigger}
              onQueryChange={setMusicSearchQuery}
              isLight={isLight}
            />
          ) : activeCategory === "addons" ? (
            /* ============================================================== */
            /* SEÇÃO 5: GERENCIADOR DE COMPLEMENTOS / ADDONS                  */
            /* ============================================================== */
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className={`text-2xl font-bold flex items-center gap-3 ${isLight ? "text-zinc-950" : "text-white"}`}>
                    <Grid className="w-6 h-6 text-red-600" />
                    <span>Navegador de Complementos (Addons)</span>
                  </h2>
                  <p className={`text-xs mt-1 ${isLight ? "text-zinc-600 font-semibold" : "text-slate-400"}`}>
                    Repositórios oficiais, addons de streaming e instalador de ZIP.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className={`flex p-1 rounded-xl border text-xs ${
                    isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/90 border-zinc-800"
                  }`}>
                    {(["all", "installed", "available"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setAddonFilter(filter)}
                        className={`px-3 py-1.5 rounded-lg transition-colors font-bold capitalize cursor-pointer ${
                          addonFilter === filter
                            ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                            : isLight
                            ? "text-zinc-950 hover:text-red-600 hover:bg-red-50"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        <span className={addonFilter === filter ? "text-white font-black" : isLight ? "text-zinc-950 font-black hover:text-red-600" : "text-slate-300 font-bold"}>
                          {filter === "all" ? "Todos" : filter === "installed" ? "Instalados" : "Disponíveis"}
                        </span>
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
                    className={`group relative rounded-2xl overflow-hidden border p-5 flex flex-col justify-between transition-all duration-300 shadow-xl ${
                      isLight
                        ? "border-zinc-300 bg-white hover:border-red-500 hover:shadow-red-500/10"
                        : "border-zinc-800 bg-zinc-950/70 hover:border-red-600/50"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-16 h-16 rounded-xl overflow-hidden border shrink-0 shadow-lg group-hover:scale-105 transition-transform ${
                        isLight ? "border-zinc-200 bg-zinc-100" : "border-zinc-700 bg-black"
                      }`}>
                        <img
                          src={addon.icon}
                          alt={addon.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold text-base truncate transition-colors ${
                            isLight ? "text-zinc-950 group-hover:text-red-600" : "text-white group-hover:text-red-400"
                          }`}>
                            {addon.name}
                          </h3>
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                            isLight ? "text-red-700 bg-red-100 border border-red-300" : "text-red-500 bg-red-950/60 border border-red-800/40"
                          }`}>
                            v{addon.version}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isLight ? "text-zinc-600 font-semibold" : "text-slate-400"}`}>por {addon.author}</p>
                        <p className={`text-xs line-clamp-2 mt-2 leading-relaxed ${isLight ? "text-zinc-700 font-medium" : "text-slate-300"}`}>
                          {addon.description}
                        </p>
                      </div>
                    </div>

                    <div className={`mt-5 pt-3 border-t flex items-center justify-between ${isLight ? "border-zinc-200" : "border-zinc-850"}`}>
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
                              ? isLight
                                ? "bg-zinc-100 hover:bg-red-50 text-zinc-800 hover:text-red-600 border border-zinc-300"
                                : "bg-slate-800 hover:bg-red-950/80 hover:text-red-300 text-slate-300 border border-zinc-700 hover:border-red-500/40"
                              : "bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-600/30"
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
          ) : activeCategory === "cast" ? (
            /* ============================================================== */
            /* SEÇÃO 6: TRANSMITIR DO CELULAR PARA A TV (SEM DELAY E SEM TRAVA) */
            /* ============================================================== */
            <CastConnectView
              isLight={isLight}
              playingMedia={playingMedia}
              favoriteCatalogItems={favoriteCatalogItems}
              catalogItems={catalogItems}
              onPlayMediaOnLocal={(title, synopsis, thumbnail, tmdb_id, link, season, episode) => {
                handlePlayMedia(title, synopsis, thumbnail, tmdb_id ? String(tmdb_id) : undefined, link, season, episode);
              }}
            />
          ) : (
            /* Fallback Mídia Padrão */
            <div className={`text-center py-20 ${isLight ? "text-zinc-600" : "text-slate-400"}`}>
              <p>Selecione uma categoria válida no menu lateral do WMPLAY.</p>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* BARRA DE NAVEGAÇÃO INFERIOR PARA CELULARES (MOBILE BOTTOM NAV) */}
      {/* ============================================================== */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-xl px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-pb transition-colors ${
        isLight ? "bg-white/95 border-zinc-200" : "bg-zinc-950/95 border-zinc-800"
      }`}>
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
                  ? "text-red-600 font-bold scale-105"
                  : isLight
                  ? "text-zinc-700 hover:text-red-600"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`p-1 rounded-lg transition-all ${
                  isActive ? "bg-red-600/20 text-red-600 shadow-sm shadow-red-600/30" : ""
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight font-bold ${
                isActive ? "text-red-600" : isLight ? "text-zinc-800" : "text-slate-400"
              }`}>
                {item.id === "movies"
                  ? "Filmes"
                  : item.id === "tv"
                  ? "Séries"
                  : item.id === "releases"
                  ? "Lançamentos"
                  : item.id === "novelas"
                  ? "Novelas"
                  : item.id === "music"
                  ? "Música"
                  : item.id === "live"
                  ? "Ao Vivo"
                  : item.id === "addons"
                  ? "Add-ons"
                  : item.id === "cast"
                  ? "Transmitir"
                  : item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ============================================================== */}
      {/* HUD FLUTUANTE DE ATALHOS DO CONTROLE PS1                       */}
      {/* ============================================================== */}
      {isTvModeActive && tvFocusIndex !== null && !playingMedia && (
        <Ps1ControllerHud
          mode={selectedSeriesItem ? "episodes" : "catalog"}
          isLight={isLight}
          focusedTitle={
            selectedSeriesItem
              ? seriesSeasons.find((s) => s.seasonNumber === activeSeasonTab)?.episodes[tvFocusIndex]?.title
              : (catalogGenre === "favoritos" ? favoriteCatalogItems : catalogItems)[tvFocusIndex]?.title
          }
          onCross={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true }));
          }}
          onCircle={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
          }}
          onTriangle={() => {
            if (selectedSeriesItem && seriesSeasons.length > 0) {
              setActiveSeasonTab((prev) => (prev >= seriesSeasons.length ? 1 : prev + 1));
            } else {
              setCatalogSearch("");
              const searchInput = document.querySelector('input[placeholder*="Buscar"]') as HTMLInputElement;
              if (searchInput) searchInput.focus();
            }
          }}
          onSquare={() => {
            if (selectedSeriesItem) {
              toggleFavoriteCatalog(selectedSeriesItem);
            } else {
              const items = catalogGenre === "favoritos" ? favoriteCatalogItems : catalogItems;
              if (tvFocusIndex !== null && items[tvFocusIndex]) {
                toggleFavoriteCatalog(items[tvFocusIndex]);
              }
            }
          }}
        />
      )}

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
          isLiteMode={isLiteMode}
          resumeTime={playingMedia.initialResumeTime || 0}
          onProgressUpdate={handleProgressUpdate}
          onNextEpisode={handleNextEpisode}
          hasNextEpisode={hasNextEpisode}
          isTv={playingMedia.isTv}
          seriesSeasons={seriesSeasons}
          currentSeason={playingMedia.seasonNum}
          currentEpisode={playingMedia.epNum}
          onSelectEpisode={handleSelectEpisodeInPlayer}
        />
      )}

      {/* ============================================================== */}
      {/* MODAL DE INSTALAÇÃO VIA ZIP                                    */}
      {/* ============================================================== */}
      {isZipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-150">
          <div className={`w-full max-w-xl border rounded-3xl p-6 shadow-2xl space-y-6 transition-colors ${
            isLight ? "bg-white border-zinc-300" : "bg-zinc-950 border-zinc-700"
          }`}>
            <div className={`flex items-center justify-between border-b pb-4 ${isLight ? "border-zinc-200" : "border-zinc-800"}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/30 flex items-center justify-center text-red-600">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`font-black text-lg ${isLight ? "text-zinc-950" : "text-white"}`}>Instalar a partir de arquivo ZIP</h3>
                  <p className={`text-xs ${isLight ? "text-zinc-600 font-semibold" : "text-zinc-400"}`}>Suporte a pacotes de streaming (.zip) e complementos</p>
                </div>
              </div>
              <button
                onClick={() => setIsZipModalOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isLight ? "hover:bg-zinc-100 text-zinc-600 hover:text-red-600" : "hover:bg-zinc-900 text-slate-400 hover:text-white"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center ${
                isLight
                  ? "border-red-300 bg-red-50/30 hover:bg-red-50/70 hover:border-red-500"
                  : "border-red-600/30 hover:border-red-500 bg-black/40 hover:bg-black/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={handleZipFileUpload}
              />
              <div className="w-14 h-14 rounded-2xl bg-red-600/20 text-red-600 flex items-center justify-center">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className={`text-sm font-bold ${isLight ? "text-zinc-950" : "text-white"}`}>Clique para selecionar o arquivo .ZIP</p>
                <p className={`text-xs mt-1 ${isLight ? "text-zinc-600 font-semibold" : "text-slate-400"}`}>
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
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  isLight
                    ? "bg-zinc-100 hover:bg-red-50 border-zinc-300 text-zinc-800 hover:text-red-600 shadow-sm"
                    : "bg-slate-800 hover:bg-zinc-800 border-transparent text-slate-200"
                }`}
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
  catalogPlatform = "",
  platformsList = [],
  onSelectPlatform,
  tvFocusIndex = null,
  isTvModeActive = false,
  onToggleTvMode,
  catalogSearch,
  jumpPageInput,
  genresList,
  onSelectGenre,
  onPageChange,
  onJumpPageSubmit,
  setJumpPageInput,
  onItemClick,
  isLight = false,
  isLiteMode = false,
  favoriteCatalogItems = [],
  onToggleFavoriteCatalog,
}: {
  title: string;
  badge?: string;
  catalogLoading: boolean;
  catalogItems: CatalogItem[];
  catalogPage: number;
  catalogTotalPages: number;
  catalogTotalCount: number;
  catalogGenre: string;
  catalogPlatform?: string;
  platformsList?: { id: string; name: string; badge?: string }[];
  onSelectPlatform?: (platform: string) => void;
  tvFocusIndex?: number | null;
  isTvModeActive?: boolean;
  onToggleTvMode?: () => void;
  catalogSearch: string;
  jumpPageInput: string;
  genresList: string[];
  onSelectGenre: (genre: string) => void;
  onPageChange: (newPage: number) => void;
  onJumpPageSubmit: (e: React.FormEvent) => void;
  setJumpPageInput: (val: string) => void;
  onItemClick: (item: CatalogItem) => void;
  isLight?: boolean;
  isLiteMode?: boolean;
  favoriteCatalogItems?: CatalogItem[];
  onToggleFavoriteCatalog?: (item: CatalogItem) => void;
}) {
  const isFavoritesTab = catalogGenre === "favoritos";
  const displayedItems = isFavoritesTab
    ? favoriteCatalogItems.filter((it) =>
        catalogSearch.trim() === ""
          ? true
          : it.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
            (it.synopsis && it.synopsis.toLowerCase().includes(catalogSearch.toLowerCase()))
      )
    : catalogItems;

  return (
    <div className="space-y-4 sm:space-y-5 pb-16">
      {/* Cabeçalho da Lista Responsivo */}
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className={`text-xl sm:text-2xl font-black flex items-center gap-2 sm:gap-3 flex-wrap ${
            isLight ? "text-zinc-950" : "text-white"
          }`}>
            <span>{isFavoritesTab ? "⭐ Minha Lista de Favoritos" : title}</span>
            {badge && !isFavoritesTab && (
              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full font-mono ${
                isLight ? "text-amber-800 bg-amber-100 border border-amber-300" : "text-amber-300 bg-amber-950/60 border border-amber-500/40"
              }`}>
                {badge}
              </span>
            )}
            <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full font-mono ${
              isLight ? "text-red-700 bg-red-100 border border-red-300" : "text-red-400 bg-red-950/60 border border-red-600/30"
            }`}>
              {isFavoritesTab
                ? `${displayedItems.length} salvos`
                : `${catalogTotalCount.toLocaleString("pt-BR")} títulos`}
            </span>
            {catalogPlatform && (
              <span className="text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1 shadow-md shadow-red-600/30">
                <Tv2 className="w-3 h-3" />
                {platformsList?.find((p) => p.id === catalogPlatform)?.name || catalogPlatform}
              </span>
            )}
            {isLiteMode && (
              <span className="text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full font-mono text-amber-900 bg-amber-400 border border-amber-500 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-black text-black" />
                Modo TV Lite
              </span>
            )}
          </h3>
          <p className={`text-[11px] sm:text-xs mt-1 ${isLight ? "text-zinc-600 font-semibold" : "text-slate-400"}`}>
            {isFavoritesTab ? (
              <span>Seus filmes e séries favoritos salvos para assistir quando quiser.</span>
            ) : (
              <>
                Pág. <span className={`font-bold ${isLight ? "text-zinc-950" : "text-white"}`}>{catalogPage}</span> de{" "}
                <span className={`font-bold ${isLight ? "text-zinc-950" : "text-white"}`}>{catalogTotalPages}</span> · {isLiteMode ? "24 títulos por pág. (Modo TV Lite)" : "48 títulos por página"}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onToggleTvMode && (
            <button
              onClick={onToggleTvMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                isTvModeActive && tvFocusIndex !== null
                  ? "bg-red-600 border-red-500 text-white shadow-md shadow-red-600/40"
                  : isLight
                  ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950 border-zinc-700 hover:border-red-500 text-slate-200 hover:text-white"
              }`}
              title="Navegue no catálogo usando as setas do controle da Smart TV ou teclado (Enter para assistir)"
            >
              <div className="flex items-center gap-1 shrink-0">
                <Ps1Button type="triangle" size="xs" />
                <Ps1Button type="circle" size="xs" />
                <Ps1Button type="cross" size="xs" />
                <Ps1Button type="square" size="xs" />
              </div>
              <span>{isTvModeActive && tvFocusIndex !== null ? "Controle PS1 Ativo" : "Controle PS1 / TV"}</span>
            </button>
          )}

          {/* Paginação Compacta Superior (oculta na aba favoritos) */}
          {!isFavoritesTab && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onPageChange(catalogPage - 1)}
                disabled={catalogPage <= 1 || catalogLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border disabled:opacity-40 text-xs font-black transition-all cursor-pointer ${
                  isLight
                    ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                    : "bg-zinc-950 border-zinc-700 hover:border-red-500 text-slate-200 hover:text-white"
                }`}
              >
                <ChevronLeft className="w-4 h-4 text-red-600 shrink-0" />
                <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Anterior</span>
              </button>
              <span className="text-xs font-mono font-black text-red-600 px-1 sm:px-2">
                {catalogPage} / {catalogTotalPages}
              </span>
              <button
                onClick={() => onPageChange(catalogPage + 1)}
                disabled={catalogPage >= catalogTotalPages || catalogLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border disabled:opacity-40 text-xs font-black transition-all cursor-pointer ${
                  isLight
                    ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                    : "bg-zinc-950 border-zinc-700 hover:border-red-500 text-slate-200 hover:text-white"
                }`}
              >
                <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Próxima</span>
                <ChevronRight className="w-4 h-4 text-red-600 shrink-0" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Linha 1: Filtro por Plataforma Original (Netflix, HBO Max, Disney+, Prime Video, Apple TV+, Globoplay) */}
      {!isFavoritesTab && platformsList && platformsList.length > 0 && (
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
          <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-wider px-1.5 shrink-0 flex items-center gap-1 ${
            isLight ? "text-zinc-500" : "text-zinc-500"
          }`}>
            <Tv2 className="w-3.5 h-3.5 text-red-500" />
            <span>Plataformas:</span>
          </span>
          {platformsList.map((p) => {
            const isSelected = (!catalogPlatform && p.id === "") || catalogPlatform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPlatform && onSelectPlatform(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30 scale-105 ring-2 ring-red-400"
                    : isLight
                    ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-red-600 hover:border-red-500 hover:bg-red-50 shadow-sm"
                    : "bg-zinc-950/90 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700"
                }`}
              >
                {p.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-black font-mono ${
                    isSelected ? "bg-black/40 text-white" : "bg-red-950/80 text-red-400 border border-red-600/30"
                  }`}>
                    {p.badge}
                  </span>
                )}
                <span>{p.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Chips de Gênero Responsivos com Swipe (Subfiltros de Gênero + Minha Lista) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none -mx-2 px-2 sm:mx-0 sm:px-0">
        {/* Chip ⭐ Minha Lista */}
        <button
          onClick={() => onSelectGenre("favoritos")}
          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            isFavoritesTab
              ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30"
              : isLight
              ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-amber-600 hover:border-amber-500 hover:bg-amber-50 shadow-sm"
              : "bg-zinc-950/90 border border-zinc-800 text-amber-300 hover:text-white hover:border-zinc-700"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${isFavoritesTab ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
          <span>Minha Lista ({favoriteCatalogItems.length})</span>
        </button>

        {genresList.map((g) => {
          const isSelected = !isFavoritesTab && ((g === "Todos" && !catalogGenre) || catalogGenre === g);
          return (
            <button
              key={g}
              onClick={() => onSelectGenre(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-md shadow-red-600/30"
                  : isLight
                  ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-red-600 hover:border-red-500 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950/90 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700"
              }`}
            >
              <span className={isSelected ? "text-white font-black" : isLight ? "text-zinc-950 font-black hover:text-red-600" : "text-slate-300 font-bold"}>
                {g}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grade de Vídeos (2 colunas em celulares, escalonando em telas maiores) */}
      {catalogLoading && !isFavoritesTab ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 text-red-500">
          <Loader2 className="w-10 h-10 animate-spin text-red-500" />
          <p className={`text-xs sm:text-sm font-bold ${isLight ? "text-zinc-700" : "text-slate-300"}`}>Consultando catálogo de 38.600+ títulos...</p>
        </div>
      ) : displayedItems.length === 0 ? (
        <div className={`p-12 text-center rounded-2xl border ${
          isLight ? "bg-white border-zinc-300 shadow-sm" : "bg-zinc-950/50 border-zinc-800"
        }`}>
          <p className={`text-sm sm:text-base font-bold ${isLight ? "text-zinc-900" : "text-slate-300"}`}>
            {isFavoritesTab ? "Sua lista de favoritos está vazia." : "Nenhum título encontrado."}
          </p>
          <p className={`text-xs mt-1 ${isLight ? "text-zinc-600" : "text-slate-400"}`}>
            {isFavoritesTab
              ? "Clique na estrela (⭐) de qualquer filme ou série para adicionar à sua lista."
              : "Tente remover os filtros ou buscar por outro termo."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-4 md:gap-5">
          {displayedItems.map((item, index) => {
            const isFav = favoriteCatalogItems.some((x) => x.id === item.id);
            const isTvFocused = tvFocusIndex === index;
            return (
              <div
                id={`catalog-card-${index}`}
                key={item.id}
                onClick={() => onItemClick(item)}
                className={`group rounded-xl sm:rounded-2xl overflow-hidden border cursor-pointer transition-all duration-300 flex flex-col shadow-xl ${
                  isTvFocused
                    ? "ring-4 ring-red-500 scale-[1.05] shadow-2xl z-20 shadow-red-600/70 brightness-110 -translate-y-1 bg-red-950/40 border-red-500"
                    : isLight
                    ? "border-zinc-200 bg-white hover:scale-[1.02] hover:border-red-500 hover:shadow-red-500/10"
                    : "border-red-600/20 bg-zinc-950/70 hover:scale-[1.02] hover:border-red-500 hover:shadow-red-600/20"
                }`}
              >
                <div className="aspect-[2/3] w-full overflow-hidden relative bg-black">
                  <img
                    src={item.thumbnail || "/wmplay_icon.png"}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />

                  {/* Badges superiores (Ano / Avaliação / Favorito) */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 z-20 flex items-center justify-between pointer-events-none">
                    <div className="flex items-center gap-1">
                      {item.rating ? (
                        <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full flex items-center gap-0.5 border border-amber-500/30">
                          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                          {item.rating}
                        </span>
                      ) : null}
                      {item.year && (
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-200 bg-black/85 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-zinc-700">
                          {item.year.slice(0, 4)}
                        </span>
                      )}
                    </div>

                    {onToggleFavoriteCatalog && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          onToggleFavoriteCatalog(item);
                        }}
                        className={`p-2 -m-1 sm:p-2 sm:-m-0.5 rounded-full backdrop-blur-md transition-all cursor-pointer pointer-events-auto shadow-md ${
                          isFav
                            ? "bg-amber-500 text-white shadow-amber-500/50 scale-105"
                            : "bg-black/75 hover:bg-black/95 text-zinc-300 hover:text-amber-400 border border-white/10"
                        }`}
                        title={isFav ? "Remover dos Favoritos" : "Salvar na Minha Lista"}
                      >
                        <Star className={`w-4 h-4 ${isFav ? "fill-white text-white" : ""}`} />
                      </button>
                    )}
                  </div>

                  {/* Indicador de Foco com Botões Oficiais PS1 */}
                  {isTvFocused && (
                    <div className="absolute bottom-2 left-2 right-2 z-30 bg-zinc-950/95 border border-zinc-700/80 text-white text-[10px] sm:text-[11px] font-black py-1 px-2 rounded-xl text-center shadow-2xl flex items-center justify-center gap-2.5 backdrop-blur-md animate-pulse">
                      <div className="flex items-center gap-1">
                        <Ps1Button type="cross" size="xs" />
                        <span className="text-blue-400 font-bold">Assistir</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Ps1Button type="square" size="xs" />
                        <span className="text-pink-400 font-bold">Favoritar</span>
                      </div>
                    </div>
                  )}

                  {/* Overlay de Ação no Hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2.5 sm:p-3 pointer-events-none">
                    <p className="text-[10px] sm:text-[11px] text-slate-200 line-clamp-3 mb-2 leading-relaxed">
                      {item.synopsis || "Clique para assistir ou ver episódios."}
                    </p>
                    <button className="w-full py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors pointer-events-auto">
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
                    <h4 className={`font-bold text-xs sm:text-sm truncate transition-colors ${
                      isLight ? "text-zinc-950 group-hover:text-red-600" : "text-white group-hover:text-red-400"
                    }`}>
                      {item.title}
                    </h4>
                    <p className={`text-[10px] sm:text-[11px] truncate mt-0.5 ${
                      isLight ? "text-zinc-600 font-semibold" : "text-slate-400"
                    }`}>
                      {item.genres || item.type}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Controles de Paginação Inferior Completa */}
      {!isFavoritesTab && catalogTotalPages > 1 && (
        <div className={`pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLight ? "border-zinc-300" : "border-zinc-850"
        }`}>
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <button
              onClick={() => onPageChange(1)}
              disabled={catalogPage <= 1 || catalogLoading}
              className={`px-3 py-2 rounded-xl border disabled:opacity-30 text-xs font-black transition-all cursor-pointer ${
                isLight
                  ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950 border-zinc-800 hover:border-red-500 text-slate-200 hover:text-white"
              }`}
            >
              <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Primeira</span>
            </button>
            <button
              onClick={() => onPageChange(catalogPage - 1)}
              disabled={catalogPage <= 1 || catalogLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border disabled:opacity-30 text-xs font-black transition-all cursor-pointer ${
                isLight
                  ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950 border-zinc-800 hover:border-red-500 text-slate-200 hover:text-white"
              }`}
            >
              <ChevronLeft className="w-4 h-4 text-red-600" />
              <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Anterior</span>
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
                    className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      catalogPage === pageNum
                        ? "bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-lg shadow-red-600/30"
                        : isLight
                        ? "bg-white border-2 border-zinc-300 text-zinc-950 hover:text-red-600 hover:border-red-500 hover:bg-red-50 shadow-sm"
                        : "bg-zinc-950 border border-zinc-800 text-slate-300 hover:text-white hover:border-zinc-700"
                    }`}
                  >
                    <span className={catalogPage === pageNum ? "text-white font-black" : isLight ? "text-zinc-950 font-black" : "text-slate-300 font-bold"}>
                      {pageNum}
                    </span>
                  </button>
                ))}
            </div>

            <button
              onClick={() => onPageChange(catalogPage + 1)}
              disabled={catalogPage >= catalogTotalPages || catalogLoading}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border disabled:opacity-30 text-xs font-black transition-all cursor-pointer ${
                isLight
                  ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950 border-zinc-800 hover:border-red-500 text-slate-200 hover:text-white"
              }`}
            >
              <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Próxima</span>
              <ChevronRight className="w-4 h-4 text-red-600" />
            </button>
            <button
              onClick={() => onPageChange(catalogTotalPages)}
              disabled={catalogPage >= catalogTotalPages || catalogLoading}
              className={`px-3 py-2 rounded-xl border disabled:opacity-30 text-xs font-black transition-all cursor-pointer ${
                isLight
                  ? "bg-white border-2 border-zinc-300 hover:border-red-500 text-zinc-950 hover:text-red-600 hover:bg-red-50 shadow-sm"
                  : "bg-zinc-950 border-zinc-800 hover:border-red-500 text-slate-200 hover:text-white"
              }`}
            >
              <span className={isLight ? "text-zinc-950 font-black" : "text-slate-200 font-bold"}>Última ({catalogTotalPages})</span>
            </button>
          </div>

          {/* Pular para Página */}
          <form onSubmit={onJumpPageSubmit} className="flex items-center gap-2">
            <span className={`text-xs ${isLight ? "text-zinc-700 font-semibold" : "text-slate-400"}`}>Ir para página:</span>
            <input
              type="number"
              min={1}
              max={catalogTotalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              placeholder={catalogPage.toString()}
              className={`w-16 rounded-xl px-2.5 py-1.5 text-xs text-center font-bold focus:outline-none focus:border-red-500 ${
                isLight
                  ? "bg-white border border-zinc-300 text-zinc-950 shadow-sm"
                  : "bg-zinc-950 border border-zinc-700 text-white"
              }`}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors shadow-sm"
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
  isLight = false,
}: {
  externalQuery?: string;
  externalTrigger?: number;
  onQueryChange?: (val: string) => void;
  isLight?: boolean;
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
      <div className={`relative rounded-2xl overflow-hidden border p-4 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 shadow-2xl backdrop-blur-md transition-colors ${
        isLight ? "bg-white border-zinc-300 shadow-sm" : "border-red-600/30 bg-zinc-950/90"
      }`}>
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-red-600 to-rose-700 border border-red-500/50 shadow-xl flex items-center justify-center text-white shrink-0">
            <Music className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className={`text-xl sm:text-2xl font-black ${isLight ? "text-zinc-950" : "text-white"}`}>Central de Música WMPLAY</h2>
              <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 rounded-full font-mono ${
                isLight ? "text-red-700 bg-red-100 border border-red-300" : "text-red-400 bg-red-950/80 border border-red-600/40"
              }`}>
                UNIVERSAL
              </span>
            </div>
            <p className={`text-[11px] sm:text-xs mt-1 max-w-xl ${isLight ? "text-zinc-700 font-semibold" : "text-slate-300"}`}>
              Pesquise qualquer artista, música ou playlist no YouTube, Spotify e SoundCloud com reprodução instantânea.
            </p>
          </div>
        </div>

        {/* Seletor de Plataforma Musical em Grade para Celular */}
        <div className={`grid grid-cols-3 sm:flex items-center p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border gap-1 w-full sm:w-auto ${
          isLight ? "bg-zinc-100 border-zinc-300 shadow-sm" : "bg-black/60 border-zinc-800"
        }`}>
          <button
            onClick={() => {
              setActivePlatform("youtube");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${
              activePlatform === "youtube"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : isLight
                ? "text-zinc-950 hover:text-red-600 hover:bg-white"
                : "text-slate-300 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current shrink-0" />
            <span className={activePlatform === "youtube" ? "text-white font-black truncate" : isLight ? "text-zinc-950 font-black truncate" : "text-slate-300 font-bold truncate"}>YouTube</span>
          </button>

          <button
            onClick={() => {
              setActivePlatform("spotify");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${
              activePlatform === "spotify"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                : isLight
                ? "text-zinc-950 hover:text-emerald-700 hover:bg-white"
                : "text-slate-300 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Disc3 className="w-3.5 h-3.5 shrink-0" />
            <span className={activePlatform === "spotify" ? "text-white font-black truncate" : isLight ? "text-zinc-950 font-black truncate" : "text-slate-300 font-bold truncate"}>Spotify</span>
          </button>

          <button
            onClick={() => {
              setActivePlatform("soundcloud");
              setSearchError(null);
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold transition-all text-center cursor-pointer ${
              activePlatform === "soundcloud"
                ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30"
                : isLight
                ? "text-zinc-950 hover:text-orange-700 hover:bg-white"
                : "text-slate-300 hover:text-white hover:bg-zinc-900"
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0" />
            <span className={activePlatform === "soundcloud" ? "text-white font-black truncate" : isLight ? "text-zinc-950 font-black truncate" : "text-slate-300 font-bold truncate"}>SoundCloud</span>
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
              className={`w-full border rounded-xl pl-11 pr-12 py-3 sm:py-3.5 text-base sm:text-base font-bold focus:outline-none transition-all ${
                isLight
                  ? "bg-white border-zinc-300 text-zinc-950 placeholder:text-zinc-500 shadow-sm"
                  : "bg-zinc-950/95 border-zinc-800 text-white placeholder-slate-400 shadow-inner"
              } ${
                activePlatform === "youtube"
                  ? "focus:border-red-600 focus:ring-1 focus:ring-red-500"
                  : activePlatform === "spotify"
                  ? "focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500"
                  : "focus:border-orange-600 focus:ring-1 focus:ring-orange-500"
              }`}
            />
            {platformQuery && (
              <button
                type="button"
                onClick={handleClearSearch}
                className={`absolute right-4 top-1/2 -translate-y-1/2 ${
                  isLight ? "text-zinc-500 hover:text-zinc-950" : "text-slate-400 hover:text-white"
                }`}
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
