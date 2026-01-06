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
import { isLowPerfDevice } from './perf';

// Dynamic Camera Controller
const CameraController = () => {
  const { camera, size } = useThree();
  const { laneCount } = useStore();

  useFrame((state, delta) => {
    // Determine if screen is narrow (mobile portrait)
    const aspect = size.width / size.height;
    const isMobile = aspect < 1.2; // Threshold for "mobile-like" narrowness or square-ish displays

    // Calculate expansion factors
    // Mobile requires backing up significantly more because vertical FOV is fixed in Three.js,
    // meaning horizontal view shrinks as aspect ratio drops.
    // We use more aggressive multipliers for mobile to keep outer lanes in frame.
    const heightFactor = isMobile ? 2.0 : 0.5;
    const distFactor = isMobile ? 4.5 : 1.0;

    // Base (3 lanes): y=5.5, z=8
    // Calculate target based on how many extra lanes we have relative to the start
    const extraLanes = Math.max(0, laneCount - 3);

    const targetY = 5.5 + extraLanes * heightFactor;
    const targetZ = 8.0 + extraLanes * distFactor;

    const targetPos = new THREE.Vector3(0, targetY, targetZ);

    // Smoothly interpolate camera position
    camera.position.lerp(targetPos, delta * 2.0);

    // Look further down the track to see the end of lanes
    // Adjust look target slightly based on height to maintain angle
    camera.lookAt(0, 0, -30);
  });

  return null;
};

function Scene({ lowPerf }: { lowPerf: boolean }) {
  return (
    <>
      <Environment />
      <group>
        {/* Attach a userData to identify player group for LevelManager collision logic */}
        <group userData={{ isPlayer: true }} name="PlayerGroup">
          <Player />
        </group>
        <LevelManager />
      </group>
      {!lowPerf && <Effects />}
    </>
  );
}

function App() {
  const { toggleLang } = useStore();
  const { supported: fsSupported, toggle: toggleFs } = useFullscreen('app-root');
  const lowPerf = useMemo(() => isLowPerfDevice(), []);

  // Keyboard shortcuts:
  // - F: toggle fullscreen
  // - L: toggle language
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
        shadows={false}
        dpr={[1, lowPerf ? 1 : 1.35]}
        gl={{ antialias: false, stencil: false, depth: true, powerPreference: lowPerf ? 'low-power' : 'high-performance' }}
        // Initial camera, matches the controller base
        camera={{ position: [0, 5.5, 8], fov: 60 }}
      >
        <CameraController />
        <Suspense fallback={null}>
          <Scene lowPerf={lowPerf} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default App;
