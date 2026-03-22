import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  Settings, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Ticket,
  Plus,
  Trash2,
  QrCode,
  ShoppingBag,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useApp } from '../context/AppContext';
import { cn, formatCoins, coinsToRupees } from '../lib/utils';
import { collection, query, getDocs, doc, updateDoc, increment, orderBy, limit, where, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function AdminPanel() {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEarned: 0,
    pendingWithdrawals: 0,
    activeAds: 0
  });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [redeemCodes, setRedeemCodes] = useState<Record<string, string>>({});
  const [users, setUsers] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stats' | 'withdrawals' | 'users' | 'promo' | 'settings'>('stats');
  const [searchTerm, setSearchTerm] = useState('');
  const [newPromo, setNewPromo] = useState({ code: '', reward: 100, max_uses: 100, expires_at: '' });
  const [selectedUserForReferrals, setSelectedUserForReferrals] = useState<any | null>(null);
  const { config } = useApp();
  const [referralSettings, setReferralSettings] = useState({
    bonus_referrer: 200,
    bonus_new_user: 50
  });

  useEffect(() => {
    if (config) {
      setReferralSettings({
        bonus_referrer: config.referral_bonus_referrer || 200,
        bonus_new_user: config.referral_bonus_new_user || 50
      });
    }
  }, [config]);

  const handleUpdateReferralSettings = async () => {
    try {
      const configRef = doc(db, 'settings', 'app_config');
      await setDoc(configRef, {
        referral_bonus_referrer: Number(referralSettings.bonus_referrer),
        referral_bonus_new_user: Number(referralSettings.bonus_new_user)
      }, { merge: true });
      showNotification({ message: 'Referral settings updated!', type: 'success' });
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'settings/app_config');
    }
  };

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Fetch Stats
        const usersSnap = await getDocs(collection(db, 'users'));
        const walletsSnap = await getDocs(collection(db, 'wallets'));
        const withdrawalsSnap = await getDocs(query(collection(db, 'withdrawals'), where('status', '==', 'pending')));

        let totalEarned = 0;
        const walletMap: Record<string, any> = {};
        walletsSnap.forEach(doc => {
          const data = doc.data();
          totalEarned += data.total_earned || 0;
          walletMap[doc.id] = data;
        });

        setStats({
          totalUsers: usersSnap.size,
          totalEarned: totalEarned,
          pendingWithdrawals: withdrawalsSnap.size,
          activeAds: 12 // Placeholder
        });

        // Fetch Withdrawals
        const withdrawalList: any[] = [];
        withdrawalsSnap.forEach(doc => withdrawalList.push({ id: doc.id, ...doc.data() }));
        setWithdrawals(withdrawalList);

        // Fetch Users with their wallet data
        const userList: any[] = [];
        usersSnap.forEach(doc => {
          const userData = doc.data();
          userList.push({ 
            id: doc.id, 
            ...userData,
            wallet: walletMap[doc.id] || { balance: 0, total_earned: 0 }
          });
        });
        setUsers(userList);

        // Fetch Promo Codes
        const promoSnap = await getDocs(collection(db, 'promo_codes'));
        const promoList: any[] = [];
        promoSnap.forEach(doc => promoList.push({ id: doc.id, ...doc.data() }));
        setPromoCodes(promoList);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const handleWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const path = `withdrawals/${id}`;
      const withdrawalRef = doc(db, path);
      const redeemCode = redeemCodes[id] || '';
      
      try {
        await updateDoc(withdrawalRef, {
          status,
          redeem_code: redeemCode,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
      setWithdrawals(prev => prev.filter(w => w.id !== id));
      setStats(prev => ({ ...prev, pendingWithdrawals: prev.pendingWithdrawals - 1 }));
      setRedeemCodes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePromo = async () => {
    if (!newPromo.code.trim()) return;
    try {
      const code = newPromo.code.trim().toUpperCase();
      const path = `promo_codes/${code}`;
      const promoRef = doc(db, path);
      const promoData = {
        code,
        reward: Number(newPromo.reward),
        max_uses: Number(newPromo.max_uses),
        current_uses: 0,
        used_by: [],
        expires_at: newPromo.expires_at || null,
        created_at: new Date().toISOString()
      };
      try {
        await setDoc(promoRef, promoData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
      
      setPromoCodes(prev => {
        const filtered = prev.filter(p => p.id !== code);
        return [{ id: code, ...promoData }, ...filtered];
      });
      setNewPromo({ code: '', reward: 100, max_uses: 100, expires_at: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePromo = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      const path = `promo_codes/${id}`;
      await deleteDoc(doc(db, path));
      setPromoCodes(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `promo_codes/${id}`);
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Admin Data...</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'home' }))}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Admin Console</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Management</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar">
        {(['stats', 'withdrawals', 'users', 'promo', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 min-w-[80px] py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all",
              activeTab === tab ? "bg-white text-primary shadow-sm" : "text-slate-400"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'stats' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <StatCard label="Total Users" value={stats.totalUsers.toLocaleString()} icon={Users} color="blue" />
            <StatCard label="Total Earned" value={`₹${coinsToRupees(stats.totalEarned)}`} icon={TrendingUp} color="emerald" />
            <StatCard label="Pending Payouts" value={stats.pendingWithdrawals.toString()} icon={Clock} color="amber" />
            <StatCard label="Active Ads" value={stats.activeAds.toString()} icon={PlayCircle} color="primary" />
          </motion.div>
        )}

        {activeTab === 'withdrawals' && (
          <motion.div
            key="withdrawals"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {withdrawals.length > 0 ? withdrawals.map((w) => (
              <Card key={w.id} className="p-4 space-y-4 h-full flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      w.method === 'upi' ? "bg-emerald-50 text-emerald-600" : 
                      w.method === 'amazon' ? "bg-amber-50 text-amber-600" : "bg-primary/5 text-primary"
                    )}>
                      {w.method === 'upi' ? <QrCode className="w-6 h-6" /> : 
                       w.method === 'amazon' ? <ShoppingBag className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{w.amount.toLocaleString()} Coins</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Value: ₹{w.rupees || coinsToRupees(w.amount)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider inline-block mb-1",
                      w.method === 'upi' ? "bg-emerald-100 text-emerald-700" : 
                      w.method === 'amazon' ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
                    )}>
                      {w.method === 'googleplay' ? 'Play Store' : w.method}
                    </div>
                    <p className="text-[10px] font-bold text-slate-400">{new Date(w.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 flex-1">
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">User Info</p>
                    <p className="text-xs font-bold text-slate-900">{w.display_name || 'User'}</p>
                    <p className="text-[10px] font-medium text-slate-500 truncate">{w.email}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Payment Details</p>
                    <p className="text-xs font-bold text-slate-700 break-all">{w.details}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Reference / Redeem Code (Optional)</p>
                  <input 
                    type="text" 
                    placeholder="Enter Transaction ID or Redeem Code..."
                    value={redeemCodes[w.id] || ''}
                    onChange={(e) => setRedeemCodes({ ...redeemCodes, [w.id]: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>

                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 border-none text-xs py-2"
                    onClick={() => handleWithdrawal(w.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1 text-xs py-2"
                    onClick={() => handleWithdrawal(w.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            )) : (
              <div className="lg:col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">All caught up!</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'users' && (
          <motion.div
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-100 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredUsers.map((u) => (
                <Card key={u.id} className="p-4 h-full flex flex-col">
                  <div className="flex items-center justify-between flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center">
                        <span className="text-primary font-black">{u.display_name?.[0] || 'U'}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{u.display_name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-primary">{u.wallet?.balance?.toLocaleString()} Coins</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Balance</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-1">
                        Ref Earned: {u.wallet?.referral_earnings?.toLocaleString() || 0}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Ref Count: {u.wallet?.referral_count || 0}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-50 flex justify-between items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Total Earned: {u.wallet?.total_earned?.toLocaleString()} Coins
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 text-[10px] font-black uppercase"
                        onClick={() => setSelectedUserForReferrals(u)}
                      >
                        View Referrals
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Referrals Modal */}
            <AnimatePresence>
              {selectedUserForReferrals && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
                  >
                    <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                          Referrals by {selectedUserForReferrals.display_name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Code: {selectedUserForReferrals.referral_code}
                        </p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => setSelectedUserForReferrals(null)}
                        className="rounded-full"
                      >
                        <XCircle className="w-6 h-6 text-slate-400" />
                      </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
                      {users.filter(u => u.referred_by === selectedUserForReferrals.referral_code).length > 0 ? (
                        users.filter(u => u.referred_by === selectedUserForReferrals.referral_code).map((ref) => (
                          <div key={ref.id} className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between border border-slate-100">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-100">
                                <span className="text-[10px] font-black text-primary">{ref.display_name?.[0] || 'U'}</span>
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-900">{ref.display_name}</p>
                                <p className="text-[9px] font-bold text-slate-400">{ref.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Joined</p>
                              <p className="text-[9px] font-bold text-slate-400">
                                {ref.created_at ? new Date(ref.created_at).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-10 text-center">
                          <Users className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No referrals found</p>
                        </div>
                      )}
                    </div>

                    <div className="p-6 bg-slate-50 border-t border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Referral Earnings</p>
                        <p className="text-lg font-black text-emerald-600">
                          {selectedUserForReferrals.wallet?.referral_earnings?.toLocaleString() || 0} Coins
                        </p>
                      </div>
                      <Button 
                        onClick={() => setSelectedUserForReferrals(null)}
                        className="w-full py-3 font-black uppercase tracking-widest"
                      >
                        Close
                      </Button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {activeTab === 'promo' && (
          <motion.div
            key="promo"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <Card className="p-6 space-y-4 h-fit lg:sticky lg:top-24">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Create New Promo Code</h3>
              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="CODE (e.g. WELCOME50)"
                  value={newPromo.code}
                  onChange={(e) => setNewPromo({ ...newPromo, code: e.target.value })}
                  className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-black uppercase tracking-widest focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Reward Coins</label>
                    <input 
                      type="number" 
                      value={newPromo.reward}
                      onChange={(e) => setNewPromo({ ...newPromo, reward: Number(e.target.value) })}
                      className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Max Uses</label>
                    <input 
                      type="number" 
                      value={newPromo.max_uses}
                      onChange={(e) => setNewPromo({ ...newPromo, max_uses: Number(e.target.value) })}
                      className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Expiration Date (Optional)</label>
                  <input 
                    type="date" 
                    value={newPromo.expires_at}
                    onChange={(e) => setNewPromo({ ...newPromo, expires_at: e.target.value })}
                    className="w-full bg-slate-100 border-none rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-primary"
                  />
                </div>
                <Button 
                  onClick={handleCreatePromo}
                  className="w-full py-3 font-black uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Code
                </Button>
              </div>
            </Card>

            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest ml-1">Active Promo Codes</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {promoCodes.map((p) => (
                  <Card key={p.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                        <Ticket className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase tracking-widest">{p.code}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {p.reward} Coins • {p.current_uses}/{p.max_uses} Uses
                        </p>
                        {p.expires_at && (
                          <p className={cn(
                            "text-[9px] font-bold uppercase tracking-widest",
                            new Date(p.expires_at) < new Date() ? "text-red-500" : "text-amber-500"
                          )}>
                            Expires: {new Date(p.expires_at).toLocaleDateString()}
                            {new Date(p.expires_at) < new Date() && " (EXPIRED)"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeletePromo(p.id)}
                        className="text-red-500 hover:bg-red-50 rounded-xl h-8 w-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {activeTab === 'settings' && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Referral Settings</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure referral rewards</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referrer Bonus (Coins)</label>
                  <input 
                    type="number" 
                    value={referralSettings.bonus_referrer}
                    onChange={(e) => setReferralSettings({ ...referralSettings, bonus_referrer: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary" 
                  />
                  <p className="text-[9px] text-slate-400 font-medium ml-1">Coins awarded to the person who shared their code.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New User Bonus (Coins)</label>
                  <input 
                    type="number" 
                    value={referralSettings.bonus_new_user}
                    onChange={(e) => setReferralSettings({ ...referralSettings, bonus_new_user: Number(e.target.value) })}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary" 
                  />
                  <p className="text-[9px] text-slate-400 font-medium ml-1">Coins awarded to the person joining with a code.</p>
                </div>
              </div>

              <Button 
                onClick={handleUpdateReferralSettings}
                className="w-full py-4 font-black uppercase tracking-widest"
              >
                Save Referral Settings
              </Button>
            </Card>

            <Card className="p-6 space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">App Maintenance</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System-wide controls</p>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                  <span className="block mb-1 uppercase tracking-wider">Note:</span>
                  These settings affect all users immediately. Be careful when changing reward amounts as it impacts the app economy.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    primary: "bg-primary/5 text-primary"
  };

  return (
    <Card className="p-4">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", colors[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-slate-900">{value}</p>
    </Card>
  );
}

const PlayCircle = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
);
