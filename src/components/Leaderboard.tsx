import React, { useState } from 'react';
import { GameView, HighScore } from '../types';
import { sound } from './SoundEngine';
import { Trophy, Calendar, Compass, Coins, RotateCcw, Medal, Sparkles, ChevronLeft, Trash2 } from 'lucide-react';

interface LeaderboardProps {
  scores: HighScore[];
  onClearLeaderboard: () => void;
  onViewChange: (view: GameView) => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  scores,
  onClearLeaderboard,
  onViewChange,
}) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleBackToMenu = () => {
    sound.playSlide();
    onViewChange(GameView.Menu);
  };

  const handleClear = () => {
    sound.playCrash();
    onClearLeaderboard();
    setShowClearConfirm(false);
  };

  return (
    <div className="w-full natural-card overflow-hidden shadow-2xl flex flex-col p-6 animate-fadeIn">
      
      {/* Header heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#52796f]/30 pb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#f4a261]/15 border border-[#f4a261]/35 text-[#f4a261] rounded-2xl">
            <Trophy size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-sans font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#f4a261] via-[#cad2c5] to-[#e76f51] italic">
              HALL OF RUNNERS
            </h2>
            <p className="text-xs text-[#cad2c5]/80 font-sans mt-0.5">
              The fastest explorers who crossed the ancient ruins.
            </p>
          </div>
        </div>

        {/* Back navigation button */}
        <button
          onClick={handleBackToMenu}
          className="flex items-center gap-2 px-4 py-2 bg-[#0b1a13]/85 hover:bg-[#1a3828] border border-[#52796f]/40 hover:border-[#52796f]/70 text-xs font-semibold text-[#84a59d] hover:text-[#cad2c5] rounded-xl active:scale-95 transition self-start sm:self-center cursor-pointer"
          id="leaderboard-back-button"
        >
          <ChevronLeft size={16} />
          <span>RETURN TO CAMP</span>
        </button>
      </div>

      {/* Main leader board contents list */}
      <div className="my-6 flex-1 min-h-[220px]">
        {scores.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-[#0b1a13]/25 border border-dashed border-[#52796f]/45 rounded-2xl h-full">
            <Medal size={45} className="text-[#52796f]/60 mb-2.5" />
            <h4 className="font-bold text-[#cad2c5] text-sm">NO EXPEDITIONS LOGGED YET</h4>
            <p className="text-xs text-[#cad2c5]/60 max-w-xs mt-1.5 leading-relaxed font-sans mt-0.5">
              Deploy your explorer to the ancient temples, farm gold, evade fireballs, and log your high scores here!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[#52796f]/35 bg-[#0b1a13]/50">
            <table className="w-full text-left text-xs font-mono select-none">
              <thead className="bg-[#0b1a13] text-[#84a59d] text-[10px] tracking-wider uppercase border-b border-[#52796f]/30">
                <tr>
                  <th className="py-3 px-4 font-bold">RANK</th>
                  <th className="py-3 px-4 font-bold">EXPLORER NICKNAME</th>
                  <th className="py-3 px-4 font-bold text-right">SCORE</th>
                  <th className="py-3 px-4 font-bold text-right">DISTANCE</th>
                  <th className="py-3 px-4 font-bold text-right">COINS COPFED</th>
                  <th className="py-3 px-4 font-bold text-center">EXPEDITION DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#52796f]/20 text-[#cad2c5]/90">
                {scores.slice(0, 10).map((scoreItem, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <tr 
                      key={scoreItem.id}
                      className={`hover:bg-[#132c1f]/40 transition ${
                        idx === 0 
                          ? 'bg-[#f4a261]/10 font-semibold text-[#f4a261]' 
                          : ''
                      }`}
                    >
                      <td className="py-3 px-4 flex items-center gap-1.5">
                        {idx === 0 && <span className="text-[#f4a261]">🥇</span>}
                        {idx === 1 && <span className="text-slate-300">🥈</span>}
                        {idx === 2 && <span className="text-[#e76f51]">🥉</span>}
                        {!isTop3 && <span className="text-[#52796f] pl-1">#{idx + 1}</span>}
                      </td>

                      <td className="py-3 px-4 font-sans font-bold">
                        {scoreItem.name}
                      </td>

                      <td className="py-3 px-4 text-right font-bold font-mono text-[#f4a261]">
                        {scoreItem.score.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 text-right text-[#84a59d]">
                        {scoreItem.distance}m
                      </td>

                      <td className="py-3 px-4 text-right text-[#f4a261]">
                        🪙 {scoreItem.coins}
                      </td>

                      <td className="py-3 px-4 text-center text-[10px] text-[#84a59d]/75 font-sans">
                        {new Date(scoreItem.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Leaderboard wipe utility triggers */}
      {scores.length > 0 && (
        <div className="flex justify-end pt-4 border-t border-[#52796f]/30">
          {!showClearConfirm ? (
            <button
              onClick={() => { sound.playCrash(); setShowClearConfirm(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#e76f51]/10 text-[#e76f51] hover:text-[#ef8164] border border-transparent hover:border-[#e76f51]/30 text-[10px] font-mono font-bold rounded-lg transition cursor-pointer"
              id="request-wipe-leaderboard"
            >
              <Trash2 size={12} />
              <span>ERASE HALL RECORDS</span>
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-[#e76f51]/10 border border-[#e76f51]/30 rounded-xl p-2.5 text-xs">
              <span className="text-[#e76f51] font-sans font-semibold">ARE YOU ABSOLUTELY SURE?</span>
              <div className="flex gap-2">
                <button
                  onClick={handleClear}
                  className="px-2.5 py-1 bg-[#e76f51] text-[#0b1a13] rounded font-bold hover:bg-[#ef8164] text-[10px] cursor-pointer"
                  id="confirm-wipe"
                >
                  YES, WIPE
                </button>
                <button
                  onClick={() => { sound.playSlide(); setShowClearConfirm(false); }}
                  className="px-2.5 py-1 bg-[#0b1a13]/85 border border-[#52796f]/30 text-[#cad2c5]/70 rounded font-semibold hover:bg-[#132c1f] text-[10px] cursor-pointer"
                  id="cancel-wipe"
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
