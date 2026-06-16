import React, { useEffect, useRef, useState } from 'react';
import { GameView, Lane, PlayerSkin, UpgradeItem, GameObject, ObstacleType } from '../types';
import { sound } from './SoundEngine';
import { RotateCcw, Play, Volume2, VolumeX, Shield, Zap, Sparkles, AlertTriangle } from 'lucide-react';

interface GameCanvasProps {
  selectedSkin: PlayerSkin;
  upgrades: UpgradeItem[];
  onGameOver: (stats: { score: number; distance: number; coinsCollected: number }) => void;
  onCoinCollected: (count: number) => void;
  onTrackStats: (meters: number, coins: number, actionType?: 'jump' | 'slide') => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  selectedSkin,
  upgrades,
  onGameOver,
  onCoinCollected,
  onTrackStats,
  isSoundEnabled,
  onToggleSound,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Core Game State Refs to avoid state staleness in high-spec requestAnimationFrame loop
  const stateRef = useRef({
    isPlaying: true,
    isPaused: false,
    score: 0,
    distance: 0,
    coinsCollected: 0,
    
    // Speed variables
    speed: 0.015,       // Game movement speed per frame
    baseSpeed: 0.015,
    maxSpeed: 0.038,
    speedIncrement: 0.000002, // Speeds up gradually

    // Player position
    currentLane: 1 as Lane,
    targetLane: 1 as Lane,
    playerVisualX: 0.5, // Interpolated 0..1 coordinate on horizontal screen
    
    // Player action states
    isJumping: false,
    jumpTimer: 0,
    jumpDuration: 30, // frames
    isSliding: false,
    slideTimer: 0,
    slideDuration: 35, // frames

    // Obstacles & power-ups
    gameObjects: [] as GameObject[],
    nextSpawnZ: 0,
    spawnTimer: 0,
    spawnInterval: 45, // frames between spawns, decreases with higher speed

    // Active powerups timers (stored in frames)
    shieldTimeLeft: 0,
    magnetTimeLeft: 0,
    boostTimeLeft: 0,

    shieldMaxTime: 360, // 6 seconds base in 60fps
    magnetMaxTime: 480, // 8 seconds base
    boostMaxTime: 300,  // 5 seconds base

    // Monster mechanics
    monsterActive: false,
    monsterIntimacy: 0, // 0 to 100%. If hits 100%, catches player.
    stumbleFlashTimer: 0, // Visual effect on hit

    animationFrameId: 0,
    frameCount: 0,
    gameTime: 0,
  });

  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  const [coins, setCoins] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Powerup state indicators for overlay UI
  const [activeShield, setActiveShield] = useState(false);
  const [activeMagnet, setActiveMagnet] = useState(false);
  const [activeBoost, setActiveBoost] = useState(false);
  const [monsterWarning, setMonsterWarning] = useState(false);

  // Fetch upgrade multiplier values
  const getUpgradeMultiplier = (id: string): number => {
    const upgrade = upgrades.find(u => u.id === id);
    if (!upgrade) return 1;
    return 1 + upgrade.level * upgrade.multiplier;
  };

  // Dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 450 });

