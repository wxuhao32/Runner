/**
 * Simple i18n helper (no runtime deps).
 * Default language: zh-CN.
 */

export type Lang = 'zh-CN' | 'en-US';

export type I18nKey = keyof typeof DICTS['en-US'];

const DICTS = {
  'en-US': {
    // Common
    'ui.common.fullscreen': 'Fullscreen',
    'ui.common.exitFullscreen': 'Exit fullscreen',
    'ui.common.toggleLang': '中文 / English',

    // Menu
    'ui.menu.start': 'INITIALIZE RUN',
    'ui.menu.controlsHint': '[ SWIPE ←/→: CHANGE LANE · SWIPE ↑: JUMP · TAP: SKILL ]',

    // Shop
    'ui.shop.title': 'CYBER SHOP',
    'ui.shop.credits': 'AVAILABLE CREDITS:',
    'ui.shop.buyUnit': 'GEMS',
    'ui.shop.maxed': 'MAX',
    'ui.shop.resume': 'RESUME MISSION',

    // Shop items
    'shop.item.DOUBLE_JUMP.name': 'DOUBLE JUMP',
    'shop.item.DOUBLE_JUMP.desc': 'Jump again in mid-air. Essential for high obstacles.',
    'shop.item.MAX_LIFE.name': 'MAX LIFE UP',
    'shop.item.MAX_LIFE.desc': 'Permanently adds a heart slot and heals you.',
    'shop.item.HEAL.name': 'REPAIR KIT',
    'shop.item.HEAL.desc': 'Restores 1 Life point instantly.',
    'shop.item.IMMORTAL.name': 'IMMORTALITY',
    'shop.item.IMMORTAL.desc': 'Unlock Ability: Tap to be invincible for 5s.',

    // Game over
    'ui.gameOver.title': 'GAME OVER',
    'ui.gameOver.level': 'LEVEL',
    'ui.gameOver.gemsCollected': 'GEMS COLLECTED',
    'ui.gameOver.distance': 'DISTANCE',
    'ui.gameOver.totalScore': 'TOTAL SCORE',
    'ui.gameOver.runAgain': 'RUN AGAIN',

    // Victory
    'ui.victory.title': 'MISSION COMPLETE',
    'ui.victory.subtitle': 'THE ANSWER TO THE UNIVERSE HAS BEEN FOUND',
    'ui.victory.finalScore': 'FINAL SCORE',
    'ui.victory.gems': 'GEMS',
    'ui.victory.distance': 'DISTANCE',
    'ui.victory.restart': 'RESTART MISSION',

    // HUD
    'ui.hud.level': 'LEVEL',
    'ui.hud.immortal': 'IMMORTAL',
    'ui.hud.speed': 'SPEED',
  },
  'zh-CN': {
    // Common
    'ui.common.fullscreen': '全屏',
    'ui.common.exitFullscreen': '退出全屏',
    'ui.common.toggleLang': '中文 / English',

    // Menu
    'ui.menu.start': '开始游戏',
    'ui.menu.controlsHint': '[ 左右滑动换道 · 上滑跳跃 · 点击触发技能 ]',

    // Shop
    'ui.shop.title': '赛博商店',
    'ui.shop.credits': '可用积分：',
    'ui.shop.buyUnit': '宝石',
    'ui.shop.maxed': '已满',
    'ui.shop.resume': '继续任务',

    // Shop items
    'shop.item.DOUBLE_JUMP.name': '二段跳',
    'shop.item.DOUBLE_JUMP.desc': '空中可以再跳一次，高障碍必备。',
    'shop.item.MAX_LIFE.name': '生命上限 +1',
    'shop.item.MAX_LIFE.desc': '永久增加一格生命，并立刻回复。',
    'shop.item.HEAL.name': '修理包',
    'shop.item.HEAL.desc': '立即恢复 1 点生命。',
    'shop.item.IMMORTAL.name': '不朽',
    'shop.item.IMMORTAL.desc': '解锁技能：点击屏幕触发 5 秒无敌。',

    // Game over
    'ui.gameOver.title': '游戏结束',
    'ui.gameOver.level': '关卡',
    'ui.gameOver.gemsCollected': '收集宝石',
    'ui.gameOver.distance': '距离',
    'ui.gameOver.totalScore': '总分',
    'ui.gameOver.runAgain': '再跑一次',

    // Victory
    'ui.victory.title': '任务完成',
    'ui.victory.subtitle': '已找到宇宙的答案',
    'ui.victory.finalScore': '最终得分',
    'ui.victory.gems': '宝石',
    'ui.victory.distance': '距离',
    'ui.victory.restart': '重新开始',

    // HUD
    'ui.hud.level': '关卡',
    'ui.hud.immortal': '无敌',
    'ui.hud.speed': '速度',
  },
} as const;

export function t(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? DICTS['zh-CN'];
  let text = dict[key] ?? (DICTS['en-US'] as any)[key] ?? String(key);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}