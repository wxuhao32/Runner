/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Zap,
  Trophy,
  MapPin,
  Diamond,
  Rocket,
  ArrowUpCircle,
  Shield,
  Activity,
  PlusCircle,
  Play,
  Languages,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { useStore } from '../../store';
import { GameMode, GameStatus, GEMINI_COLORS, ShopItem, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';
import { useFullscreen } from '../../fullscreen';
import { t } from '../../i18n';

// Available Shop Items
const SHOP_ITEMS: ShopItem[] = [
  { id: 'DOUBLE_JUMP', name: 'DOUBLE JUMP', description: 'Jump again in mid-air. Essential for high obstacles.', cost: 1000, icon: ArrowUpCircle, oneTime: true },
  { id: 'MAX_LIFE', name: 'MAX LIFE UP', description: 'Permanently adds a heart slot and heals you.', cost: 1500, icon: Activity },
  { id: 'HEAL', name: 'REPAIR KIT', description: 'Restores 1 Life point instantly.', cost: 1000, icon: PlusCircle },
  { id: 'IMMORTAL', name: 'IMMORTALITY', description: 'Unlock Ability: Press Space/Tap to be invincible for 5s.', cost: 3000, icon: Shield, oneTime: true },
];

const TopLeftControls: React.FC<{ variant?: 'absolute' | 'inline' }> = ({ variant = 'absolute' }) => {
  const { lang, toggleLang } = useStore();
  const { supported, isFullscreen, toggle } = useFullscreen('app-root');

  const wrapperClass =
    variant === 'absolute'
      ? 'absolute top-4 left-4 z-[120] pointer-events-auto flex gap-2'
      : 'pointer-events-auto flex gap-2';

  return (
    <div className={wrapperClass}>
      <button
        onClick={toggleLang}
        title={t(lang, 'ui.common.toggleLang')}
        className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all"
      >
        <Languages className="w-5 h-5 text-cyan-200" />
      </button>

      {supported && (
        <button
          onClick={() => void toggle()}
          title={isFullscreen ? t(lang, 'ui.common.exitFullscreen') : t(lang, 'ui.common.fullscreen')}
          className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-all"
        >
          {isFullscreen ? <Minimize2 className="w-5 h-5 text-cyan-200" /> : <Maximize2 className="w-5 h-5 text-cyan-200" />}
        </button>
      )}
    </div>
  );
};

const ShopScreen: React.FC = () => {
  const { score, buyItem, closeShop, hasDoubleJump, hasImmortality, lang, maxLives } = useStore();
  const [items, setItems] = useState<ShopItem[]>([]);

  useEffect(() => {
    let pool = SHOP_ITEMS.filter((item) => {
      if (item.id === 'DOUBLE_JUMP' && hasDoubleJump) return false;
      if (item.id === 'IMMORTAL' && hasImmortality) return false;
      if (item.id === 'MAX_LIFE' && maxLives >= 6) return false;
      return true;
    });

    pool = pool.sort(() => 0.5 - Math.random());
    setItems(pool.slice(0, 3));
  }, [hasDoubleJump, hasImmortality, maxLives]);

  return (
    <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
      <TopLeftControls />
      <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
        <h2 className="text-3xl md:text-4xl font-black text-cyan-400 mb-2 font-cyber tracking-widest text-center">
          {t(lang, 'ui.shop.title')}
        </h2>
        <div className="flex items-center text-yellow-400 mb-6 md:mb-8">
          <span className="text-base md:text-lg mr-2">{t(lang, 'ui.shop.credits')}</span>
          <span className="text-xl md:text-2xl font-bold">{score.toLocaleString()}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl w-full mb-8">
          {items.map((item) => {
            const Icon = item.icon;
            const canAfford = score >= item.cost;
            const isMaxed = item.id === 'MAX_LIFE' && maxLives >= 6;
            const isDisabled = !canAfford || isMaxed;
            const nameKey = `shop.item.${item.id}.name` as any;
            const descKey = `shop.item.${item.id}.desc` as any;

            return (
              <div
                key={item.id}
                className="bg-gray-900/80 border border-gray-700 p-4 md:p-6 rounded-xl flex flex-col items-center text-center hover:border-cyan-500 transition-colors"
              >
                <div className="bg-gray-800 p-3 md:p-4 rounded-full mb-3 md:mb-4">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-cyan-400" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-2">{t(lang, nameKey)}</h3>
                <p className="text-gray-400 text-xs md:text-sm mb-4 h-10 md:h-12 flex items-center justify-center">
                  {t(lang, descKey)}
                </p>
                <button
                  onClick={() => buyItem(item.id as any, item.cost)}
                  disabled={isDisabled}
                  className={`px-4 md:px-6 py-2 rounded font-bold w-full text-sm md:text-base ${
                    !isDisabled ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110' : 'bg-gray-700 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isMaxed ? t(lang, 'ui.shop.maxed') : (
                    <>
                      {item.cost} {t(lang, 'ui.shop.buyUnit')}
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={closeShop}
          className="flex items-center px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,0,255,0.4)]"
        >
          {t(lang, 'ui.shop.resume')} <Play className="ml-2 w-5 h-5" fill="white" />
        </button>
      </div>
    </div>
  );
};

export const HUD: React.FC = () => {
  const {
    score,
    lives,
    maxLives,
    collectedLetters,
    status,
    level,
    restartGame,
    startGame,
    gemsCollected,
    distance,
    isImmortalityActive,
    speed,
    lang,

    // new
    mode,
    isShieldActive,
    isMagnetActive,
    isControlsReversed,
    isSlowMoActive,
    scoreMultiplier,
    lastPowerUp,
    startEndlessFromVictory,
  } = useStore();

  const target = ['G', 'E', 'M', 'I', 'N', 'I'];
  const containerClass = 'absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-8 z-50';

  if (status === GameStatus.SHOP) return <ShopScreen />;

  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/80 backdrop-blur-sm p-4 pointer-events-auto">
        <TopLeftControls />
        <div className="relative w-full max-w-md rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,255,255,0.2)] border border-white/10 animate-in zoom-in-95 duration-500">
          <div className="relative w-full bg-gray-900">
            <img
              src="https://www.gstatic.com/aistudio/starter-apps/gemini_runner/gemini_runner.png"
              alt="Gemini Runner Cover"
              className="w-full h-auto block"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050011] via-black/30 to-transparent"></div>
            <div className="absolute inset-0 flex flex-col justify-end items-center p-6 pb-8 text-center z-10">
              <button
                onClick={() => {
                  audio.init();
                  startGame();
                }}
                className="w-full group relative px-6 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-black text-xl rounded-xl hover:bg-white/20 transition-all shadow-[0_0_20px_rgba(0,255,255,0.2)] hover:shadow-[0_0_30px_rgba(0,255,255,0.4)] hover:border-cyan-400 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/40 via-purple-500/40 to-pink-500/40 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 tracking-widest flex items-center justify-center">
                  {t(lang, 'ui.menu.start')} <Play className="ml-2 w-5 h-5 fill-white" />
                </span>
              </button>

              <p className="text-cyan-400/60 text-[10px] md:text-xs font-mono mt-3 tracking-wider">
                {t(lang, 'ui.menu.controlsHint')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 bg-black/90 z-[100] text-white pointer-events-auto backdrop-blur-sm overflow-y-auto">
        <TopLeftControls />
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] font-cyber text-center">
            {t(lang, 'ui.gameOver.title')}
          </h1>

          <div className="grid grid-cols-1 gap-3 md:gap-4 text-center mb-8 w-full max-w-md">
            <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
              <div className="flex items-center text-yellow-400 text-sm md:text-base">
                <Trophy className="mr-2 w-4 h-4 md:w-5 md:h-5" /> {t(lang, 'ui.gameOver.level')}
              </div>
              <div className="text-xl md:text-2xl font-bold font-mono">{level} / 3</div>
            </div>
            <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
              <div className="flex items-center text-cyan-400 text-sm md:text-base">
                <Diamond className="mr-2 w-4 h-4 md:w-5 md:h-5" /> {t(lang, 'ui.gameOver.gemsCollected')}
              </div>
              <div className="text-xl md:text-2xl font-bold font-mono">{gemsCollected}</div>
            </div>
            <div className="bg-gray-900/80 p-3 md:p-4 rounded-lg border border-gray-700 flex items-center justify-between">
              <div className="flex items-center text-purple-400 text-sm md:text-base">
                <MapPin className="mr-2 w-4 h-4 md:w-5 md:h-5" /> {t(lang, 'ui.gameOver.distance')}
              </div>
              <div className="text-xl md:text-2xl font-bold font-mono">{Math.floor(distance)} LY</div>
            </div>
            <div className="bg-gray-800/50 p-3 md:p-4 rounded-lg flex items-center justify-between mt-2">
              <div className="flex items-center text-white text-sm md:text-base">{t(lang, 'ui.gameOver.totalScore')}</div>
              <div className="text-2xl md:text-3xl font-bold font-cyber text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                {score.toLocaleString()}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              audio.init();
              restartGame();
            }}
            className="px-8 md:px-10 py-3 md:py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_20px_rgba(0,255,255,0.4)]"
          >
            {t(lang, 'ui.gameOver.runAgain')}
          </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    const endlessText = lang === 'zh-CN' ? '进入无限模式' : 'Enter Endless Mode';
    const restartText = lang === 'zh-CN' ? '重新开始' : 'Restart';

    return (
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/90 to-black/95 z-[100] text-white pointer-events-auto backdrop-blur-md overflow-y-auto">
        <TopLeftControls />
        <div className="flex flex-col items-center justify-center min-h-full py-8 px-4">
          <Rocket className="w-16 h-16 md:w-24 md:h-24 text-yellow-400 mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.6)]" />
          <h1 className="text-3xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-pink-500 mb-2 drop-shadow-[0_0_20px_rgba(255,165,0,0.6)] font-cyber text-center leading-tight">
            {t(lang, 'ui.victory.title')}
          </h1>
          <p className="text-cyan-300 text-sm md:text-2xl font-mono mb-8 tracking-widest text-center">
            {t(lang, 'ui.victory.subtitle')}
          </p>

          <div className="grid grid-cols-1 gap-4 text-center mb-8 w-full max-w-md">
            <div className="bg-black/60 p-6 rounded-xl border border-yellow-500/30 shadow-[0_0_15px_rgba(255,215,0,0.1)]">
              <div className="text-xs md:text-sm text-gray-400 mb-1 tracking-wider">{t(lang, 'ui.victory.finalScore')}</div>
              <div className="text-3xl md:text-4xl font-bold font-cyber text-yellow-400">{score.toLocaleString()}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/60 p-4 rounded-lg border border-white/10">
                <div className="text-xs text-gray-400">{t(lang, 'ui.victory.gems')}</div>
                <div className="text-xl md:text-2xl font-bold text-cyan-400">{gemsCollected}</div>
              </div>
              <div className="bg-black/60 p-4 rounded-lg border border-white/10">
                <div className="text-xs text-gray-400">{t(lang, 'ui.victory.distance')}</div>
                <div className="text-xl md:text-2xl font-bold text-purple-400">{Math.floor(distance)} LY</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-md">
            <button
              onClick={() => {
                audio.init();
                startEndlessFromVictory();
              }}
              className="px-8 md:px-12 py-4 md:py-5 bg-gradient-to-r from-cyan-400 to-blue-600 text-black font-black text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_40px_rgba(0,255,255,0.35)] tracking-widest"
            >
              {endlessText}
            </button>

            <button
              onClick={() => {
                audio.init();
                restartGame();
              }}
              className="px-8 md:px-12 py-4 md:py-5 bg-white text-black font-black text-lg md:text-xl rounded hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] tracking-widest"
            >
              {restartText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const effectiveSpeed = speed * (isSlowMoActive ? 0.65 : 1);
  const levelText = mode === GameMode.ENDLESS ? (lang === 'zh-CN' ? '∞' : '∞') : `${level}`;

  return (
    <>
      <div className={containerClass}>
        {/* Top Bar */}
        <div className="flex justify-between items-start w-full">
          <div className="flex flex-col">
            <TopLeftControls variant="inline" />
            <div className="text-3xl md:text-5xl font-bold text-cyan-400 drop-shadow-[0_0_10px_#00ffff] font-cyber">
              {score.toLocaleString()}
            </div>

            {/* Buff badges */}
            <div className="pointer-events-none mt-2 flex gap-2 flex-wrap">
              {isShieldActive && <span className="px-2 py-1 text-xs rounded bg-yellow-400/20 border border-yellow-400/40 text-yellow-200">SHIELD</span>}
              {isMagnetActive && <span className="px-2 py-1 text-xs rounded bg-cyan-400/20 border border-cyan-400/40 text-cyan-200">MAGNET</span>}
              {isControlsReversed && <span className="px-2 py-1 text-xs rounded bg-pink-400/20 border border-pink-400/40 text-pink-200">{lang === 'zh-CN' ? '反转' : 'REVERSE'}</span>}
              {isSlowMoActive && <span className="px-2 py-1 text-xs rounded bg-green-400/20 border border-green-400/40 text-green-200">{lang === 'zh-CN' ? '慢动作' : 'SLOW'}</span>}
              {scoreMultiplier > 1 && <span className="px-2 py-1 text-xs rounded bg-yellow-300/20 border border-yellow-300/40 text-yellow-100">x{scoreMultiplier}</span>}
              {lastPowerUp && <span className="px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white/80">{lastPowerUp}</span>}
            </div>
          </div>

          <div className="flex space-x-1 md:space-x-2">
            {[...Array(maxLives)].map((_, i) => (
              <Heart
                key={i}
                className={`w-6 h-6 md:w-8 md:h-8 ${
                  i < lives ? 'text-pink-500 fill-pink-500' : 'text-gray-800 fill-gray-800'
                } drop-shadow-[0_0_5px_#ff0054]`}
              />
            ))}
          </div>
        </div>

        {/* Level Indicator */}
        <div className="absolute top-5 left-1/2 transform -translate-x-1/2 text-sm md:text-lg text-purple-300 font-bold tracking-wider font-mono bg-black/50 px-3 py-1 rounded-full border border-purple-500/30 backdrop-blur-sm z-50">
          {t(lang, 'ui.hud.level')} {levelText} <span className="text-gray-500 text-xs md:text-sm">{mode === GameMode.ENDLESS ? '' : '/ 3'}</span>
        </div>

        {/* Active Skill Indicator */}
        {isImmortalityActive && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 text-yellow-400 font-bold text-xl md:text-2xl animate-pulse flex items-center drop-shadow-[0_0_10px_gold]">
            <Shield className="mr-2 fill-yellow-400" /> {t(lang, 'ui.hud.immortal')}
          </div>
        )}

        {/* Gemini Collection Status (Endless 不显示字母进度) */}
        {mode !== GameMode.ENDLESS && (
          <div className="absolute top-16 md:top-24 left-1/2 transform -translate-x-1/2 flex space-x-2 md:space-x-3">
            {target.map((char, idx) => {
              const isCollected = collectedLetters.includes(idx);
              const color = GEMINI_COLORS[idx];

              return (
                <div
                  key={idx}
                  style={{
                    borderColor: isCollected ? color : 'rgba(55, 65, 81, 1)',
                    color: isCollected ? 'rgba(0, 0, 0, 0.8)' : 'rgba(55, 65, 81, 1)',
                    boxShadow: isCollected ? `0 0 20px ${color}` : 'none',
                    backgroundColor: isCollected ? color : 'rgba(0, 0, 0, 0.9)',
                  }}
                  className="w-8 h-10 md:w-10 md:h-12 flex items-center justify-center border-2 font-black text-lg md:text-xl font-cyber rounded-lg transform transition-all duration-300"
                >
                  {char}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Overlay - Speed Indicator */}
        <div className="w-full flex justify-end items-end mb-24 lg:mb-0">
          <div className="flex items-center space-x-2 text-cyan-500 opacity-70">
            <Zap className="w-4 h-4 md:w-6 md:h-6 animate-pulse" />
            <span className="font-mono text-base md:text-xl">
              {t(lang, 'ui.hud.speed')} {Math.round((effectiveSpeed / RUN_SPEED_BASE) * 100)}%
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
