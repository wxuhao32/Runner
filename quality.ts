/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type QualityTier = 'low' | 'medium' | 'high';

// Tiny heuristic to choose more mobile-friendly settings.
// Goal: avoid stutters on low-end / older mobile GPUs.
export function getQualityTier(): QualityTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'high';

  const nav: any = navigator as any;
  const mem: number = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : 8;
  const cores: number = typeof navigator.hardwareConcurrency === 'number' ? navigator.hardwareConcurrency : 8;

  const ua = (navigator.userAgent || '').toLowerCase();
  const isMobileUA = /mobi|android|iphone|ipad|ipod/.test(ua);
  const isTouch = (navigator.maxTouchPoints || 0) > 1;
  const isMobile = isMobileUA || isTouch;

  // Conservative: many phones report 4GB + 8 cores but still struggle with postprocessing.
  if (isMobile && (mem <= 4 || cores <= 4)) return 'low';
  if (isMobile) return 'medium';

  if (mem <= 4 || cores <= 4) return 'medium';
  return 'high';
}

export function isLowEnd(): boolean {
  return getQualityTier() === 'low';
}
