/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { GameStatus, PowerUpType, RUN_SPEED_BASE } from './types';
import type { Lang } from './i18n';

type GameMode = 'STORY' | 'ENDLESS';

interface GameState {
  status: GameStatus;
  mode: GameMode;

  score: number;
  lives: number;
  maxLives: number;

  /** Base run speed (before temporary multipliers). */
  speed: number;
  /** Temporary multiplier from buffs like SLOW/BOOST. */
  speedMultiplier: number;
  /** Temporary multiplier for score (e.g. SCORE_X2). */
  scoreMultiplier: number;

  collectedLetters: number[];
  level: number;
  laneCount: number;
  gemsCollected: number;
  distance: number;

  // UI / Settings
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;

  // Inventory / Abilities
  hasDoubleJump: boolean;
  hasImmortality: boolean;
  isImmortalityActive: boolean;

  // In-run buffs (pickups)
  isControlsInverted: boolean;
  isMagnetActive: boolean;
  shieldCharges: number;

  // Actions
  startGame: () => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  setSpeed: (speed: number) => void;

  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;

  // Powerups
  applyPowerUp: (type: PowerUpType) => void;

  // Legacy / debug (unused but kept for compatibility)
  increaseLevel: () => void;
}

const GEMINI_TARGET = ['G', 'E', 'M', 'I', 'N', 'I'];
const MAX_LEVEL = 3;

