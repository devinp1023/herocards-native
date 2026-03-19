import { createContext, useContext } from 'react';
import { GameState } from '../hooks/useGameState';

export const GameStateContext = createContext<GameState | null>(null);

export function useGameStateContext(): GameState {
  const ctx = useContext(GameStateContext);
  if (!ctx) throw new Error('useGameStateContext must be used inside GameStateContext.Provider');
  return ctx;
}
