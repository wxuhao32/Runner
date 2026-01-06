/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
}

export enum GameMode {
  STORY = 'STORY',
  ENDLESS = 'ENDLESS',
}

export enum ObjectType {
  OBSTACLE = 'OBSTACLE',
  GEM = 'GEM',
  LETTER = 'LETTER',
  SHOP_PORTAL = 'SHOP_PORTAL',
  ALIEN = 'ALIEN',
  MISSILE = 'MISSILE',
  POWERUP = 'POWERUP',
}

export enum PowerUpType {
  MAGNET = 'MAGNET', // 吸附
  SHIELD = 'SHIELD', // 护盾无敌
  REVERSE = 'REVERSE', // 操控反转
  SLOWMO = 'SLOWMO', // 子弹时间
  SCOREX2 = 'SCOREX2', // 双倍分
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;

  // Letter
  value?: string;
  targetIndex?: number;

  // Visual / points
  color?: string;
  points?: number;

  // Alien
  hasFired?: boolean;

  // PowerUp
  powerUp?: PowerUpType;
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 22.5;
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// Google-ish Neon Colors: Blue, Red, Yellow, Blue, Green, Red
export const GEMINI_COLORS = ['#2979ff', '#ff1744', '#ffea00', '#2979ff', '#00e676', '#ff1744'];

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: any; // Lucide icon component
  oneTime?: boolean;
}

