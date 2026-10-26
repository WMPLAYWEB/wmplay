export interface BrazucaEpisode {
  id: string;
  number: number;
  title: string;
  duration: string;
  overview: string;
  streamUrl: string;
}

export interface BrazucaChannel {
  id: string;
  name: string;
  logo: string;
  category: "aberta" | "esportes" | "filmes_series" | "infantil" | "noticias_docs" | "variedades";
  epg?: string;
  streamUrl: string;
}

export interface BrazucaMedia {
  id: string;
  title: string;
  year?: string;
  genre: string;
  rating?: number;
  overview: string;
  poster: string;
  backdrop: string;
  streamUrl: string;
  category: "filmes" | "series" | "novelas" | "animes" | "kids";
  episodesCount?: number;
  episodes?: BrazucaEpisode[];
}

export interface BrazucaCategoryNode {
  id: string;
  title: string;
  badge?: string;
  description: string;
  banner: string;
  type: "channels" | "movies" | "lancamentos" | "series" | "novelas" | "animes" | "kids" | "doramas" | "settings";
}

export const BRAZUCA_ROOT_CATEGORIES: BrazucaCategoryNode[] = [
  {
    id: "cat_canais",
    title: "CANAIS DE TV AO VIVO",
    badge: "156 Canais HD",
    description: "TV Aberta, Esportes HD, Filmes, Séries, Desenhos e Variedades com logos oficiais.",
    banner: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&auto=format&fit=crop&q=80",
    type: "channels",
  },
  {
    id: "cat_filmes",
    title: "FILMES (TODOS OS GÊNEROS)",
    badge: "17.857 Filmes",
    description: "Catálogo completo com mais de 17.800 filmes em HD/4K, organizados por gênero e ano.",
    banner: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1200&auto=format&fit=crop&q=80",
    type: "movies",
  },
  {
    id: "cat_lancamentos",
    title: "LANÇAMENTOS RECENTES",
    badge: "1.137 Lançamentos",
    description: "Os filmes mais recentes do cinema e streaming adicionados ao catálogo.",
    banner: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80",
    type: "lancamentos",
  },
  {
    id: "cat_series",
    title: "SÉRIES DE TV",
    badge: "13.075 Séries",
    description: "Mais de 13 mil séries completas com temporadas e episódios sincronizados.",
    banner: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1200&auto=format&fit=crop&q=80",
    type: "series",
  },
  {
    id: "cat_animes",
    title: "ANIMES & MANGÁS",
    badge: "2.777 Animes",
    description: "Catálogo completo de animes clássicos e sazonais dublados e legendados.",
    banner: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80",
    type: "animes",
  },
  {
    id: "cat_doramas",
    title: "DORAMAS & ASIÁTICOS",
    badge: "3.013 Doramas",
    description: "K-Dramas, C-Dramas e J-Dramas dublados e legendados com todas as temporadas.",
    banner: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80",
    type: "doramas",
  },
  {
    id: "cat_kids",
    title: "DESENHOS & INFANTIL",
    badge: "804 Desenhos",
    description: "Animações clássicas e contemporâneas para todas as idades.",
    banner: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80",
    type: "kids",
  },
  {
    id: "cat_novelas",
    title: "NOVELAS BRASILEIRAS",
    badge: "Capítulos Completos",
    description: "Novelas completas clássicas da TV aberta com todos os capítulos.",
    banner: "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=1200&auto=format&fit=crop&q=80",
    type: "novelas",
  },
  {
    id: "cat_config",
    title: "CONFIGURAÇÕES DO ADD-ON",
    badge: "v2.1.4",
    description: "Servidores de EPG, fontes alternativas de stream, F4MTester e ajustes do addon.",
    banner: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80",
    type: "settings",
  },
];

