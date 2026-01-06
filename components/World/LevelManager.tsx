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
import { GameObject, ObjectType, PowerUpType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS, RUN_SPEED_BASE } from '../../types';
import { audio } from '../System/Audio';
import { isLowPerfDevice } from '../../perf';

// Geometry Constants
const OBSTACLE_HEIGHT = 1.6;
const OBSTACLE_GEOMETRY = new THREE.ConeGeometry(0.9, OBSTACLE_HEIGHT, 6);
const OBSTACLE_GLOW_GEO = new THREE.ConeGeometry(0.9, OBSTACLE_HEIGHT, 6);
const OBSTACLE_RING_GEO = new THREE.RingGeometry(0.6, 0.9, 6);

const GEM_GEOMETRY = new THREE.IcosahedronGeometry(0.3, 0);
const POWERUP_CORE_GEO = new THREE.IcosahedronGeometry(0.55, 0);
const POWERUP_RING_GEO = new THREE.TorusGeometry(0.75, 0.08, 12, 24);

// Alien Geometries
const ALIEN_BODY_GEO = new THREE.CylinderGeometry(0.6, 0.3, 0.3, 8);
const ALIEN_DOME_GEO = new THREE.SphereGeometry(0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI/2);
const ALIEN_EYE_GEO = new THREE.SphereGeometry(0.1);

// Missile Geometries
const MISSILE_CORE_GEO = new THREE.CylinderGeometry(0.08, 0.08, 3.0, 8);
const MISSILE_RING_GEO = new THREE.TorusGeometry(0.15, 0.02, 16, 32);

// Shadow Geometries
const SHADOW_LETTER_GEO = new THREE.PlaneGeometry(2, 0.6);
const SHADOW_GEM_GEO = new THREE.CircleGeometry(0.6, 32);
const SHADOW_ALIEN_GEO = new THREE.CircleGeometry(0.8, 32);
const SHADOW_MISSILE_GEO = new THREE.PlaneGeometry(0.15, 3);
const SHADOW_DEFAULT_GEO = new THREE.CircleGeometry(0.8, 6);

// Shop Geometries
const SHOP_FRAME_GEO = new THREE.BoxGeometry(1, 7, 1); // Will be scaled
const SHOP_BACK_GEO = new THREE.BoxGeometry(1, 5, 1.2); // Will be scaled
const SHOP_OUTLINE_GEO = new THREE.BoxGeometry(1, 7.2, 0.8); // Will be scaled
const SHOP_FLOOR_GEO = new THREE.PlaneGeometry(1, 4); // Will be scaled

// Particle budget (mobile friendly)
const HIGH_PARTICLE_COUNT = 600;
const LOW_PARTICLE_COUNT = 400;
const BASE_LETTER_INTERVAL = 150; 

const getLetterInterval = (level: number) => {
    // Level 1: 150
    // Level 2: 225 (150 * 1.5)
    // Level 3: 337.5 (225 * 1.5)
    return BASE_LETTER_INTERVAL * Math.pow(1.5, Math.max(0, level - 1));
};

const MISSILE_SPEED = 30; // Extra speed added to world speed

// Font for 3D Text
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const lowPerf = useMemo(() => isLowPerfDevice(), []);
    const particleCount = lowPerf ? LOW_PARTICLE_COUNT : HIGH_PARTICLE_COUNT;
    const burstAmount = lowPerf ? 28 : 40;
    
    const particles = useMemo(() => new Array(particleCount).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(),
        color: new THREE.Color()
    })), [particleCount]);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color } = e.detail;
            let spawned = 0;

            for(let i = 0; i < particleCount; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 1.0 + Math.random() * 0.5; 
                    p.pos.set(position[0], position[1], position[2]);
                    
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos(2 * Math.random() - 1);
                    const speed = 2 + Math.random() * 10;
                    
                    p.vel.set(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    ).multiplyScalar(speed);

                    p.rot.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                    p.rotVel.set(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(5);
                    
                    p.color.set(color);
                    
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles, particleCount, burstAmount]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
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
                
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, particleCount]}>
            <octahedronGeometry args={[0.5, 0]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.9} />
        </instancedMesh>
    );
};


