/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import {
  GameMode,
  GameObject,
  GameStatus,
  ObjectType,
  PowerUpType,
  GEMINI_COLORS,
  LANE_WIDTH,
  REMOVE_DISTANCE,
  SPAWN_DISTANCE,
} from '../../types';
import { audio } from '../System/Audio';

// Geometry Constants
const OBSTACLE_HEIGHT = 1.6;
const OBSTACLE_GEOMETRY = new THREE.ConeGeometry(0.9, OBSTACLE_HEIGHT, 6);
const OBSTACLE_GLOW_GEO = new THREE.ConeGeometry(0.9, OBSTACLE_HEIGHT, 6);
const OBSTACLE_RING_GEO = new THREE.RingGeometry(0.6, 0.9, 6);

const GEM_GEOMETRY = new THREE.IcosahedronGeometry(0.3, 0);

// PowerUp geometry
const POWERUP_CORE_GEO = new THREE.OctahedronGeometry(0.42, 0);
const POWERUP_RING_GEO = new THREE.TorusGeometry(0.55, 0.06, 10, 24);

// Alien Geometries
const ALIEN_BODY_GEO = new THREE.CylinderGeometry(0.6, 0.3, 0.3, 8);
const ALIEN_DOME_GEO = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const ALIEN_EYE_GEO = new THREE.SphereGeometry(0.1);

// Missile Geometries
const MISSILE_CORE_GEO = new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8);
const MISSILE_RING_GEO = new THREE.TorusGeometry(0.15, 0.02, 12, 20);

// Shadow Geometries
const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.6, 24);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.8, 24);
const SHADOW_MISSILE_GEO = new THREE.PlaneGeometry(0.15, 3);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(0.8, 6);

// Shop Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1);
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2);
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8);
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4);

const BASE_LETTER_INTERVAL = 150;
const getLetterInterval = (level: number) => BASE_LETTER_INTERVAL * Math.pow(1.5, Math.max(0, level - 1));

const MISSILE_SPEED = 30;

// Font for 3D Text
const FONT_URL = 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 900;
};

// --- Particle System (移动端减少粒子数) ---
const ParticleSystem: React.FC = () => {
  const mobile = isMobileDevice();
  const PARTICLE_COUNT = mobile ? 360 : 600;

  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(
    () =>
      new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color(),
      })),
    [PARTICLE_COUNT]
  );

  useEffect(() => {
    const handleExplosion = (e: CustomEvent) => {
      const { position, color } = e.detail;
      let spawned = 0;
      const burstAmount = mobile ? 26 : 40;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const p = particles[i];
        if (p.life <= 0) {
          p.life = 1.0 + Math.random() * 0.5;
          p.pos.set(position[0], position[1], position[2]);

          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          const speed = (mobile ? 1.5 : 2) + Math.random() * (mobile ? 7 : 10);

          p.vel
            .set(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi))
            .multiplyScalar(speed);

          p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
          p.rotVel.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(5);

          p.color.set(color);

          spawned++;
          if (spawned >= burstAmount) break;
        }
      }
    };

    window.addEventListener('particle-burst', handleExplosion as any);
    return () => window.removeEventListener('particle-burst', handleExplosion as any);
  }, [PARTICLE_COUNT, particles, mobile]);

  useFrame((state, delta) => {
    if (!mesh.current) return;
    const safeDelta = Math.min(delta, 0.1);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      if (p.life > 0) {
        p.life -= safeDelta * 1.5;
        p.pos.addScaledVector(p.vel, safeDelta);
        p.vel.y -= safeDelta * 5;
        p.vel.multiplyScalar(0.98);

        p.rot.x += p.rotVel.x * safeDelta;
        p.rot.y += p.rotVel.y * safeDelta;

        dummy.position.copy(p.pos);
        const scale = Math.max(0, p.life * 0.25);
        dummy.scale.set(scale, scale, scale);

        dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
        dummy.updateMatrix();

        mesh.current.setMatrixAt(i, dummy.matrix);
        mesh.current.setColorAt(i, p.color);
      } else {
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        mesh.current.setMatrixAt(i, dummy.matrix);
      }
    }

    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
      <octahedronGeometry args={[0.5, 0]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
    </instancedMesh>
  );
};

