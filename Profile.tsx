import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Shield, 
  Key, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Camera,
  Users,
  Trophy,
  Wallet,
  History,
  ArrowLeft,
  Copy,
  CheckCircle2,
  Share2,
  Trash2,
  FileText,
  Gift
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, Button } from './UI';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { cn, formatCoins } from '../lib/utils';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Profile({ onTabChange }: { onTabChange: (tab: any) => void }) {
  const { user, profile, wallet, logout } = useAuth();
  const { showNotification } = useNotification();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'main' | 'referrals' | 'security' | 'edit'>('main');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newAvatar, setNewAvatar] = useState('');
  const [updating, setUpdating] = useState(false);

  const AVATARS = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oscar',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Daisy',
  ];

  useEffect(() => {
    if (profile) {
      setNewDisplayName(profile.display_name || profile.email?.split('@')[0] || '');
      setNewAvatar(profile.avatar || '');
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;
    setUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        display_name: newDisplayName,
        avatar: newAvatar
      });
      showNotification({ message: "Profile updated successfully!", type: 'success' });
      setActiveSection('main');
    } catch (err) {
      console.error(err);
      showNotification({ message: "Failed to update profile", type: 'error' });
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    const fetchReferrals = async () => {
      if (!profile?.referral_code) return;
      try {
        const q = query(collection(db, 'users'), where('referred_by', '==', profile.referral_code));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        setReferrals(list);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReferrals();
  }, [profile]);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText(profile?.referral_code || '');
    showNotification({ message: "Referral code copied!", type: 'success' });
  };

  return (
    <div className="space-y-6 pb-20">
      <AnimatePresence mode="wait">
        {activeSection === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Profile</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Settings</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="text-red-500 hover:bg-red-50 rounded-2xl">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>

            {/* Profile Card */}
            <Card className="p-6 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-primary to-primary-light" />
              <div className="relative pt-8">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-xl mx-auto">
                    <div className="w-full h-full rounded-2xl bg-primary flex items-center justify-center text-white text-3xl font-display font-black overflow-hidden">
                      {profile?.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        profile?.email?.[0].toUpperCase() || 'U'
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveSection('edit')}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center text-primary border border-slate-100"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="mt-4 font-display font-black text-xl text-slate-900">{profile?.display_name || profile?.email?.split('@')[0]}</h3>
                <p className="text-sm font-bold text-slate-400">{profile?.email}</p>
                
                <div className="flex items-center justify-center gap-2 mt-4">
                  <div className="px-3 py-1 bg-primary/5 text-primary rounded-full text-[10px] font-black uppercase tracking-wider border border-primary/10">
                    Day {wallet?.checkin_streak || 1} Streak
                  </div>
                  {profile?.is_admin && (
                    <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-wider border border-amber-100">
                      Administrator
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Balance</p>
                <p className="text-xl font-display font-black text-primary">{formatCoins(wallet?.balance || 0)}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Referrals</p>
                <p className="text-xl font-display font-black text-primary">{referrals.length}</p>
              </Card>
            </div>

            {/* Menu List */}
            <div className="space-y-2">
              <ProfileMenuItem 
                icon={User} 
                label="Edit Profile" 
                sublabel="Change name & avatar" 
                onClick={() => setActiveSection('edit')} 
              />
              <ProfileMenuItem 
                icon={Users} 
                label="Refer & Earn" 
                sublabel="Manage your referrals" 
                onClick={() => setActiveSection('referrals')} 
              />
              <ProfileMenuItem 
                icon={History} 
                label="Transaction History" 
                sublabel="View your earnings" 
                onClick={() => onTabChange('history')} 
              />
              <ProfileMenuItem 
                icon={Gift} 
                label="My Gift Cards" 
                sublabel="View your reward codes" 
                onClick={() => onTabChange('giftcards')} 
              />
              <ProfileMenuItem 
                icon={FileText} 
                label="Privacy Policy" 
                sublabel="How we handle your data" 
                onClick={() => onTabChange('privacy')} 
              />
              <ProfileMenuItem 
                icon={Shield} 
                label="Security" 
                sublabel="Password & Privacy" 
                onClick={() => setActiveSection('security')} 
              />
              <ProfileMenuItem 
                icon={Bell} 
                label="Notifications" 
                sublabel="Preferences" 
                onClick={() => {}} 
              />
            </div>
          </motion.div>
        )}

        {activeSection === 'referrals' && (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')} className="rounded-2xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Referrals</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grow your network</p>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-success to-success-dark text-white border-none p-6 shadow-xl shadow-success/20">
              <h3 className="font-display font-black text-lg mb-2">Invite Friends</h3>
              <p className="text-sm text-white/90 font-medium mb-6">
                Share your code with friends. When they join, you both get 200 coins!
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 font-display font-black text-xl tracking-widest border border-white/30 truncate">
                  {profile?.referral_code}
                </div>
                <Button 
                  className="bg-white text-success hover:bg-slate-100 h-full px-4 flex items-center gap-2 shadow-lg" 
                  onClick={handleCopyReferral}
                >
                  <Copy className="w-4 h-4" />
                  <span className="text-xs font-black uppercase">Copy</span>
                </Button>
              </div>
            </Card>

            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Your Referrals ({referrals.length})</h4>
              {referrals.length > 0 ? referrals.map((ref) => (
                <Card key={ref.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-display font-black">
                      {ref.email[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 truncate max-w-[150px]">{ref.email}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Joined {new Date(ref.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-display font-black text-success">+200</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Earned</p>
                  </div>
                </Card>
              )) : (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <Users className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No referrals yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeSection === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')} className="rounded-2xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Edit Profile</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Personalize your account</p>
              </div>
            </div>

            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Display Name</label>
                  <input 
                    type="text" 
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter your name" 
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary" 
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Avatar</label>
                  <div className="grid grid-cols-4 gap-3">
                    {AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        onClick={() => setNewAvatar(url)}
                        className={cn(
                          "aspect-square rounded-2xl overflow-hidden border-4 transition-all",
                          newAvatar === url ? "border-primary scale-105 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full mt-4 py-4" 
                  onClick={handleUpdateProfile}
                  loading={updating}
                  disabled={updating}
                >
                  Save Changes
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {activeSection === 'security' && (
          <motion.div
            key="security"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setActiveSection('main')} className="rounded-2xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Protect your account</p>
              </div>
            </div>

            <Card className="p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900">Change Password</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary" />
                  </div>
                  <Button className="w-full mt-2">Update Password</Button>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <h4 className="text-sm font-black text-slate-900">Privacy Settings</h4>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Show on Leaderboard</p>
                    <p className="text-[10px] text-slate-400 font-medium">Allow others to see your rank</p>
                  </div>
                  <div className="w-12 h-6 bg-primary rounded-full relative">
                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-center gap-2 text-red-600">
                  <Trash2 className="w-5 h-5" />
                  <h4 className="text-sm font-black">Danger Zone</h4>
                </div>
                <p className="text-[10px] text-slate-500 font-medium">
                  Deleting your account will permanently remove all your coins, transaction history, and profile data. This action cannot be undone.
                </p>
                <Button 
                  variant="outline" 
                  className="w-full border-red-100 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    showNotification({
                      message: "Are you sure you want to delete your account? This will permanently remove all your data.",
                      type: 'confirm',
                      onConfirm: () => {
                        showNotification({ message: "Account deletion request submitted. Our team will process it within 48 hours.", type: 'info' });
                      }
                    });
                  }}
                >
                  Request Account Deletion
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenuItem({ icon: Icon, label, sublabel, onClick }: any) {
  return (
    <Card 
      hover 
      onClick={onClick}
      className="p-4 flex items-center justify-between group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-primary/5 text-primary rounded-xl flex items-center justify-center transition-colors group-hover:bg-primary group-hover:text-white">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-display font-black text-slate-900">{label}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sublabel}</p>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-primary transition-colors" />
    </Card>
  );
}
