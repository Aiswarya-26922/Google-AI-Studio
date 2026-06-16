import React, { useState } from 'react';
import { GameView, PlayerSkin, UpgradeItem, GameStats, Achievement } from '../types';
import { sound } from './SoundEngine';
import { 
  Play, 
  User, 
  ShoppingBag, 
  TrendingUp, 
  Trophy, 
  Compass, 
  Volume2, 
  VolumeX, 
  Check, 
  Coins, 
  Info,
  Sparkles,
  ShieldAlert,
  Zap,
  Target
} from 'lucide-react';

interface MainMenuProps {
  stats: GameStats;
  skins: PlayerSkin[];
  upgrades: UpgradeItem[];
  achievements: Achievement[];
  selectedSkinId: string;
  onSelectSkin: (id: string) => void;
  onUnlockSkin: (id: string, cost: number) => void;
  onUpgrade: (id: string, cost: number) => void;
  onClaimAchievement: (id: string) => void;
  onViewChange: (view: GameView) => void;
  isSoundEnabled: boolean;
  onToggleSound: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  stats,
  skins,
  upgrades,
  achievements,
  selectedSkinId,
  onSelectSkin,
  onUnlockSkin,
  onUpgrade,
  onClaimAchievement,
  onViewChange,
  isSoundEnabled,
  onToggleSound,
}) => {
  const [activeTab, setActiveTab] = useState<'play' | 'characters' | 'upgrades' | 'achievements'>('play');

  const selectedSkin = skins.find((s) => s.id === selectedSkinId) || skins[0];

  const handleStartGame = () => {
    sound.playShieldActivate(); // click arcade chime
    onViewChange(GameView.Playing);
  };

  // Claim achievement helper
  const handleClaimReward = (ach: Achievement) => {
    if (ach.completed && !ach.claimed) {
      sound.playGem();
      onClaimAchievement(ach.id);
    }
  };

  return (
    <div className="w-full flex flex-col bg-[#132c1f]/90 rounded-3xl overflow-hidden border-2 border-[#52796f] shadow-2xl">
      
      {/* Visual Header Banner */}
      <div className="relative h-44 flex flex-col justify-end p-6 bg-gradient-to-t from-[#0b1a13] via-[#0f2a1d]/60 to-transparent overflow-hidden">
        
        {/* Procedural temple background element in header */}
        <div className="absolute inset-0 bg-[#0b1a13]/40 z-0">
          <div className="absolute inset-x-0 bottom-0 h-1 bg-[#52796f]/30 animate-pulse" />
        </div>

        {/* Ambient header runes */}
        <div className="absolute top-5 right-6 text-[#52796f]/30 font-mono text-[10px] tracking-widest hidden sm:block">
          RUN_COORDS_0x7FFA<br />
          TEMPLE_CORE_ACTIVE<br />
          SECURE_PORT_3000
        </div>

        {/* Title & subtitle */}
        <div className="z-10 flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] bg-[#2d6a4f]/20 border border-[#52796f]/45 text-[#84a59d] font-mono font-bold tracking-wider rounded">
              ANCIENT CORRIDORS
            </span>
          </div>
          <h1 className="text-3xl font-sans font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#f4a261] via-[#cad2c5] to-[#e76f51]">
            TEMPLE RUNNER
          </h1>
          <p className="text-xs text-[#cad2c5]/85 font-sans">
            Evade lethal traps and outrun the raging temple guardian beast.
          </p>
        </div>

        {/* Floating current wallet stats */}
        <div className="absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1 bg-[#0b1a13]/85 rounded-xl border border-[#52796f]/45 shadow-lg z-10">
          <span className="text-[#f4a261] text-sm">🪙</span>
          <span className="text-sm font-mono font-bold text-[#f4a261] mt-0.5">{stats.coins}</span>
          <span className="text-[10px] font-mono text-[#84a59d] ml-1">GOLD</span>
        </div>

        {/* Sound toggle float */}
        <button
          onClick={onToggleSound}
          className="absolute top-6 right-6 p-2 bg-[#0b1a13]/70 hover:bg-[#132c1f] text-[#84a59d] hover:text-[#cad2c5] rounded-xl border border-[#52796f]/40 transition z-10"
          id="main-menu-sound-toggle"
        >
          {isSoundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
      </div>

      {/* Modern Dashboard Navigation Tabs */}
      <div className="flex border-b border-[#52796f]/30 bg-[#0a1811]/60 p-1.5 gap-1 select-none">
        <button
          onClick={() => { sound.playSlide(); setActiveTab('play'); }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'play'
              ? 'bg-[#2d6a4f]/40 border border-[#52796f] text-[#cad2c5] shadow'
              : 'text-[#84a59d] hover:text-[#cad2c5] hover:bg-[#1a3828]/50'
          }`}
          id="tab-btn-play"
        >
          <Compass size={14} />
          <span>ADVENTURE</span>
        </button>

        <button
          onClick={() => { sound.playSlide(); setActiveTab('characters'); }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'characters'
              ? 'bg-[#2d6a4f]/40 border border-[#52796f] text-[#cad2c5] shadow'
              : 'text-[#84a59d] hover:text-[#cad2c5] hover:bg-[#1a3828]/50'
          }`}
          id="tab-btn-characters"
        >
          <User size={14} />
          <span>RUNNERS</span>
        </button>

        <button
          onClick={() => { sound.playSlide(); setActiveTab('upgrades'); }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'upgrades'
              ? 'bg-[#2d6a4f]/40 border border-[#52796f] text-[#cad2c5] shadow'
              : 'text-[#84a59d] hover:text-[#cad2c5] hover:bg-[#1a3828]/50'
          }`}
          id="tab-btn-upgrades"
        >
          <ShoppingBag size={14} />
          <span>UPGRADES</span>
        </button>

        <button
          onClick={() => { sound.playSlide(); setActiveTab('achievements'); }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'achievements'
              ? 'bg-[#2d6a4f]/40 border border-[#52796f] text-[#cad2c5] shadow'
              : 'text-[#84a59d] hover:text-[#cad2c5] hover:bg-[#1a3828]/50'
          }`}
          id="tab-btn-achievements"
        >
          <Target size={14} />
          <span className="relative">
            MISSIONS
            {achievements.some((a) => a.completed && !a.claimed) && (
              <span className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#e76f51] animate-ping" />
            )}
          </span>
        </button>
      </div>

      {/* Inner Content panels based on Tab */}
      <div className="p-6 bg-[#132c1f]/50 flex-1 min-h-[300px]">
        
        {/* Tab 1: PLAY ADVENTURE */}
        {activeTab === 'play' && (
          <div className="flex flex-col gap-6 animate-fadeIn">
            
            {/* Quick dashboard statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0b1a13]/85 p-3 rounded-2xl border border-[#52796f]/35 flex flex-col shadow-inner">
                <span className="text-[9px] font-mono text-[#84a59d] tracking-wider">HIGHEST SCORE</span>
                <span className="text-base font-mono font-bold text-[#f4a261]">{stats.highScore}</span>
              </div>
              <div className="bg-[#0b1a13]/85 p-3 rounded-2xl border border-[#52796f]/35 flex flex-col shadow-inner">
                <span className="text-[9px] font-mono text-[#84a59d] tracking-wider">TOTAL RUN SPAN</span>
                <span className="text-base font-mono font-bold text-[#84a59d]">{stats.totalDistanceRun}m</span>
              </div>
              <div className="bg-[#0b1a13]/85 p-3 rounded-2xl border border-[#52796f]/35 flex flex-col shadow-inner">
                <span className="text-[9px] font-mono text-[#84a59d] tracking-wider">COINS EARNED</span>
                <span className="text-base font-mono font-bold text-[#f4a261]">🪙 {stats.totalCoinsCollected}</span>
              </div>
              <div className="bg-[#0b1a13]/85 p-3 rounded-2xl border border-[#52796f]/35 flex flex-col shadow-inner">
                <span className="text-[9px] font-mono text-[#84a59d] tracking-wider">EXPEDITIONS</span>
                <span className="text-base font-mono font-bold text-[#e76f51]">{stats.totalRuns}</span>
              </div>
            </div>

            {/* Active Character overview & Quick controls help layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              
              {/* Selected Runner card */}
              <div className="flex items-center gap-4 bg-[#0b1a13]/60 p-4 rounded-2xl border border-[#52796f]/30">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg relative border border-[#52796f]/40"
                  style={{ backgroundColor: selectedSkin.color }}
                >
                  <span className="text-3xl text-white select-none">
                    {selectedSkin.id === 'guy_default' && '🤠'}
                    {selectedSkin.id === 'jane_archaeologist' && '👩‍🌾'}
                    {selectedSkin.id === 'cyber_runner' && '🤖'}
                    {selectedSkin.id === 'golden_monarch' && '👑'}
                  </span>
                  <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#0b1a13] border border-[#52796f]/50 flex items-center justify-center">
                    <span className="text-[10px] text-[#f4a261]">⚡</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <span className="text-[10px] font-mono text-[#84a59d]">SELECTED RUNNER</span>
                  <h3 className="text-base font-bold text-[#cad2c5]">{selectedSkin.name}</h3>
                  <p className="text-xs text-[#cad2c5]/70 line-clamp-1">{selectedSkin.description}</p>
                </div>
              </div>

              {/* Play Tutorial Guidelines snippet */}
              <div className="bg-[#0b1a13]/30 p-4 rounded-2xl border border-[#52796f]/25 text-xs text-[#cad2c5]/80 space-y-2">
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-[#84a59d] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Keyboard Controls:</strong> Use <strong>Arrow Left/A</strong> or <strong>Arrow Right/D</strong> to switch lanes. Press <strong>Arrow Up/W/Space</strong> to jump, and <strong>Arrow Down/S</strong> to slide.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Info size={14} className="text-[#f4a261] flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Avoid Hostiles:</strong> Logs must be jumped over. Stone pillars and hanging vines must be slid under. Black voids must be jumped!
                  </p>
                </div>
              </div>

            </div>

            {/* Sizable prominent START BUTTON */}
            <button
              onClick={handleStartGame}
              className="w-full mt-2 py-4 bg-gradient-to-r from-[#2d6a4f] to-[#1b4332] hover:from-[#40916c] hover:to-[#2d6a4f] text-[#cad2c5] rounded-2xl text-lg font-bold tracking-wider shadow-xl border border-[#52796f]/60 font-sans flex items-center justify-center gap-3 active:scale-[0.99] transition cursor-pointer"
              id="main-start-game-button"
            >
              <Play size={22} className="fill-current text-[#cad2c5]" />
              <span>START EXPEDITION</span>
            </button>

            {/* Quick Link to local highscore leaderboard */}
            <button
              onClick={() => { sound.playSlide(); onViewChange(GameView.Leaderboard); }}
              className="py-2.5 bg-[#0b1a13]/70 hover:bg-[#1a3828] text-[#84a59d] hover:text-[#cad2c5] rounded-xl border border-[#52796f]/35 text-xs font-semibold tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
              id="nav-leaderboard-btn"
            >
              <Trophy size={14} className="text-[#f4a261]" />
              <span>VIEW LEADERBOARD</span>
            </button>

          </div>
        )}

        {/* Tab 2: CHARACTERS SHOP */}
        {activeTab === 'characters' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <h2 className="text-base font-bold text-[#cad2c5] flex items-center gap-1.5 border-b border-[#52796f]/30 pb-2">
              <User size={16} className="text-[#84a59d]" />
              <span>Select Active Explorer</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {skins.map((skin) => (
                <div 
                  key={skin.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                    selectedSkinId === skin.id 
                      ? 'bg-[#0b1a13]/90 border-[#f4a261] shadow-lg' 
                      : 'bg-[#0b1a13]/40 border-[#52796f]/30 hover:border-[#52796f]/70'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    
                    {/* Visual representative skin bubble */}
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 border border-[#52796f]/30"
                      style={{ backgroundColor: skin.color }}
                    >
                      <span className="text-2xl select-none">
                        {skin.id === 'guy_default' && '🤠'}
                        {skin.id === 'jane_archaeologist' && '👩‍🌾'}
                        {skin.id === 'cyber_runner' && '🤖'}
                        {skin.id === 'golden_monarch' && '👑'}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#cad2c5]">{skin.name}</span>
                        {selectedSkinId === skin.id && (
                          <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-[#2d6a4f]/20 border border-[#52796f]/40 text-[#84a59d] rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#cad2c5]/60 line-clamp-2 mt-0.5">{skin.description}</span>
                    </div>
                  </div>

                  {/* Operational unlock/selection triggers */}
                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-[#52796f]/20">
                    <span className="text-[10px] font-mono text-[#84a59d]">
                      Style Color: {skin.color}
                    </span>

                    {skin.unlocked ? (
                      selectedSkinId === skin.id ? (
                        <div className="flex items-center gap-1 text-[11px] font-mono text-[#84a59d] font-bold">
                          <Check size={14} />
                          <span>EQUIPPED</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => { sound.playCoin(); onSelectSkin(skin.id); }}
                          className="px-3 py-1 bg-[#2d6a4f]/20 border border-[#52796f]/50 hover:bg-[#2d6a4f]/40 active:scale-95 text-xs text-[#cad2c5] rounded-lg flex items-center gap-1 transition cursor-pointer"
                          id={`select-skin-${skin.id}`}
                        >
                          <span>SELECT</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => {
                          if (stats.coins >= skin.cost) {
                            onUnlockSkin(skin.id, skin.cost);
                          } else {
                            sound.playCrash(); // buzz error
                          }
                        }}
                        disabled={stats.coins < skin.cost}
                        className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                          stats.coins >= skin.cost
                            ? 'bg-gradient-to-r from-[#e76f51] to-[#f4a261] hover:from-[#f4a261] hover:to-[#e76f51] text-[#0b1a13]'
                            : 'bg-[#0b1a13] text-[#52796f] border border-[#52796f]/20 cursor-not-allowed'
                        }`}
                        id={`unlock-skin-${skin.id}`}
                      >
                        <Coins size={12} />
                        <span>UNLOCK : {skin.cost}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: EXPEDITION UPGRADES SHOP */}
        {activeTab === 'upgrades' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[#52796f]/30 pb-2">
              <h2 className="text-base font-bold text-[#cad2c5] flex items-center gap-1.5">
                <TrendingUp size={16} className="text-[#84a59d]" />
                <span>Power-up Duration Upgrades</span>
              </h2>
              <span className="text-xs text-[#84a59d] font-mono">Max level: 5</span>
            </div>

            <div className="flex flex-col gap-3.5">
              {upgrades.map((upgrade) => {
                const isMax = upgrade.level >= upgrade.maxLevel;
                const nextCost = isMax ? 0 : upgrade.costs[upgrade.level];
                const canAfford = !isMax && stats.coins >= nextCost;

                return (
                  <div key={upgrade.id} className="bg-[#0b1a13]/50 p-4 rounded-2xl border border-[#52796f]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      
                      {/* Icons representation */}
                      <div className="w-10 h-10 rounded-xl bg-[#0b1a13] border border-[#52796f]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {upgrade.id === 'upgrade_shield' && <ShieldAlert size={18} className="text-sky-400" />}
                        {upgrade.id === 'upgrade_magnet' && <Sparkles size={18} className="text-[#f4a261]" />}
                        {upgrade.id === 'shop_multiplier' && <Zap size={18} className="text-[#e76f51]" />}
                      </div>

                      <div className="flex-1 flex flex-col">
                        <span className="font-bold text-sm text-[#cad2c5]">{upgrade.name}</span>
                        <span className="text-xs text-[#cad2c5]/60 mt-0.5 max-w-md">{upgrade.description}</span>
                        
                        {/* Dynamic level bar strips */}
                        <div className="flex gap-1.5 mt-2.5">
                          {[1, 2, 3, 4, 5].map((idx) => (
                            <span 
                              key={idx}
                              className={`h-1.5 w-7 rounded-sm border ${
                                idx <= upgrade.level 
                                  ? 'bg-[#2d6a4f] border-[#2d6a4f]' 
                                  : 'bg-[#0a1811] border-[#52796f]/20'
                              }`}
                            />
                          ))}
                          <span className="text-[10px] font-mono text-[#84a59d] self-center ml-2">
                            Lvl {upgrade.level}/{upgrade.maxLevel}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Operational Purchase Buttons */}
                    {isMax ? (
                      <span className="px-3 py-1.5 bg-[#0b1a13] text-[#52796f] text-xs font-bold rounded-lg border border-[#52796f]/20 text-center select-none">
                        MAX LEVEL REACHED
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          if (canAfford) {
                            onUpgrade(upgrade.id, nextCost);
                          } else {
                            sound.playCrash();
                          }
                        }}
                        disabled={!canAfford}
                        className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-[#2d6a4f] to-[#1b4332] border border-[#52796f]/50 hover:from-[#3a805f] hover:to-[#2d6a4f] text-[#cad2c5] shadow-md'
                            : 'bg-[#0b1a13] text-[#52796f] border border-[#52796f]/20 cursor-not-allowed'
                        }`}
                        id={`upgrade-button-${upgrade.id}`}
                      >
                        <Coins size={12} />
                        <span>UPGRADE : {nextCost}</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: MISSIONS / ACHIEVEMENTS */}
        {activeTab === 'achievements' && (
          <div className="flex flex-col gap-4 animate-fadeIn">
            <h2 className="text-base font-bold text-[#cad2c5] flex items-center gap-1.5 border-b border-[#52796f]/30 pb-2">
              <Target size={16} className="text-[#f4a261]" />
              <span>Temple Trials & Achievements</span>
            </h2>

            <div className="flex flex-col gap-3">
              {achievements.map((ach) => {
                const percent = Math.min(100, Math.round((ach.currentValue / ach.targetValue) * 100));
                
                return (
                  <div 
                    key={ach.id} 
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between sm:items-center gap-4 transition-all ${
                      ach.claimed 
                        ? 'bg-[#0b1a13]/25 border-[#52796f]/10 opacity-60' 
                        : ach.completed 
                        ? 'bg-[#0f2d1e]/85 border-[#f4a261]/60 shadow-lg' 
                        : 'bg-[#0b1a13]/50 border-[#52796f]/30'
                    }`}
                  >
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#cad2c5]">{ach.name}</span>
                        {ach.completed && !ach.claimed && (
                          <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold bg-[#f4a261]/10 border border-[#f4a261]/30 text-[#f4a261] rounded animate-bounce">
                            COMPLETED
                          </span>
                        )}
                        {ach.claimed && (
                          <span className="px-1.5 py-0.5 text-[8px] font-mono bg-[#0b1a13] border border-[#52796f]/20 text-[#52796f] rounded">
                            CLAIMED
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#cad2c5]/60 mt-1">{ach.description}</span>
                      
                      {/* Operational Progress Bar */}
                      {!ach.claimed && (
                        <div className="flex items-center gap-3.5 mt-2.5">
                          <div className="flex-1 h-2 bg-[#0a1811] border border-[#52796f]/20 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                ach.completed ? 'bg-[#f4a261]' : 'bg-[#2d6a4f]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-[#84a59d] whitespace-nowrap">
                            {ach.currentValue} / {ach.targetValue} ({percent}%)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Operational claims rewards */}
                    {!ach.claimed ? (
                      ach.completed ? (
                        <button
                          onClick={() => handleClaimReward(ach)}
                          className="px-4 py-2 bg-gradient-to-r from-[#e76f51] to-[#f4a261] hover:from-[#f4a261] hover:to-[#e76f51] text-[#0b1a13] text-xs font-bold rounded-xl active:scale-95 transition flex items-center justify-center gap-1 cursor-pointer"
                          id={`claim-reward-${ach.id}`}
                        >
                          <Coins size={12} />
                          <span>CLAIM : 🪙 {ach.rewardCoins}</span>
                        </button>
                      ) : (
                        <div className="px-3.5 py-1.5 bg-[#0b1a13] border border-[#52796f]/25 text-[#52796f] text-xs font-bold rounded-xl text-center self-start sm:self-center">
                          REWARD : 🪙 {ach.rewardCoins}
                        </div>
                      )
                    ) : (
                      <div className="text-[#52796f] font-mono text-xs select-none p-1 flex items-center gap-1.5">
                        <Check size={14} className="text-[#52796f]" />
                        <span>CLAIMED</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Decorative Brand footer credit line */}
      <div className="py-2.5 px-6 border-t border-[#52796f]/40 bg-[#0a1811]/90 flex flex-col md:flex-row items-center justify-between text-[10px] font-mono text-[#84a59d]/50 select-none">
        <span>RUNNING SESSION STABLE ON PORT 3000 INCLOUD CONTAINER</span>
        <span>GOOGLE AI STUDIO BUILD APPNATIVE TEMPLATE</span>
      </div>

    </div>
  );
};
