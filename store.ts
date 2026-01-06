/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { GameMode, GameStatus, PowerUpType, RUN_SPEED_BASE } from './types';
import type { Lang } from './i18n';

interface GameState {
  status: GameStatus;
  mode: GameMode;

  score: number;
  lives: number;
  maxLives: number;
  speed: number;

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

  // Buffs (局内道具)
  isShieldActive: boolean;
  isMagnetActive: boolean;
  isControlsReversed: boolean;
  isSlowMoActive: boolean;
  scoreMultiplier: number;
  lastPowerUp: PowerUpType | null;

  // Actions
  startGame: () => void;
  restartGame: () => void;
  takeDamage: () => void;
  addScore: (amount: number) => void;
  collectGem: (value: number) => void;
  collectLetter: (index: number) => void;
  setStatus: (status: GameStatus) => void;
  setDistance: (dist: number) => void;
  addSpeed: (delta: number) => void;

  // Shop / Abilities
  buyItem: (type: 'DOUBLE_JUMP' | 'MAX_LIFE' | 'HEAL' | 'IMMORTAL', cost: number) => boolean;
  advanceLevel: () => void;
  openShop: () => void;
  closeShop: () => void;
  activateImmortality: () => void;

  // PowerUp
  applyPowerUp: (p: PowerUpType) => void;

  // Endless
  startEndlessFromVictory: () => void;

  // Legacy / debug
  increaseLevel: () => void;
}

const GEMINI_TARGET = ['G', 'E', 'M', 'I', 'N', 'I'];
const MAX_LEVEL = 3;

function loadLang(): Lang {
  if (typeof window === 'undefined') return 'zh-CN';
  const saved = window.localStorage.getItem('runner.lang');
  if (saved === 'zh-CN' || saved === 'en-US') return saved;

  const nav = (navigator.language || '').toLowerCase();
  if (nav.startsWith('en')) return 'en-US';
  return 'zh-CN';
}

// 统一管理 Buff 的 timeout，避免重复叠加 & 重开后残留
const buffTimeouts: Partial<Record<PowerUpType, number>> = {};
let victorySpeedCache = RUN_SPEED_BASE;

function setBuff(
  set: any,
  p: PowerUpType,
  enablePatch: any,
  disablePatch: any,
  ms: number
) {
  if (typeof window !== 'undefined') {
    const existing = buffTimeouts[p];
    if (existing) window.clearTimeout(existing);
    set(enablePatch);
    buffTimeouts[p] = window.setTimeout(() => {
      set(disablePatch);
      buffTimeouts[p] = undefined;
    }, ms);
  } else {
    // SSR fallback
    set(enablePatch);
  }
}

function clearAllBuffTimers() {
  if (typeof window === 'undefined') return;
  (Object.keys(buffTimeouts) as PowerUpType[]).forEach((k) => {
    const id = buffTimeouts[k];
    if (id) window.clearTimeout(id);
    buffTimeouts[k] = undefined;
  });
}