  // Handle ResizeObserver as per Guidelines
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        const targetWidth = Math.max(width, 320);
        const targetHeight = Math.min(Math.max(width * 0.75, 360), 600); // 4:3 aspect ratio
        setDimensions({
          width: targetWidth,
          height: targetHeight,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Sync canvas dimensions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
    }
  }, [dimensions]);

  // Touch Swipe inputs for mobile / preview iframe support
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const diffX = touch.clientX - touchStartRef.current.x;
    const diffY = touch.clientY - touchStartRef.current.y;
    
    const absX = Math.abs(diffX);
    const absY = Math.abs(diffY);
    const minDistance = 30; // Threshold for swipe detector

    if (Math.max(absX, absY) > minDistance) {
      if (absX > absY) {
        // Horizontal Swipes
        if (diffX > 0) {
          triggerMoveRight();
        } else {
          triggerMoveLeft();
        }
      } else {
        // Vertical Swipes
        if (diffY > 0) {
          triggerSlide();
        } else {
          triggerJump();
        }
      }
    }
    touchStartRef.current = null;
  };

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'a') {
        triggerMoveLeft();
      } else if (key === 'arrowright' || key === 'd') {
        triggerMoveRight();
      } else if (key === 'arrowup' || key === 'w' || key === ' ') {
        e.preventDefault();
        triggerJump();
      } else if (key === 'arrowdown' || key === 's') {
        e.preventDefault();
        triggerSlide();
      } else if (key === 'escape' || key === 'p') {
        togglePause();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Controls triggers
  const triggerMoveLeft = () => {
    const st = stateRef.current;
    if (!st.isPlaying || st.isPaused) return;
    if (st.targetLane > 0) {
      st.targetLane = (st.targetLane - 1) as Lane;
      sound.playSlide(); // Hiss swipe feedback
    }
  };

  const triggerMoveRight = () => {
    const st = stateRef.current;
    if (!st.isPlaying || st.isPaused) return;
    if (st.targetLane < 2) {
      st.targetLane = (st.targetLane + 1) as Lane;
      sound.playSlide();
    }
  };

  const triggerJump = () => {
    const st = stateRef.current;
    if (!st.isPlaying || st.isPaused) return;
    if (!st.isJumping && !st.isSliding) {
      st.isJumping = true;
      st.jumpTimer = 0;
      sound.playJump();
      onTrackStats(0, 0, 'jump');
    }
  };

  const triggerSlide = () => {
    const st = stateRef.current;
    if (!st.isPlaying || st.isPaused) return;
    if (!st.isSliding && !st.isJumping) {
      st.isSliding = true;
      st.slideTimer = 0;
      sound.playSlide();
      onTrackStats(0, 0, 'slide');
    }
  };

  const togglePause = () => {
    const st = stateRef.current;
    if (!st.isPlaying) return;
    st.isPaused = !st.isPaused;
    setIsPaused(st.isPaused);
    if (st.isPaused) {
      sound.stopMusic();
    } else {
      if (isSoundEnabled) {
        sound.startMusic();
      }
    }
  };

  // Setup Sound state
  useEffect(() => {
    sound.setEnabled(isSoundEnabled);
    if (isSoundEnabled && stateRef.current.isPlaying && !stateRef.current.isPaused) {
      sound.startMusic();
    } else {
      sound.stopMusic();
    }
    return () => {
      sound.stopMusic();
    };
  }, [isSoundEnabled]);

  // Main Loop logic inside requestAnimationFrame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    stateRef.current.isPlaying = true;
    stateRef.current.isPaused = false;
    stateRef.current.score = 0;
    stateRef.current.distance = 0;
    stateRef.current.coinsCollected = 0;
    stateRef.current.gameObjects = [];
    stateRef.current.speed = 0.015;
    stateRef.current.stumbleFlashTimer = 0;
    stateRef.current.monsterIntimacy = 0;
    stateRef.current.monsterActive = false;
    stateRef.current.shieldTimeLeft = 0;
    stateRef.current.magnetTimeLeft = 0;
    stateRef.current.boostTimeLeft = 0;
    stateRef.current.targetLane = 1;
    stateRef.current.currentLane = 1;
    stateRef.current.playerVisualX = 0.5;

    // Reset components react states
    setScore(0);
    setDistance(0);
    setCoins(0);
    setIsPaused(false);
    setActiveShield(false);
    setActiveMagnet(false);
    setActiveBoost(false);
    setMonsterWarning(false);

    let lastTime = performance.now();

    const loop = (time: number) => {
      const st = stateRef.current;
      if (!st.isPlaying) return;

      if (!st.isPaused) {
        updateGame();
      }
      renderGame(ctx);

      st.animationFrameId = requestAnimationFrame(loop);
    };

    // Spawn Helpers
    const spawnGameObject = () => {
      const st = stateRef.current;
      const typeRand = Math.random();
      let type: ObstacleType = 'HURDLE_LOW';
      
      // Determine obstacle or cluster item
      // Higher speed spawn more difficult obstacles
      if (typeRand < 0.3) {
        // Row of coins
        const lane = Math.floor(Math.random() * 3) as Lane;
        for (let idx = 0; idx < 3; idx++) {
          st.gameObjects.push({
            id: `coin-${st.frameCount}-${idx}`,
            type: 'COIN_ROW',
            lane,
            z: -0.05 * idx, // Staggered entry sequence
          });
        }
        return;
      } else if (typeRand < 0.35) {
        // Red ruby gem
        const lane = Math.floor(Math.random() * 3) as Lane;
        st.gameObjects.push({
          id: `gem-${st.frameCount}`,
          type: 'GEM',
          lane,
          z: 0,
        });
        return;
      } else if (typeRand < 0.42) {
        // Power-up
        const powerupRand = Math.random();
        let pType: ObstacleType = 'POWER_SHIELD';
        if (powerupRand < 0.4) pType = 'POWER_MAGNET';
        else if (powerupRand < 0.7) pType = 'POWER_BOOST';
        
        const lane = Math.floor(Math.random() * 3) as Lane;
        st.gameObjects.push({
          id: `powerup-${st.frameCount}`,
          type: pType,
          lane,
          z: 0,
        });
        return;
      } else {
        // Hostile obstacle
        const obstChoiceRange = Math.random();
        const lane = Math.floor(Math.random() * 3) as Lane;
        
        if (obstChoiceRange < 0.45) {
          type = 'HURDLE_LOW';
        } else if (obstChoiceRange < 0.75) {
          type = 'HURDLE_HIGH';
        } else if (obstChoiceRange < 0.90) {
          type = 'GAP';
        } else {
          type = 'CORRIDOR_BLOCKED';
        }

        st.gameObjects.push({
          id: `obstacle-${st.frameCount}`,
          type,
          lane,
          z: 0,
        });
      }
    };

    const updateGame = () => {
      const st = stateRef.current;
      st.frameCount++;
      st.gameTime += 1;

      // Gradually increase game speed
      if (st.boostTimeLeft > 0) {
        st.speed = st.baseSpeed * 2.1; // Turbo speed boost
      } else {
        st.speed = Math.min(st.baseSpeed + st.frameCount * st.speedIncrement, st.maxSpeed);
      }

      // Track distance
      const distanceGained = st.speed * 8.5; // conversion factor
      st.distance += distanceGained;
      setDistance(Math.floor(st.distance));

      // Calculate score accumulated
      st.score += Math.round(distanceGained * (st.boostTimeLeft > 0 ? 3 : 1) * getUpgradeMultiplier('shop_multiplier'));
      setScore(Math.floor(st.score));

      // Report distance to App for achievements periodically
      if (Math.floor(st.distance) % 25 === 0 && Math.floor(st.distance) > 0) {
        onTrackStats(Math.round(distanceGained), 0);
      }

      // Update monster distance (stumble penalty decays over time)
      if (st.monsterIntimacy > 0) {
        st.monsterIntimacy = Math.max(0, st.monsterIntimacy - 0.05); // Recedes when running well
      }
      setMonsterWarning(st.monsterIntimacy > 20);

      // Flash timer decay
      if (st.stumbleFlashTimer > 0) {
        st.stumbleFlashTimer--;
      }

      // Powerups duration logic
      if (st.shieldTimeLeft > 0) {
        st.shieldTimeLeft--;
        setActiveShield(st.shieldTimeLeft > 0);
      }
      if (st.magnetTimeLeft > 0) {
        st.magnetTimeLeft--;
        setActiveMagnet(st.magnetTimeLeft > 0);
      }
      if (st.boostTimeLeft > 0) {
        st.boostTimeLeft--;
        setActiveBoost(st.boostTimeLeft > 0);
      }

      // Player physical visual lane interpolation
      const playerLaneTargetX = st.targetLane === 0 ? 0.20 : (st.targetLane === 2 ? 0.80 : 0.50);
      st.playerVisualX += (playerLaneTargetX - st.playerVisualX) * 0.22;

      // Jump parabola physics
      if (st.isJumping) {
        st.jumpTimer++;
        if (st.jumpTimer >= st.jumpDuration) {
          st.isJumping = false;
          st.jumpTimer = 0;
        }
      }

      // Slide/Duck duration physics
      if (st.isSliding) {
        st.slideTimer++;
        if (st.slideTimer >= st.slideDuration) {
          st.isSliding = false;
          st.slideTimer = 0;
        }
      }

      // Game object spawns
      st.spawnTimer += st.speed * 40; // scales spawn threshold speed
      if (st.spawnTimer >= st.spawnInterval) {
        st.spawnTimer = 0;
        // Tweak interval at higher speeds to make it tougher
        st.spawnInterval = Math.max(28, 48 - (st.speed * 300));
        spawnGameObject();
      }

      // Game objects updates (move along Z depth towards screen viewer)
      st.gameObjects.forEach((obj) => {
        obj.z += st.speed; // move closer

        // Magnetized pull towards player's lane if Coin is in range
        if (st.magnetTimeLeft > 0 && (obj.type === 'COIN_ROW' || obj.type === 'GEM') && !obj.collected) {
          if (obj.z > 0.40 && obj.z < 0.9) {
            // Drift towards player's lane
            if (obj.lane !== st.targetLane) {
              const speedFactor = 0.12;
              if (obj.lane < st.targetLane) {
                // drift right
                const nextLaneVal = obj.lane + speedFactor;
                if (nextLaneVal >= st.targetLane) obj.lane = st.targetLane;
                else if (nextLaneVal >= obj.lane + 0.5) obj.lane = Math.round(nextLaneVal) as Lane;
              } else {
                // drift left
                const nextLaneVal = obj.lane - speedFactor;
                if (nextLaneVal <= st.targetLane) obj.lane = st.targetLane;
                else if (nextLaneVal <= obj.lane - 0.5) obj.lane = Math.round(nextLaneVal) as Lane;
              }
            }
          }
        }

        // Check Collisions on screen depth threshold (z = 0.82 to 0.88)
        if (obj.z > 0.80 && obj.z < 0.90 && !obj.collected) {
          // Precise lane matching
          // Check if obstacle's lane matches player's lane
          if (obj.lane === st.targetLane) {
            handleCollision(obj);
          }
        }
      });

      // Filter out off-screen objects
      st.gameObjects = st.gameObjects.filter((obj) => obj.z < 1.05);
    };

    const handleCollision = (obj: GameObject) => {
      const st = stateRef.current;
      
      // Coins details
      if (obj.type === 'COIN_ROW') {
        obj.collected = true;
        st.coinsCollected += 1;
        setCoins(st.coinsCollected);
        sound.playCoin();
        onCoinCollected(1);
        onTrackStats(0, 1);
        // Add flat score bonus
        st.score += 15 * Math.round(getUpgradeMultiplier('shop_multiplier'));
        return;
      }

      // Ruby Gems details
      if (obj.type === 'GEM') {
        obj.collected = true;
        st.coinsCollected += 5; // worth five coins!
        setCoins(st.coinsCollected);
        sound.playGem();
        onCoinCollected(5);
        onTrackStats(0, 5);
        st.score += 100 * Math.round(getUpgradeMultiplier('shop_multiplier'));
        return;
      }

      // Shield Action Trigger
      if (obj.type === 'POWER_SHIELD') {
        obj.collected = true;
        const multiplier = getUpgradeMultiplier('upgrade_shield');
        st.shieldTimeLeft = Math.round(st.shieldMaxTime * multiplier);
        setActiveShield(true);
        sound.playShieldActivate();
        st.score += 50 * Math.round(multiplier);
        return;
      }

      // Magnet Action Trigger
      if (obj.type === 'POWER_MAGNET') {
        obj.collected = true;
        const multiplier = getUpgradeMultiplier('upgrade_magnet');
        st.magnetTimeLeft = Math.round(st.magnetMaxTime * multiplier);
        setActiveMagnet(true);
        sound.playShieldActivate();
        st.score += 50 * Math.round(multiplier);
        return;
      }

      // Boost Action Trigger
      if (obj.type === 'POWER_BOOST') {
        obj.collected = true;
        const multiplier = getUpgradeMultiplier('upgrade_boost');
        st.boostTimeLeft = Math.round(st.boostMaxTime * multiplier);
        setActiveBoost(true);
        sound.playShieldActivate();
        st.score += 100;
        return;
      }

      // HOSTILE CRASH ACTION HANDLING
      // If we are under invincible Speed Boost, barrel clean through them!
      if (st.boostTimeLeft > 0) {
        obj.collected = true; // destroy obstacle
        sound.playCrash(); // nice physical crunch
        return;
      }

      // Check evasion maneuvers
      let avoided = false;
      
      if (obj.type === 'HURDLE_LOW') {
        // Can dodge by jumping
        if (st.isJumping) {
          avoided = true;
        }
      } else if (obj.type === 'HURDLE_HIGH') {
        // Can dodge by sliding
        if (st.isSliding) {
          avoided = true;
        }
      } else if (obj.type === 'GAP') {
        // Can only dodge by jumping
        if (st.isJumping) {
          avoided = true;
        }
      }

      if (!avoided) {
        // CRASH EVENT
        obj.collected = true; // Consume obstacle so we don't crash multiple times

        // Shield protection absorbs fatal impact
        if (st.shieldTimeLeft > 0) {
          st.shieldTimeLeft = 0; // shield shattered
          setActiveShield(false);
          sound.playCrash();
          st.stumbleFlashTimer = 15; // visual feedback screen flash
          return;
        }

        // Stumble logic:
        // First strike draws the Guardian Monster closer to the screen.
        // If monster is already highly intimate (stumble twice), or we get a severe crash (GAP/CORRIDOR_BLOCKED), then dead!
        const isSevere = obj.type === 'GAP' || obj.type === 'CORRIDOR_BLOCKED';
        
        if (isSevere || st.monsterIntimacy > 55) {
          // FATAL GAME OVER
          endGame();
        } else {
          // Minor Stumble: Monster grabs closer
          st.monsterIntimacy = 90; // draws the beast instantly close!
          st.stumbleFlashTimer = 22;
          sound.playCrash();
          sound.playBeastGrowl(); // beast roar SFX
        }
      }
    };

    const endGame = () => {
      const st = stateRef.current;
      st.isPlaying = false;
      sound.stopMusic();
      sound.playCrash();
      sound.playGameOver();

      onGameOver({
        score: st.score,
        distance: Math.floor(st.distance),
        coinsCollected: st.coinsCollected,
      });
    };

    // --- PROXIMAL PROCEDURAL RENDERING IN CANVAS ---
    const renderGame = (ctx: CanvasRenderingContext2D) => {
      const { width, height } = dimensions;
      ctx.clearRect(0, 0, width, height);

      const st = stateRef.current;

      // 1. Draw Environment Sky & Clouds
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.35);
      skyGrad.addColorStop(0, '#0f172a'); // deep midnight blue
      skyGrad.addColorStop(0.6, '#1e293b');
      skyGrad.addColorStop(1, '#020617'); // dark background
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.35);

      // Stylized distant ancient mountains
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, height * 0.35);
      ctx.lineTo(width * 0.15, height * 0.22);
      ctx.lineTo(width * 0.35, height * 0.32);
      ctx.lineTo(width * 0.65, height * 0.18);
      ctx.lineTo(width * 0.85, height * 0.30);
      ctx.lineTo(width, height * 0.35);
      ctx.closePath();
      ctx.fill();

      // Ambient glowing sunrise runes near horizon vanishing point
      const vanishingY = height * 0.35;
      const vanishingX = width / 2;

      const runelessGrad = ctx.createRadialGradient(
        vanishingX, vanishingY, 0,
        vanishingX, vanishingY, width * 0.4
      );
      runelessGrad.addColorStop(0, 'rgba(234, 179, 8, 0.25)'); // golden sun rise glow
      runelessGrad.addColorStop(0.5, 'rgba(13, 148, 136, 0.05)'); // teal temple moss
      runelessGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = runelessGrad;
      ctx.fillRect(0, 0, width, height);

      // Two majestic giant stone temple columns standing in the horizon background
      ctx.fillStyle = '#1e293b';
      // Left horizon monolith
      ctx.fillRect(width * 0.2, vanishingY - 80, width * 0.05, 80);
      ctx.fillStyle = '#334155';
      ctx.fillRect(width * 0.19, vanishingY - 85, width * 0.07, 6);
      
      // Right horizon monolith
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(width * 0.75, vanishingY - 80, width * 0.05, 80);
      ctx.fillStyle = '#334155';
      ctx.fillRect(width * 0.74, vanishingY - 85, width * 0.07, 6);

      // 2. Draw Corridor Floor Bed and Perspective Lanes
      // Base dark ground
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, vanishingY, width, height - vanishingY);

      // Golden Rune Engravings on walls or stone floor strip
      // Draw background floor lines shifting outwards to simulate movement
      ctx.strokeStyle = '#0d9488'; // green temple stone line
      ctx.lineWidth = 1;

      // Vertical Corridor limits lines
      const leftColXMax = width * 0.10;
      const rightColXMax = width * 0.90;

      // Draw horizontal stones slab lines moving towards reader
      const speedOffset = (st.frameCount * st.speed * 20) % 40;
      for (let i = 0; i < 18; i++) {
        // Perspective scaled Z lines
        const lineZ = (i * 40 - speedOffset) / 450;
        if (lineZ > 0 && lineZ <= 1) {
          const lineY = vanishingY + (height - vanishingY) * Math.pow(lineZ, 2);
          const leftX = vanishingX + (leftColXMax - vanishingX) * lineZ;
          const rightX = vanishingX + (rightColXMax - vanishingX) * lineZ;

          ctx.strokeStyle = `rgba(13, 148, 136, ${0.1 + lineZ * 0.4})`;
          ctx.lineWidth = 1 + lineZ * 3;
          ctx.beginPath();
          ctx.moveTo(leftX, lineY);
          ctx.lineTo(rightX, lineY);
          ctx.stroke();

          // Golden brick tiles details on center lane
          if (i % 2 === 0) {
            ctx.fillStyle = `rgba(234, 179, 8, ${0.05 + lineZ * 0.15})`;
            ctx.fillRect(leftX + (rightX - leftX) * 0.35, lineY, (rightX - leftX) * 0.3, Math.max(1, lineZ * 4));
          }
        }
      }

      // Draw Lane Dividers radiating from horizon point
      const leftLaneMaxX = width * 0.15;
      const rightLaneMaxX = width * 0.85;

      const laneDividers = [
        // Extreme left edge wall
        { endX: width * 0.05, stroke: 'rgba(13, 148, 136, 0.45)', w: 3 },
        // Lane left/center boundary
        { endX: width * 0.38, stroke: 'rgba(234, 179, 8, 0.3)', w: 2 },
        // Lane center/right boundary
        { endX: width * 0.62, stroke: 'rgba(234, 179, 8, 0.3)', w: 2 },
        // Extreme right edge wall
        { endX: width * 0.95, stroke: 'rgba(13, 148, 136, 0.45)', w: 3 },
      ];

      laneDividers.forEach((div) => {
        ctx.strokeStyle = div.stroke;
        ctx.lineWidth = div.w;
        ctx.beginPath();
        ctx.moveTo(vanishingX, vanishingY);
        ctx.lineTo(div.endX, height);
        ctx.stroke();
      });

      // Side Wall Rails (resembling a deep ruined temple chasm)
      // Left side dark ruins wall
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(0, vanishingY);
      ctx.lineTo(width * 0.05, vanishingY);
      ctx.lineTo(width * 0.05, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Right side dark ruins wall
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(width, vanishingY);
      ctx.lineTo(width * 0.95, vanishingY);
      ctx.lineTo(width * 0.95, height);
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Flame torched on left/right walls to animate speed
      const wallTorchOffset = (st.frameCount * st.speed * 12) % 150;
      for (let w = 0; w < 4; w++) {
        const torchZ = (w * 150 - wallTorchOffset) / 450;
        if (torchZ > 0 && torchZ <= 1) {
          const torchY = vanishingY + (height - vanishingY - 60) * Math.pow(torchZ, 1.8);
          
          // Left Wall Torch
          const leftWallX = vanishingX + (width * 0.045 - vanishingX) * torchZ;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)'; // Reddish glowing fire
          ctx.beginPath();
          ctx.arc(leftWallX - 8, torchY, 4 + torchZ * 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(249, 115, 22, 0.9)'; // Orange core
          ctx.beginPath();
          ctx.arc(leftWallX - 8, torchY, 2 + torchZ * 8, 0, Math.PI * 2);
          ctx.fill();

          // Right Wall Torch
          const rightWallX = vanishingX + (width * 0.955 - vanishingX) * torchZ;
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.beginPath();
          ctx.arc(rightWallX + 8, torchY, 4 + torchZ * 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(249, 115, 22, 0.9)';
          ctx.beginPath();
          ctx.arc(rightWallX + 8, torchY, 2 + torchZ * 8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 3. Draw Game Objects (obstacles, coins, powerups) sorted so far objects are drawn first
      // Sort so objects closer to horizon (lower z) render behind closer objects (higher z)
      const sortedObjects = [...st.gameObjects].sort((a, b) => a.z - b.z);

      sortedObjects.forEach((obj) => {
        if (obj.z < 0 || obj.z > 1.02) return;

        // Calculate visual properties using scaling projection
        // Curve drop Y coordinate quadratic
        const objY = vanishingY + (height - vanishingY) * Math.pow(obj.z, 2);
        
        // Horizontal projection based on Lane
        const maxLaneX = obj.lane === 0 ? width * 0.20 : (obj.lane === 2 ? 0.80 * width : 0.50 * width);
        const objX = vanishingX + (maxLaneX - vanishingX) * obj.z;

        // Scale factor: object gets bigger as Z increases
        const sizeFactor = 38 * Math.pow(obj.z, 1.5) + 2; // tiny at horizon, larger near bottom

        if (obj.collected) return; // do not render collected coins

        // Draw shadow on floor
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(objX, objY, sizeFactor * 1.1, sizeFactor * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Canvas Vector Render depending on type
        if (obj.type === 'COIN_ROW') {
          // Spinning Golden Coin
          const spinFactor = Math.sin((st.frameCount * 0.15) + parseFloat(obj.id.split('-')[2] || '0') * 0.6);
          const coinH = sizeFactor * 0.95;
          const coinW = coinH * Math.abs(spinFactor);

          if (coinW > 1) {
            ctx.fillStyle = '#eab308'; // glowing yellow
            ctx.strokeStyle = '#ca8a04'; // dark gold
            ctx.lineWidth = Math.max(1, sizeFactor * 0.1);
            
            ctx.beginPath();
            ctx.ellipse(objX, objY - sizeFactor * 0.4, coinW, coinH, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Inside star/circle symbol details
            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.ellipse(objX, objY - sizeFactor * 0.4, coinW * 0.4, coinH * 0.4, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } 
        else if (obj.type === 'GEM') {
          // Shiny Red Ruby Gem
          const gemSize = sizeFactor * 1.05;
          ctx.fillStyle = '#ef4444'; // Red ruby glowing
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = Math.max(1, sizeFactor * 0.08);

          // Draw a diamond shape
          ctx.beginPath();
          ctx.moveTo(objX, objY - gemSize * 1.4);
          ctx.lineTo(objX + gemSize * 0.8, objY - gemSize * 0.7);
          ctx.lineTo(objX, objY);
          ctx.lineTo(objX - gemSize * 0.8, objY - gemSize * 0.7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Shiny white highlight
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
          ctx.beginPath();
          ctx.moveTo(objX, objY - gemSize * 1.3);
          ctx.lineTo(objX + gemSize * 0.3, objY - gemSize * 0.8);
          ctx.lineTo(objX, objY - gemSize * 0.6);
          ctx.closePath();
          ctx.fill();
        }
        else if (obj.type === 'HURDLE_LOW') {
          // Ancient Fallen Jungle Tree Log blocking path
          const obstacleW = sizeFactor * 1.9;
          const logH = sizeFactor * 0.85;

          ctx.fillStyle = '#78350f'; // Dark wood bark
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = Math.max(1, sizeFactor * 0.1);

          // Draw log cylinder structure
          ctx.beginPath();
          ctx.roundRect(objX - obstacleW / 2, objY - logH, obstacleW, logH, Math.max(2, sizeFactor * 0.15));
          ctx.fill();
          ctx.stroke();

          // Green moss details on tree log
          ctx.fillStyle = '#0f766e';
          ctx.beginPath();
          ctx.ellipse(objX - obstacleW / 4, objY - logH, obstacleW / 5, logH * 0.35, 0, 0, Math.PI * 2);
          ctx.ellipse(objX + obstacleW / 4, objY - logH, obstacleW / 6, logH * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tree ring detail on extreme left end
          ctx.fillStyle = '#ca8a04';
          ctx.beginPath();
          ctx.ellipse(objX - obstacleW / 2 + 2, objY - logH / 2, 2, logH / 3, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        else if (obj.type === 'HURDLE_HIGH') {
          // Ruined Stone Arch / overhanging spikes that forces slider
          const archW = sizeFactor * 2.3;
          const archH = sizeFactor * 3.5;

          ctx.strokeStyle = '#475569'; // slate grey stone arch
          ctx.fillStyle = '#1e293b';
          ctx.lineWidth = Math.max(2, sizeFactor * 0.18);

          // Draw Arch columns
          ctx.beginPath();
          // Left pillar
          ctx.rect(objX - archW / 2, objY - archH, archW * 0.2, archH);
          // Right pillar
          ctx.rect(objX + archW / 2 - archW * 0.2, objY - archH, archW * 0.2, archH);
          ctx.fill();
          ctx.stroke();

          // Overhead arch lintel
          ctx.fillStyle = '#334155';
          ctx.beginPath();
          ctx.roundRect(objX - archW / 2 - 4, objY - archH - 3, archW + 8, sizeFactor * 0.8, 3);
          ctx.fill();
          ctx.stroke();

          // Warning sign glowing red rune on arch lintel
          ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ef4444';
          ctx.fillRect(objX - 3, objY - archH, 6, sizeFactor * 0.4);
          ctx.shadowBlur = 0; // reset
        }
        else if (obj.type === 'CORRIDOR_BLOCKED') {
          // Solid heavy ruined obsidian stone slab block, must change lane!
          const slabW = sizeFactor * 1.8;
          const slabH = sizeFactor * 3.4;

          // Back shadow
          ctx.fillStyle = '#020617';
          ctx.fillRect(objX - slabW / 2, objY - slabH, slabW, slabH);

          // Front glowing panel
          const wallGrad = ctx.createLinearGradient(objX - slabW/2, objY, objX + slabW/2, objY - slabH);
          wallGrad.addColorStop(0, '#1e1b4b'); // Deep indigo purple
          wallGrad.addColorStop(1, '#311042');
          ctx.fillStyle = wallGrad;
          ctx.beginPath();
          ctx.roundRect(objX - slabW / 1.9, objY - slabH, slabW * 1.05, slabH, 5);
          ctx.fill();

          ctx.strokeStyle = '#ef4444'; // red outline laser guard lines warning
          ctx.lineWidth = Math.max(1.5, sizeFactor * 0.12);
          ctx.beginPath();
          ctx.strokeRect(objX - slabW / 1.9, objY - slabH, slabW * 1.05, slabH);

          // Runic hazard symbol inside block
          ctx.fillStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.beginPath();
          ctx.moveTo(objX, objY - slabH * 0.8);
          ctx.lineTo(objX + slabW * 0.35, objY - slabH * 0.45);
          ctx.lineTo(objX - slabW * 0.35, objY - slabH * 0.45);
          ctx.closePath();
          ctx.fill();
        }
        else if (obj.type === 'GAP') {
          // Complete cracked black void gap of floor structure
          const gapW = sizeFactor * 2.1;
          const gapH = sizeFactor * 0.6;

          ctx.fillStyle = '#000000'; // black deep dungeon abyss yawning void
          ctx.strokeStyle = '#ef4444'; // fiery crumbling red margins
          ctx.lineWidth = Math.max(1, sizeFactor * 0.08);

          ctx.beginPath();
          ctx.ellipse(objX, objY, gapW, gapH, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Lava / flame heat lines inside gap abyss
          ctx.strokeStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(objX - gapW * 0.6, objY);
          ctx.lineTo(objX + gapW * 0.5, objY);
          ctx.stroke();
        }
        else if (obj.type === 'POWER_SHIELD') {
          // Floating Shield Power-up
          drawPowerupOrb(ctx, objX, objY, sizeFactor, '#3b82f6', '#93c5fd', 'S');
        }
        else if (obj.type === 'POWER_MAGNET') {
          // Floating magnet Power-up
          drawPowerupOrb(ctx, objX, objY, sizeFactor, '#ea580c', '#fdba74', 'M');
        }
        else if (obj.type === 'POWER_BOOST') {
          // Floating turbo Speed Boost Power-up
          drawPowerupOrb(ctx, objX, objY, sizeFactor, '#ea580c', '#fde047', '⚡');
        }
      });

      // Power-up rendering utility helper
      function drawPowerupOrb(ctx: CanvasRenderingContext2D, x: number, y: number, sf: number, col1: string, col2: string, text: string) {
        const floatY = y - sf * 1.1 - Math.sin((st.frameCount * 0.12) + x) * 6;
        
        // Inner glowing core
        const orbGrad = ctx.createRadialGradient(x, floatY, 0, x, floatY, sf * 1.5);
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.3, col2);
        orbGrad.addColorStop(0.9, col1);
        orbGrad.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = orbGrad;
        ctx.beginPath();
        ctx.arc(x, floatY, sf * 1.5, 0, Math.PI * 2);
        ctx.fill();

        // High glossy ring surrounding orb
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, sf * 0.09);
        ctx.beginPath();
        ctx.ellipse(x, floatY, sf * 1.1, sf * 0.45, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Text display ID
        ctx.font = `bold ${Math.max(10, Math.round(sf * 1.05))}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, floatY);
      }

      // 4. Draw Player Runner Character
      // The player has static Z coordinate = 0.85 on the screen
      const playerZ = 0.85;
      const playerYBase = vanishingY + (height - vanishingY) * Math.pow(playerZ, 2);
      
      const playerX = vanishingX + (st.playerVisualX * width - vanishingX) * playerZ;
      const playerSF = 38 * Math.pow(playerZ, 1.5) + 2; // base size scaling

      // Jump adjustment displacement
      let playerJumpHeightOffset = 0;
      if (st.isJumping) {
        const percent = st.jumpTimer / st.jumpDuration;
        // Parabolic jump curve
        playerJumpHeightOffset = Math.sin(percent * Math.PI) * 95;
      }
      const playerY = playerYBase - playerJumpHeightOffset;

      // Squashing deformation for Slider
      let playerScaleY = 1.0;
      let playerScaleX = 1.0;
      if (st.isSliding) {
        playerScaleY = 0.42; // flat squashed torso sliding under vines
        playerScaleX = 1.15;
      }

      // Draw shadow at floor
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath();
      // Shadow does NOT jump with player, but tracks physical lane positions
      ctx.ellipse(playerX, playerYBase + 3, playerSF * 1.1, playerSF * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      // Custom Runner Vector Drawing
      const pColor = selectedSkin.color;
      const pAccentColor = selectedSkin.accentColor;
      const pSkinColor = selectedSkin.headColor;

      // Vector Character Assembly
      ctx.save();
      ctx.translate(playerX, playerY - (playerSF * 2 * playerScaleY));
      ctx.scale(playerScaleX, playerScaleY);

      // Running swing phase computations
      const runCycleSpeed = 0.38 + st.speed * 8;
      const swayPhase = Math.sin(st.frameCount * runCycleSpeed);
      const legLeftTheta = swayPhase * 0.65;
      const legRightTheta = -swayPhase * 0.65;
      const armLeftTheta = -swayPhase * 0.55;
      const armRightTheta = swayPhase * 0.55;

      // A. Drawing Back Leg
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = playerSF * 0.28;
      ctx.beginPath();
      ctx.moveTo(-playerSF * 0.2, playerSF * 1.5);
      const bLegTermX = -playerSF * 0.3 + Math.sin(legRightTheta) * playerSF * 1.1;
      const bLegTermY = playerSF * 1.5 + Math.cos(legRightTheta) * playerSF * 1.1;
      ctx.lineTo(bLegTermX, bLegTermY);
      ctx.stroke();

      // Shoes details back
      ctx.fillStyle = pAccentColor;
      ctx.beginPath();
      ctx.arc(bLegTermX, bLegTermY, playerSF * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // B. Torso (Coat jacket) and Backpack
      // Backpack/satchel
      ctx.fillStyle = '#78350f'; // Brown rustic bag pack
      ctx.fillRect(-playerSF * 0.72, playerSF * 0.1, playerSF * 0.4, playerSF * 1.0);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-playerSF * 0.72, playerSF * 0.2, playerSF * 0.1, playerSF * 0.8);

      // Main heavy adventurer torso
      ctx.fillStyle = pColor;
      ctx.beginPath();
      ctx.roundRect(-playerSF * 0.45, 0, playerSF * 0.85, playerSF * 1.6, playerSF * 0.2);
      ctx.fill();

      // Golden detailing utility belts / scarf
      ctx.fillStyle = pAccentColor;
      ctx.fillRect(-playerSF * 0.43, playerSF * 0.4, playerSF * 0.82, playerSF * 0.3); // cross belt
      ctx.fillRect(-playerSF * 0.35, playerSF * 1.0, playerSF * 0.7, playerSF * 0.15); // waist belt

      // C. Front Leg (active runner)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = playerSF * 0.32;
      ctx.beginPath();
      ctx.moveTo(playerSF * 0.12, playerSF * 1.5);
      const fLegTermX = playerSF * 0.22 + Math.sin(legLeftTheta) * playerSF * 1.15;
      const fLegTermY = playerSF * 1.5 + Math.cos(legLeftTheta) * playerSF * 1.15;
      ctx.lineTo(fLegTermX, fLegTermY);
      ctx.stroke();

      // Shoes details front
      ctx.fillStyle = pAccentColor;
      ctx.beginPath();
      ctx.arc(fLegTermX, fLegTermY, playerSF * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // D. Adventurer Head (custom skin color)
      ctx.fillStyle = pSkinColor;
      ctx.beginPath();
      ctx.arc(0, -playerSF * 0.4, playerSF * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Retro Explorer Hat
      ctx.fillStyle = '#854d0e'; // Fedora / explorer headgear
      ctx.beginPath();
      ctx.ellipse(0, -playerSF * 0.65, playerSF * 0.75, playerSF * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a16207'; // Hat crown dome
      ctx.beginPath();
      ctx.ellipse(0, -playerSF * 0.82, playerSF * 0.45, playerSF * 0.3, 0, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();

      // Goggles or visor
      ctx.fillStyle = '#38bdf8'; // glossy cyan goggles
      ctx.fillRect(-playerSF * 0.28, -playerSF * 0.48, playerSF * 0.55, playerSF * 0.15);

      // E. Arms
      ctx.strokeStyle = pColor;
      ctx.lineWidth = playerSF * 0.22;
      ctx.beginPath();
      ctx.moveTo(0, playerSF * 0.3);
      const armTermX = Math.sin(armLeftTheta) * playerSF * 0.85;
      const armTermY = playerSF * 0.3 + Math.cos(armLeftTheta) * playerSF * 0.85;
      ctx.lineTo(armTermX, armTermY);
      ctx.stroke();

      ctx.restore();

      // F. Power-up Glowing Bubbles surrounds Player
      if (st.shieldTimeLeft > 0) {
        // Neon Blue Protection dome
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#06b6d4';
        
        ctx.beginPath();
        ctx.arc(playerX, playerY - playerSF, playerSF * 2.1, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fill();
        ctx.shadowBlur = 0; // restore
      }

      if (st.boostTimeLeft > 0) {
        // Glowing Golden Speed Trails spark
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.85)';
        ctx.lineWidth = 5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#eab308';
        
        ctx.beginPath();
        ctx.arc(playerX, playerY - playerSF, playerSF * 1.9, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(234, 179, 8, 0.05)';
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw lightning particles behind player
        for (let p = 0; p < 3; p++) {
          const randAngle = Math.random() * Math.PI * 2;
          const pRad = playerSF * (1.1 + Math.random() * 0.7);
          const px = playerX + Math.cos(randAngle) * pRad;
          const py = (playerY - playerSF) + Math.sin(randAngle) * pRad;
          
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(px, py, 3, 10 + Math.random() * 10);
        }
      }

      // Magnet sparks drawing on top of player's head
      if (st.magnetTimeLeft > 0) {
        ctx.fillStyle = '#ea580c';
        ctx.font = '14px sans-serif';
        ctx.fillText('🧲', playerX, playerY - playerSF * 2.8 + Math.sin(st.frameCount * 0.2) * 5);
      }

      // 5. Draw Chasing Beast Monster (The Temple Guardian!)
      // The beast looms closer depending on st.monsterIntimacy.
      // If monsterIntimacy is 0, he stays hidden behind view horizon.
      // If monsterIntimacy is high (e.g. 90), he is rendered HUGE right behind player!
      if (st.monsterIntimacy > 1) {
        const beastProximity = st.monsterIntimacy / 100; // 0.0 to 1.0 close
        
        // Render Beast at depth corresponding to closeness
        const beastZ = 0.85 - (1.0 - beastProximity) * 0.45; // right behind player!
        
        const beastYBase = vanishingY + (height - vanishingY) * Math.pow(beastZ, 2);
        const playerClampedVisualX = st.playerVisualX + (Math.sin(st.frameCount * 0.1) * 0.05); // follows shakily
        const beastX = vanishingX + (playerClampedVisualX * width - vanishingX) * beastZ;
        const beastSF = 70 * Math.pow(beastZ, 1.4); // MASSIVE shadow

        // Render black shadowy demon claws
        ctx.save();
        ctx.translate(beastX, beastYBase - beastSF * 1.25);
        
        // Demonic roar shakes screen
        const rumbleX = (Math.random() - 0.5) * 5 * beastProximity;
        const rumbleY = (Math.random() - 0.5) * 5 * beastProximity;
        ctx.translate(rumbleX, rumbleY);

        // Body Shadow
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)'; // scary dark charcoal grey
        ctx.beginPath();
        ctx.roundRect(-beastSF * 0.9, 0, beastSF * 1.8, beastSF * 1.8, beastSF * 0.5);
        ctx.fill();

        // Massive Claws
        ctx.fillStyle = '#020617';
        // Left arm clawing outwards
        ctx.beginPath();
        ctx.ellipse(-beastSF * 1.0, beastSF * 0.6, beastSF * 0.7, beastSF * 0.25, -Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();
        // Claws fingers
        ctx.strokeStyle = '#ef4444'; // bloody fangs claws details
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-beastSF * 1.5, beastSF * 0.6);
        ctx.lineTo(-beastSF * 1.7, beastSF * 0.8);
        ctx.stroke();

        // Right arm clawing outwards
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.ellipse(beastSF * 1.0, beastSF * 0.6, beastSF * 0.7, beastSF * 0.25, Math.PI * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(beastSF * 1.5, beastSF * 0.6);
        ctx.lineTo(beastSF * 1.7, beastSF * 0.8);
        ctx.stroke();

        // Demonic glowing eyes
        ctx.fillStyle = '#ef4444'; // Glowing demonic red eyes
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff0000';
        ctx.beginPath();
        // Angry slanted eye shape left
        ctx.moveTo(-beastSF * 0.4, beastSF * 0.35);
        ctx.lineTo(-beastSF * 0.15, beastSF * 0.45);
        ctx.lineTo(-beastSF * 0.45, beastSF * 0.5);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        // Angry slanted eye shape right
        ctx.moveTo(beastSF * 0.4, beastSF * 0.35);
        ctx.lineTo(beastSF * 0.15, beastSF * 0.45);
        ctx.lineTo(beastSF * 0.45, beastSF * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0; // restore

        // Slanted scary fangs
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-beastSF * 0.25, beastSF * 0.9);
        ctx.lineTo(-beastSF * 0.15, beastSF * 1.15); // fang 1
        ctx.lineTo(-beastSF * 0.05, beastSF * 0.9);
        ctx.lineTo(beastSF * 0.05, beastSF * 0.9);
        ctx.lineTo(beastSF * 0.15, beastSF * 1.15); // fang 2
        ctx.lineTo(beastSF * 0.25, beastSF * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }

      // 6. Draw visual crash screen-shake flash
      if (st.stumbleFlashTimer > 0) {
        ctx.fillStyle = `rgba(239, 68, 68, ${st.stumbleFlashTimer / 25})`;
        ctx.fillRect(0, 0, width, height);
      }
    };

    // Run active loop
    stateRef.current.animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.animationFrameId);
    };
  }, [selectedSkin, upgrades, dimensions]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-950 border border-slate-800" ref={containerRef}>
      
      {/* Absolute Canvas */}
      <canvas
        id="game-endless-runner-canvas"
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="block mx-auto w-full max-w-full cursor-pointer h-full object-cover select-none"
      />

      {/* Modern Retro Gaming Heads-Up Display overlays */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none select-none">
        
        {/* Statistics info board */}
        <div className="flex gap-4">
          <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 flex flex-col items-start shadow-lg">
            <span className="text-[10px] font-mono text-cyan-400 mt-0.5 tracking-wider font-semibold">METERS RUN</span>
            <span className="text-xl font-mono text-slate-100 font-bold tracking-tight">{distance}m</span>
          </div>
          
          <div className="px-3 py-1 bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 flex flex-col items-start shadow-lg">
            <span className="text-[10px] font-mono text-emerald-400 mt-0.5 tracking-wider font-semibold">COINS</span>
            <span className="text-xl font-mono text-slate-100 font-bold tracking-tight">🪙 {coins}</span>
          </div>
        </div>

        {/* Total Score display board */}
        <div className="flex flex-col items-end gap-2">
          <div className="px-4 py-1.5 bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-500/30 flex flex-col items-end shadow-lg animate-pulse">
            <span className="text-[10px] font-mono text-yellow-400 mt-0.5 tracking-wider font-bold">ARCADE SCORE</span>
            <span className="text-2xl font-mono text-yellow-300 font-bold tracking-wider">{score}</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSound();
            }}
            className="pointer-events-auto p-1.5 bg-slate-900/60 backdrop-blur-sm rounded-lg hover:bg-slate-800/80 transition-colors border border-slate-700/50 text-slate-300"
            title="Toggle sound"
            id="toggle-game-audio-button"
          >
            {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </div>

      {/* Active Boost Powerups bar indicator overlays */}
      <div className="absolute bottom-5 left-4 flex flex-col gap-2.5 pointer-events-none max-w-[200px] select-none">
        {activeShield && (
          <div className="flex items-center gap-2 border border-blue-500/30 bg-blue-950/85 backdrop-blur-sm shadow-md rounded-xl py-1 px-3.5 text-blue-300 animate-pulse text-xs font-mono font-semibold">
            <Shield size={14} className="text-blue-400" />
            <span>SHIELD ACTIVE</span>
          </div>
        )}
        {activeMagnet && (
          <div className="flex items-center gap-2 border border-orange-500/30 bg-orange-950/85 backdrop-blur-sm shadow-md rounded-xl py-1 px-3.5 text-orange-300 animate-pulse text-xs font-mono font-semibold">
            <Sparkles size={14} className="text-orange-400" />
            <span>COIN MAGNET ACTIVE</span>
          </div>
        )}
        {activeBoost && (
          <div className="flex items-center gap-2 border border-yellow-500/30 bg-yellow-950/85 backdrop-blur-sm shadow-md rounded-xl py-1 px-3.5 text-yellow-300 animate-pulse text-xs font-mono font-bold">
            <Zap size={14} className="text-yellow-400" />
            <span>TURBO BOOST ACTIVE</span>
          </div>
        )}
      </div>

      {/* Demonic warning indicator! */}
      {monsterWarning && (
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 border border-red-500/50 bg-red-950/90 backdrop-blur-md shadow-2xl rounded-2xl py-2 px-5 text-red-100 flex items-center gap-2.5 pointer-events-none select-none text-sm font-mono font-bold animate-bounce">
          <AlertTriangle size={18} className="text-red-500 animate-pulse" />
          <span>GUARDIAN MONSTER IS RAGING BEHIND!</span>
        </div>
      )}

      {/* Mobile Swipe Buttons helper panel overlay (Only visible on small devices) */}
      <div className="absolute bottom-5 right-4 flex gap-2 pointer-events-auto">
        <button
          onClick={triggerMoveLeft}
          className="p-3 bg-slate-900/80 backdrop-blur-sm rounded-xl hover:bg-slate-800 border border-slate-700/60 text-slate-100 active:scale-95 transition-transform text-xs font-mono font-bold select-none shadow-lg md:hidden"
          title="Move Left"
          id="mobile-btn-left"
        >
          ◀
        </button>
        <div className="flex flex-col gap-2">
          <button
            onClick={triggerJump}
            className="p-2.5 bg-slate-900/80 backdrop-blur-sm rounded-xl hover:bg-slate-800 border border-slate-700/60 text-slate-100 active:scale-95 transition-transform text-[10px] font-mono font-bold select-none shadow-lg md:hidden"
            title="Jump"
            id="mobile-btn-jump"
          >
            ▲ JUMP
          </button>
          <button
            onClick={triggerSlide}
            className="p-2.5 bg-slate-900/80 backdrop-blur-sm rounded-xl hover:bg-slate-800 border border-slate-700/60 text-slate-100 active:scale-95 transition-transform text-[10px] font-mono font-bold select-none shadow-lg md:hidden"
            title="Slide"
            id="mobile-btn-slide"
          >
            ▼ SLIDE
          </button>
        </div>
        <button
          onClick={triggerMoveRight}
          className="p-3 bg-slate-900/80 backdrop-blur-sm rounded-xl hover:bg-slate-800 border border-slate-700/60 text-slate-100 active:scale-95 transition-transform text-xs font-mono font-bold select-none shadow-lg md:hidden"
          title="Move Right"
          id="mobile-btn-right"
        >
          ▶
        </button>
      </div>

      {/* Mini Controls guidelines indicator on bottom center (Desktop only) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4 py-1.5 px-4 rounded-full bg-slate-950/85 backdrop-blur-md border border-slate-800 text-[10px] font-mono text-slate-400 select-none pointer-events-none">
        <span>◀ ▶ Or A D : Move lane</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>▲ Or SPACE : Jump</span>
        <span className="w-1 h-1 rounded-full bg-slate-700" />
        <span>▼ Or S : Slide</span>
      </div>

      {/* Visual overlay for Paused state */}
      {isPaused && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 z-20">
          <h2 className="text-3xl font-sans tracking-wide font-bold text-slate-100 mb-2">RUN PAUSED</h2>
          <p className="text-slate-400 text-xs font-sans max-w-sm text-center mb-6">
            The Temple Guardian halts in the ruins. Take a breath and focus. Look ahead at the next ruins!
          </p>
          <button
            onClick={togglePause}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-100 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-emerald-900/20 active:scale-95 transition-all text-sm"
            id="paused-resume-button"
          >
            <Play size={16} />
            <span>RESUME RUNNING</span>
          </button>
        </div>
      )}
    </div>
  );
};
