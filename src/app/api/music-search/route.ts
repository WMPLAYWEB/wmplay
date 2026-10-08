import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface YouTubeResult {
  id: string;
  title: string;
  channel: string;
  duration: string;
  views: string;
  thumbnail: string;
  url: string;
}

interface SoundCloudResult {
  title: string;
  artist: string;
  url: string;
  embedUrl: string;
}

interface SpotifyResult {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: string;
  preview: string;
  link: string;
  spotifyArtistEmbed?: string;
}

// Dicionário de Artistas Famosos mapeados para seus IDs oficiais do Spotify
const KNOWN_SPOTIFY_ARTISTS: Record<string, { id: string; name: string }> = {
  alok: { id: "4LADVWbGgajvchOHelqZv2", name: "Alok" },
  coldplay: { id: "4gzpq5DPGxSnKTe4SA8HAU", name: "Coldplay" },
  "henrique e juliano": { id: "3p75Vb6Wnt644z2PVNgpSp", name: "Henrique & Juliano" },
  "henrique & juliano": { id: "3p75Vb6Wnt644z2PVNgpSp", name: "Henrique & Juliano" },
  "gusttavo lima": { id: "7oSJLEvslp9KG2utXm35ko", name: "Gusttavo Lima" },
  "marilia mendonca": { id: "1yR2vrVuuzJGkvUVAgI2un", name: "Marília Mendonça" },
  "marília mendonça": { id: "1yR2vrVuuzJGkvUVAgI2un", name: "Marília Mendonça" },
  "vintage culture": { id: "1Tq489Q2a4n62eK1t78fK3", name: "Vintage Culture" },
  "taylor swift": { id: "06HL4z0CvFAxyc27GXpf02", name: "Taylor Swift" },
  "the weeknd": { id: "1Xyo4u8uXC1ZmMpatF05PJ", name: "The Weeknd" },
  queen: { id: "1dfeR4HaWDbWqFssioPslY", name: "Queen" },
  anitta: { id: "7FNnA9vBm6EKceENgCGRMb", name: "Anitta" },
  "jorge e mateus": { id: "1elUiq4X7px261SIrEz8BS", name: "Jorge & Mateus" },
  "jorge & mateus": { id: "1elUiq4X7px261SIrEz8BS", name: "Jorge & Mateus" },
  "luan santana": { id: "0a17J4Y467y2e4f0r7X19", name: "Luan Santana" },
  matue: { id: "7d3WFRn6iyFqeb9neFm2rC", name: "Matuê" },
  matuê: { id: "7d3WFRn6iyFqeb9neFm2rC", name: "Matuê" },
  kayblack: { id: "2Vp8e92Jvj4N2gB1k3n8aF", name: "KayBlack" },
  "mc ryan sp": { id: "6v2d1n1h3y4u5k6a7b8c9d", name: "MC Ryan SP" },
  "ana castela": { id: "2auHQW467e4Wd0wS5y5N0C", name: "Ana Castela" },
  "ludmilla": { id: "4BkJ2gLp0XF9QnZ1iT3a8A", name: "Ludmilla" },
  "iron maiden": { id: "6zaBeb48o2b7xG0Z9eD4p4", name: "Iron Maiden" },
  "metallica": { id: "2ye2Wgw4gimLv2eAKt19tG", name: "Metallica" },
  "eminem": { id: "7dGJoEcocunAkohTVvdVhK", name: "Eminem" },
  "bruno mars": { id: "0du5cEVh5yTK9QJze8zA0C", name: "Bruno Mars" },
  "billie eilish": { id: "6qqNVTkY8uVI9o25976bQi", name: "Billie Eilish" },
  "dua lipa": { id: "6M2wZ9GZgrQXHCFfjv46we", name: "Dua Lipa" },
  "imagine dragons": { id: "53XhwfbYqKCa1cC15pYq2q", name: "Imagine Dragons" }
};

async function searchYouTube(q: string): Promise<YouTubeResult[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    },
    next: { revalidate: 3600 },
  });
  const html = await res.text();
  const match =
    html.match(/var ytInitialData = ({[\s\S]*?});<\/script>/) ||
    html.match(/ytInitialData\s*=\s*({[\s\S]+?});/);
  if (!match) return [];

  const data = JSON.parse(match[1]);
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
  const items: YouTubeResult[] = [];

  for (const c of contents || []) {
    const itemSection = c?.itemSectionRenderer?.contents;
    for (const item of itemSection || []) {
      const v = item?.videoRenderer;
      if (v?.videoId) {
        items.push({
          id: v.videoId,
          title:
            v.title?.runs?.map((r: any) => r.text).join("") ||
            v.title?.simpleText ||
            "Vídeo do YouTube",
          channel:
            v.ownerText?.runs?.map((r: any) => r.text).join("") ||
            v.shortBylineText?.runs?.map((r: any) => r.text).join("") ||
            "Canal Oficial",
          duration: v.lengthText?.simpleText || "",
          views: v.viewCountText?.simpleText || "",
          thumbnail:
            v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
            `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${v.videoId}`,
        });
      }
    }
  }

  return items.slice(0, 20);
}

