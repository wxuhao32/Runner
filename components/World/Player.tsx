/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

const GRAVITY = 50;
const JUMP_FORCE = 16;

const TORSO_GEO = new THREE.CylinderGeometry(0.25, 0.15, 0.6, 4);
const JETPACK_GEO = new THREE.BoxGeometry(0.3, 0.4, 0.15);
const GLOW_STRIP_GEO = new THREE.PlaneGeometry(0.05, 0.2);
const HEAD_GEO = new THREE.BoxGeometry(0.25, 0.3, 0.3);
const ARM_GEO = new THREE.BoxGeometry(0.12, 0.6, 0.12);
const JOINT_SPHERE_GEO = new THREE.SphereGeometry(0.07);
const HIPS_GEO = new THREE.CylinderGeometry(0.16, 0.16, 0.2);
const LEG_GEO = new THREE.BoxGeometry(0.15, 0.7, 0.15);
const SHADOW_GEO = new THREE.CircleGeometry(0.5, 24);

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);

  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  const {
    status,
    laneCount,
    takeDamage,
    hasDoubleJump,
    activateImmortality,
    isImmortalityActive,
    isShieldActive,
    isControlsReversed,
  } = useStore();

  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);

  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0);
  const spinRotation = useRef(0);

  const pointerDown = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const jumpTriggered = useRef(false);

  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  const { armorMaterial, jointMaterial, glowMaterial, shadowMaterial } = useMemo(() => {
    const strongInv = isImmortalityActive || isShieldActive;
    const armorColor = strongInv ? '#ffd700' : '#00aaff';
    const glowColor = strongInv ? '#ffffff' : '#00ffff';

    return {
      armorMaterial: new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.3, metalness: 0.8 }),
      jointMaterial: new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.7, metalness: 0.5 }),
      glowMaterial: new THREE.MeshBasicMaterial({ color: glowColor }),
      shadowMaterial: new THREE.MeshBasicMaterial({ color: '#000000', opacity: 0.3, transparent: true }),
    };
  }, [isImmortalityActive, isShieldActive]);

  useEffect(() => {
    if (status === GameStatus.PLAYING) {
      isJumping.current = false;
      jumpsPerformed.current = 0;
      velocityY.current = 0;
      spinRotation.current = 0;
      if (groupRef.current) groupRef.current.position.y = 0;
      if (bodyRef.current) bodyRef.current.rotation.x = 0;
    }
  }, [status]);

  useEffect(() => {
    const maxLane = Math.floor(laneCount / 2);
    if (Math.abs(lane) > maxLane) {
      setLane((l) => Math.max(Math.min(l, maxLane), -maxLane));
    }
  }, [laneCount, lane]);

  const moveLane = (dir: -1 | 1) => {
    const maxLane = Math.floor(laneCount / 2);
    const realDir = isControlsReversed ? (dir === -1 ? 1 : -1) : dir;
    setLane((l) => Math.max(Math.min(l + realDir, maxLane), -maxLane));
  };

  const triggerJump = () => {
    const maxJumps = hasDoubleJump ? 2 : 1;

    if (!isJumping.current) {
      audio.playJump(false);
      isJumping.current = true;
      jumpsPerformed.current = 1;
      velocityY.current = JUMP_FORCE;
    } else if (jumpsPerformed.current < maxJumps) {
      audio.playJump(true);
      jumpsPerformed.current += 1;
      velocityY.current = JUMP_FORCE;
      spinRotation.current = 0;
    }
  };

  // 指针事件：比 touchend 更跟手（滑动过程中就触发变道）
  useEffect(() => {
    const opts: AddEventListenerOptions = { passive: false };

    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      if (status !== GameStatus.PLAYING) return;

      pointerDown.current = true;
      jumpTriggered.current = false;

      startX.current = e.clientX;
      startY.current = e.clientY;

      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!pointerDown.current) return;
      if ((e.target as HTMLElement).closest('button')) return;
      if (status !== GameStatus.PLAYING) return;

      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;

      // 横向：每超过阈值就立刻变道，并重置起点实现“连续变道”
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 38) {
        moveLane(dx > 0 ? 1 : -1);
        startX.current = e.clientX; // 重置，让连续变道更自然
      }

      // 上滑：即时跳（只触发一次，避免抖动）
      if (!jumpTriggered.current && Math.abs(dy) > Math.abs(dx) && dy < -46) {
        triggerJump();
        jumpTriggered.current = true;
      }

      e.preventDefault();
    };

    const onUp = (e: PointerEvent) => {
      if (!pointerDown.current) return;
      pointerDown.current = false;

      // 轻点：触发技能（避免误触按钮）
      const dx = e.clientX - startX.current;
      const dy = e.clientY - startY.current;
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
        if (!(e.target as HTMLElement).closest('button')) {
          activateImmortality();
        }
      }
    };

    window.addEventListener('pointerdown', onDown, opts);
    window.addEventListener('pointermove', onMove, opts);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality, isControlsReversed]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX.current, delta * 18);

    if (isJumping.current) {
      groupRef.current.position.y += velocityY.current * delta;
      velocityY.current -= GRAVITY * delta;

      if (groupRef.current.position.y <= 0) {
        groupRef.current.position.y = 0;
        isJumping.current = false;
        jumpsPerformed.current = 0;
        velocityY.current = 0;
        if (bodyRef.current) bodyRef.current.rotation.x = 0;
      }

      if (jumpsPerformed.current === 2 && bodyRef.current) {
        spinRotation.current -= delta * 15;
        if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
        bodyRef.current.rotation.x = spinRotation.current;
      }
    }

    const xDiff = targetX.current - groupRef.current.position.x;
    groupRef.current.rotation.z = -xDiff * 0.2;
    groupRef.current.rotation.x = isJumping.current ? 0.1 : 0.05;

    const time = state.clock.elapsedTime * 25;

    if (!isJumping.current) {
      if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time) * 0.7;
      if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.7;
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time + Math.PI) * 1.0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time) * 1.0;

      if (bodyRef.current) bodyRef.current.position.y = 1.1 + Math.abs(Math.sin(time)) * 0.1;
    } else {
      const jumpPoseSpeed = delta * 10;
      if (leftArmRef.current) leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
      if (rightArmRef.current) rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -2.5, jumpPoseSpeed);
      if (leftLegRef.current) leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, 0.5, jumpPoseSpeed);
      if (rightLegRef.current) rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, -0.5, jumpPoseSpeed);

      if (bodyRef.current && jumpsPerformed.current !== 2) bodyRef.current.position.y = 1.1;
    }

    if (shadowRef.current) {
      const height = groupRef.current.position.y;
      const scale = Math.max(0.2, 1 - (height / 2.5) * 0.5);
      const runStretch = isJumping.current ? 1 : 1 + Math.abs(Math.sin(time)) * 0.3;

      shadowRef.current.scale.set(scale, scale, scale * runStretch);
      const material = shadowRef.current.material as THREE.MeshBasicMaterial;
      if (material && !Array.isArray(material)) material.opacity = Math.max(0.1, 0.3 - (height / 2.5) * 0.2);
    }

    // Flicker
    const showFlicker = isInvincible.current || isImmortalityActive || isShieldActive;
    if (showFlicker) {
      if (isInvincible.current) {
        if (Date.now() - lastDamageTime.current > 1500) {
          isInvincible.current = false;
          groupRef.current.visible = true;
        } else {
          groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
        }
      }
      if (isImmortalityActive || isShieldActive) groupRef.current.visible = true;
    } else {
      groupRef.current.visible = true;
    }
  });

  useEffect(() => {
    const checkHit = () => {
      if (isInvincible.current || isImmortalityActive || isShieldActive) return;
      audio.playDamage();
      takeDamage();
      isInvincible.current = true;
      lastDamageTime.current = Date.now();
    };
    window.addEventListener('player-hit', checkHit);
    return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive, isShieldActive]);

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyRef} position={[0, 1.1, 0]}>
        <mesh castShadow position={[0, 0.2, 0]} geometry={TORSO_GEO} material={armorMaterial} />

        <mesh position={[0, 0.2, -0.2]} geometry={JETPACK_GEO} material={jointMaterial} />
        <mesh position={[-0.08, 0.1, -0.28]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />
        <mesh position={[0.08, 0.1, -0.28]} geometry={GLOW_STRIP_GEO} material={glowMaterial} />

        <mesh castShadow geometry={HEAD_GEO} material={armorMaterial} position={[0, 0.6, 0]} />

        <group position={[0.32, 0.4, 0]}>
          <group ref={rightArmRef}>
            <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={armorMaterial} />
            <mesh position={[0, -0.55, 0]} geometry={JOINT_SPHERE_GEO} material={glowMaterial} />
          </group>
        </group>
        <group position={[-0.32, 0.4, 0]}>
          <group ref={leftArmRef}>
            <mesh position={[0, -0.25, 0]} castShadow geometry={ARM_GEO} material={armorMaterial} />
            <mesh position={[0, -0.55, 0]} geometry={JOINT_SPHERE_GEO} material={glowMaterial} />
          </group>
        </group>

        <mesh position={[0, -0.15, 0]} geometry={HIPS_GEO} material={jointMaterial} />

        <group position={[0.12, -0.25, 0]}>
          <group ref={rightLegRef}>
            <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={armorMaterial} />
          </group>
        </group>
        <group position={[-0.12, -0.25, 0]}>
          <group ref={leftLegRef}>
            <mesh position={[0, -0.35, 0]} castShadow geometry={LEG_GEO} material={armorMaterial} />
          </group>
        </group>
      </group>

      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={SHADOW_GEO} material={shadowMaterial} />
    </group>
  );
};
