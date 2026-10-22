export interface Addon {
  id: string;
  name: string;
  author: string;
  version: string;
  icon: string;
  fanart?: string;
  category: "video" | "iptv" | "subtitles" | "audio";
  description: string;
  installed: boolean;
  type: "builtin" | "custom_url" | "repository";
  streamUrl?: string;
  repoUrl?: string;
}

export const INITIAL_ADDONS: Addon[] = [
  {
    id: "addon-brazuca-play",
    name: "Brazuca Play (Repositório Oficial)",
    author: "Brazuca Play Community",
    version: "2.1.4",
    icon: "/wmplay_icon.png",
    category: "video",
    description: "Versão oficial do repositório Brazuca Play v2.1.4 com grade completa de 154 canais de TV ao vivo, logos originais, filmes, séries dubladas, desenhos e animes.",
    installed: true,
    type: "repository",
    repoUrl: "https://skyrisk.github.io/brazucaplay",
  },
  {
    id: "addon-f4m-tester",
    name: "F4MTester",
    author: "Shani",
    version: "2.7.1",
    icon: "/wmplay_icon.png",
    category: "video",
    description: "Plugin F4M oficial do repositório Brazuca Play para decodificação e streaming de transmissões ao vivo em alta performance.",
    installed: true,
    type: "builtin",
  },
  {
    id: "addon-f4m-proxy",
    name: "F4MProxy",
    author: "Shani",
    version: "2.8.7",
    icon: "/wmplay_icon.png",
    category: "video",
    description: "Script F4MProxy para roteamento de mídia HLS e F4M do repositório Brazuca Play.",
    installed: true,
    type: "builtin",
  },
  {
    id: "addon-youtube",
    name: "YouTube Web Integration",
    author: "Google / Web Player",
    version: "1.4.2",
    icon: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=200&auto=format&fit=crop&q=80",
    category: "video",
    description: "Acesse trailers oficiais, canais de streaming e vídeos públicos diretamente no player.",
    installed: true,
    type: "builtin",
  },
  {
    id: "addon-m3u-loader",
    name: "Carregador de Lista M3U / M3U8",
    author: "Kodi Web Core",
    version: "1.0.0",
    icon: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80",
    category: "iptv",
    description: "Importe suas próprias listas personalizadas M3U / M3U8 com canais e categorias de vídeo.",
    installed: true,
    type: "builtin",
  }
];
