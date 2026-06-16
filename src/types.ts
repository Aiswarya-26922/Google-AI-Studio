export enum GameView {
  Menu = 'MENU',
  Playing = 'PLAYING',
  GameOver = 'GAMEOVER',
  Shop = 'SHOP',
  Upgrades = 'UPGRADES',
  Leaderboard = 'LEADERBOARD',
  HowToPlay = 'HOWTOPLAY',
}

export type Lane = 0 | 1 | 2; // 0 = Left, 1 = Center, 2 = Right

export interface PlayerSkin {
  id: string;
  name: string;
  description: string;
  cost: number;
  unlocked: boolean;
  color: string;       // Primary dress hex or CSS style
  accentColor: string; // Detail accents
  headColor: string;   // Skin tone
  special?: string;    // Extra description
}

export interface UpgradeItem {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  costs: number[]; // Array of costs for each level upgrade, e.g. [100, 250, 500, 1000]
  baseValue: number;
  multiplier: number; // Value increase per level
}

export interface HighScore {
  id: string;
  name: string;
  score: number;
  distance: number;
  coins: number;
  date: string;
}

export interface GameStats {
  coins: number;
  totalCoinsCollected: number;
  totalDistanceRun: number;
  totalRuns: number;
  highScore: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  requirementType: 'distance' | 'coins' | 'runCount' | 'score' | 'slide' | 'jump';
  targetValue: number;
  rewardCoins: number;
  currentValue: number;
  completed: boolean;
  claimed: boolean;
}

export type ObstacleType = 
  | 'HURDLE_LOW'     // Must jump over (e.g., tree log, stone wall)
  | 'HURDLE_HIGH'    // Must slide under (e.g., dangling vine, stone arch)
  | 'CORRIDOR_BLOCKED'// Blocks left/right path entirely, forces lane change
  | 'GAP'            // Void on the lane, must jump or move
  | 'COIN_ROW'       // Row of coins
  | 'GEM'            // Rare ruby
  | 'POWER_SHIELD'   // Shield powerup
  | 'POWER_MAGNET'   // Coin magnet powerup
  | 'POWER_BOOST'    // Hyper speed boost powerup
;

export interface GameObject {
  id: string;
  type: ObstacleType;
  lane: Lane;
  z: number;         // Depth coordinate (0 = spawned at horizon, 1 = passed player/ended)
  yOffset?: number;  // Extra height off the ground (for airborne coins or floating elements)
  collected?: boolean;
}
