/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { GameStatus, RUN_SPEED_BASE, type BuffType } from './types';
import type { Lang } from './i18n';

interface GameState {
  status: GameStatus;
  score: number;
  lives: number;
  maxLives: number;
  speed: number;
  collectedLetters: number[];
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;

  // Endless mode
  isEndlessMode: boolean;
  // Marks campaign completion (used to show endless button on victory screen)
  canContinueEndless: boolean;

  // In-run buffs (timestamps in ms; 0 = inactive)
  buffReverseUntil: number;
  buffMagnetUntil: number;
  buffSpeedUntil: number;
  buffScoreX2Until: number;

  isBuffActive: (buff: BuffType) => boolean;
  applyBuff: (buff: BuffType, durationMs?: number) => void;

  // UI / Settings
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;

  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // Actions
  startGame: () => void;
  restartGame: () => void;
  continueEndless: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  setSpeed: (speed: number) => void;
  addSpeed: (amount: number) => void;

  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;

  // Legacy / debug
  increaseLevel: () => void;
}

const GEMINI_TARGET = ['G', 'E', 'M', 'I', 'N', 'I'];
const MAX_LEVEL = 3;

const BUFF_DEFAULTS: Record<BuffType, number> = {
  REVERSE: 8000,
  MAGNET: 10000,
  SPEED: 6500,
  SCORE_X2: 12000,
};

function loadLang(): Lang {
  if (typeof window === 'undefined') return 'zh-CN';
  const saved = window.localStorage.getItem('runner.lang');
  if (saved === 'zh-CN' || saved === 'en-US') return saved;

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

function isActive(until: number): boolean {
  return until > Date.now();
}

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  score: 0,
  lives: 6,
  maxLives: 6,
  speed: 0,
  collectedLetters: [],
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,

  isEndlessMode: false,
  canContinueEndless: false,

  buffReverseUntil: 0,
  buffMagnetUntil: 0,
  buffSpeedUntil: 0,
  buffScoreX2Until: 0,

  isBuffActive: (buff) => {
    const s = get();
    switch (buff) {
      case 'REVERSE':
        return isActive(s.buffReverseUntil);
      case 'MAGNET':
        return isActive(s.buffMagnetUntil);
      case 'SPEED':
        return isActive(s.buffSpeedUntil);
      case 'SCORE_X2':
        return isActive(s.buffScoreX2Until);
      default:
        return false;
    }
  },

  applyBuff: (buff, durationMs) => {
    const until = Date.now() + (durationMs ?? BUFF_DEFAULTS[buff]);
    switch (buff) {
      case 'REVERSE':
        set({ buffReverseUntil: until });
        break;
      case 'MAGNET':
        set({ buffMagnetUntil: until });
        break;
      case 'SPEED':
        set({ buffSpeedUntil: until });
        break;
      case 'SCORE_X2':
        set({ buffScoreX2Until: until });
        break;
    }
  },

  lang: loadLang(),
  setLang: (lang) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('runner.lang', lang);
    set({ lang });
  },
  toggleLang: () => {
    const next: Lang = get().lang === 'zh-CN' ? 'en-US' : 'zh-CN';
    if (typeof window !== 'undefined') window.localStorage.setItem('runner.lang', next);
    set({ lang: next });
  },

  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  startGame: () =>
    set({
      status: GameStatus.PLAYING,
      score: 0,
      lives: 6,
      maxLives: 6,
      speed: RUN_SPEED_BASE,
      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,

      isEndlessMode: false,
      canContinueEndless: false,
      buffReverseUntil: 0,
      buffMagnetUntil: 0,
      buffSpeedUntil: 0,
      buffScoreX2Until: 0,
    }),

  restartGame: () =>
    set({
      status: GameStatus.PLAYING,
      score: 0,
      lives: 6,
      maxLives: 6,
      speed: RUN_SPEED_BASE,
      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,
      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,

      isEndlessMode: false,
      canContinueEndless: false,
      buffReverseUntil: 0,
      buffMagnetUntil: 0,
      buffSpeedUntil: 0,
      buffScoreX2Until: 0,
    }),

  continueEndless: () => {
    const { speed } = get();
    set({
      status: GameStatus.PLAYING,
      isEndlessMode: true,
      canContinueEndless: false,
      collectedLetters: [],
      speed: Math.max(speed, RUN_SPEED_BASE * 2.0),
    });
  },

  takeDamage: () => {
    const { lives, isImmortalityActive } = get();
    if (isImmortalityActive) return;
    if (lives > 1) set({ lives: lives - 1 });
    else set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),

  collectGem: (value) =>
    set((state) => {
      const mult = get().isBuffActive('SCORE_X2') ? 2 : 1;
      return {
        score: state.score + value * mult,
        gemsCollected: state.gemsCollected + 1,
      };
    }),

  setDistance: (dist) => set({ distance: dist }),
  setSpeed: (speed) => set({ speed }),
  addSpeed: (amount) => set((s) => ({ speed: Math.max(0, s.speed + amount) })),

  collectLetter: (index) => {
    const { collectedLetters, level, speed, isEndlessMode } = get();
    if (isEndlessMode) return;

    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];
      const speedIncrease = RUN_SPEED_BASE * 0.1;
      const nextSpeed = speed + speedIncrease;

      set({ collectedLetters: newLetters, speed: nextSpeed });

      if (newLetters.length === GEMINI_TARGET.length) {
        if (level < MAX_LEVEL) {
          get().advanceLevel();
        } else {
          set({
            status: GameStatus.VICTORY,
            score: get().score + 5000,
            canContinueEndless: true,
          });
        }
      }
    }
  },

  advanceLevel: () => {
    const { level, laneCount, speed } = get();
    const nextLevel = level + 1;
    const speedIncrease = RUN_SPEED_BASE * 0.4;
    const newSpeed = speed + speedIncrease;

    set({
      level: nextLevel,
      laneCount: Math.min(laneCount + 2, 9),
      status: GameStatus.PLAYING,
      speed: newSpeed,
      collectedLetters: [],
    });
  },

  openShop: () => set({ status: GameStatus.SHOP }),
  closeShop: () => set({ status: GameStatus.PLAYING }),

  buyItem: (type, cost) => {
    const { score, maxLives, lives } = get();
    if (type === 'MAX_LIFE' && maxLives >= 6) return false;
    if (score < cost) return false;

    set({ score: score - cost });

    switch (type) {
      case 'DOUBLE_JUMP':
        set({ hasDoubleJump: true });
        break;
      case 'MAX_LIFE': {
        const nextMax = Math.min(maxLives + 1, 6);
        const nextLives = Math.min(lives + 1, nextMax);
        set({ maxLives: nextMax, lives: nextLives });
        break;
      }
      case 'HEAL':
        set({ lives: Math.min(lives + 1, maxLives) });
        break;
      case 'IMMORTAL':
        set({ hasImmortality: true });
        break;
    }
    return true;
  },

  activateImmortality: () => {
    const { hasImmortality, isImmortalityActive } = get();
    if (!hasImmortality || isImmortalityActive) return;

    set({ isImmortalityActive: true });
    setTimeout(() => set({ isImmortalityActive: false }), 5000);
  },

  setStatus: (status) => set({ status }),

  increaseLevel: () => set((state) => ({ level: state.level + 1 })),
}));