const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    speedMultiplier,
    mode,
    isMagnetActive,
    collectGem, 
    collectLetter, 
    applyPowerUp,
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    setSpeed,
    level
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);
  const prevMode = useRef(mode);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const playerPosRef = useRef(new THREE.Vector3());
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);
  const nextPortalDistance = useRef(450);
  const nextRampDistance = useRef(80);

  // Handle resets and transitions
  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const enteredEndless = mode === 'ENDLESS' && prevMode.current !== 'ENDLESS';

    if (isMenuReset || isRestart) {
        // Hard Reset of objects
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        
        // Reset trackers
        distanceTraveled.current = 0;
        nextLetterDistance.current = getLetterInterval(1);
        nextPortalDistance.current = 450;
        nextRampDistance.current = 80;

    } else if (enteredEndless) {
        // Story complete → Endless: keep visible world objects, but stop letter scheduling.
        nextLetterDistance.current = Number.POSITIVE_INFINITY;
        // Initialize endless pacing.
        nextPortalDistance.current = Math.max(nextPortalDistance.current, distanceTraveled.current + 350);
        nextRampDistance.current = Math.max(nextRampDistance.current, distanceTraveled.current + 80);

    } else if (isLevelUp && level > 1) {
        // Soft Reset for Level Up (Keep visible objects)
        // Clear objects deep in the fog (> -80) to make room for portal, but keep visible ones
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);

        // Spawn Shop Portal further out (Twice previous distance)
        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -100], 
            active: true,
        });
        
        // Adjust next letter spawn for the new level's difficulty (50% increase).
        // We calculate this relative to where the last letter was (which was approx at player position + 0, so SPAWN_DISTANCE ago).
        // This ensures the gap between the last letter of Level X and the first letter of Level X+1 is the new interval.
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        
        setRenderTrigger(t => t + 1);
        
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    
    prevStatus.current = status;
    prevLevel.current = level;
    prevMode.current = mode;
  }, [status, level, mode, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) {
              playerObjRef.current = group.children[0];
          }
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05);
    const effectiveSpeed = speed * speedMultiplier;
    const dist = effectiveSpeed * safeDelta;
    
    distanceTraveled.current += dist;

    // Endless mode: slowly ramp base speed over distance (without sudden spikes).
    if (mode === 'ENDLESS' && distanceTraveled.current >= nextRampDistance.current) {
        nextRampDistance.current += 80;
        const cap = RUN_SPEED_BASE * 3.0; // hard cap to keep mobile playable
        const inc = RUN_SPEED_BASE * 0.03;
        setSpeed(Math.min(cap, speed + inc));
    }

    let hasChanges = false;
    const playerPos = playerPosRef.current;
    playerPos.set(0, 0, 0);
    if (playerObjRef.current) playerObjRef.current.getWorldPosition(playerPos);

    // 1. Move & Update
    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        // Standard Movement
        let moveAmount = dist;
        
        // Missile Movement (Moves faster than world)
        if (obj.type === ObjectType.MISSILE) {
            moveAmount += MISSILE_SPEED * safeDelta;
        }

        // Store previous Z for swept collision check (prevents tunneling)
        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;

        // Magnet buff: gently pull pickups toward the player to feel more "sticky" on touch.
        if (
            isMagnetActive &&
            obj.active &&
            (obj.type === ObjectType.GEM || obj.type === ObjectType.LETTER || obj.type === ObjectType.POWERUP)
        ) {
            const dz = Math.abs(obj.position[2] - playerPos.z);
            if (dz < 28) {
                obj.position[0] += (playerPos.x - obj.position[0]) * safeDelta * 3.5;
            }
        }
        
        // Alien AI Logic
        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             // Fire when within range (e.g., -90 units away)
             if (obj.position[2] > -90) {
                 obj.hasFired = true;
                 
                 // Spawn Missile
                 newSpawns.push({
                     id: uuidv4(),
                     type: ObjectType.MISSILE,
                     position: [obj.position[0], 1.0, obj.position[2] + 2], // Spawn slightly in front
                     active: true,
                     color: '#ff0000'
                 });
                 hasChanges = true;
                 
                 // Visual flare event
                 window.dispatchEvent(new CustomEvent('particle-burst', { 
                    detail: { position: obj.position, color: '#ff00ff' } 
                 }));
             }
        }

        let keep = true;
        if (obj.active) {
            // Swept Collision: Check if object's path [prevZ, currentZ] overlaps with player collision zone
            // INCREASED THRESHOLD from 1.0 to 2.0 to prevent missile tunneling at low FPS/High Speed
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            // SHOP PORTAL COLLISION
            if (obj.type === ObjectType.SHOP_PORTAL) {
                // Strict proximity check for portal since it's large
                const dz = Math.abs(obj.position[2] - playerPos.z);
                if (dz < 2) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                // STANDARD COLLISION
                const dx = Math.abs(obj.position[0] - playerPos.x);
                const isDamageSource = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;
                // Magnet grants a wider pickup cone without making damage unfair.
                const dxThreshold = isDamageSource ? 0.9 : (isMagnetActive ? 2.1 : 0.9);

                if (dx < dxThreshold) {
                     
                     if (isDamageSource) {
                         // VERTICAL COLLISION WITH BOUNDS CHECK
                         // More robust than simple distance check for jumping/running
                         const playerBottom = playerPos.y;
                         const playerTop = playerPos.y + 1.8; // Approx height of player

                         let objBottom = obj.position[1] - 0.5;
                         let objTop = obj.position[1] + 0.5;

                         if (obj.type === ObjectType.OBSTACLE) {
                             objBottom = 0;
                             objTop = OBSTACLE_HEIGHT;
                         } else if (obj.type === ObjectType.MISSILE) {
                             // Missile at Y=1.0
                             objBottom = 0.5;
                             objTop = 1.5;
                         }

                         const isHit = (playerBottom < objTop) && (playerTop > objBottom);

                         if (isHit) { 
                             window.dispatchEvent(new Event('player-hit'));
                             obj.active = false; 
                             hasChanges = true;
                             
                             // Visual burst for missile impact
                             if (obj.type === ObjectType.MISSILE) {
                                window.dispatchEvent(new CustomEvent('particle-burst', { 
                                    detail: { position: obj.position, color: '#ff4400' } 
                                }));
                             }
                         }
                     } else {
                         // Item Collection
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         if (dy < 2.8) { // Generous vertical pickup range
                            if (obj.type === ObjectType.GEM) {
                                collectGem(obj.points || 50);
                                audio.playGemCollect();
                            }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                                collectLetter(obj.targetIndex);
                                audio.playLetterCollect();
                            }
                            if (obj.type === ObjectType.POWERUP && obj.powerUpType) {
                                applyPowerUp(obj.powerUpType);
                                audio.playPowerUp?.();
                            }
                            
                            window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { 
                                    position: obj.position, 
                                    color: obj.color || '#ffffff' 
                                } 
                            }));

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

        if (keep) {
            keptObjects.push(obj);
        }
    }

    // Add any newly spawned entities (Missiles)
    if (newSpawns.length > 0) {
        keptObjects.push(...newSpawns);
    }

    // 2. Spawning Logic
    let furthestZ = 0;
    // Only consider static obstacles/gems for gap calculation, not missiles or moving aliens
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    
    if (staticObjects.length > 0) {
        furthestZ = Math.min(...staticObjects.map(o => o.position[2]));
    } else {
        furthestZ = -20;
    }

    if (furthestZ > -SPAWN_DISTANCE) {
         // Balanced gap formula (less "sudden" difficulty spikes, more stable on mobile)
         const baseGap = mode === 'ENDLESS' ? 13 : 14;
         const gapFactor = mode === 'ENDLESS' ? 0.22 : 0.26;
         const minGap = Math.min(30, baseGap + effectiveSpeed * gapFactor);
         const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);

         // Endless: periodically offer a shop portal (optional break)
         if (mode === 'ENDLESS' && distanceTraveled.current >= nextPortalDistance.current) {
              const hasPortal = keptObjects.some(o => o.type === ObjectType.SHOP_PORTAL && o.active);
              if (!hasPortal) {
                  keptObjects.push({
                      id: uuidv4(),
                      type: ObjectType.SHOP_PORTAL,
                      position: [0, 0, spawnZ - 35],
                      active: true,
                  });
                  nextPortalDistance.current += 520;
                  hasChanges = true;
              }
         }

         const isLetterDue = mode === 'STORY' && distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             const lane = getRandomLane(laneCount);
             const target = ['G','E','M','I','N','I'];

             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

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
                    targetIndex: chosenIndex
                 });

                 // Schedule next letter based on current level difficulty
                 nextLetterDistance.current += getLetterInterval(level);
                 hasChanges = true;
             } else {
                // Fallback to gem if all letters collected for this level
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#00ffff',
                    points: 50
                });
                hasChanges = true;
             }

         } else if (Math.random() > 0.12) { // 88% chance to attempt spawn if gap exists

            // Powerups: frequent enough to be fun, rare enough to stay special.
            const powerupChance = mode === 'ENDLESS' ? 0.10 : 0.07;

            if (Math.random() < powerupChance) {
                const lane = getRandomLane(laneCount);
                const r = Math.random();
                let pType: PowerUpType;
                if (r < 0.26) pType = PowerUpType.SHIELD;
                else if (r < 0.50) pType = PowerUpType.MAGNET;
                else if (r < 0.70) pType = PowerUpType.SCORE_X2;
                else if (r < 0.86) pType = PowerUpType.SLOW;
                else if (r < 0.95) pType = PowerUpType.BOOST;
                else pType = PowerUpType.INVERT; // rarer debuff

                const colorByType: Record<PowerUpType, string> = {
                    [PowerUpType.SHIELD]: '#00ffff',
                    [PowerUpType.MAGNET]: '#b388ff',
                    [PowerUpType.SLOW]: '#2979ff',
                    [PowerUpType.BOOST]: '#ff1744',
                    [PowerUpType.SCORE_X2]: '#ffea00',
                    [PowerUpType.INVERT]: '#ff00ff',
                };

                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.POWERUP,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    powerUpType: pType,
                    color: colorByType[pType],
                });
                hasChanges = true;
            } else {
                // Obstacles vs gems
                const obstacleProb = mode === 'ENDLESS' ? 0.74 : 0.64;
                const isObstacle = Math.random() < obstacleProb;

                if (isObstacle) {
                    // Decide between Alien (Level 2+) or Spikes
                    const spawnAlien = level >= 2 && Math.random() < (mode === 'ENDLESS' ? 0.16 : 0.12);

                    if (spawnAlien) {
                        const availableLanes: number[] = [];
                        const maxLane = Math.floor(laneCount / 2);
                        for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                        availableLanes.sort(() => Math.random() - 0.5);

                        let alienCount = 1;
                        const pAlien = Math.random();
                        if (pAlien > 0.82) alienCount = Math.min(2, availableLanes.length);

                        for (let k = 0; k < alienCount; k++) {
                            const lane = availableLanes[k];
                            keptObjects.push({
                                id: uuidv4(),
                                type: ObjectType.ALIEN,
                                position: [lane * LANE_WIDTH, 1.5, spawnZ],
                                active: true,
                                color: '#00ff00',
                                hasFired: false
                            });
                        }
                    } else {
                        const availableLanes: number[] = [];
                        const maxLane = Math.floor(laneCount / 2);
                        for (let i = -maxLane; i <= maxLane; i++) availableLanes.push(i);
                        availableLanes.sort(() => Math.random() - 0.5);

                        let countToSpawn = 1;
                        const p = Math.random();
                        // More balanced multi-spike probabilities (still ramps with speed because gaps shrink)
                        if (p > 0.88) countToSpawn = Math.min(3, availableLanes.length);
                        else if (p > 0.62) countToSpawn = Math.min(2, availableLanes.length);

                        for (let i = 0; i < countToSpawn; i++) {
                            const lane = availableLanes[i];
                            const laneX = lane * LANE_WIDTH;

                            keptObjects.push({
                                id: uuidv4(),
                                type: ObjectType.OBSTACLE,
                                position: [laneX, OBSTACLE_HEIGHT / 2, spawnZ],
                                active: true,
                                color: '#ff0054'
                            });

                            // Chance for gem on top of obstacle
                            const topGemChance = mode === 'ENDLESS' ? 0.34 : 0.28;
                            if (Math.random() < topGemChance) {
                                 keptObjects.push({
                                    id: uuidv4(),
                                    type: ObjectType.GEM,
                                    position: [laneX, OBSTACLE_HEIGHT + 1.0, spawnZ],
                                    active: true,
                                    color: '#ffd700',
                                    points: 100
                                });
                            }
                        }
                    }

                } else {
                    // Ground gems
                    const lane = getRandomLane(laneCount);
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.GEM,
                        position: [lane * LANE_WIDTH, 1.2, spawnZ],
                        active: true,
                        color: '#00ffff',
                        points: 50
                    });
                }
                hasChanges = true;
            }
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
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
        // 1. Move Main Container
        if (groupRef.current) {
            groupRef.current.position.set(data.position[0], 0, data.position[2]);
        }

        // 2. Animate Visuals
        if (visualRef.current) {
            const baseHeight = data.position[1];
            
            if (data.type === ObjectType.SHOP_PORTAL) {
                 visualRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.02);
            } else if (data.type === ObjectType.MISSILE) {
                 // Missile rotation
                 visualRef.current.rotation.z += delta * 20; // Fast spin
                 visualRef.current.position.y = baseHeight;
            } else if (data.type === ObjectType.ALIEN) {
                 // Alien Hover
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
                 visualRef.current.rotation.y += delta;
            } else if (data.type !== ObjectType.OBSTACLE) {
                // Gem/Letter Bobbing
                visualRef.current.rotation.y += delta * 3;
                const bobOffset = Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
                visualRef.current.position.y = baseHeight + bobOffset;
                
                if (shadowRef.current) {
                    const shadowScale = 1 - bobOffset; 
                    shadowRef.current.scale.setScalar(shadowScale);
                }
            } else {
                visualRef.current.position.y = baseHeight;
            }
        }
    });

    // Select Shadow Geometry based on type (using shared geometries)
    const shadowGeo = useMemo(() => {
        if (data.type === ObjectType.LETTER) return SHADOW_LETTER_GEO;
        if (data.type === ObjectType.GEM) return SHADOW_GEM_GEO;
        if (data.type === ObjectType.POWERUP) return SHADOW_GEM_GEO;
        if (data.type === ObjectType.SHOP_PORTAL) return null; // No shadow needed or custom handled
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
                {/* --- SHOP PORTAL --- */}
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
                         <mesh position={[0, 0.1, 0]} rotation={[-Math.PI/2, 0, 0]} geometry={SHOP_FLOOR_GEO} scale={[laneCount * LANE_WIDTH, 1, 1]}>
                             <meshBasicMaterial color="#00ffff" transparent opacity={0.3} />
                         </mesh>
                    </group>
                )}

                {/* --- OBSTACLE --- */}
                {data.type === ObjectType.OBSTACLE && (
                    <group>
                        <mesh geometry={OBSTACLE_GEOMETRY} castShadow receiveShadow>
                             <meshStandardMaterial 
                                 color="#330011"
                                 roughness={0.3} 
                                 metalness={0.8} 
                                 flatShading={true}
                             />
                        </mesh>
                        <mesh scale={[1.02, 1.02, 1.02]} geometry={OBSTACLE_GLOW_GEO}>
                             <meshBasicMaterial 
                                 color={data.color} 
                                 wireframe 
                                 transparent 
                                 opacity={0.3} 
                             />
                        </mesh>
                         <mesh position={[0, -OBSTACLE_HEIGHT/2 + 0.05, 0]} rotation={[-Math.PI/2,0,0]} geometry={OBSTACLE_RING_GEO}>
                             <meshBasicMaterial color={data.color} transparent opacity={0.4} side={THREE.DoubleSide} />
                         </mesh>
                    </group>
                )}

                {/* --- ALIEN (LEVEL 2+) --- */}
                {data.type === ObjectType.ALIEN && (
                    <group>
                        {/* Saucer Body */}
                        <mesh castShadow geometry={ALIEN_BODY_GEO}>
                            <meshStandardMaterial color="#4400cc" metalness={0.8} roughness={0.2} />
                        </mesh>
                        {/* Dome */}
                        <mesh position={[0, 0.2, 0]} geometry={ALIEN_DOME_GEO}>
                            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} transparent opacity={0.8} />
                        </mesh>
                        {/* Glowing Eyes/Lights */}
                        <mesh position={[0.3, 0, 0.3]} geometry={ALIEN_EYE_GEO}>
                             <meshBasicMaterial color="#ff00ff" />
                        </mesh>
                        <mesh position={[-0.3, 0, 0.3]} geometry={ALIEN_EYE_GEO}>
                             <meshBasicMaterial color="#ff00ff" />
                        </mesh>
                    </group>
                )}

                {/* --- MISSILE (Long Laser) --- */}
                {data.type === ObjectType.MISSILE && (
                    <group rotation={[Math.PI / 2, 0, 0]}>
                        {/* Long glowing core: Oriented along Y (which is Z after rotation) */}
                        <mesh geometry={MISSILE_CORE_GEO}>
                            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} />
                        </mesh>
                        {/* Energy Rings */}
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

                {/* --- POWERUP --- */}
                {data.type === ObjectType.POWERUP && (
                    <group>
                        <mesh geometry={POWERUP_CORE_GEO}>
                            <meshStandardMaterial
                                color={data.color || '#ffffff'}
                                emissive={data.color || '#ffffff'}
                                emissiveIntensity={2.5}
                                roughness={0.25}
                                metalness={0.7}
                            />
                        </mesh>
                        <mesh geometry={POWERUP_RING_GEO} rotation={[Math.PI / 2, 0, 0]}>
                            <meshBasicMaterial color={data.color || '#ffffff'} transparent opacity={0.7} />
                        </mesh>
                        <mesh geometry={POWERUP_RING_GEO} rotation={[0, Math.PI / 2, 0]}>
                            <meshBasicMaterial color={data.color || '#ffffff'} transparent opacity={0.35} />
                        </mesh>
                    </group>
                )}

                {/* --- GEM --- */}
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

                {/* --- LETTER --- */}
                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <Center>
                             <Text3D 
                                font={FONT_URL} 
                                size={0.8} 
                                height={0.5} 
                                bevelEnabled
                                bevelThickness={0.02}
                                bevelSize={0.02}
                                bevelSegments={5}
                             >
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
