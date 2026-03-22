import React, { useState, useEffect } from 'react';
import { Trophy, Medal, Crown, Star, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { collection, query, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface LeaderboardUser {
  id: string;
  name: string;
  total_earned: number;
  is_me: boolean;
}

export const Leaderboard: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const walletsRef = collection(db, 'wallets');
        const q = query(walletsRef, orderBy('total_earned', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        
        const leaderboardData: LeaderboardUser[] = [];
        
        for (const walletDoc of querySnapshot.docs) {
          const walletData = walletDoc.data();
          
          leaderboardData.push({
            id: walletDoc.id,
            name: walletData.display_name || 'Unknown',
            total_earned: walletData.total_earned || 0,
            is_me: walletDoc.id === currentUser?.uid
          });
        }
        
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [currentUser]);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Crown className="w-6 h-6 text-amber-400" />;
      case 1: return <Medal className="w-6 h-6 text-slate-400" />;
      case 2: return <Medal className="w-6 h-6 text-amber-700" />;
      default: return <span className="text-xs font-black text-slate-400">#{index + 1}</span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0: return "bg-amber-50 border-amber-200 shadow-amber-100";
      case 1: return "bg-slate-50 border-slate-200 shadow-slate-100";
      case 2: return "bg-orange-50 border-orange-200 shadow-orange-100";
      default: return "bg-white border-slate-100";
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Leaderboard</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Earners</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center">
          <Trophy className="w-5 h-5 text-primary" />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Champions...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-2 mb-8 px-2">
            {leaderboard.slice(0, 3).map((user, idx) => {
              const order = [1, 0, 2]; // Silver, Gold, Bronze
              const podiumIdx = order[idx];
              const podiumUser = leaderboard[podiumIdx];
              if (!podiumUser) return null;

              const heights = ["h-32", "h-40", "h-28"];
              const icons = [
                <Medal className="w-6 h-6 text-slate-400" />,
                <Crown className="w-8 h-8 text-amber-400" />,
                <Medal className="w-6 h-6 text-amber-700" />
              ];

              return (
                <motion.div
                  key={podiumUser.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <div className="relative">
                    <div className={cn(
                      "w-14 h-14 rounded-full border-4 flex items-center justify-center bg-white shadow-lg overflow-hidden transition-transform",
                      podiumIdx === 0 ? "border-amber-400" : podiumIdx === 1 ? "border-slate-300" : "border-amber-700",
                      podiumUser.is_me && "ring-4 ring-primary/30 scale-110"
                    )}>
                      <span className="text-lg font-display font-black text-slate-300">{podiumUser.name[0]}</span>
                    </div>
                    <div className="absolute -top-3 -right-3">
                      {icons[podiumIdx]}
                    </div>
                    {podiumUser.is_me && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg z-10">
                        YOU
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "w-full rounded-t-2xl flex flex-col items-center justify-end pb-4 gap-1 shadow-xl relative overflow-hidden",
                    podiumIdx === 0 ? "bg-gradient-to-b from-amber-400 to-amber-500 text-white" : 
                    podiumIdx === 1 ? "bg-gradient-to-b from-slate-400 to-slate-500 text-white" : 
                    "bg-gradient-to-b from-amber-700 to-amber-800 text-white",
                    heights[podiumIdx]
                  )}>
                    {podiumUser.is_me && (
                      <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                    )}
                    <p className="text-[10px] font-display font-black uppercase truncate w-full text-center px-1">{podiumUser.name.split('@')[0]}</p>
                    <p className="text-xs font-display font-black">{podiumUser.total_earned.toLocaleString()} Coins</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* List */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {leaderboard.slice(3).map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={cn(
                    "p-4 flex items-center gap-4 transition-all relative overflow-hidden",
                    user.is_me ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-100"
                  )}>
                    {user.is_me && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                    )}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                      user.is_me ? "bg-primary/10" : "bg-slate-50"
                    )}>
                      <span className={cn(
                        "text-xs font-display font-black",
                        user.is_me ? "text-primary" : "text-slate-400"
                      )}>#{index + 4}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-black text-slate-900 truncate">{user.name}</h4>
                        {user.is_me && (
                          <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[8px] font-black uppercase tracking-wider">You</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Earned</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 text-primary">
                        <Sparkles className="w-3 h-3" />
                        <span className="font-display font-black text-sm">{user.total_earned.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coins</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
};