export const BRAZUCA_CHANNELS: BrazucaChannel[] = [
{
    "id": "ch_1hd",
    "name": "Canal 1 HD",
    "logo": "/logos/1hd.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal 1 HD Ao Vivo",
    "streamUrl": "https://cdn.jmvstream.com/w/LVW-8155/ngrp:LVW8155_41E1ciuCvO_all/playlist.m3u8"
  },
  {
    "id": "ch_24hrs",
    "name": "Canal 24 Horas",
    "logo": "/logos/24hrs.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal 24 Horas Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
  },
  {
    "id": "ch_acriticaplay",
    "name": "A Crítica Play",
    "logo": "/logos/acriticaplay.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação A Crítica Play Ao Vivo",
    "streamUrl": "https://cdn.jmvstream.com/w/LVW-9715/LVW9715_12B26T62tm/playlist.m3u8"
  },
  {
    "id": "ch_ae",
    "name": "A&E HD",
    "logo": "/logos/ae.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação A&E HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AeE/index.m3u8"
  },
  {
    "id": "ch_afazenda",
    "name": "A Fazenda 24h Ao Vivo",
    "logo": "/logos/afazenda.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação A Fazenda 24h Ao Vivo Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-655e5bc94261ca000810cb17.m3u8"
  },
  {
    "id": "ch_allsports",
    "name": "All Sports HD",
    "logo": "/logos/allsports.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação All Sports HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-61b790b985706b00072cb797.m3u8"
  },
  {
    "id": "ch_amc",
    "name": "AMC HD",
    "logo": "/logos/amc.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação AMC HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/AMCHD/index.m3u8"
  },
  {
    "id": "ch_animal_planet",
    "name": "Animal Planet HD",
    "logo": "/logos/animal_planet.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Animal Planet HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/ANIMAL_PLANET/index.m3u8"
  },
  {
    "id": "ch_arte1",
    "name": "Arte 1 HD",
    "logo": "/logos/arte1.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Arte 1 HD Ao Vivo",
    "streamUrl": "http://168.197.104.22/ARTE1/index.m3u8"
  },
  {
    "id": "ch_axn",
    "name": "AXN HD",
    "logo": "/logos/axn.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação AXN HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AXN/index.m3u8"
  },
  {
    "id": "ch_babytv",
    "name": "Baby TV",
    "logo": "/logos/babytv.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Baby TV Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6759eeb1bd523200083b4f29.m3u8"
  },
  {
    "id": "ch_band",
    "name": "Rede Bandeirantes (Band) HD",
    "logo": "/logos/band.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Rede Bandeirantes (Band) HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/BAND_SPORTS/index.m3u8"
  },
  {
    "id": "ch_bandsports",
    "name": "BandSports HD",
    "logo": "/logos/bandsports.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação BandSports HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/BAND_SPORTS/index.m3u8"
  },
  {
    "id": "ch_band_news",
    "name": "BandNews TV HD",
    "logo": "/logos/band_news.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação BandNews TV HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/BAND_NEWS/index.m3u8"
  },
  {
    "id": "ch_bbb",
    "name": "Big Brother Brasil (BBB) Ao Vivo",
    "logo": "/logos/bbb.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Big Brother Brasil (BBB) Ao Vivo Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-655e5bc94261ca000810cb17.m3u8"
  },
  {
    "id": "ch_bhnews_tv",
    "name": "BH News TV",
    "logo": "/logos/bhnews_tv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação BH News TV Ao Vivo",
    "streamUrl": "http://45.162.64.114/AGRO_CANAL/index.m3u8"
  },
  {
    "id": "ch_bis",
    "name": "Canal Bis HD",
    "logo": "/logos/bis.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal Bis HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/AGROMAIS/index.m3u8"
  },
  {
    "id": "ch_boomerang",
    "name": "Boomerang HD",
    "logo": "/logos/boomerang.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Boomerang HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/BOXKIDSHD/index.m3u8"
  },
  {
    "id": "ch_canalbrasil",
    "name": "Canal Brasil HD",
    "logo": "/logos/canalbrasil.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal Brasil HD Ao Vivo",
    "streamUrl": "https://amazonsat.brasilstream.com.br/hls/amazonsat/index.m3u8"
  },
  {
    "id": "ch_canalfutura",
    "name": "Futura HD",
    "logo": "/logos/canalfutura.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Futura HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/AMCHD/index.m3u8"
  },
  {
    "id": "ch_canalrural",
    "name": "Canal Rural",
    "logo": "/logos/canalrural.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal Rural Ao Vivo",
    "streamUrl": "https://janya-digimix.akamaized.net/vglive-sk-382409/portuese/ngrp:angelportuguese_all/playlist.m3u8"
  },
  {
    "id": "ch_cartoon_network",
    "name": "Cartoon Network HD",
    "logo": "/logos/cartoon_network.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Cartoon Network HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/CARTOON_NETWORK/index.m3u8"
  },
  {
    "id": "ch_casadopatrao",
    "name": "Casa do Patrão",
    "logo": "/logos/casadopatrao.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Casa do Patrão Ao Vivo",
    "streamUrl": "https://video05.logicahost.com.br/ararunatv/ararunatv/playlist.m3u8"
  },
  {
    "id": "ch_cinemax",
    "name": "Cinemax HD",
    "logo": "/logos/cinemax.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Cinemax HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AeE/index.m3u8"
  },
  {
    "id": "ch_cinesky",
    "name": "Cine Sky HD",
    "logo": "/logos/cinesky.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Cine Sky HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/AMCHD/index.m3u8"
  },
  {
    "id": "ch_cnn_brasil",
    "name": "CNN Brasil HD",
    "logo": "/logos/cnn_brasil.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação CNN Brasil HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/CNN_BRASIL/index.m3u8"
  },
  {
    "id": "ch_combate",
    "name": "Canal Combate HD",
    "logo": "/logos/combate.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Canal Combate HD Ao Vivo",
    "streamUrl": "http://181.78.197.59:8000/play/a07z/index.m3u8"
  },
  {
    "id": "ch_comedy_central",
    "name": "Comedy Central HD",
    "logo": "/logos/comedy_central.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Comedy Central HD Ao Vivo",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-9359/LVW9359_XSyReL0QVf/playlist.m3u8"
  },
  {
    "id": "ch_conmebol",
    "name": "CONMEBOL TV HD",
    "logo": "/logos/conmebol.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação CONMEBOL TV HD Ao Vivo",
    "streamUrl": "https://ogc-nsprt-tcl-roku-syndication.otteravision.com/ogc/nsprt/nsprt.m3u8"
  },
  {
    "id": "ch_discovery_channel",
    "name": "Discovery Channel HD",
    "logo": "/logos/discovery_channel.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery Channel HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/DISCOVERY_CHANNEL/index.m3u8"
  },
  {
    "id": "ch_discovery_civilization",
    "name": "Discovery Civilization",
    "logo": "/logos/discovery_civilization.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery Civilization Ao Vivo",
    "streamUrl": "http://79.127.238.228:14093"
  },
  {
    "id": "ch_discovery_home_health",
    "name": "Discovery Home & Health HD",
    "logo": "/logos/discovery_home_health.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Discovery Home & Health HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/DISCOVERY_HOME_HEALTH/index.m3u8"
  },
  {
    "id": "ch_discovery_investigation",
    "name": "Investigation Discovery (ID) HD",
    "logo": "/logos/discovery_investigation.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Investigation Discovery (ID) HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6759eeb1bd523200083b4f29.m3u8"
  },
  {
    "id": "ch_discovery_kids",
    "name": "Discovery Kids HD",
    "logo": "/logos/discovery_kids.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Discovery Kids HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/DISCOVERYKIDS/index.m3u8"
  },
  {
    "id": "ch_discovery_science",
    "name": "Discovery Science",
    "logo": "/logos/discovery_science.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery Science Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/DISCOVERYSCIENCEHD/index.m3u8"
  },
  {
    "id": "ch_discovery_theater",
    "name": "Discovery Theater HD",
    "logo": "/logos/discovery_theater.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery Theater HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/DISCOVERYTHEATERHD/index.m3u8"
  },
  {
    "id": "ch_discovery_turbo",
    "name": "Discovery Turbo HD",
    "logo": "/logos/discovery_turbo.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery Turbo HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/DISCOVERY_TURBO/index.m3u8"
  },
  {
    "id": "ch_discovery_world",
    "name": "Discovery World HD",
    "logo": "/logos/discovery_world.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Discovery World HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/DISCOVERY_WORLD/index.m3u8"
  },
  {
    "id": "ch_disney_channel",
    "name": "Disney Channel HD",
    "logo": "/logos/disney_channel.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Disney Channel HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6824ce95f09106f4b18f4114.m3u8"
  },
  {
    "id": "ch_disney_junior",
    "name": "Disney Junior",
    "logo": "/logos/disney_junior.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Disney Junior Ao Vivo",
    "streamUrl": "https://stmv2.srvif.com/nicktoons/nicktoons/playlist.m3u8"
  },
  {
    "id": "ch_disney_xd",
    "name": "Disney XD",
    "logo": "/logos/disney_xd.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Disney XD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6824ce10c5d53e1351ceb8d1.m3u8"
  },
  {
    "id": "ch_djing",
    "name": "Djing TV",
    "logo": "/logos/djing.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Djing TV Ao Vivo",
    "streamUrl": "https://awtv.nuvemplay.live/hls/stream.m3u8"
  },
  {
    "id": "ch_e!",
    "name": "E! Entertainment HD",
    "logo": "/logos/e!.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação E! Entertainment HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AXN/index.m3u8"
  },
  {
    "id": "ch_ei1",
    "name": "Esporte Interativo 1",
    "logo": "/logos/ei1.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Esporte Interativo 1 Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f32d2db0af67400077f29c4.m3u8"
  },
  {
    "id": "ch_ei2",
    "name": "Esporte Interativo 2",
    "logo": "/logos/ei2.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Esporte Interativo 2 Ao Vivo",
    "streamUrl": "http://195.178.110.110/sportv2/index.m3u8"
  },
  {
    "id": "ch_eimaxx",
    "name": "EI Maxx HD",
    "logo": "/logos/eimaxx.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação EI Maxx HD Ao Vivo",
    "streamUrl": "http://195.178.110.110/sportv3/index.m3u8"
  },
  {
    "id": "ch_eimaxx2",
    "name": "EI Maxx 2 HD",
    "logo": "/logos/eimaxx2.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação EI Maxx 2 HD Ao Vivo",
    "streamUrl": "http://195.178.110.110/sportv/index.m3u8"
  },
  {
    "id": "ch_espn",
    "name": "ESPN HD",
    "logo": "/logos/espn.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação ESPN Brasil HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/ESPN/index.m3u8"
  },
  {
    "id": "ch_espn_brasil",
    "name": "ESPN 2 HD",
    "logo": "/logos/espn_brasil.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação ESPN 2 HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/ESPN_BRASIL/index.m3u8"
  },
  {
    "id": "ch_espn_extra",
    "name": "ESPN Extra HD",
    "logo": "/logos/espn_extra.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação ESPN Extra HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/ESPN_EXTRA/index.m3u8"
  },
  {
    "id": "ch_espn_plus",
    "name": "ESPN Plus HD",
    "logo": "/logos/espn_plus.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação ESPN Plus HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/ESPN4HD/index.m3u8"
  },
  {
    "id": "ch_fishtv",
    "name": "Fish TV HD",
    "logo": "/logos/fishtv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Fish TV HD Ao Vivo",
    "streamUrl": "https://video09.logicahost.com.br/bemmaistv01/bemmaistv01/playlist.m3u8"
  },
  {
    "id": "ch_food_network",
    "name": "Food Network HD",
    "logo": "/logos/food_network.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Food Network HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5ff768b6a4c8b80008498610.m3u8"
  },
  {
    "id": "ch_foxsports",
    "name": "Fox Sports 1 HD",
    "logo": "/logos/foxsports.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Fox Sports 1 HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-61b790b985706b00072cb797.m3u8"
  },
  {
    "id": "ch_foxsports2",
    "name": "Fox Sports 2 HD",
    "logo": "/logos/foxsports2.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Fox Sports 2 HD Ao Vivo",
    "streamUrl": "http://181.78.197.59:8000/play/a07n/index.m3u8"
  },
  {
    "id": "ch_foxsports_full",
    "name": "Fox Sports Premium",
    "logo": "/logos/foxsports_full.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Fox Sports Premium Ao Vivo",
    "streamUrl": "http://181.78.197.59:8000/play/a07z/index.m3u8"
  },
  {
    "id": "ch_fox_premium",
    "name": "Fox Premium 1 HD",
    "logo": "/logos/fox_premium.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Fox Premium 1 HD Ao Vivo",
    "streamUrl": "https://stmv1.transmissaodigital.com/blitstv/blitstv/playlist.m3u8"
  },
  {
    "id": "ch_fx",
    "name": "FX HD",
    "logo": "/logos/fx.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação FX HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AXN/index.m3u8"
  },
  {
    "id": "ch_globo",
    "name": "Rede Globo HD",
    "logo": "/logos/globo.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Rede Globo HD Ao Vivo",
    "streamUrl": "/api/proxy-stream?url=http%3A%2F%2Fhls1.sua.tv%2Flive%2Fglobotvbahiafhdbr2%2Fs.m3u8"
  },
  {
    "id": "ch_globonews",
    "name": "GloboNews HD",
    "logo": "/logos/globonews.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação GloboNews HD Ao Vivo",
    "streamUrl": "/api/proxy-stream?url=http%3A%2F%2F79.127.238.228%3A14093"
  },
  {
    "id": "ch_gloob",
    "name": "Gloob HD",
    "logo": "/logos/gloob.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Gloob HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-60f5fabf0721880007cd50e3.m3u8"
  },
  {
    "id": "ch_gloobinho",
    "name": "Gloobinho",
    "logo": "/logos/gloobinho.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Gloobinho Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-645951c0e94c38000802d2cb.m3u8"
  },
  {
    "id": "ch_gnt",
    "name": "GNT HD",
    "logo": "/logos/gnt.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação GNT HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-666c9c60a7efd40008f552f0.m3u8"
  },
  {
    "id": "ch_gospelmusic_tv",
    "name": "Gospel Music TV",
    "logo": "/logos/gospelmusic_tv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Gospel Music TV Ao Vivo",
    "streamUrl": "https://cdn.jmvstream.com/w/LVW-9375/LVW9375_6i0wPBCHYc/playlist.m3u8"
  },
  {
    "id": "ch_h2",
    "name": "History 2 (H2) HD",
    "logo": "/logos/h2.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação History 2 (H2) HD Ao Vivo",
    "streamUrl": "https://video01.logicahost.com.br/tvideonews/tvideonews/playlist.m3u8"
  },
  {
    "id": "ch_hbo",
    "name": "HBO HD",
    "logo": "/logos/hbo.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f12111c9e6c2c00078ef3bb.m3u8"
  },
  {
    "id": "ch_hbo2",
    "name": "HBO 2 HD",
    "logo": "/logos/hbo2.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO 2 HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f171d3442a0500007362f22.m3u8"
  },
  {
    "id": "ch_hbo_family",
    "name": "HBO Family HD",
    "logo": "/logos/hbo_family.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Family HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-620fdc7d8a36fc000710e3ba.m3u8"
  },
  {
    "id": "ch_hbo_max",
    "name": "HBO Max Live",
    "logo": "/logos/hbo_max.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Max Live Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-61099df8cee03b00074b2ecf.m3u8"
  },
  {
    "id": "ch_hbo_mundi",
    "name": "HBO Mundi HD",
    "logo": "/logos/hbo_mundi.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Mundi HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5fa1612a669ba0000702017b.m3u8"
  },
  {
    "id": "ch_hbo_plus",
    "name": "HBO Plus HD",
    "logo": "/logos/hbo_plus.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Plus HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f12101f0b12f00007844c7c.m3u8"
  },
  {
    "id": "ch_hbo_plus_e",
    "name": "HBO Plus Extra",
    "logo": "/logos/hbo_plus_e.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Plus Extra Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-62545ed3dab4380007582f7c.m3u8"
  },
  {
    "id": "ch_hbo_pop",
    "name": "HBO Pop HD",
    "logo": "/logos/hbo_pop.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Pop HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6479ff764f5ba5000878dfe2.m3u8"
  },
  {
    "id": "ch_hbo_signature",
    "name": "HBO Signature HD",
    "logo": "/logos/hbo_signature.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Signature HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f1210d14ae1f80007bafb1d.m3u8"
  },
  {
    "id": "ch_hbo_xtreme",
    "name": "HBO Xtreme HD",
    "logo": "/logos/hbo_xtreme.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação HBO Xtreme HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f171f032cd22e0007f17f3d.m3u8"
  },
  {
    "id": "ch_heartv",
    "name": "Hear TV HD",
    "logo": "/logos/heartv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Hear TV HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-62545c0b002f4b0007688b61.m3u8"
  },
  {
    "id": "ch_hgtv",
    "name": "HGTV Home & Garden HD",
    "logo": "/logos/hgtv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação HGTV Home & Garden HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/BOXKIDSHD/index.m3u8"
  },
  {
    "id": "ch_history",
    "name": "History Channel HD",
    "logo": "/logos/history.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação History Channel HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/HISTORY/index.m3u8"
  },
  {
    "id": "ch_hittv",
    "name": "Hit TV",
    "logo": "/logos/hittv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Hit TV Ao Vivo",
    "streamUrl": "https://cdn.jmvstream.com/w/LVW-8503/LVW8503_d0V5oduFlK/playlist.m3u8"
  },
  {
    "id": "ch_lifetime",
    "name": "Lifetime HD",
    "logo": "/logos/lifetime.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Lifetime HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/CANAL_DO_BOI/index.m3u8"
  },
  {
    "id": "ch_loading",
    "name": "Loading TV",
    "logo": "/logos/loading.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Loading TV Ao Vivo",
    "streamUrl": "http://45.162.64.114/CANAL_EDUCACAO/index.m3u8"
  },
  {
    "id": "ch_megapix",
    "name": "Megapix HD",
    "logo": "/logos/megapix.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Megapix HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5fa991b1f09e020007e78626.m3u8"
  },
  {
    "id": "ch_mimusica",
    "name": "Mi Música TV",
    "logo": "/logos/mimusica.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Mi Música TV Ao Vivo",
    "streamUrl": "https://v-us-01.wisestream.io/memfs/e4ade538-7924-4359-81ef-b9d4dd229e91.m3u8"
  },
  {
    "id": "ch_mixtv",
    "name": "Mix TV",
    "logo": "/logos/mixtv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Mix TV Ao Vivo",
    "streamUrl": "http://45.162.64.114/FUTURA/index.m3u8"
  },
  {
    "id": "ch_modo_viagem",
    "name": "Modo Viagem HD",
    "logo": "/logos/modo_viagem.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Modo Viagem HD Ao Vivo",
    "streamUrl": "https://stmv5.samcast.com.br/claudio8701/claudio8701/playlist.m3u8"
  },
  {
    "id": "ch_mtv",
    "name": "MTV Brasil HD",
    "logo": "/logos/mtv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação MTV Brasil HD Ao Vivo",
    "streamUrl": "http://play.canalsete.com.br:1935/canalsete/xpl-c7_source/playlist.m3u8"
  },
  {
    "id": "ch_multishow",
    "name": "Multishow HD",
    "logo": "/logos/multishow.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Multishow HD Ao Vivo",
    "streamUrl": "https://video24.mais.uol.com.br/live/6146.m3u8"
  },
  {
    "id": "ch_muztv",
    "name": "Muz TV",
    "logo": "/logos/muztv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Muz TV Ao Vivo",
    "streamUrl": "https://5b33b873179a2.streamlock.net:1443/catve2/catve2/playlist.m3u8"
  },
  {
    "id": "ch_natgeo",
    "name": "National Geographic HD",
    "logo": "/logos/natgeo.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação National Geographic HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/AGROMAIS/index.m3u8"
  },
  {
    "id": "ch_natgeo_kids",
    "name": "Nat Geo Kids",
    "logo": "/logos/natgeo_kids.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Nat Geo Kids Ao Vivo",
    "streamUrl": "https://x1colegal.com/hls/stream.m3u8"
  },
  {
    "id": "ch_natgeo_wild",
    "name": "Nat Geo Wild HD",
    "logo": "/logos/natgeo_wild.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação Nat Geo Wild HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-666c9c60a7efd40008f552f0.m3u8"
  },
  {
    "id": "ch_nick",
    "name": "Nickelodeon HD",
    "logo": "/logos/nick.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Nickelodeon HD Ao Vivo",
    "streamUrl": "https://stmv2.srvif.com/nicktoons/nicktoons/playlist.m3u8"
  },
  {
    "id": "ch_nick_jr",
    "name": "Nick Jr. HD",
    "logo": "/logos/nick_jr.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Nick Jr. HD Ao Vivo",
    "streamUrl": "https://stmv2.srvif.com/nicktoons/nicktoons/playlist.m3u8"
  },
  {
    "id": "ch_nosso_futebol",
    "name": "Nosso Futebol HD",
    "logo": "/logos/nosso_futebol.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Nosso Futebol HD Ao Vivo",
    "streamUrl": "https://ogc-nsprt-tcl-roku-syndication.otteravision.com/ogc/nsprt/nsprt.m3u8"
  },
  {
    "id": "ch_nsports",
    "name": "NSports Ao Vivo",
    "logo": "/logos/nsports.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação NSports Ao Vivo Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f32d2db0af67400077f29c4.m3u8"
  },
  {
    "id": "ch_off",
    "name": "Canal Off HD",
    "logo": "/logos/off.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal Off HD Ao Vivo",
    "streamUrl": "https://5b33b873179a2.streamlock.net:1443/radiocamera/livestream/playlist.m3u8"
  },
  {
    "id": "ch_paramount_network",
    "name": "Paramount Network HD",
    "logo": "/logos/paramount_network.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Paramount Network HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f171f988ab9780007fa95ea.m3u8"
  },
  {
    "id": "ch_paramount_plus",
    "name": "Paramount+ Live",
    "logo": "/logos/paramount_plus.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Paramount+ Live Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f120e94a5714d00074576a1.m3u8"
  },
  {
    "id": "ch_playboytv",
    "name": "Playboy TV",
    "logo": "/logos/playboytv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Playboy TV Ao Vivo",
    "streamUrl": "https://5b33b873179a2.streamlock.net:1443/mastertv/livestream/playlist.m3u8"
  },
  {
    "id": "ch_playtv",
    "name": "PlayTV",
    "logo": "/logos/playtv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação PlayTV Ao Vivo",
    "streamUrl": "http://45.162.64.114/PLAY_TV/index.m3u8"
  },
  {
    "id": "ch_premiere",
    "name": "Premiere Clubes HD",
    "logo": "/logos/premiere.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação Premiere Clubes HD Ao Vivo",
    "streamUrl": "http://195.178.110.110/sportv2/index.m3u8"
  },
  {
    "id": "ch_prime_video",
    "name": "Prime Video Live",
    "logo": "/logos/prime_video.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Prime Video Live Ao Vivo",
    "streamUrl": "http://168.197.104.22/CHEF_TV/index.m3u8"
  },
  {
    "id": "ch_radiomontecarlo",
    "name": "Rádio Monte Carlo TV",
    "logo": "/logos/radiomontecarlo.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Rádio Monte Carlo TV Ao Vivo",
    "streamUrl": "https://5c483b9d1019c.streamlock.net/8054/8054/playlist.m3u8"
  },
  {
    "id": "ch_rbstv",
    "name": "RBS TV HD",
    "logo": "/logos/rbstv.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação RBS TV HD Ao Vivo",
    "streamUrl": "https://janya-digimix.akamaized.net/vglive-sk-382409/portuese/ngrp:angelportuguese_all/playlist.m3u8"
  },
  {
    "id": "ch_record",
    "name": "Record TV HD",
    "logo": "/logos/record.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Record TV HD Ao Vivo",
    "streamUrl": "https://cdn.jmvstream.com/w/LVW-10842/LVW10842_513N26MDBL/chunklist.m3u8"
  },
  {
    "id": "ch_record_news",
    "name": "Record News HD",
    "logo": "/logos/record_news.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Record News HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
  },
  {
    "id": "ch_redebrasil",
    "name": "Rede Brasil HD",
    "logo": "/logos/redebrasil.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Rede Brasil HD Ao Vivo",
    "streamUrl": "https://awtv.nuvemplay.live/hls/stream.m3u8"
  },
  {
    "id": "ch_redetv",
    "name": "RedeTV! HD",
    "logo": "/logos/redetv.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação RedeTV! HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/REDE_TV/index.m3u8"
  },
  {
    "id": "ch_rede_vida",
    "name": "Rede Vida HD",
    "logo": "/logos/rede_vida.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação Rede Vida HD Ao Vivo",
    "streamUrl": "https://644398c.ha.azioncdn.net/primary/tvuniversal_480p.sdp/playlist.m3u8"
  },
  {
    "id": "ch_retro_cartoon",
    "name": "Boomerang / Clássicos Cartoon",
    "logo": "/logos/retro_cartoon.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Retro Cartoon Clássicos Ao Vivo",
    "streamUrl": "http://168.197.104.22/BOOMERANG/index.m3u8"
  },
  {
    "id": "ch_sbt",
    "name": "SBT HD",
    "logo": "/logos/sbt.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação SBT HD Ao Vivo",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/playlist.m3u8"
  },
  {
    "id": "ch_sextreme",
    "name": "Sextreme TV",
    "logo": "/logos/sextreme.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Sextreme TV Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f12111c9e6c2c00078ef3bb.m3u8"
  },
  {
    "id": "ch_sexyhot",
    "name": "Sexy Hot HD",
    "logo": "/logos/sexyhot.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Sexy Hot HD Ao Vivo",
    "streamUrl": "https://stmv1.srvif.com/classique/classique/playlist.m3u8"
  },
  {
    "id": "ch_slam",
    "name": "Slam TV",
    "logo": "/logos/slam.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Slam TV Ao Vivo",
    "streamUrl": "https://dfr80qz435crc.cloudfront.net/EFGH/Amagi/NewCo/New_Brasil_BR/New_Brasil.m3u8"
  },
  {
    "id": "ch_sony",
    "name": "Sony Channel HD",
    "logo": "/logos/sony.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Sony Channel HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/SONYHD/index.m3u8"
  },
  {
    "id": "ch_space",
    "name": "Space HD",
    "logo": "/logos/space.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Space HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/SPACE/index.m3u8"
  },
  {
    "id": "ch_sportv",
    "name": "SporTV HD",
    "logo": "/logos/sportv.png",
    "category": "esportes",
    "epg": "Guia EPG · Programação SporTV HD Ao Vivo",
    "streamUrl": "http://195.178.110.110/sportv3/index.m3u8"
  },
  {
    "id": "ch_star_channel",
    "name": "Star Channel HD",
    "logo": "/logos/star_channel.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Star Channel HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6806d62369aec5b19cd628c0.m3u8"
  },
  {
    "id": "ch_star_hits",
    "name": "Star Hits HD",
    "logo": "/logos/star_hits.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Star Hits HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f5a545d0dbf7f0007c09408.m3u8"
  },
  {
    "id": "ch_star_life",
    "name": "Star Life HD",
    "logo": "/logos/star_life.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Star Life HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f512365abe1f50007d3ff56.m3u8"
  },
  {
    "id": "ch_star_plus",
    "name": "Star+ Live",
    "logo": "/logos/star_plus.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Star+ Live Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6474ab1da51cb80008bfb5f4.m3u8"
  },
  {
    "id": "ch_studio_universal",
    "name": "Studio Universal HD",
    "logo": "/logos/studio_universal.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Studio Universal HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-655e5bc94261ca000810cb17.m3u8"
  },
  {
    "id": "ch_syfy",
    "name": "Syfy HD",
    "logo": "/logos/syfy.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Syfy HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-6474ab5cdc7a760008745008.m3u8"
  },
  {
    "id": "ch_tbs",
    "name": "TBS HD",
    "logo": "/logos/tbs.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação TBS HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-5f357e91b18f0b00073583d2.m3u8"
  },
  {
    "id": "ch_tcm",
    "name": "TCM Clássicos",
    "logo": "/logos/tcm.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação TCM Clássicos Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-65f060d84e01740008d7421f.m3u8"
  },
  {
    "id": "ch_tc_action",
    "name": "Telecine Action HD",
    "logo": "/logos/tc_action.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Action HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-691627e4a29a6123e400b3e0.m3u8"
  },
  {
    "id": "ch_tc_cult",
    "name": "Telecine Cult HD",
    "logo": "/logos/tc_cult.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Cult HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-63d2ba2f60bc8f0008981a0e.m3u8"
  },
  {
    "id": "ch_tc_fun",
    "name": "Telecine Fun HD",
    "logo": "/logos/tc_fun.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Fun HD Ao Vivo",
    "streamUrl": "http://187.102.210.46/universo/index.m3u8"
  },
  {
    "id": "ch_tc_pipoca",
    "name": "Telecine Pipoca HD",
    "logo": "/logos/tc_pipoca.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Pipoca HD Ao Vivo",
    "streamUrl": "http://46.151.196.223:14326/"
  },
  {
    "id": "ch_tc_premium",
    "name": "Telecine Premium HD",
    "logo": "/logos/tc_premium.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Premium HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/TERRAVIVA/index.m3u8"
  },
  {
    "id": "ch_tc_touch",
    "name": "Telecine Touch HD",
    "logo": "/logos/tc_touch.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Telecine Touch HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/TNT_NOVELAS/index.m3u8"
  },
  {
    "id": "ch_tlc",
    "name": "TLC HD",
    "logo": "/logos/tlc.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação TLC HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-609ae66b359b270007869ff1.m3u8"
  },
  {
    "id": "ch_tnt",
    "name": "TNT HD",
    "logo": "/logos/tnt.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação TNT HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/TNT/index.m3u8"
  },
  {
    "id": "ch_tnt_novelas",
    "name": "TNT Novelas HD",
    "logo": "/logos/tnt_novelas.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação TNT Novelas HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/TNT_NOVELAS/index.m3u8"
  },
  {
    "id": "ch_tnt_series",
    "name": "TNT Series HD",
    "logo": "/logos/tnt_series.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação TNT Series HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/TNTSERIESHD/index.m3u8"
  },
  {
    "id": "ch_tooncast",
    "name": "Tooncast HD",
    "logo": "/logos/tooncast.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Tooncast HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/TOONCASTHD/index.m3u8"
  },
  {
    "id": "ch_trutv",
    "name": "TruTV HD",
    "logo": "/logos/trutv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação TruTV HD Ao Vivo",
    "streamUrl": "https://adylnet.streampool.net/10324/live/hls/Conecta/index.m3u8"
  },
  {
    "id": "ch_tvclima",
    "name": "TV Clima Tempo",
    "logo": "/logos/tvclima.png",
    "category": "noticias_docs",
    "epg": "Guia EPG · Programação TV Clima Tempo Ao Vivo",
    "streamUrl": "https://stmv5.samcast.com.br/claudio8701/claudio8701/playlist.m3u8"
  },
  {
    "id": "ch_tvcultura",
    "name": "TV Cultura HD",
    "logo": "/logos/tvcultura.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação TV Cultura HD Ao Vivo",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
  },
  {
    "id": "ch_tvescola",
    "name": "TV Escola",
    "logo": "/logos/tvescola.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação TV Escola Ao Vivo",
    "streamUrl": "https://stream01.msolutionbrasil.com.br/hls/conectv/live.m3u8"
  },
  {
    "id": "ch_tvgazeta",
    "name": "TV Gazeta HD",
    "logo": "/logos/tvgazeta.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação TV Gazeta HD Ao Vivo",
    "streamUrl": "http://45.162.64.114/GAZETA/index.m3u8"
  },
  {
    "id": "ch_tvpontanegra",
    "name": "TV Ponta Negra",
    "logo": "/logos/tvpontanegra.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação TV Ponta Negra Ao Vivo",
    "streamUrl": "https://5b33b873179a2.streamlock.net:1443/mastertv/livestream/playlist.m3u8"
  },
  {
    "id": "ch_tvtem",
    "name": "TV TEM Globo",
    "logo": "/logos/tvtem.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação TV TEM Globo Ao Vivo",
    "streamUrl": "/api/proxy-stream?url=http%3A%2F%2Fhls1.sua.tv%2Flive%2Fglobotvbahiafhdbr2%2Fs.m3u8"
  },
  {
    "id": "ch_tv_aparecida",
    "name": "TV Aparecida HD",
    "logo": "/logos/tv_aparecida.png",
    "category": "aberta",
    "epg": "Guia EPG · Programação TV Aparecida HD Ao Vivo",
    "streamUrl": "https://stream01.msolutionbrasil.com.br/hls/conectv/live.m3u8"
  },
  {
    "id": "ch_universal_premiere",
    "name": "Universal Premiere HD",
    "logo": "/logos/universal_premiere.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Universal Premiere HD Ao Vivo",
    "streamUrl": "https://video09.logicahost.com.br/tvparaense/tvparaense/playlist.m3u"
  },
  {
    "id": "ch_universal_reality",
    "name": "Universal Reality HD",
    "logo": "/logos/universal_reality.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Universal Reality HD Ao Vivo",
    "streamUrl": "https://stmv1.srvif.com/tvserie/tvserie/playlist.m3u8"
  },
  {
    "id": "ch_universal_tv",
    "name": "Universal TV HD",
    "logo": "/logos/universal_tv.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Universal TV HD Ao Vivo",
    "streamUrl": "https://644398c.ha.azioncdn.net/primary/tvuniversal_480p.sdp/playlist.m3u8"
  },
  {
    "id": "ch_usa_network",
    "name": "USA Network HD",
    "logo": "/logos/usa_network.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação USA Network HD Ao Vivo",
    "streamUrl": "http://170.83.16.50/AeE/index.m3u8"
  },
  {
    "id": "ch_venus",
    "name": "Venus TV",
    "logo": "/logos/venus.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Venus TV Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-63eb9c5351f5d000085e8d7e.m3u8"
  },
  {
    "id": "ch_vh1",
    "name": "VH1 HD",
    "logo": "/logos/vh1.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação VH1 HD Ao Vivo",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
  },
  {
    "id": "ch_virgintv",
    "name": "Virgin TV",
    "logo": "/logos/virgintv.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Virgin TV Ao Vivo",
    "streamUrl": "https://br.conectmy.com.br/DespertarTV/index.m3u8"
  },
  {
    "id": "ch_viva",
    "name": "Canal Viva HD",
    "logo": "/logos/viva.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Canal Viva HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-638df93ae2f2a3000737c168.m3u8"
  },
  {
    "id": "ch_warner_channel",
    "name": "Warner Channel HD",
    "logo": "/logos/warner_channel.png",
    "category": "filmes_series",
    "epg": "Guia EPG · Programação Warner Channel HD Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/AMCHD/index.m3u8"
  },
  {
    "id": "ch_woohoo",
    "name": "Woohoo HD",
    "logo": "/logos/woohoo.png",
    "category": "variedades",
    "epg": "Guia EPG · Programação Woohoo HD Ao Vivo",
    "streamUrl": "https://jmp2.uk/plu-61f1d27a189ed10007b7393e.m3u8"
  },
  {
    "id": "ch_cartoonito",
    "name": "Cartoonito HD",
    "logo": "/logos/cartoonito.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação Cartoonito Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/CARTOONITOHD/index.m3u8"
  },
  {
    "id": "ch_zoomoo_kids",
    "name": "ZooMoo Kids HD",
    "logo": "/logos/zoomoo_kids.png",
    "category": "infantil",
    "epg": "Guia EPG · Programação ZooMoo Kids Ao Vivo",
    "streamUrl": "http://170.83.49.66:8083/ZOOMOOKIDSHD/index.m3u8"
  }
];

