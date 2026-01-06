import { useCallback, useEffect, useMemo, useState } from 'react';

function getFullscreenElement(): Element | null {
  const d: any = document;
  return (
    document.fullscreenElement ||
    d.webkitFullscreenElement ||
    d.mozFullScreenElement ||
    d.msFullscreenElement ||
    null
  );
}

function getRequestFullscreen(el: HTMLElement): (() => Promise<void> | void) | null {
  const anyEl: any = el;
  return (
    anyEl.requestFullscreen ||
    anyEl.webkitRequestFullscreen ||
    anyEl.mozRequestFullScreen ||
    anyEl.msRequestFullscreen ||
    null
  );
}

function getExitFullscreen(): (() => Promise<void> | void) | null {
  const d: any = document;
  return (
    document.exitFullscreen ||
    d.webkitExitFullscreen ||
    d.mozCancelFullScreen ||
    d.msExitFullscreen ||
    null
  );
}

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  return !!getFullscreenElement();
}

export function isFullscreenSupported(): boolean {
  if (typeof document === 'undefined') return false;
  return !!(getRequestFullscreen(document.documentElement) && getExitFullscreen());
}

export async function enterFullscreen(target?: HTMLElement): Promise<boolean> {
  if (!isFullscreenSupported()) return false;
  const el = target ?? document.documentElement;
  const fn = getRequestFullscreen(el);
  try {
    await fn?.call(el);
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen(): Promise<boolean> {
  if (!isFullscreenSupported()) return false;
  const fn = getExitFullscreen();
  try {
    await fn?.call(document);
    return true;
  } catch {
    return false;
  }
}

export function useFullscreen(targetId?: string) {
  const [active, setActive] = useState<boolean>(() => (typeof document === 'undefined' ? false : isFullscreen()));

  const supported = useMemo(() => (typeof document === 'undefined' ? false : isFullscreenSupported()), []);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const onChange = () => setActive(isFullscreen());

    document.addEventListener('fullscreenchange', onChange);
    // Vendor events (best-effort)
    (document as any).addEventListener?.('webkitfullscreenchange', onChange);
    (document as any).addEventListener?.('mozfullscreenchange', onChange);
    (document as any).addEventListener?.('MSFullscreenChange', onChange);

    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      (document as any).removeEventListener?.('webkitfullscreenchange', onChange);
      (document as any).removeEventListener?.('mozfullscreenchange', onChange);
      (document as any).removeEventListener?.('MSFullscreenChange', onChange);
    };
  }, []);

  const toggle = useCallback(async () => {
    if (!supported) return;
    const target = targetId ? (document.getElementById(targetId) as HTMLElement | null) : null;
    if (isFullscreen()) {
      await exitFullscreen();
    } else {
      await enterFullscreen(target ?? undefined);
    }
  }, [supported, targetId]);

  return { supported, isFullscreen: active, toggle };
}
