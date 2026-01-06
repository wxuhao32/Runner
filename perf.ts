/**
 * Lightweight device/performance heuristics.
 * - No runtime deps
 * - Safe for mobile browsers
 */

export function isMobileLike(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const uaMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);

  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const noHover = typeof window.matchMedia === 'function' && window.matchMedia('(hover: none)').matches;

  return uaMobile || coarse || noHover;
}

export function isLowPerfDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const dpr = window.devicePixelRatio || 1;
  const cores = (navigator as any).hardwareConcurrency || 4;
  const mem = (navigator as any).deviceMemory || 4;

  // Heuristic: treat touch devices and/or low core/memory devices as "low perf".
  // (This is conservative to reduce stutter on phones.)
  const mobile = isMobileLike();
  return mobile || dpr >= 2 || cores <= 4 || mem <= 4;
}
