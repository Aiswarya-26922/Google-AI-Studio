import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameView, PlayerSkin, UpgradeItem, HighScore, GameStats, Achievement } from './types';
import { sound } from './components/SoundEngine';
import { GameCanvas } from './components/GameCanvas';
import { MainMenu } from './components/MainMenu';
import { Leaderboard } from './components/Leaderboard';
import { 
  Trophy, 
  MapPin, 
  Coins, 
  Award, 
  RotateCcw, 
  ArrowRight, 
  Skull, 
  Compass, 
  Sparkles, 
  Flame,
  Volume2,
  VolumeX,
  BookOpen,
  X
} from 'lucide-react';

const LOCAL_STORAGE_STATS_KEY = 'temple_runner_stats_v1';
const LOCAL_STORAGE_SKINS_KEY = 'temple_runner_skins_v1';
const LOCAL_STORAGE_UPGRADES_KEY = 'temple_runner_upgrades_v1';
const LOCAL_STORAGE_SCORES_KEY = 'temple_runner_scores_v1';
const LOCAL_STORAGE_ACHS_KEY = 'temple_runner_achs_v1';
const LOCAL_STORAGE_SELECTED_SKIN = 'temple_runner_selected_skin_v1';
const LOCAL_STORAGE_SOUND_KEY = 'temple_runner_sound_v1';

const initialSkins: PlayerSkin[] = [
  {
    id: 'guy_default',
    name: 'Guy Templeton',
    description: 'A courageous, seasoned explorer carrying a side-satchel backpack.',
    cost: 0,
    unlocked: true,
    color: '#b45309', // khaki brown explorer attire
    accentColor: '#15803d', // green leaf scarf
    headColor: '#fbcfe8',
  },
  {
    id: 'jane_archaeologist',
    name: 'Jane Lara',
    description: 'An agile archaeologist wearing comfortable climbing gears for acrobatics.',
    cost: 150,
    unlocked: false,
    color: '#0f766e', // teal survival armor
    accentColor: '#e11d48', // ruby details
    headColor: '#ffe4e6',
  },
  {
    id: 'cyber_runner',
    name: 'Neo Cypher',
    description: 'A high-spec synthetic android configured with cybernetic glowing optics.',
    cost: 450,
    unlocked: false,
    color: '#1d4ed8', // cyber active blue
    accentColor: '#ea580c', // hazardous safety orange stripes
    headColor: '#38bdf8', // hollow cyber glow skin
    special: '+25% Extra Score Speed',
  },
  {
    id: 'golden_monarch',
    name: 'Golden Sovereign',
    description: 'An elite champion of the temple legends completely clad in heavy gold.',
    cost: 950,
    unlocked: false,
    color: '#eab308', // solid glistening gold
    accentColor: '#fafafa', // contrast bone lining
    headColor: '#ca8a04',
    special: 'Elite double multiplier perks',
  },
];

const initialUpgrades: UpgradeItem[] = [
  {
    id: 'upgrade_shield',
    name: 'Aegis Force Shield',
    description: 'Increases active duration of the Shield powerup by +20% per level.',
    level: 0,
    maxLevel: 5,
    costs: [100, 250, 500, 1000, 2000],
    baseValue: 1.0,
    multiplier: 0.20,
  },
  {
    id: 'upgrade_magnet',
    name: 'Vortex Coin Magnet',
    description: 'Boosts gold coins pull radius and collection duration by +20% per grade.',
    level: 0,
    maxLevel: 5,
    costs: [150, 300, 600, 1200, 2400],
    baseValue: 1.0,
    multiplier: 0.20,
  },
  {
    id: 'shop_multiplier',
    name: 'Arcade Score Multiplier',
    description: 'Increases score earnings rate by additional x1 multiplier count per level.',
    level: 0,
    maxLevel: 5,
    costs: [200, 400, 800, 1600, 3200],
    baseValue: 1.0,
    multiplier: 1.0,
  },
];

