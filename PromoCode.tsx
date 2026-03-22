import React, { useState } from 'react';
import { Ticket, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, Button, Input } from './UI';
import { useNotification } from '../context/NotificationContext';
import { doc, getDoc, updateDoc, increment, arrayUnion, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

import { showInterstitialAd } from '../services/admobService';

export default function PromoCode() {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const handleRedeem = async () => {
    if (!code.trim() || !user) return;
    
    setIsLoading(true);
    try {
      const promoPath = `promo_codes/${code.trim().toUpperCase()}`;
      const promoRef = doc(db, promoPath);
      let promoSnap;
      try {
        promoSnap = await getDoc(promoRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, promoPath);
        return;
      }

      if (!promoSnap.exists()) {
        showNotification({ message: "Invalid promo code!", type: 'error' });
        setIsLoading(false);
        return;
      }

      const promoData = promoSnap.data();
      
      // Check if already used
      if (promoData.used_by && promoData.used_by.includes(user.uid)) {
        showNotification({ message: "You have already used this code!", type: 'error' });
        setIsLoading(false);
        return;
      }

      // Check if expired
      if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
        showNotification({ message: "This code has expired!", type: 'error' });
        setIsLoading(false);
        return;
      }

      // Check usage limit
      if (promoData.current_uses >= promoData.max_uses) {
        showNotification({ message: "This code has reached its usage limit!", type: 'error' });
        setIsLoading(false);
        return;
      }

      // Redeem
      const walletPath = `wallets/${user.uid}`;
      const walletRef = doc(db, walletPath);
      const reward = promoData.reward;

      // Update promo code usage
      try {
        await updateDoc(promoRef, {
          current_uses: increment(1),
          used_by: arrayUnion(user.uid)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, promoPath);
      }

      // Update user wallet
      try {
        await updateDoc(walletRef, {
          balance: increment(reward),
          total_earned: increment(reward)
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, walletPath);
      }

      // Log transaction
      const txId = Math.random().toString(36).substring(2, 15);
      const txPath = `transactions/${txId}`;
      try {
        await setDoc(doc(db, txPath), {
          user_id: user.uid,
          amount: reward,
          type: 'promo',
          description: `Promo Code: ${code.toUpperCase()}`,
          created_at: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, txPath);
      }

      showNotification({ 
        message: `Success! You redeemed ${reward} coins!`, 
        type: 'success' 
      });
      showInterstitialAd();
      setCode('');
    } catch (error) {
      console.error("Error redeeming promo code:", error);
      // If it's already a JSON error from handleFirestoreError, it will be caught here
      // but we should only show notification for non-permission errors
      if (error instanceof Error && !error.message.startsWith('{')) {
        showNotification({ message: "Something went wrong. Please try again.", type: 'error' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Promo Code</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Redeem codes for extra coins</p>
      </div>

      <Card className="p-8 bg-gradient-to-br from-white to-slate-50 border-slate-100 shadow-xl">
        <div className="flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-inner">
            <Ticket className="w-10 h-10" />
          </div>
          
          <div className="w-full space-y-4">
            <div className="relative">
              <Input
                placeholder="ENTER CODE HERE"
                value={code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value.toUpperCase())}
                className="text-center font-black tracking-widest uppercase py-4 border-2 border-slate-100 focus:border-primary transition-all"
              />
              <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400 opacity-50" />
            </div>
            
            <Button 
              onClick={handleRedeem}
              disabled={isLoading || !code.trim()}
              className="w-full py-4 text-lg font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {isLoading ? 'Redeeming...' : 'Redeem Now'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-4 border-dashed border-2 border-slate-200 bg-transparent">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">How it works</p>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed mt-1">
                Enter a valid promo code shared on our social media or telegram channel to get instant rewards. Each code has a limited number of uses.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
