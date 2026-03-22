import React, { useState, useEffect } from 'react';
import { Gift, Copy, CheckCircle2, ArrowLeft, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';

export default function GiftCards({ onBack }: { onBack: () => void }) {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [giftCards, setGiftCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGiftCards = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'withdrawals'),
          where('user_id', '==', user.uid),
          where('status', '==', 'approved'),
          orderBy('updated_at', 'desc')
        );
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(doc => {
          const data = doc.data();
          if (data.redeem_code) {
            list.push({ id: doc.id, ...data });
          }
        });
        setGiftCards(list);
      } catch (err) {
        console.error("Error fetching gift cards:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGiftCards();
  }, [user]);

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    showNotification({ message: "Code copied to clipboard!", type: 'success' });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Gift Cards...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">My Gift Cards</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Your rewards & codes</p>
        </div>
      </div>

      <div className="space-y-4">
        {giftCards.length > 0 ? giftCards.map((card) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card className="p-6 bg-gradient-to-br from-white to-slate-50 border-slate-100 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-150" />
              
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{card.method} Reward</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Approved on {new Date(card.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-primary">{card.amount.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coins</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Redeem Code</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-100 border-2 border-dashed border-slate-200 rounded-xl px-4 py-3 font-black text-lg text-slate-900 tracking-widest text-center">
                    {card.redeem_code}
                  </div>
                  <Button 
                    size="icon" 
                    className="h-12 w-12 rounded-xl shadow-md"
                    onClick={() => handleCopy(card.redeem_code)}
                  >
                    <Copy className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Verified Reward</span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 italic">ID: {card.id.slice(0, 8)}...</p>
              </div>
            </Card>
          </motion.div>
        )) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">No Gift Cards Yet</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Withdraw your coins to get codes</p>
            <Button 
              variant="secondary" 
              className="mt-6 text-xs"
              onClick={() => onBack()}
            >
              Go Back Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
