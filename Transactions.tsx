import React, { useState, useEffect } from 'react';
import { 
  History, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Search, 
  Filter, 
  Loader2,
  Trophy,
  PlayCircle,
  Users,
  RotateCw,
  Palette,
  Wallet,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useAuth } from '../context/AuthContext';
import { cn, formatCoins } from '../lib/utils';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { formatDistanceToNow } from 'date-fns';

import PullToRefresh from './PullToRefresh';

export default function Transactions({ onBack }: { onBack: () => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  const fetchTransactions = async (isRefresh = false) => {
    if (!user) return;
    if (!isRefresh) setLoading(true);
    try {
      const q = query(
        collection(db, 'transactions'),
        where('user_id', '==', user.uid),
        orderBy('created_at', 'desc'),
        limit(50)
      );
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
      setTransactions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  const handleRefresh = async () => {
    await fetchTransactions(true);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">History</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Transaction Log</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <History className="w-5 h-5 text-primary" />
        </div>
      </div>

      <PullToRefresh onRefresh={handleRefresh}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching History...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {transactions.length > 0 ? transactions.map((tx) => (
              <Card key={tx.id} className="p-4 flex items-center justify-between border-slate-100/50 hover:border-primary/20 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    tx.amount > 0 ? "bg-success/10 text-success" : "bg-red-50 text-red-600"
                  )}>
                    {tx.type === 'checkin' && <Trophy className="w-5 h-5" />}
                    {tx.type === 'ad' && <PlayCircle className="w-5 h-5" />}
                    {tx.type === 'referral' && <Users className="w-5 h-5" />}
                    {tx.type === 'spin' && <RotateCw className="w-5 h-5" />}
                    {tx.type === 'color_match' && <Palette className="w-5 h-5" />}
                    {tx.type === 'withdraw' && <Wallet className="w-5 h-5" />}
                    {tx.type === 'promo' && <Gift className="w-5 h-5" />}
                    {!['checkin', 'ad', 'referral', 'spin', 'color_match', 'withdraw', 'promo'].includes(tx.type) && (
                      tx.amount > 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-display font-black text-slate-900">{tx.description}</p>
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-md tracking-tighter">
                        {tx.type?.replace('_', ' ') || 'activity'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "text-sm font-display font-black",
                    tx.amount > 0 ? "text-success" : "text-red-600"
                  )}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coins</p>
                </div>
              </Card>
            )) : (
              <div className="md:col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No transactions yet</p>
              </div>
            )}
          </div>
        )}
      </PullToRefresh>
    </div>
  );
}