function loadLang(): Lang {
  if (typeof window === 'undefined') return 'zh-CN';
  const saved = window.localStorage.getItem('runner.lang');
  if (saved === 'zh-CN' || saved === 'en-US') return saved;

  // Fallback to browser language, defaulting to Chinese.
  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

// --- Buff timers (module-local) ---
let invertTimer: number | null = null;
let magnetTimer: number | null = null;
let scoreTimer: number | null = null;
let speedTimer: number | null = null;

const speedEffect = {
  slowUntil: 0,
  boostUntil: 0,
};

function recomputeSpeedMultiplier(set: (p: Partial<GameState>) => void) {
  const now = Date.now();
  const slowOn = speedEffect.slowUntil > now;
  const boostOn = speedEffect.boostUntil > now;

  let mult = 1;
  if (boostOn) mult *= 1.25;
  if (slowOn) mult *= 0.75;
  // Clamp to keep things sane.
  mult = Math.max(0.55, Math.min(1.45, mult));

  set({ speedMultiplier: mult });

  // Reschedule for next expiry.
  const next = Math.min(
    slowOn ? speedEffect.slowUntil : Infinity,
    boostOn ? speedEffect.boostUntil : Infinity,
  );
  if (next !== Infinity) {
    if (speedTimer) window.clearTimeout(speedTimer);
    speedTimer = window.setTimeout(() => recomputeSpeedMultiplier(set), Math.max(0, next - now) + 10);
  } else {
    if (speedTimer) window.clearTimeout(speedTimer);
    speedTimer = null;
  }
}

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  mode: 'STORY',

  score: 0,
  lives: 6,
  maxLives: 6,

  speed: 0,
  speedMultiplier: 1,
  scoreMultiplier: 1,

  collectedLetters: [],
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,

  // UI / Settings
  lang: loadLang(),
  setLang: (lang) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('runner.lang', lang);
    }
    set({ lang });
  },
  toggleLang: () => {
    const next: Lang = get().lang === 'zh-CN' ? 'en-US' : 'zh-CN';
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('runner.lang', next);
    }
    set({ lang: next });
  },

  // Abilities
  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  // In-run buffs
  isControlsInverted: false,
  isMagnetActive: false,
  shieldCharges: 0,

  startGame: () =>
    set({
      status: GameStatus.PLAYING,
      mode: 'STORY',

      score: 0,
      lives: 6,
      maxLives: 6,

      speed: RUN_SPEED_BASE,
      speedMultiplier: 1,
      scoreMultiplier: 1,

      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,

      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,

      isControlsInverted: false,
      isMagnetActive: false,
      shieldCharges: 0,
    }),

  restartGame: () =>
    set({
      status: GameStatus.PLAYING,
      mode: 'STORY',

      score: 0,
      lives: 6,
      maxLives: 6,

      speed: RUN_SPEED_BASE,
      speedMultiplier: 1,
      scoreMultiplier: 1,

      collectedLetters: [],
      level: 1,
      laneCount: 3,
      gemsCollected: 0,
      distance: 0,

      hasDoubleJump: false,
      hasImmortality: false,
      isImmortalityActive: false,

      isControlsInverted: false,
      isMagnetActive: false,
      shieldCharges: 0,
    }),

  takeDamage: () => {
    const { lives, isImmortalityActive, shieldCharges } = get();
    if (isImmortalityActive) return;

    // Shield absorbs one hit.
    if (shieldCharges > 0) {
      set({ shieldCharges: Math.max(0, shieldCharges - 1) });
      return;
    }

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
    }
  },

  addScore: (amount) => {
    const mult = get().scoreMultiplier;
    set((state) => ({ score: state.score + Math.floor(amount * mult) }));
  },

  collectGem: (value) => {
    const mult = get().scoreMultiplier;
    set((state) => ({
      score: state.score + Math.floor(value * mult),
      gemsCollected: state.gemsCollected + 1,
    }));
  },

  setDistance: (dist) => set({ distance: dist }),
  setSpeed: (speed) => set({ speed }),

  collectLetter: (index) => {
    const { collectedLetters, level, speed, mode } = get();

    // In ENDLESS mode letters are treated as simple score pickups.
    if (mode === 'ENDLESS') {
      get().addScore(250);
      return;
    }

    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];

      // Difficulty balance: reduce speed growth a bit for better mobile control.
      // Add 6% of BASE speed per letter: smooth, still rewarding.
      const speedIncrease = RUN_SPEED_BASE * 0.06;
      const nextSpeed = speed + speedIncrease;

      set({
        collectedLetters: newLetters,
        speed: nextSpeed,
      });

      // Check if full word collected
      if (newLetters.length === GEMINI_TARGET.length) {
        if (level < MAX_LEVEL) {
          get().advanceLevel();
        } else {
          // Story complete → seamlessly switch to ENDLESS.
          // Keep playing, remove the hard "VICTORY" stop to enable infinite run.
          set({
            mode: 'ENDLESS',
            status: GameStatus.PLAYING,
            score: get().score + 5000,
            collectedLetters: [],
          });
        }
      }
    }
  },

  advanceLevel: () => {
    const { level, laneCount, speed } = get();
    const nextLevel = level + 1;

    // Difficulty balance: level speed increase toned down.
    const speedIncrease = RUN_SPEED_BASE * 0.25;
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

    if (score >= cost) {
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
    }
    return false;
  },

  activateImmortality: () => {
    const { hasImmortality, isImmortalityActive } = get();
    if (hasImmortality && !isImmortalityActive) {
      set({ isImmortalityActive: true });
      window.setTimeout(() => set({ isImmortalityActive: false }), 5000);
    }
  },

  applyPowerUp: (type) => {
    const now = Date.now();

    switch (type) {
      case PowerUpType.SHIELD: {
        const cur = get().shieldCharges;
        set({ shieldCharges: Math.min(2, cur + 1) });
        break;
      }
      case PowerUpType.MAGNET: {
        if (magnetTimer) window.clearTimeout(magnetTimer);
        set({ isMagnetActive: true });
        magnetTimer = window.setTimeout(() => set({ isMagnetActive: false }), 6500);
        break;
      }
      case PowerUpType.INVERT: {
        if (invertTimer) window.clearTimeout(invertTimer);
        set({ isControlsInverted: true });
        invertTimer = window.setTimeout(() => set({ isControlsInverted: false }), 4500);
        break;
      }
      case PowerUpType.SCORE_X2: {
        if (scoreTimer) window.clearTimeout(scoreTimer);
        set({ scoreMultiplier: 2 });
        scoreTimer = window.setTimeout(() => set({ scoreMultiplier: 1 }), 6500);
        break;
      }
      case PowerUpType.SLOW: {
        speedEffect.slowUntil = Math.max(speedEffect.slowUntil, now + 5200);
        recomputeSpeedMultiplier(set);
        break;
      }
      case PowerUpType.BOOST: {
        speedEffect.boostUntil = Math.max(speedEffect.boostUntil, now + 4200);
        recomputeSpeedMultiplier(set);
        break;
      }
    }
  },

  setStatus: (status) => set({ status }),

  // Legacy / debug (unused)
  increaseLevel: () => set((state) => ({ level: state.level + 1 })),
}));
