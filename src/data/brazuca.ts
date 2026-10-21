export interface BrazucaItem {
  id: string;
  title: string;
  type: "folder" | "stream";
  genre?: string;
  year?: string;
  poster?: string;
  streamUrl?: string;
  items?: BrazucaItem[];
}

export const BRAZUCA_PLAY_MENU: BrazucaItem[] = [
  {
    id: "filmes",
    title: "Filmes Dublados & Legendados",
    type: "folder",
    poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
    items: [
      {
        id: "f-lancamentos",
        title: "Lançamentos de Cinema 2024",
        type: "folder",
        poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
        items: [
          {
            id: "m-bbb",
            title: "Deadpool & Wolverine - Lançamento Full HD",
            type: "stream",
            genre: "Ação / Comédia",
            year: "2024",
            poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
            streamUrl: "https://fpa-gateway.tvcultura.com.br:8181/memfs/606caef0-a290-413d-9f1f-8fcdb3a73831.m3u8"
          },
          {
            id: "m-tos",
            title: "Duna: Parte 2 - Épico Sci-Fi",
            type: "stream",
            genre: "Ficção Científica",
            year: "2024",
            poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&auto=format&fit=crop&q=80",
            streamUrl: "https://jmp2.uk/plu-6102e04e9ab1db0007a980a1.m3u8"
          }
        ]
      },
      {
        id: "f-acao",
        title: "Ação & Aventura",
        type: "folder",
        poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
        items: [
          {
            id: "m-sintel",
            title: "Sintel - A Caçadora de Dragões",
            type: "stream",
            genre: "Aventura",
            year: "2023",
            poster: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop&q=80",
            streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
          }
        ]
      }
    ]
  },
  {
    id: "series",
    title: "Séries de TV & Novelas",
    type: "folder",
    poster: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&auto=format&fit=crop&q=80",
    items: [
      {
        id: "s-drama",
        title: "Séries Populares Atualizadas",
        type: "folder",
        poster: "https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80",
        items: [
          {
            id: "s-empire",
            title: "Empire - Fama e Poder (Temporadas 1 a 6 Dublado)",
            type: "stream",
            genre: "Drama Musical",
            year: "2015-2020",
            poster: "https://image.tmdb.org/t/p/w500/8Uz4oB6Sa84AZEFif2ZOg2m6K0k.jpg",
            streamUrl: "https://c.direitonapratica.com/cdns0003/24/101245.mp4?token=YjZhMTljYg=="
          },
          {
            id: "s-cosmos",
            title: "Cosmos & Mistérios - Temp 1",
            type: "stream",
            genre: "Documentário / Aventura",
            year: "2024",
            poster: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=500&auto=format&fit=crop&q=80",
            streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4"
          },
          {
            id: "s-cyber",
            title: "Cyber City - Temporada Completa",
            type: "stream",
            genre: "Suspense",
            year: "2024",
            poster: "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=500&auto=format&fit=crop&q=80",
            streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
          }
        ]
      }
    ]
  },
  {
    id: "aovivo",
    title: "Canais de TV Aberta & Esportes",
    type: "folder",
    poster: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=80",
    items: [
      {
        id: "ch-esportes",
        title: "Brazuca Sports HD - Ao Vivo",
        type: "stream",
        genre: "Futebol e Automobilismo",
        poster: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=500&auto=format&fit=crop&q=80",
        streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4"
      },
      {
        id: "ch-noticias",
        title: "Brazuca Notícias 24h",
        type: "stream",
        genre: "Jornalismo",
        poster: "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=500&auto=format&fit=crop&q=80",
        streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4"
      }
    ]
  },
  {
    id: "desenhos",
    title: "Infantil & Desenhos Clássicos",
    type: "folder",
    poster: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=500&auto=format&fit=crop&q=80",
    items: [
      {
        id: "m-elephant",
        title: "Elephant's World - Clássico",
        type: "stream",
        genre: "Animação Clássica",
        poster: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80",
        streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
      }
    ]
  }
];
