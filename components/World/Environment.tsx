/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;
};

const StarField: React.FC = () => {
  const speed = useStore((s) => s.speed);
  const isSlowMoActive = useStore((s) => s.isSlowMoActive);

  const mobile = isMobileDevice();
  const count = mobile ? 1500 : 3000;

  const meshRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      let x = (Math.random() - 0.5) * 400;
      let y = (Math.random() - 0.5) * 200 + 50;
      let z = -550 + Math.random() * 650;

      if (Math.abs(x) < 15 && y > -5 && y < 20) {
        if (x < 0) x -= 15;
        else x += 15;
      }

      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    return pos;
  }, [count]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const arr = meshRef.current.geometry.attributes.position.array as Float32Array;

    const effectiveSpeed = (speed > 0 ? speed : 2) * (isSlowMoActive ? 0.65 : 1);

    for (let i = 0; i < count; i++) {
      let z = arr[i * 3 + 2];
      z += effectiveSpeed * delta * 2.0;

      if (z > 100) {
        z = -550 - Math.random() * 50;

        let x = (Math.random() - 0.5) * 400;
        let y = (Math.random() - 0.5) * 200 + 50;

        if (Math.abs(x) < 15 && y > -5 && y < 20) {
          if (x < 0) x -= 15;
          else x += 15;
        }

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
      }

      arr[i * 3 + 2] = z;
    }

    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.5} color="#ffffff" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
};

const LaneGuides: React.FC = () => {
  const { laneCount } = useStore();

  const separators = useMemo(() => {
    const lines: number[] = [];
    const startX = -(laneCount * LANE_WIDTH) / 2;
    for (let i = 0; i <= laneCount; i++) lines.push(startX + i * LANE_WIDTH);
    return lines;
  }, [laneCount]);

  return (
    <group position={[0, 0.02, 0]}>
      <mesh position={[0, -0.02, -20]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[laneCount * LANE_WIDTH, 200]} />
        <meshBasicMaterial color="#1a0b2e" transparent opacity={0.9} />
      </mesh>

      {separators.map((x, i) => (
        <mesh key={`sep-${i}`} position={[x, 0, -20]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.05, 200]} />
          <meshBasicMaterial color="#00ffff" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const RetroSun: React.FC = () => {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const sunGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (matRef.current) matRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (sunGroupRef.current) {
      sunGroupRef.current.position.y = 30 + Math.sin(state.clock.elapsedTime * 0.2) * 1.0;
      sunGroupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uColorTop: { value: new THREE.Color('#ffe600') },
      uColorBottom: { value: new THREE.Color('#ff0077') },
    }),
    []
  );

  return (
    <group ref={sunGroupRef} position={[0, 30, -180]}>
      <mesh>
        <sphereGeometry args={[35, 32, 32]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          transparent
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;
            uniform float uTime;
            uniform vec3 uColorTop;
            uniform vec3 uColorBottom;

            void main() {
              vec3 color = mix(uColorBottom, uColorTop, vUv.y);
              float stripeFreq = 40.0;
              float stripeSpeed = 1.0;
              float stripes = sin((vUv.y * stripeFreq) - (uTime * stripeSpeed));
              float stripeMask = smoothstep(0.2, 0.3, stripes);
              float scanlineFade = smoothstep(0.7, 0.3, vUv.y);
              vec3 finalColor = mix(color, color * 0.1, (1.0 - stripeMask) * scanlineFade);
              gl_FragColor = vec4(finalColor, 1.0);
            }
          `}
        />
      </mesh>
    </group>
  );
};

const MovingGrid: React.FC = () => {
  const speed = useStore((s) => s.speed);
  const isSlowMoActive = useStore((s) => s.isSlowMoActive);
  const meshRef = useRef<THREE.Mesh>(null);
  const offsetRef = useRef(0);

  const mobile = isMobileDevice();
  const segX = mobile ? 22 : 30;
  const segZ = mobile ? 28 : 40;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const effectiveSpeed = (speed > 0 ? speed : 5) * (isSlowMoActive ? 0.65 : 1);

    offsetRef.current += effectiveSpeed * delta;
    const cellSize = 10;

    const zPos = -100 + (offsetRef.current % cellSize);
    meshRef.current.position.z = zPos;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, -100]}>
      <planeGeometry args={[300, 400, segX, segZ]} />
      <meshBasicMaterial color="#8800ff" wireframe transparent opacity={0.15} />
    </mesh>
  );
};

export const Environment: React.FC = () => {
  return (
    <>
      <color attach="background" args={['#050011']} />
      <fog attach="fog" args={['#050011', 40, 160]} />

      <ambientLight intensity={0.2} color="#400080" />
      <directionalLight position={[0, 20, -10]} intensity={1.5} color="#00ffff" />
      <pointLight position={[0, 25, -150]} intensity={2} color="#ff00aa" distance={200} decay={2} />

      <StarField />
      <MovingGrid />
      <LaneGuides />
      <RetroSun />
    </>
  );
};
