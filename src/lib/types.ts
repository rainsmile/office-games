export type GameType = 'draw' | 'music' | 'emoji' | 'spy' | 'quiz' | 'rank' | 'story';

export type RoomStatus = 'waiting' | 'playing' | 'result';

export interface Player {
  id: string;
  nickname: string;
  color: string;
  score: number;
  online: boolean;
}

export interface RoomSettings {
  rounds: number;
  timeLimit: number;
}

export interface Room {
  code: string;
  status: RoomStatus;
  hostId: string;
  players: Player[];
  currentGame: GameType | null;
  gameState: unknown;
  settings: RoomSettings;
}

export interface GameEvent {
  type: string;
  [key: string]: unknown;
}

export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface DrawGameState {
  drawerId: string;
  word: string;
  hints: string;
  round: number;
  totalRounds: number;
  guessedPlayerIds: string[];
  strokes: Stroke[];
  timeLeft: number;
}

export interface MusicGameState {
  round: number;
  totalRounds: number;
  previewUrl: string;
  options: string[];
  correctAnswer: string;
  answeredPlayerIds: string[];
  timeLeft: number;
}

export interface EmojiGameState {
  presenterId: string;
  word: string;
  emojis: string;
  round: number;
  totalRounds: number;
  guessedPlayerIds: string[];
  timeLeft: number;
}

export interface SpyGameState {
  phase: 'describe' | 'vote' | 'result';
  alivePlayers: string[];
  spyIds: string[];
  currentSpeakerId: string | null;
  descriptions: Record<string, string>;
  votes: Record<string, string>;
  round: number;
}

export interface QuizGameState {
  round: number;
  totalRounds: number;
  question: string;
  options: string[];
  correctAnswer: number;
  answers: Record<string, { answer: number; time: number }>;
  timeLeft: number;
}

export interface RankGameState {
  round: number;
  totalRounds: number;
  topic: string;
  items: string[];
  correctOrder: number[];
  submissions: Record<string, number[]>;
  timeLeft: number;
}

export interface StoryGameState {
  phase: 'writing' | 'reveal' | 'voting';
  currentWriterIndex: number;
  writerOrder: string[];
  sentences: { playerId: string; text: string }[];
  lastSentence: string;
  votes: Record<string, string>;
  timeLeft: number;
}

export interface ClientEvents {
  'room:create': (data: { nickname: string }) => void;
  'room:join': (data: { nickname: string; code: string }) => void;
  'room:start': (data: { game: GameType }) => void;
  'room:kick': (data: { playerId: string }) => void;
  'room:settings': (data: Partial<RoomSettings>) => void;
  'game:action': (data: GameEvent) => void;
  'draw:stroke': (data: Stroke) => void;
}

export interface ServerEvents {
  'room:created': (data: { code: string; playerId: string }) => void;
  'room:joined': (data: { playerId: string }) => void;
  'room:state': (data: Room) => void;
  'room:error': (data: { message: string }) => void;
  'room:player-joined': (data: { player: Player }) => void;
  'room:player-left': (data: { playerId: string }) => void;
  'game:state': (data: unknown) => void;
  'game:event': (data: GameEvent) => void;
  'draw:stroke': (data: Stroke) => void;
}