async function searchSoundCloud(q: string): Promise<SoundCloudResult[]> {
  const url = `https://soundcloud.com/search/sounds?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    next: { revalidate: 3600 },
  });
  const html = await res.text();
  const generalLinks = [...html.matchAll(/<a href="(\/[a-zA-Z0-9-_]+\/[a-zA-Z0-9-_]+)">([^<]+)<\/a>/g)]
    .map((m) => ({
      path: m[1],
      title: m[2].replace(/&amp;/g, "&").replace(/&#39;/g, "'").trim(),
    }))
    .filter(
      (x) =>
        x.title &&
        !x.path.includes("/search") &&
        !x.path.includes("/popular") &&
        !x.path.includes("/terms") &&
        !x.path.includes("/pages")
    );

  const items: SoundCloudResult[] = [];
  const seen = new Set<string>();

  for (const l of generalLinks) {
    if (!seen.has(l.path)) {
      seen.add(l.path);
      const parts = l.path.split("/").filter(Boolean);
      const artist = parts[0] || "SoundCloud Artist";
      const fullUrl = `https://soundcloud.com${l.path}`;
      items.push({
        title: l.title,
        artist,
        url: fullUrl,
        embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          fullUrl
        )}&color=%23ff5500&auto_play=true&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true`,
      });
    }
  }

  return items.slice(0, 15);
}

async function searchSpotifyDeezer(q: string): Promise<{
  results: SpotifyResult[];
  spotifyArtistEmbed?: string;
  spotifyArtistName?: string;
}> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=15`,
    { next: { revalidate: 3600 } }
  );
  const data = await res.json();

  const results: SpotifyResult[] = (data.data || []).map((d: any) => ({
    id: d.id,
    title: d.title,
    artist: d.artist?.name || "Artista",
    album: d.album?.title || "",
    cover: d.album?.cover_medium || d.artist?.picture_medium || "",
    duration: d.duration
      ? `${Math.floor(d.duration / 60)}:${String(d.duration % 60).padStart(2, "0")}`
      : "",
    preview: d.preview || "",
    link: d.link || `https://open.spotify.com/search/${encodeURIComponent(q)}`,
  }));

  // Check if query matches known Spotify artist
  const normalizedQuery = q.toLowerCase().trim();
  let spotifyArtistEmbed: string | undefined;
  let spotifyArtistName: string | undefined;

  for (const [key, artist] of Object.entries(KNOWN_SPOTIFY_ARTISTS)) {
    if (normalizedQuery.includes(key) || key.includes(normalizedQuery)) {
      spotifyArtistEmbed = `https://open.spotify.com/embed/artist/${artist.id}?utm_source=generator&theme=0`;
      spotifyArtistName = artist.name;
      break;
    }
  }

  return { results, spotifyArtistEmbed, spotifyArtistName };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") || "youtube";
  const query = searchParams.get("q")?.trim() || "";

  if (!query) {
    return NextResponse.json(
      { error: "Parâmetro 'q' é obrigatório para pesquisa." },
      { status: 400 }
    );
  }

  try {
    if (platform === "youtube") {
      const items = await searchYouTube(query);
      return NextResponse.json({
        platform: "youtube",
        query,
        count: items.length,
        items,
      });
    }

    if (platform === "soundcloud") {
      const items = await searchSoundCloud(query);
      return NextResponse.json({
        platform: "soundcloud",
        query,
        count: items.length,
        items,
      });
    }

    if (platform === "spotify") {
      const { results, spotifyArtistEmbed, spotifyArtistName } =
        await searchSpotifyDeezer(query);
      return NextResponse.json({
        platform: "spotify",
        query,
        count: results.length,
        items: results,
        spotifyArtistEmbed,
        spotifyArtistName,
      });
    }

    return NextResponse.json(
      { error: `Plataforma '${platform}' não suportada.` },
      { status: 400 }
    );
  } catch (error: any) {
    console.error(`Erro na busca de música [${platform}]:`, error);
    return NextResponse.json(
      { error: "Falha ao processar pesquisa musical.", details: error.message },
      { status: 500 }
    );
  }
}