export const useStore = create<GameState>((set, get) => ({
  status: GameStatus.MENU,
  mode: GameMode.STORY,

  score: 0,
  lives: 6,
  maxLives: 6,
  speed: 0,

  collectedLetters: [],
  level: 1,
  laneCount: 3,
  gemsCollected: 0,
  distance: 0,

  // UI / Settings
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

  // Abilities
  hasDoubleJump: false,
  hasImmortality: false,
  isImmortalityActive: false,

  // Buffs
  isShieldActive: false,
  isMagnetActive: false,
  isControlsReversed: false,
  isSlowMoActive: false,
  scoreMultiplier: 1,
  lastPowerUp: null,

  startGame: () => {
    clearAllBuffTimers();
    set({
      status: GameStatus.PLAYING,
      mode: GameMode.STORY,

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

      isShieldActive: false,
      isMagnetActive: false,
      isControlsReversed: false,
      isSlowMoActive: false,
      scoreMultiplier: 1,
      lastPowerUp: null,
    });
  },

  restartGame: () => {
    clearAllBuffTimers();
    set({
      status: GameStatus.PLAYING,
      mode: GameMode.STORY,

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

      isShieldActive: false,
      isMagnetActive: false,
      isControlsReversed: false,
      isSlowMoActive: false,
      scoreMultiplier: 1,
      lastPowerUp: null,
    });
  },

  takeDamage: () => {
    const { lives, isImmortalityActive, isShieldActive } = get();
    if (isImmortalityActive || isShieldActive) return;

    if (lives > 1) {
      set({ lives: lives - 1 });
    } else {
      set({ lives: 0, status: GameStatus.GAME_OVER, speed: 0 });
    }
  },

  addScore: (amount) => set((state) => ({ score: state.score + amount })),

  collectGem: (value) =>
    set((state) => ({
      score: state.score + value * state.scoreMultiplier,
      gemsCollected: state.gemsCollected + 1,
    })),

  setDistance: (dist) => set({ distance: dist }),

  addSpeed: (delta) => set((s) => ({ speed: Math.max(0, s.speed + delta) })),

  collectLetter: (index) => {
    const { collectedLetters, level, speed, mode } = get();
    if (mode !== GameMode.STORY) return;

    if (!collectedLetters.includes(index)) {
      const newLetters = [...collectedLetters, index];

      // 每个字母增加速度
      const speedIncrease = RUN_SPEED_BASE * 0.1;
      const nextSpeed = speed + speedIncrease;

      set({
        collectedLetters: newLetters,
        speed: nextSpeed,
      });

      if (newLetters.length === GEMINI_TARGET.length) {
        if (level < MAX_LEVEL) {
          get().advanceLevel();
        } else {
          // 胜利：暂停，让玩家选择“进入无限”
          victorySpeedCache = nextSpeed;
          set({
            status: GameStatus.VICTORY,
            speed: 0,
            score: get().score + 5000,
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
      setTimeout(() => set({ isImmortalityActive: false }), 5000);
    }
  },

  applyPowerUp: (p) => {
    // UI 快闪提示
    set({ lastPowerUp: p });
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        // 避免被后来的覆盖清掉：只清相同
        if (get().lastPowerUp === p) set({ lastPowerUp: null });
      }, 900);
    }

    switch (p) {
      case PowerUpType.MAGNET:
        setBuff(set, p, { isMagnetActive: true }, { isMagnetActive: false }, 6500);
        break;
      case PowerUpType.SHIELD:
        setBuff(set, p, { isShieldActive: true }, { isShieldActive: false }, 5200);
        break;
      case PowerUpType.REVERSE:
        setBuff(set, p, { isControlsReversed: true }, { isControlsReversed: false }, 7500);
        break;
      case PowerUpType.SLOWMO:
        setBuff(set, p, { isSlowMoActive: true }, { isSlowMoActive: false }, 4200);
        break;
      case PowerUpType.SCOREX2:
        setBuff(set, p, { scoreMultiplier: 2 }, { scoreMultiplier: 1 }, 8000);
        break;
    }
  },

  startEndlessFromVictory: () => {
    // 从胜利界面进入无限：恢复速度、切换模式、清空字母
    clearAllBuffTimers();
    const base = Math.max(RUN_SPEED_BASE * 1.6, victorySpeedCache * 1.1);
    set({
      status: GameStatus.PLAYING,
      mode: GameMode.ENDLESS,

      speed: base,
      collectedLetters: [],
      // 让关卡数字继续上涨当“难度等级”
      level: MAX_LEVEL + 1,
      // lanes 保持不变（或你想也可以继续增）
      scoreMultiplier: 1,

      isShieldActive: false,
      isMagnetActive: false,
      isControlsReversed: false,
      isSlowMoActive: false,
      lastPowerUp: null,
    });
  },

  setStatus: (status) => set({ status }),

  increaseLevel: () => set((state) => ({ level: state.level + 1 })),
}));