const getRandomLane = (laneCount: number) => {
  const max = Math.floor(laneCount / 2);
  return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

const pickPowerUp = (mode: GameMode): PowerUpType => {
  // Endless 更“好玩”：反转/子弹时间/吸附更常见
  const bag: PowerUpType[] =
    mode === GameMode.ENDLESS
      ? [
          PowerUpType.MAGNET,
          PowerUpType.MAGNET,
          PowerUpType.REVERSE,
          PowerUpType.REVERSE,
          PowerUpType.SLOWMO,
          PowerUpType.SCOREX2,
          PowerUpType.SHIELD,
        ]
      : [PowerUpType.MAGNET, PowerUpType.SCOREX2, PowerUpType.SHIELD, PowerUpType.SLOWMO];

  return bag[Math.floor(Math.random() * bag.length)];
};

const powerUpColor = (p: PowerUpType) => {
  switch (p) {
    case PowerUpType.MAGNET:
      return '#00ffff';
    case PowerUpType.SHIELD:
      return '#ffd700';
    case PowerUpType.REVERSE:
      return '#ff00aa';
    case PowerUpType.SLOWMO:
      return '#00e676';
    case PowerUpType.SCOREX2:
      return '#ffea00';
  }
};

export const LevelManager: React.FC = () => {
  const {
    status,
    speed,
    collectGem,
    collectLetter,
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level,
    mode,
    isMagnetActive,
    isSlowMoActive,
    applyPowerUp,
    addSpeed,
  } = useStore();

  const objectsRef = useRef<GameObject[]>([]);
  const [, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);

  // 性能：避免每帧 new Vector3
  const playerPos = useMemo(() => new THREE.Vector3(0, 0, 0), []);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  // Endless：难度爬升 + shop 刷新
  const nextDifficultyDistance = useRef(160);
  const nextShopDistance = useRef(380);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
      objectsRef.current = [];
      setRenderTrigger((t) => t + 1);

      distanceTraveled.current = 0;
      nextLetterDistance.current = getLetterInterval(1);
      nextDifficultyDistance.current = 160;
      nextShopDistance.current = 380;
    } else if (isLevelUp && level > 1) {
      objectsRef.current = objectsRef.current.filter((obj) => obj.position[2] > -80);

      objectsRef.current.push({
        id: uuidv4(),
        type: ObjectType.SHOP_PORTAL,
        position: [0, 0, -100],
        active: true,
      });

      nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);

      setRenderTrigger((t) => t + 1);
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
      setDistance(Math.floor(distanceTraveled.current));
    }

    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
    if (!playerObjRef.current) {
      const group = state.scene.getObjectByName('PlayerGroup');
      if (group && group.children.length > 0) playerObjRef.current = group.children[0];
    }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05);

    const effectiveSpeed = speed * (isSlowMoActive ? 0.65 : 1);
    const dist = effectiveSpeed * safeDelta;

    distanceTraveled.current += dist;

    // Endless：按距离轻微加速（平滑难度）
    if (mode === GameMode.ENDLESS && distanceTraveled.current >= nextDifficultyDistance.current) {
      addSpeed(0.8); // 小步快跑，不会突然暴增
      nextDifficultyDistance.current += 160;
    }

    if (playerObjRef.current) {
      playerObjRef.current.getWorldPosition(playerPos);
    } else {
      playerPos.set(0, 0, 0);
    }

    let hasChanges = false;

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    // ---- Move / AI / Magnet / Collision ----
    for (let i = 0; i < currentObjects.length; i++) {
      const obj = currentObjects[i];

      let moveAmount = dist;
      if (obj.type === ObjectType.MISSILE) moveAmount += MISSILE_SPEED * safeDelta;

      const prevZ = obj.position[2];
      obj.position[2] += moveAmount;

      // Alien fires
      if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
        if (obj.position[2] > -90) {
          obj.hasFired = true;

          newSpawns.push({
            id: uuidv4(),
            type: ObjectType.MISSILE,
            position: [obj.position[0], 1.0, obj.position[2] + 2],
            active: true,
            color: '#ff0000',
          });
          hasChanges = true;

          window.dispatchEvent(
            new CustomEvent('particle-burst', {
              detail: { position: obj.position, color: '#ff00ff' },
            })
          );
        }
      }

      // Magnet attract (只吸：宝石/字母/道具)
      if (
        isMagnetActive &&
        obj.active &&
        (obj.type === ObjectType.GEM || obj.type === ObjectType.LETTER || obj.type === ObjectType.POWERUP)
      ) {
        const dz = playerPos.z - obj.position[2];
        if (dz > -4 && dz < 26) {
          const pull = 12 * safeDelta;
          obj.position[0] += (playerPos.x - obj.position[0]) * pull;
          obj.position[1] += (playerPos.y + 1.0 - obj.position[1]) * pull;
        }
      }

      let keep = true;

      if (obj.active) {
        const zThreshold = 2.0;
        const inZZone = prevZ < playerPos.z + zThreshold && obj.position[2] > playerPos.z - zThreshold;

        // Shop portal collision
        if (obj.type === ObjectType.SHOP_PORTAL) {
          const dz = Math.abs(obj.position[2] - playerPos.z);
          if (dz < 2) {
            openShop();
            obj.active = false;
            hasChanges = true;
            keep = false;
          }
        } else if (inZZone) {
          const dx = Math.abs(obj.position[0] - playerPos.x);
          if (dx < 0.9) {
            const isDamageSource =
              obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;

            if (isDamageSource) {
              const playerBottom = playerPos.y;
              const playerTop = playerPos.y + 1.8;

              let objBottom = obj.position[1] - 0.5;
              let objTop = obj.position[1] + 0.5;

              if (obj.type === ObjectType.OBSTACLE) {
                objBottom = 0;
                objTop = OBSTACLE_HEIGHT;
              } else if (obj.type === ObjectType.MISSILE) {
                objBottom = 0.5;
                objTop = 1.5;
              }

              const isHit = playerBottom < objTop && playerTop > objBottom;
              if (isHit) {
                window.dispatchEvent(new Event('player-hit'));
                obj.active = false;
                hasChanges = true;

                if (obj.type === ObjectType.MISSILE) {
                  window.dispatchEvent(
                    new CustomEvent('particle-burst', { detail: { position: obj.position, color: '#ff4400' } })
                  );
                }
              }
            } else {
              // Item collection
              const dy = Math.abs(obj.position[1] - playerPos.y);
              if (dy < 2.6) {
                if (obj.type === ObjectType.GEM) {
                  collectGem(obj.points || 50);
                  audio.playGemCollect();
                }
                if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                  collectLetter(obj.targetIndex);
                  audio.playLetterCollect();
                }
                if (obj.type === ObjectType.POWERUP && obj.powerUp) {
                  applyPowerUp(obj.powerUp);
                  audio.playGemCollect();
                }

                window.dispatchEvent(
                  new CustomEvent('particle-burst', {
                    detail: { position: obj.position, color: obj.color || '#ffffff' },
                  })
                );

                obj.active = false;
                hasChanges = true;
              }
            }
          }
        }
      }

      if (obj.position[2] > REMOVE_DISTANCE) {
        keep = false;
        hasChanges = true;
      }

      if (keep) keptObjects.push(obj);
    }

    if (newSpawns.length > 0) keptObjects.push(...newSpawns);

    // ---- Spawn logic (性能：不再 filter+map，每帧只扫一遍) ----
    let furthestZ = -20;
    if (keptObjects.length > 0) {
      let minZ = Infinity;
      for (let i = 0; i < keptObjects.length; i++) {
        const o = keptObjects[i];
        if (o.type === ObjectType.MISSILE) continue;
        if (o.position[2] < minZ) minZ = o.position[2];
      }
      furthestZ = minZ === Infinity ? -20 : minZ;
    }

    if (furthestZ > -SPAWN_DISTANCE) {
      const minGap = 12 + effectiveSpeed * 0.4;
      const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);

      // 1) Endless：每隔一段距离刷商店门（不影响跑酷）
      if (mode === GameMode.ENDLESS && distanceTraveled.current >= nextShopDistance.current) {
        keptObjects.push({
          id: uuidv4(),
          type: ObjectType.SHOP_PORTAL,
          position: [0, 0, spawnZ],
          active: true,
        });
        nextShopDistance.current += 420;
        hasChanges = true;
      }

      // 2) PowerUp（少量、但“立刻生效”）
      const powerUpChance = mode === GameMode.ENDLESS ? 0.06 : 0.035;
      if (Math.random() < powerUpChance) {
        const lane = getRandomLane(laneCount);
        const p = pickPowerUp(mode);
        keptObjects.push({
          id: uuidv4(),
          type: ObjectType.POWERUP,
          position: [lane * LANE_WIDTH, 1.3, spawnZ],
          active: true,
          powerUp: p,
          color: powerUpColor(p),
        });
        hasChanges = true;
      } else {
        // 3) Story：字母系统（Endless 不刷字母）
        const isStoryLetters = mode === GameMode.STORY;
        const isLetterDue = isStoryLetters && distanceTraveled.current >= nextLetterDistance.current;

        if (isLetterDue) {
          const lane = getRandomLane(laneCount);
          const target = ['G', 'E', 'M', 'I', 'N', 'I'];

          const availableIndices = target.map((_, idx) => idx).filter((idx) => !collectedLetters.includes(idx));

          if (availableIndices.length > 0) {
            const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            const val = target[chosenIndex];
            const color = GEMINI_COLORS[chosenIndex];

            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.LETTER,
              position: [lane * LANE_WIDTH, 1.0, spawnZ],
              active: true,
              color,
              value: val,
              targetIndex: chosenIndex,
            });

            nextLetterDistance.current += getLetterInterval(level);
            hasChanges = true;
          } else {
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.GEM,
              position: [lane * LANE_WIDTH, 1.2, spawnZ],
              active: true,
              color: '#00ffff',
              points: 50,
            });
            hasChanges = true;
          }
        } else if (Math.random() > 0.1) {
          // 4) 障碍/宝石平衡：Endless 更密集，Story 更友好
          const obstacleBias = mode === GameMode.ENDLESS ? 0.14 : 0.2;
          const isObstacle = Math.random() > obstacleBias;

          if (isObstacle) {
            const spawnAlien = level >= 2 && Math.random() < (mode === GameMode.ENDLESS ? 0.26 : 0.2);

            if (spawnAlien) {
              const availableLanes: number[] = [];
              const maxLane = Math.floor(laneCount / 2);
              for (let ln = -maxLane; ln <= maxLane; ln++) availableLanes.push(ln);
              availableLanes.sort(() => Math.random() - 0.5);

              let alienCount = 1;
              const pAlien = Math.random();
              if (pAlien > 0.7) alienCount = Math.min(2, availableLanes.length);
              if (pAlien > 0.9 && availableLanes.length >= 3) alienCount = 3;

              for (let k = 0; k < alienCount; k++) {
                const ln = availableLanes[k];
                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.ALIEN,
                  position: [ln * LANE_WIDTH, 1.5, spawnZ],
                  active: true,
                  color: '#00ff00',
                  hasFired: false,
                });
              }
            } else {
              const availableLanes: number[] = [];
              const maxLane = Math.floor(laneCount / 2);
              for (let ln = -maxLane; ln <= maxLane; ln++) availableLanes.push(ln);
              availableLanes.sort(() => Math.random() - 0.5);

              let countToSpawn = 1;
              const p = Math.random();
              if (p > (mode === GameMode.ENDLESS ? 0.78 : 0.82)) countToSpawn = Math.min(3, availableLanes.length);
              else if (p > (mode === GameMode.ENDLESS ? 0.48 : 0.52)) countToSpawn = Math.min(2, availableLanes.length);

              for (let j = 0; j < countToSpawn; j++) {
                const ln = availableLanes[j];
                const laneX = ln * LANE_WIDTH;

                keptObjects.push({
                  id: uuidv4(),
                  type: ObjectType.OBSTACLE,
                  position: [laneX, OBSTACLE_HEIGHT / 2, spawnZ],
                  active: true,
                  color: '#ff0054',
                });

                // 顶部宝石：给玩家“风险收益”
                if (Math.random() < (mode === GameMode.ENDLESS ? 0.35 : 0.3)) {
                  keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [laneX, OBSTACLE_HEIGHT + 1.0, spawnZ],
                    active: true,
                    color: '#ffd700',
                    points: 100,
                  });
                }
              }
            }
          } else {
            const lane = getRandomLane(laneCount);
            keptObjects.push({
              id: uuidv4(),
              type: ObjectType.GEM,
              position: [lane * LANE_WIDTH, 1.2, spawnZ],
              active: true,
              color: '#00ffff',
              points: 50,
            });
          }

          hasChanges = true;
        }
      }
    }

    if (hasChanges) {
      objectsRef.current = keptObjects;
      setRenderTrigger((t) => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map((obj) => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const visualRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const { laneCount } = useStore();

  useFrame((state, delta) => {
    if (groupRef.current) groupRef.current.position.set(data.position[0], 0, data.position[2]);

    if (visualRef.current) {
      const baseHeight = data.position[1];

      if (data.type === ObjectType.SHOP_PORTAL) {
        visualRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
      } else if (data.type === ObjectType.MISSILE) {
        visualRef.current.rotation.z += delta * 20;
        visualRef.current.position.y = baseHeight;
      } else if (data.type === ObjectType.ALIEN) {
        visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        visualRef.current.rotation.y += delta;
      } else {
        // Gem/Letter/PowerUp bobbing
        visualRef.current.rotation.y += delta * 3;
        const bobOffset = Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
        visualRef.current.position.y = baseHeight + bobOffset;

        if (shadowRef.current) {
          const shadowScale = 1 - bobOffset;
          shadowRef.current.scale.setScalar(shadowScale);
        }
      }
    }
  });

  const shadowGeo = useMemo(() => {
    if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
    if (data.type === ObjectType.GEM) return SHADOW_GEM_GEO;
    if (data.type === ObjectType.POWERUP) return SHADOW_GEM_GEO;
    if (data.type === ObjectType.SHOP_PORTAL) return null;
    if (data.type === ObjectType.ALIEN) return SHADOW_ALIEN_GEO;
    if (data.type === ObjectType.MISSILE) return SHADOW_MISSILE_GEO;
    return SHADOW_DEFAULT_GEO;
  }, [data.type]);

  return (
    <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
      {data.type !== ObjectType.SHOP_PORTAL && shadowGeo && (
        <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={shadowGeo}>
          <meshBasicMaterial color="#000000" opacity={0.3} transparent />
        </mesh>
      )}

      <group ref={visualRef} position={[0, data.position[1], 0]}>
        {/* SHOP PORTAL */}
        {data.type === ObjectType.SHOP_PORTAL && (
          <group>
            <mesh position={[0, 3, 0]} geometry={SHOP_FRAME_GEO} scale={[laneCount * LANE_WIDTH + 2, 1, 1]}>
              <meshStandardMaterial color="#111111" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 2, 0]} geometry={SHOP_BACK_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
              <meshBasicMaterial color="#000000" />
            </mesh>
            <mesh position={[0, 3, 0]} geometry={SHOP_OUTLINE_GEO} scale={[laneCount * LANE_WIDTH + 2.2, 1, 1]}>
              <meshBasicMaterial color="#00ffff" wireframe transparent opacity={0.3} />
            </mesh>
            <Center position={[0, 5, 0.6]}>
              <Text3D font={FONT_URL} size={1.2} height={0.2}>
                CYBER SHOP
                <meshBasicMaterial color="#ffff00" />
              </Text3D>
            </Center>
            <mesh
              position={[0, 0.1, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
              geometry={SHOP_FLOOR_GEO}
              scale={[laneCount * LANE_WIDTH, 1, 1]}
            >
              <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
            </mesh>
          </group>
        )}

        {/* OBSTACLE */}
        {data.type === ObjectType.OBSTACLE && (
          <group>
            <mesh geometry={OBSTACLE_GEOMETRY} castShadow receiveShadow>
              <meshStandardMaterial color="#330011" roughness={0.3} metalness={0.8} flatShading />
            </mesh>
            <mesh scale={[1.02, 1.02, 1.02]} geometry={OBSTACLE_GLOW_GEO}>
              <meshBasicMaterial color={data.color} wireframe transparent opacity={0.3} />
            </mesh>
            <mesh position={[0, -OBSTACLE_HEIGHT / 2 + 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={OBSTACLE_RING_GEO}>
              <meshBasicMaterial color={data.color} transparent opacity={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}

        {/* ALIEN */}
        {data.type === ObjectType.ALIEN && (
          <group>
            <mesh castShadow geometry={ALIEN_BODY_GEO}>
              <meshStandardMaterial color="#4400cc" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.2, 0]} geometry={ALIEN_DOME_GEO}>
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.8} />
            </mesh>
            <mesh position={[0.3, 0, 0.3]} geometry={ALIEN_EYE_GEO}>
              <meshBasicMaterial color="#ff00ff" />
            </mesh>
            <mesh position={[-0.3, 0, 0.3]} geometry={ALIEN_EYE_GEO}>
              <meshBasicMaterial color="#ff00ff" />
            </mesh>
          </group>
        )}

        {/* MISSILE */}
        {data.type === ObjectType.MISSILE && (
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={MISSILE_CORE_GEO}>
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} />
            </mesh>
            <mesh position={[0, 1.0, 0]} geometry={MISSILE_RING_GEO}>
              <meshBasicMaterial color="#ffff00" />
            </mesh>
            <mesh position={[0, 0, 0]} geometry={MISSILE_RING_GEO}>
              <meshBasicMaterial color="#ffff00" />
            </mesh>
            <mesh position={[0, -1.0, 0]} geometry={MISSILE_RING_GEO}>
              <meshBasicMaterial color="#ffff00" />
            </mesh>
          </group>
        )}

        {/* GEM */}
        {data.type === ObjectType.GEM && (
          <mesh castShadow geometry={GEM_GEOMETRY}>
            <meshStandardMaterial
              color={data.color}
              roughness={0}
              metalness={1}
              emissive={data.color}
              emissiveIntensity={2}
            />
          </mesh>
        )}

        {/* POWERUP */}
        {data.type === ObjectType.POWERUP && (
          <group>
            <mesh geometry={POWERUP_CORE_GEO}>
              <meshStandardMaterial
                color={data.color}
                emissive={data.color}
                emissiveIntensity={3}
                roughness={0.2}
                metalness={0.6}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} geometry={POWERUP_RING_GEO}>
              <meshBasicMaterial color={data.color} transparent opacity={0.55} />
            </mesh>
          </group>
        )}

        {/* LETTER */}
        {data.type === ObjectType.LETTER && (
          <group scale={[1.5, 1.5, 1.5]}>
            <Center>
              <Text3D font={FONT_URL} size={0.8} height={0.5} bevelEnabled bevelThickness={0.02} bevelSize={0.02} bevelSegments={5}>
                {data.value}
                <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={1.5} />
              </Text3D>
            </Center>
          </group>
        )}
      </group>
    </group>
  );
});