const initialAchievements: Achievement[] = [
  {
    id: 'ach_meters_150',
    name: 'Quick Sprint',
    description: 'Run 150 cumulative meters through ancient dark corridors.',
    requirementType: 'distance',
    targetValue: 150,
    rewardCoins: 50,
    currentValue: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'ach_meters_600',
    name: 'Ruins Champion',
    description: 'Record 600 cumulative meters of adventurous running.',
    requirementType: 'distance',
    targetValue: 600,
    rewardCoins: 150,
    currentValue: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'ach_coins_100',
    name: 'Treasure Farmer',
    description: 'Collect 100 cumulative gold coins across your runs.',
    requirementType: 'coins',
    targetValue: 100,
    rewardCoins: 100,
    currentValue: 0,
    completed: false,
    claimed: false,
  },
  {
    id: 'ach_runs_8',
    name: 'Undying Resolve',
    description: 'Initiate 8 distinct expeditions into the Temple.',
    requirementType: 'runCount',
    targetValue: 8,
    rewardCoins: 120,
    currentValue: 0,
    completed: false,
    claimed: false,
  },
];

export default function App() {
  const [currentView, setCurrentView] = useState<GameView>(GameView.Menu);

  // Persistence States
  const [stats, setStats] = useState<GameStats>({
    coins: 40, // some modest starting budget
    totalCoinsCollected: 0,
    totalDistanceRun: 0,
    totalRuns: 0,
    highScore: 0,
  });

  const [skins, setSkins] = useState<PlayerSkin[]>(initialSkins);
  const [upgrades, setUpgrades] = useState<UpgradeItem[]>(initialUpgrades);
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [selectedSkinId, setSelectedSkinId] = useState<string>('guy_default');
  const [scores, setScores] = useState<HighScore[]>([]);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  // Late game-over statistics cache
  const [lastRunStats, setLastRunStats] = useState<{
    score: number;
    distance: number;
    coinsCollected: number;
    isNewHighScore: boolean;
  }>({
    score: 0,
    distance: 0,
    coinsCollected: 0,
    isNewHighScore: false,
  });

  const [runnerNickname, setRunnerNickname] = useState<string>('Explorer');
  const [viewingGuide, setViewingGuide] = useState<boolean>(false);

  // Load state on mount
  useEffect(() => {
    try {
      const statsRaw = localStorage.getItem(LOCAL_STORAGE_STATS_KEY);
      if (statsRaw) setStats(JSON.parse(statsRaw));

      const skinsRaw = localStorage.getItem(LOCAL_STORAGE_SKINS_KEY);
      if (skinsRaw) {
        // preserve base attributes of new skins but hydrate unlock statuses
        const parsedSkins = JSON.parse(skinsRaw);
        setSkins(skins => skins.map(s => {
          const matched = parsedSkins.find((p: any) => p.id === s.id);
          return matched ? { ...s, unlocked: matched.unlocked } : s;
        }));
      }

      const upgradesRaw = localStorage.getItem(LOCAL_STORAGE_UPGRADES_KEY);
      if (upgradesRaw) {
        const parsedUpgrades = JSON.parse(upgradesRaw);
        setUpgrades(ups => ups.map(u => {
          const matched = parsedUpgrades.find((p: any) => p.id === u.id);
          return matched ? { ...u, level: matched.level } : u;
        }));
      }

      const scoresRaw = localStorage.getItem(LOCAL_STORAGE_SCORES_KEY);
      if (scoresRaw) setScores(JSON.parse(scoresRaw));

      const achsRaw = localStorage.getItem(LOCAL_STORAGE_ACHS_KEY);
      if (achsRaw) {
        const parsedAchs = JSON.parse(achsRaw);
        setAchievements(achs => achs.map(a => {
          const matched = parsedAchs.find((p: any) => p.id === a.id);
          return matched ? { ...a, currentValue: matched.currentValue, completed: matched.completed, claimed: matched.claimed } : a;
        }));
      }

      const selSkin = localStorage.getItem(LOCAL_STORAGE_SELECTED_SKIN);
      if (selSkin) setSelectedSkinId(selSkin);

      const savedSound = localStorage.getItem(LOCAL_STORAGE_SOUND_KEY);
      if (savedSound !== null) {
        const enabled = savedSound === 'true';
        setIsSoundEnabled(enabled);
        sound.setEnabled(enabled);
      }
    } catch (e) {
      console.error('Failed to load local storage state components', e);
    }
  }, []);

  // Save changes helper
  const saveStats = (newStats: GameStats) => {
    setStats(newStats);
    localStorage.setItem(LOCAL_STORAGE_STATS_KEY, JSON.stringify(newStats));
  };

  const handleUpdateSound = () => {
    const val = !isSoundEnabled;
    setIsSoundEnabled(val);
    sound.setEnabled(val);
    localStorage.setItem(LOCAL_STORAGE_SOUND_KEY, String(val));
    sound.playCoin();
  };

  const handleSelectSkin = (id: string) => {
    setSelectedSkinId(id);
    localStorage.setItem(LOCAL_STORAGE_SELECTED_SKIN, id);
  };

  const handleUnlockSkin = (id: string, cost: number) => {
    if (stats.coins < cost) return;

    const updatedSkins = skins.map(s => s.id === id ? { ...s, unlocked: true } : s);
    setSkins(updatedSkins);
    localStorage.setItem(LOCAL_STORAGE_SKINS_KEY, JSON.stringify(updatedSkins));

    const updatedStats = { ...stats, coins: stats.coins - cost };
    saveStats(updatedStats);
  };

  const handleUpgradeItem = (id: string, cost: number) => {
    if (stats.coins < cost) return;

    const updatedUpgrades = upgrades.map(u => {
      if (u.id === id && u.level < u.maxLevel) {
        return { ...u, level: u.level + 1 };
      }
      return u;
    });
    setUpgrades(updatedUpgrades);
    localStorage.setItem(LOCAL_STORAGE_UPGRADES_KEY, JSON.stringify(updatedUpgrades));

    const updatedStats = { ...stats, coins: stats.coins - cost };
    saveStats(updatedStats);
    sound.playGem();
  };

  // Claim mission reward
  const handleClaimAchievement = (id: string) => {
    const ach = achievements.find(a => a.id === id);
    if (!ach || !ach.completed || ach.claimed) return;

    const updatedAchs = achievements.map(a => a.id === id ? { ...a, claimed: true } : a);
    setAchievements(updatedAchs);
    localStorage.setItem(LOCAL_STORAGE_ACHS_KEY, JSON.stringify(updatedAchs));

    const updatedStats = { ...stats, coins: stats.coins + ach.rewardCoins };
    saveStats(updatedStats);
  };

  const handleClearScoreboard = () => {
    setScores([]);
    localStorage.removeItem(LOCAL_STORAGE_SCORES_KEY);
  };

  // Track achievement values progress
  const handleTrackStats = (metersIncrement: number, coinsIncrement: number, actionType?: 'jump' | 'slide') => {
    const updatedAchs = achievements.map(ach => {
      if (ach.claimed) return ach;
      
      let val = ach.currentValue;
      if (ach.requirementType === 'distance' && metersIncrement > 0) {
        val += metersIncrement;
      } else if (ach.requirementType === 'coins' && coinsIncrement > 0) {
        val += coinsIncrement;
      }
      
      const comp = val >= ach.targetValue;
      return {
        ...ach,
        currentValue: Math.min(ach.targetValue, val),
        completed: comp,
      };
    });

    setAchievements(updatedAchs);
    localStorage.setItem(LOCAL_STORAGE_ACHS_KEY, JSON.stringify(updatedAchs));
  };

  // Triggered when active running crashes
  const handleGameOver = ({ score, distance, coinsCollected }: { score: number; distance: number; coinsCollected: number }) => {
    const isNewHigh = score > stats.highScore;

    // Save final stats
    const updatedStats = {
      ...stats,
      totalCoinsCollected: stats.totalCoinsCollected + coinsCollected,
      totalDistanceRun: stats.totalDistanceRun + distance,
      totalRuns: stats.totalRuns + 1,
      highScore: isNewHigh ? score : stats.highScore,
      coins: stats.coins + coinsCollected, // reward earned
    };
    saveStats(updatedStats);

    setLastRunStats({
      score,
      distance,
      coinsCollected,
      isNewHighScore: isNewHigh,
    });

    // Update cumulative achievements
    const updatedAchs = achievements.map(ach => {
      if (ach.claimed) return ach;
      let val = ach.currentValue;
      if (ach.requirementType === 'distance') {
        val += distance;
      } else if (ach.requirementType === 'coins') {
        val += coinsCollected;
      } else if (ach.requirementType === 'runCount') {
        val += 1;
      }
      return {
        ...ach,
        currentValue: Math.min(ach.targetValue, val),
        completed: val >= ach.targetValue
      };
    });
    setAchievements(updatedAchs);
    localStorage.setItem(LOCAL_STORAGE_ACHS_KEY, JSON.stringify(updatedAchs));

    setCurrentView(GameView.GameOver);
  };

  // Save current record to high score list
  const handleSaveScore = () => {
    const record: HighScore = {
      id: `score-${Date.now()}`,
      name: runnerNickname.trim() || 'Hero Adventurer',
      score: lastRunStats.score,
      distance: lastRunStats.distance,
      coins: lastRunStats.coinsCollected,
      date: new Date().toISOString(),
    };

    const newScores = [record, ...scores].sort((a, b) => b.score - a.score);
    setScores(newScores);
    localStorage.setItem(LOCAL_STORAGE_SCORES_KEY, JSON.stringify(newScores));

    sound.playCoin();
    setCurrentView(GameView.Leaderboard);
  };

  return (
    <div className="min-h-screen natural-bg text-[#cad2c5] flex flex-col items-center justify-center p-3 md:p-6 select-none font-sans relative overflow-hidden">
      
      {/* Decorative Natural Forest Vines backing layer */}
      <div className="vine-left opacity-35 sm:opacity-50 lg:opacity-85" />
      <div className="vine-right opacity-30 sm:opacity-40 lg:opacity-75" />

      {/* Decorative Outer Ambient Temple Toras / Sconces */}
      <div className="absolute top-1/2 left-5 -translate-y-1/2 hidden lg:flex flex-col gap-6 items-center z-10">
        <Flame className="text-[#e76f51]/35 h-7 w-7 animate-pulse" />
        <span className="w-[1px] h-32 bg-[#52796f]/40" />
        <span className="text-[10px] font-mono text-[#84a59d]/55 [writing-mode:vertical-lr] tracking-widest uppercase">
          TEMPLE_OUTPOST_NORTH
        </span>
      </div>

      <div className="absolute top-1/2 right-5 -translate-y-1/2 hidden lg:flex flex-col gap-6 items-center z-10">
        <Flame className="text-[#e76f51]/35 h-7 w-7 animate-pulse" />
        <span className="w-[1px] h-32 bg-[#52796f]/40" />
        <span className="text-[10px] font-mono text-[#84a59d]/55 [writing-mode:vertical-lr] tracking-widest uppercase">
          TEMPLE_OUTPOST_SOUTH
        </span>
      </div>

      {/* Main Responsive Panel Wrapper */}
      <div className="w-full max-w-2xl flex flex-col gap-4 relative z-10">
        
        {/* Navigation Quick Strip Bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-[#132c1f]/85 rounded-2xl border border-[#52796f]/55 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#2d6a4f]/20 text-[#84a59d] text-base">🌿</span>
            <span className="font-mono text-xs font-bold text-[#cad2c5] tracking-wide">CAMP_OUTPOST_RECORDS</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Guide manual button */}
            <button
              onClick={() => { sound.playSlide(); setViewingGuide(true); }}
              className="px-2.5 py-1 bg-[#0b1a13]/85 border border-[#52796f]/50 hover:border-[#84a59d] rounded-lg hover:bg-[#1a3828] text-[10px] text-[#84a59d] hover:text-[#cad2c5] font-mono font-bold flex items-center gap-1 transition"
              id="view-manual-guide"
            >
              <BookOpen size={10} />
              <span>GUIDE</span>
            </button>
            
            <button 
              onClick={handleUpdateSound}
              className="p-1 bg-[#0b1a13]/70 hover:border-[#52796f] border border-transparent rounded-lg text-[#84a59d] hover:text-[#cad2c5] transition"
              id="sound-switch-btn"
            >
              {isSoundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
            </button>
          </div>
        </div>

        {/* Dynamic game views wrapper */}
        <AnimatePresence mode="wait">
          
          {/* VIEW: MAIN MENU TABS */}
          {currentView === GameView.Menu && (
            <motion.div
              key="view-menu"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <MainMenu
                stats={stats}
                skins={skins}
                upgrades={upgrades}
                achievements={achievements}
                selectedSkinId={selectedSkinId}
                onSelectSkin={handleSelectSkin}
                onUnlockSkin={handleUnlockSkin}
                onUpgrade={handleUpgradeItem}
                onClaimAchievement={handleClaimAchievement}
                onViewChange={setCurrentView}
                isSoundEnabled={isSoundEnabled}
                onToggleSound={handleUpdateSound}
              />
            </motion.div>
          )}

          {/* VIEW: ACTIVE ARCADE PLAYING */}
          {currentView === GameView.Playing && (
            <motion.div
              key="view-playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <GameCanvas
                selectedSkin={skins.find(s => s.id === selectedSkinId) || skins[0]}
                upgrades={upgrades}
                onGameOver={handleGameOver}
                onCoinCollected={(c) => handleTrackStats(0, c)}
                onTrackStats={handleTrackStats}
                isSoundEnabled={isSoundEnabled}
                onToggleSound={handleUpdateSound}
              />
            </motion.div>
          )}

          {/* VIEW: GAME OVER REPORT BOARD */}
          {currentView === GameView.GameOver && (
            <motion.div
              key="view-gameover"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              className="w-full natural-card p-6 md:p-8 flex flex-col shadow-2xl relative overflow-hidden"
            >
              
              {/* Massive fatal crash skeleton background icon */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] text-[#52796f]">
                <Skull size={400} />
              </div>

              {/* Glowing copper warning border */}
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#e76f51] via-[#f4a261] to-[#e76f51] shadow-[0_0_15px_rgba(231,111,81,0.5)]" />

              <div className="flex flex-col items-center text-center mt-2">
                <div className="p-3 bg-[#e76f51]/15 border border-[#e76f51]/40 rounded-2xl text-[#e76f51] mb-4 animate-bounce">
                  <Skull size={32} />
                </div>

                <h2 className="text-3xl font-sans tracking-tight font-extrabold text-[#cad2c5] italic uppercase">
                  EXPEDITION CRASHED
                </h2>
                <p className="text-xs text-[#e76f51] font-mono mt-1 tracking-widest font-semibold uppercase">
                  Stumbled while fleeing the Temple Guardian
                </p>
              </div>

              {/* Dynamic stats presentation */}
              <div className="grid grid-cols-3 gap-3.5 my-6">
                
                <div className="bg-[#0b1a13]/90 p-4 rounded-2xl border border-[#52796f]/40 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-[#84a59d] uppercase">RUN SPAN</span>
                  <span className="text-base md:text-lg font-mono font-bold text-[#84a59d] mt-1">{lastRunStats.distance}m</span>
                </div>

                <div className="bg-[#0b1a13]/90 p-4 rounded-2xl border border-[#52796f]/40 flex flex-col items-center">
                  <span className="text-[9px] font-mono text-[#84a59d] uppercase">TREASURE</span>
                  <span className="text-base md:text-lg font-mono font-bold text-[#f4a261] mt-1">🪙 {lastRunStats.coinsCollected}</span>
                </div>

                <div className="bg-[#0b1a13]/90 p-4 rounded-2xl border border-[#52796f]/40 flex flex-col items-center border-[#e76f51]/30">
                  <span className="text-[9px] font-mono text-[#84a59d] uppercase">FINAL SCORE</span>
                  <span className="text-base md:text-lg font-mono font-bold text-[#f4a261] mt-1">{lastRunStats.score}</span>
                </div>

              </div>

              {/* New High Score Celebrations announcement */}
              {lastRunStats.isNewHighScore && (
                <div className="p-3 bg-[#f4a261]/15 border border-[#f4a261]/40 rounded-xl text-[#f4a261] text-xs font-semibold flex items-center justify-center gap-2 mb-6 animate-pulse">
                  <Sparkles size={16} />
                  <span>NEW LEGENDARY HIGH EXPEDITION SCORE REGISTERED!</span>
                </div>
              )}

              {/* Register nickname table form */}
              <div className="bg-[#0b1a13]/85 p-4 rounded-2xl border border-[#52796f]/40 flex flex-col gap-3 mb-6">
                <label className="text-[10px] font-mono text-[#84a59d] uppercase tracking-widest font-bold">
                  Enter explorer nickname to save record:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={15}
                    value={runnerNickname}
                    onChange={(e) => setRunnerNickname(e.target.value)}
                    placeholder="Explorer Name"
                    className="flex-1 bg-[#132c1f]/75 border border-[#52796f]/50 rounded-xl px-3 py-2 text-xs font-sans text-[#cad2c5] focus:outline-none focus:border-[#f4a261] focus:ring-1 focus:ring-[#f4a261] placeholder-[#52796f]"
                    id="save-score-nickname-input"
                  />
                  
                  <button
                    onClick={handleSaveScore}
                    className="px-4 py-2 bg-gradient-to-r from-[#e76f51] to-[#f4a261] hover:from-[#f4a261] hover:to-[#e76f51] text-[#0b1a13] text-xs font-bold rounded-xl active:scale-95 transition flex items-center gap-1.5"
                    id="save-score-records-button"
                  >
                    <span>LOG RUN</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Quick direct controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => { sound.playShieldActivate(); setCurrentView(GameView.Playing); }}
                  className="flex-1 py-3 bg-[#e76f51] hover:bg-[#ef8164] text-[#0b1a13] rounded-2xl text-xs font-bold tracking-wider active:scale-95 transition flex items-center justify-center gap-1.5"
                  id="restart-run-btn"
                >
                  <RotateCcw size={14} />
                  <span>START RETRY</span>
                </button>

                <button
                  onClick={() => { sound.playSlide(); setCurrentView(GameView.Menu); }}
                  className="flex-1 py-3 bg-[#0b1a13] hover:bg-[#13251a] text-[#84a59d] hover:text-[#cad2c5] rounded-2xl text-xs font-bold tracking-wider active:scale-95 border border-[#52796f]/40 hover:border-[#52796f] transition"
                  id="return-camp-btn"
                >
                  <span>RETURN TO CAMP</span>
                </button>
              </div>

            </motion.div>
          )}

          {/* VIEW: LEADERBOARD VIEW */}
          {currentView === GameView.Leaderboard && (
            <motion.div
              key="view-leaderboard"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <Leaderboard
                scores={scores}
                onClearLeaderboard={handleClearScoreboard}
                onViewChange={setCurrentView}
              />
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Guide dialog Modal */}
      {viewingGuide && (
        <div className="fixed inset-0 bg-[#0b1a13]/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="natural-card w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
            
            <button
              onClick={() => { sound.playSlide(); setViewingGuide(false); }}
              className="absolute top-4 right-4 p-1.5 bg-[#0b1a13]/85 hover:bg-[#1a3828] text-[#84a59d] hover:text-white rounded-lg transition border border-[#52796f]/30"
              id="close-guide-modal"
            >
              <X size={16} />
            </button>

            <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#f4a261] to-[#cad2c5] mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-[#f4a261]" />
              <span>Adventurer's Field Guide</span>
            </h3>

            <div className="space-y-4 text-xs text-[#cad2c5] font-sans leading-relaxed">
              
              <div className="border-b border-[#52796f]/30 pb-3">
                <span className="font-bold text-[#f4a261] block mb-1">THE MISSION</span>
                <p className="text-[#cad2c5]/90">
                  You are exploring the deep corridor chambers of the ancient temple ruins. Collect golden coins and mysterious rubies while avoiding lethal hurdles. If you hit a minor corner, the red-eyed Temple guardian draws closely behind you. Stumble again, and he catches you!
                </p>
              </div>

              <div className="border-b border-[#52796f]/30 pb-3">
                <span className="font-bold text-[#84a59d] block mb-1">OBSTACLES CHEATSHEET</span>
                <ul className="list-disc pl-4 space-y-1 text-[#cad2c5]/90">
                  <li><strong>Tree Logs:</strong> Low hurdles. Must be JUMPED over.</li>
                  <li><strong>Hanging Vines / Stone Arches:</strong> High hurdles. Must be SLID under.</li>
                  <li><strong>Laser Barrier Plates:</strong> Lane blockers. Change lane immediately!</li>
                  <li><strong>Cracked Void Abysses:</strong> Floor gaps. Must be JUMPED over or run around.</li>
                </ul>
              </div>

              <div className="border-b border-[#52796f]/30 pb-3">
                <span className="font-bold text-[#84a59d] block mb-1">POWER-UPS & BONUSES</span>
                <ul className="list-disc pl-4 space-y-1 text-[#cad2c5]/90">
                  <li><strong>Blue Shield (S):</strong> Safeguards you from one crash impact.</li>
                  <li><strong>Red Magnet (M):</strong> Drifts coins from neighboring lanes effortlessly.</li>
                  <li><strong>Gold Turbo (Lightning):</strong> Gives hyper velocity speed and absolute physical invulnerability.</li>
                </ul>
              </div>

              <div>
                <span className="font-bold text-[#f4a261] block mb-1">MOBILE SWIPES SUPPORT</span>
                <p className="text-[#cad2c5]/90">
                  If playing on a touch screen, you can swipe Left/Right to shift lanes, Swipe Up to jump, and Swipe Down to slide. On-screen control overlays are also available!
                </p>
              </div>

            </div>

            <button
              onClick={() => { sound.playSlide(); setViewingGuide(false); }}
              className="mt-6 w-full py-2.5 bg-gradient-to-r from-[#2d6a4f] to-[#1b4332] hover:from-[#40916c] hover:to-[#2d6a4f] text-[#cad2c5] rounded-xl text-xs font-semibold font-sans tracking-wide transition border border-[#52796f]/50"
              id="guide-modal-ok"
            >
              UNDERSTOOD!
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

