import { NextRequest, NextResponse } from "next/server";

export interface CastMedia {
  title: string;
  synopsis?: string;
  thumbnail?: string;
  link: string;
  tmdb_id?: number | string;
  season?: number;
  episode?: number;
}

export interface CastState {
  currentTime: number;
  duration: number;
  isPaused: boolean;
  volume: number;
  isMuted: boolean;
  aspectRatio: string;
  updatedAt: number;
}

export interface CastCommand {
  id: string;
  type:
    | "play_media"
    | "play"
    | "pause"
    | "toggle_play"
    | "seek"
    | "volume"
    | "mute"
    | "unmute"
    | "stop"
    | "next_episode"
    | "prev_episode"
    | "aspect_ratio";
  payload?: any;
  timestamp: number;
}

export interface CastSession {
  code: string;
  name: string;
  createdAt: number;
  lastActive: number;
  receiverConnected: boolean;
  controllerConnected: boolean;
  media: CastMedia | null;
  state: CastState;
  commands: CastCommand[];
}

// Global in-memory storage that survives Next.js fast reloads
const globalForCast = globalThis as unknown as {
  __wmplay_cast_sessions?: Map<string, CastSession>;
};

const sessions = globalForCast.__wmplay_cast_sessions || new Map<string, CastSession>();
if (!globalForCast.__wmplay_cast_sessions) {
  globalForCast.__wmplay_cast_sessions = sessions;
}

// Limpeza automática de sessões inativas (mais de 4 horas)
function pruneExpiredSessions() {
  const now = Date.now();
  const FOUR_HOURS = 4 * 60 * 60 * 1000;
  for (const [code, session] of sessions.entries()) {
    if (now - session.lastActive > FOUR_HOURS) {
      sessions.delete(code);
    }
  }
}

// Gerador de código numérico de 6 dígitos amigável e legível
function generateUniqueCode(): string {
  let code = "";
  let attempts = 0;
  do {
    // 6 dígitos entre 100000 e 999999
    code = Math.floor(100000 + Math.random() * 900000).toString();
    attempts++;
  } while (sessions.has(code) && attempts < 100);
  return code;
}

export async function GET(req: NextRequest) {
  pruneExpiredSessions();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  const role = searchParams.get("role") || "controller"; // "receiver" ou "controller"

  if (!code) {
    return NextResponse.json({ error: "Código da sessão não fornecido" }, { status: 400 });
  }

  const session = sessions.get(code);
  if (!session) {
    return NextResponse.json({ error: "Sessão não encontrada ou expirada" }, { status: 404 });
  }

  session.lastActive = Date.now();

  if (role === "receiver") {
    session.receiverConnected = true;
    // Retorna comandos pendentes e limpa a fila para o receptor
    const pendingCommands = [...session.commands];
    session.commands = [];

    return NextResponse.json({
      success: true,
      code: session.code,
      name: session.name,
      controllerConnected: session.controllerConnected,
      commands: pendingCommands,
      media: session.media,
      state: session.state,
    });
  }

  // Papel do controlador (celular)
  session.controllerConnected = true;
  return NextResponse.json({
    success: true,
    code: session.code,
    name: session.name,
    receiverConnected: session.receiverConnected,
    media: session.media,
    state: session.state,
  });
}

export async function POST(req: NextRequest) {
  pruneExpiredSessions();

  try {
    const body = await req.json();
    const { action, code, name, command, payload, state, media } = body;

    // Criar nova sessão de receptor (TV)
    if (action === "create") {
      const newCode = generateUniqueCode();
      const newSession: CastSession = {
        code: newCode,
        name: name || "Smart TV Sala",
        createdAt: Date.now(),
        lastActive: Date.now(),
        receiverConnected: true,
        controllerConnected: false,
        media: null,
        state: {
          currentTime: 0,
          duration: 0,
          isPaused: true,
          volume: 1,
          isMuted: false,
          aspectRatio: "16:9",
          updatedAt: Date.now(),
        },
        commands: [],
      };

      sessions.set(newCode, newSession);

      return NextResponse.json({
        success: true,
        code: newCode,
        session: newSession,
      });
    }

    if (!code) {
      return NextResponse.json({ error: "Código não informado" }, { status: 400 });
    }

    const session = sessions.get(code.trim());
    if (!session) {
      return NextResponse.json({ error: "Sessão não encontrada ou código incorreto" }, { status: 404 });
    }

    session.lastActive = Date.now();

    // Celular conectando à sessão da TV
    if (action === "join") {
      session.controllerConnected = true;
      return NextResponse.json({
        success: true,
        code: session.code,
        name: session.name,
        receiverConnected: session.receiverConnected,
        media: session.media,
        state: session.state,
      });
    }

    // Celular enviando comando para a TV (Play, Pause, Seek, Novo Filme, etc.)
    if (action === "command") {
      if (!command) {
        return NextResponse.json({ error: "Comando não especificado" }, { status: 400 });
      }

      const newCmd: CastCommand = {
        id: Math.random().toString(36).substring(2, 9),
        type: command,
        payload: payload || {},
        timestamp: Date.now(),
      };

      // Se for play_media, atualiza a mídia imediatamente no estado da sessão
      if (command === "play_media" && payload?.media) {
        session.media = payload.media;
        session.state.isPaused = false;
        session.state.currentTime = payload.currentTime || 0;
      }

      session.commands.push(newCmd);

      // Limita fila de comandos para não estourar memória
      if (session.commands.length > 20) {
        session.commands = session.commands.slice(-20);
      }

      return NextResponse.json({
        success: true,
        commandId: newCmd.id,
        sessionState: session.state,
      });
    }

    // Receptor (TV) atualizando o estado de reprodução para o celular
    if (action === "sync_state") {
      if (state) {
        session.state = {
          ...session.state,
          ...state,
          updatedAt: Date.now(),
        };
      }
      if (media !== undefined) {
        session.media = media;
      }
      return NextResponse.json({ success: true });
    }

    // Desconectar
    if (action === "disconnect") {
      const role = body.role || "controller";
      if (role === "receiver") {
        session.receiverConnected = false;
      } else {
        session.controllerConnected = false;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Ação não reconhecida" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