export const BRAZUCA_CATALOG: BrazucaMedia[] = [
  {
    "id": "bm1",
    "title": "Deadpool & Wolverine - Lançamento Cinema",
    "year": "2024",
    "genre": "Ação / Comédia Marvel",
    "rating": 8.9,
    "overview": "Wolverine se recupera de ferimentos quando cruza o caminho do tagarela Deadpool. Juntos, eles precisam salvar o multiverso de uma ameaça cataclísmica.",
    "poster": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm2",
    "title": "Duna: Parte 2 - Dublado Full HD",
    "year": "2024",
    "genre": "Ficção Científica / Épico",
    "rating": 9.1,
    "overview": "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família.",
    "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm3",
    "title": "Furiosa: Uma Saga Mad Max",
    "year": "2024",
    "genre": "Ação Pós-Apocalíptica",
    "rating": 8.6,
    "overview": "A jovem Furiosa é sequestrada do Vale Verde e cai nas mãos de uma horda de motoqueiros liderada pelo Senhor da Guerra Dementus.",
    "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm4",
    "title": "Godzilla e Kong: O Novo Império",
    "year": "2024",
    "genre": "Ação Monstruosa",
    "rating": 8.3,
    "overview": "Uma batalha épica contra uma ameaça colossal desconhecida escondida em nosso mundo que desafia a própria existência dos Titãs.",
    "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm5",
    "title": "Planeta dos Macacos: O Reinado",
    "year": "2024",
    "genre": "Sci-Fi / Aventura",
    "rating": 8.4,
    "overview": "Várias gerações após o reinado de César, os macacos são a espécie dominante vivendo em harmonia e os humanos foram reduzidos às sombras.",
    "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm6",
    "title": "Bad Boys: Até o Fim",
    "year": "2024",
    "genre": "Ação / Policial",
    "rating": 8.2,
    "overview": "Os 'Bad Boys' favoritos do mundo estão de volta com sua mistura icônica de ação de tirar o fôlego e comédia ultrajante.",
    "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm7",
    "title": "Oppenheimer - Oscar Melhor Filme",
    "year": "2023",
    "genre": "Drama Histórico / Biografia",
    "rating": 9.3,
    "overview": "A história do físico americano J. Robert Oppenheimer, seu papel no Projeto Manhattan e o desenvolvimento da bomba atômica.",
    "poster": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm8",
    "title": "Avatar: O Caminho da Água",
    "year": "2022",
    "genre": "Ficção Científica / Fantasia 3D",
    "rating": 8.7,
    "overview": "Jake Sully e Ney'tiri formaram uma família e fazem de tudo para ficarem juntos, mas devem explorar as regiões de Pandora quando uma antiga ameaça ressurge.",
    "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm9",
    "title": "Top Gun: Maverick",
    "year": "2022",
    "genre": "Ação Aérea / Adrenalina",
    "rating": 9,
    "overview": "Depois de mais de 30 anos servindo como um dos principais aviadores da Marinha, Pete 'Maverick' Mitchell treina um destacamento de graduados para uma missão especializada.",
    "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "filmes"
  },
  {
    "id": "bm10",
    "title": "John Wick 4: Baba Yaga",
    "year": "2023",
    "genre": "Ação Implacável / Artes Marciais",
    "rating": 8.8,
    "overview": "John Wick descobre um caminho para derrotar a Alta Cúpula, mas precisa enfrentar um novo inimigo com alianças poderosas pelo mundo todo.",
    "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "filmes"
  },
  {
    "id": "bs1",
    "title": "A Casa do Dragão - Temporada 2",
    "year": "2024",
    "genre": "Fantasia / Drama Épico HBO",
    "rating": 8.8,
    "episodesCount": 8,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - A Casa do Dragão (Temp 2)",
        "duration": "62 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      }
    ],
    "overview": "A guerra civil entre os apoiadores do Rei Aegon II e da Rainha Rhaenyra Targaryen incendeia Westeros em sangue e fogo.",
    "poster": "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8",
    "category": "series"
  },
  {
    "id": "bs2",
    "title": "The Boys - Temporada 4",
    "year": "2024",
    "genre": "Ação / Super-Heróis Prime",
    "rating": 9,
    "episodesCount": 8,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - The Boys (Temp 4)",
        "duration": "58 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "Victoria Neuman está mais perto do que nunca do Salão Oval sob o comando do Capitão Pátria, enquanto Butcher tenta unir sua equipe.",
    "poster": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "series"
  },
  {
    "id": "bs3",
    "title": "Stranger Things - Temporada 4",
    "year": "2023",
    "genre": "Ficção Científica / Suspense",
    "rating": 9.2,
    "episodesCount": 9,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Stranger Things (Temp 4)",
        "duration": "75 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "Separados pela primeira vez, os amigos enfrentam uma nova e terrível ameaça sobrenatural que surge do Mundo Invertido.",
    "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8",
    "category": "series"
  },
  {
    "id": "bs4",
    "title": "The Last of Us - Temporada 1",
    "year": "2023",
    "genre": "Sobrevivência Pós-Apocalíptica",
    "rating": 9.4,
    "episodesCount": 9,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - The Last of Us (Temp 1)",
        "duration": "55 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "Joel e Ellie cruzam os Estados Unidos devastados por um fungo mortal que transforma humanos em monstros brutais.",
    "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "series"
  },
  {
    "id": "bs5",
    "title": "Round 6 (Squid Game) - Temp 1",
    "year": "2021",
    "genre": "Suspense / Jogo Mortal",
    "rating": 9.1,
    "episodesCount": 9,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Round 6",
        "duration": "54 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "Centenas de jogadores falidos aceitam um estranho convite para competir em jogos infantis por um prêmio milionário tentador e perigos mortais.",
    "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8",
    "category": "series"
  },
  {
    "id": "bs6",
    "title": "Loki - Temporada 2",
    "year": "2023",
    "genre": "Marvel / Multiverso",
    "rating": 8.9,
    "episodesCount": 6,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Loki (Temp 2)",
        "duration": "50 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      }
    ],
    "overview": "O Deus da Trapaça tenta salvar as linhas temporais e a TVA da destruição total provocada pelo colapso do Tear Temporal.",
    "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "series"
  },
  {
    "id": "nv1",
    "title": "Renascer (2024)",
    "year": "2024",
    "genre": "Novela das Nove / Drama Rural",
    "rating": 8.7,
    "episodesCount": 197,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Renascer (Capítulo)",
        "duration": "45 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "A saga de José Inocêncio, um fazendeiro de cacau no sul da Bahia que faz um pacto com o jequitibá-rei para nunca morrer.",
    "poster": "https://images.unsplash.com/photo-1524712245354-2c4e5e7121c0?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "novelas"
  },
  {
    "id": "nv2",
    "title": "Avenida Brasil - Completa",
    "year": "2012",
    "genre": "Novela Clássica / Suspense",
    "rating": 9.6,
    "episodesCount": 179,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Avenida Brasil (Capítulo)",
        "duration": "48 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      }
    ],
    "overview": "A jovem Nina busca vingança contra Carminha, a madrasta inescrupulosa que a abandonou em um lixão na infância.",
    "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "novelas"
  },
  {
    "id": "nv3",
    "title": "Será Isso Amor? (Sen Çal Kapımı)",
    "year": "2021",
    "genre": "Novela Turca / Romance",
    "rating": 8.9,
    "episodesCount": 161,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Será Isso Amor? (Episódio)",
        "duration": "50 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      }
    ],
    "overview": "Eda sonha em terminar seus estudos no exterior, mas seu financiamento é cortado pelo ambicioso empresário Serkan Bolat.",
    "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "novelas"
  },
  {
    "id": "nv4",
    "title": "Pantanal (2022)",
    "year": "2022",
    "genre": "Novela Épica / Pantaneira",
    "rating": 9.2,
    "episodesCount": 167,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Pantanal (Capítulo)",
        "duration": "46 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      }
    ],
    "overview": "A história de amor entre Jove e Juma Marruá em meio à exuberância e aos mitos da fauna pantaneira.",
    "poster": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "category": "novelas"
  },
  {
    "id": "an1",
    "title": "Dragon Ball Z - Saga Completa Dublada",
    "year": "Clássico",
    "genre": "Shonen / Artes Marciais",
    "rating": 9.7,
    "episodesCount": 291,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Dragon Ball Z (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      }
    ],
    "overview": "Goku, Gohan e os guerreiros Z defendem a Terra contra ameaças do universo como Saiyajins, Freeza, Cell e Majin Boo.",
    "poster": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8",
    "category": "animes"
  },
  {
    "id": "an2",
    "title": "Naruto Shippuden - Dublado & Legendado",
    "year": "Clássico",
    "genre": "Ninja / Ação Shonen",
    "rating": 9.5,
    "episodesCount": 500,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Naruto Shippuden (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "Dois anos após o treinamento com Jiraiya, Naruto retorna a Konoha pronto para resgatar Sasuke e enfrentar a organização Akatsuki.",
    "poster": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8",
    "category": "animes"
  },
  {
    "id": "an3",
    "title": "One Piece - Saga Egghead",
    "year": "2024",
    "genre": "Piratas / Aventura",
    "rating": 9.8,
    "episodesCount": 1100,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - One Piece (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      }
    ],
    "overview": "Monkey D. Luffy e os Chapéus de Palha chegam à futurista ilha do renomado cientista Dr. Vegapunk, descobrindo segredos proibidos.",
    "poster": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8",
    "category": "animes"
  },
  {
    "id": "an4",
    "title": "Attack on Titan (Shingeki no Kyojin)",
    "year": "Final",
    "genre": "Ação Sombria / Titãs",
    "rating": 9.6,
    "episodesCount": 89,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Attack on Titan (Episódio)",
        "duration": "24 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      }
    ],
    "overview": "A humanidade vive cercada por muralhas gigantescas para se proteger dos Titãs devoradores, até o dia em que uma muralha é rompida.",
    "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8",
    "category": "animes"
  },
  {
    "id": "an5",
    "title": "Solo Leveling - Temporada 1",
    "year": "2024",
    "genre": "Fantasia / RPG de Ação",
    "rating": 9.3,
    "episodesCount": 12,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Solo Leveling (Episódio)",
        "duration": "23 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      }
    ],
    "overview": "Sung Jinwoo, o caçador mais fraco da humanidade, é escolhido por um sistema secreto para se tornar o caçador mais poderoso do planeta.",
    "poster": "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    "category": "animes"
  },
  {
    "id": "kd1",
    "title": "Divertida Mente 2 - Dublado Full HD",
    "year": "2024",
    "genre": "Animação Disney / Pixar",
    "rating": 9.2,
    "overview": "Riley entra na adolescência e a sala de controle das emoções passa por uma grande reforma para dar lugar a novos sentimentos: Ansiedade, Vergonha e Tédio.",
    "poster": "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8",
    "category": "kids"
  },
  {
    "id": "kd2",
    "title": "Meu Malvado Favorito 4",
    "year": "2024",
    "genre": "Comédia de Animação / Minions",
    "rating": 8.5,
    "overview": "Gru e Lucy dão as boas-vindas a um novo membro da família enquanto enfrentam novos arqui-inimigos em uma missão eletrizante.",
    "poster": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8",
    "category": "kids"
  },
  {
    "id": "kd3",
    "title": "Kung Fu Panda 4 - Dublado",
    "year": "2024",
    "genre": "Aventura e Artes Marciais",
    "rating": 8.6,
    "overview": "Po deve treinar um novo guerreiro para sucedê-lo como o Dragão Guerreiro enquanto enfrenta a Camaleoa, uma feiticeira metamorfa.",
    "poster": "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "kids"
  },
  {
    "id": "kd4",
    "title": "Bob Esponja Calça Quadrada - Clássicos",
    "year": "Nostalgia",
    "genre": "Comédia Submarina",
    "rating": 9.4,
    "episodesCount": 200,
    "episodes": [
      {
        "id": "ep_1",
        "number": 1,
        "title": "Episódio 1 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 1 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_2",
        "number": 2,
        "title": "Episódio 2 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 2 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_3",
        "number": 3,
        "title": "Episódio 3 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 3 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_4",
        "number": 4,
        "title": "Episódio 4 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 4 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_5",
        "number": 5,
        "title": "Episódio 5 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 5 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_6",
        "number": 6,
        "title": "Episódio 6 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 6 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8"
      },
      {
        "id": "ep_7",
        "number": 7,
        "title": "Episódio 7 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 7 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      },
      {
        "id": "ep_8",
        "number": 8,
        "title": "Episódio 8 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 8 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://video09.logicahost.com.br/sbtcuiaba/sbtcuiaba/playlist.m3u8"
      },
      {
        "id": "ep_9",
        "number": 9,
        "title": "Episódio 9 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 9 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://cdn-5.nxplay.com.br/BAND_NEWS/index.m3u8"
      },
      {
        "id": "ep_10",
        "number": 10,
        "title": "Episódio 10 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 10 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
      },
      {
        "id": "ep_11",
        "number": 11,
        "title": "Episódio 11 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 11 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
      },
      {
        "id": "ep_12",
        "number": 12,
        "title": "Episódio 12 - Bob Esponja (Episódio)",
        "duration": "22 min",
        "overview": "Assista ao episódio 12 completo em alta definição Full HD 1080p.",
        "streamUrl": "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ],
    "overview": "As divertidas aventuras da esponja marinha mais otimista do mundo e seu melhor amigo Patrick Estrela na Fenda do Biquíni.",
    "poster": "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&auto=format&fit=crop&q=80",
    "backdrop": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1600&auto=format&fit=crop&q=80",
    "streamUrl": "https://cdn.live.br1.jmvstream.com/w/LVW-10801/LVW10801_Xvg4R0u57n/chunklist.m3u8",
    "category": "kids"
  }
];
