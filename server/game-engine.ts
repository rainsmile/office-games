import type { Player, GameEvent, RoomSettings } from '../src/lib/types';

export interface GameEngine {
  init(players: Player[], settings: RoomSettings): unknown;
  handleAction(state: unknown, playerId: string, action: GameEvent): {
    state: unknown;
    events: GameEvent[];
    ended: boolean;
  };
  getClientState(state: unknown, playerId: string): unknown;
  tick?(state: unknown): {
    state: unknown;
    events: GameEvent[];
    ended: boolean;
  };
}

const registry = new Map<string, GameEngine>();

export function registerGame(name: string, engine: GameEngine): void {
  registry.set(name, engine);
}

export function getGameEngine(name: string): GameEngine | undefined {
  return registry.get(name);
}
