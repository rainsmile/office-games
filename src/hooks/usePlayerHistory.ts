'use client';

import { useState, useCallback } from 'react';

interface GameRecord {
  game: string;
  score: number;
  rank: number;
  totalPlayers: number;
  date: string;
}

interface PlayerHistory {
  nickname: string;
  totalGames: number;
  totalWins: number;
  records: GameRecord[];
}

const STORAGE_KEY = 'office-games-history';

function loadHistory(): PlayerHistory {
  if (typeof window === 'undefined') {
    return { nickname: '', totalGames: 0, totalWins: 0, records: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { nickname: '', totalGames: 0, totalWins: 0, records: [] };
}

function saveHistory(history: PlayerHistory) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

export function usePlayerHistory() {
  const [history, setHistory] = useState<PlayerHistory>(loadHistory);

  const addRecord = useCallback((record: GameRecord) => {
    setHistory((prev) => {
      const updated = {
        ...prev,
        totalGames: prev.totalGames + 1,
        totalWins: record.rank === 1 ? prev.totalWins + 1 : prev.totalWins,
        records: [record, ...prev.records].slice(0, 50),
      };
      saveHistory(updated);
      return updated;
    });
  }, []);

  const setNickname = useCallback((nickname: string) => {
    setHistory((prev) => {
      const updated = { ...prev, nickname };
      saveHistory(updated);
      return updated;
    });
  }, []);

  return { history, addRecord, setNickname };
}
