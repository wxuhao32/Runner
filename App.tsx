/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from './components/World/Environment';
import { Player } from './components/World/Player';
import { LevelManager } from './components/World/LevelManager';
import { Effects } from './components/World/Effects';
import { HUD } from './components/UI/HUD';
import { useStore } from './store';
import { useFullscreen } from './fullscreen';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;
};

// Dynamic Camera Controller
const CameraController = () => {
  const { camera, size } = useThree();
  const { laneCount } = useStore();

  useFrame((state, delta) => {
    const aspect = size.width / size.height;
    const isMobile = aspect < 1.2;

    const heightFactor = isMobile ? 2.0 : 0.5;
    const distFactor = isMobile ? 4.5 : 1.0;

    const extraLanes = Math.max(0, laneCount - 3);

    const targetY = 5.5 + extraLanes * heightFactor;
    const targetZ = 8.0 + extraLanes * distFactor;

    const targetPos = new THREE.Vector3(0, targetY, targetZ);
    camera.position.lerp(targetPos, delta * 2.0);
    camera.lookAt(0, 0, -30);
  });

  return null;
};

function Scene() {
  return (
    <>
      <Environment />
      <group>
        <group userData={{ isPlayer: true }} name="PlayerGroup">
          <Player />
        </group>
        <LevelManager />
      </group>
      <Effects />
    </>
  );
}

function App() {
  const { toggleLang } = useStore();
  const { supported: fsSupported, toggle: toggleFs } = useFullscreen('app-root');

  const mobile = useMemo(() => isMobileDevice(), []);
  const maxDpr = mobile ? 1.25 : 1.5;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyF') {
        if (fsSupported) void toggleFs();
      }
      if (e.code === 'KeyL') {
        toggleLang();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fsSupported, toggleFs, toggleLang]);

  return (
    <div id="app-root" className="relative w-full h-screen bg-black overflow-hidden select-none touch-none">
      <HUD />
      <Canvas
        shadows
        dpr={[1, maxDpr]}
        gl={{
          antialias: false,
          stencil: false,
          depth: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 5.5, 8], fov: 60 }}
      >
        <CameraController />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
