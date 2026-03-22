import React from 'react';
import { Shield, ArrowLeft, Lock, Eye, FileText, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Card, Button } from './UI';

export default function PrivacyPolicy({ onBack }: { onBack: () => void }) {
  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-2xl">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Privacy Policy</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">How we handle your data</p>
        </div>
      </div>

      <Card className="p-6 space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Eye className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-wider">Data Collection</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            We collect minimal information to provide our services. This includes your email address (via Google Sign-In) to manage your account and rewards balance. We also track your activities within the app (like spins and scratch cards) to calculate your earnings.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-wider">Data Security</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your data is stored securely using Google Firebase. We do not sell your personal information to third parties. We use industry-standard security measures to protect your account and transaction history.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary">
            <FileText className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-wider">Third-Party Services</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our app uses Google Firebase for authentication and database management. Please refer to Google's Privacy Policy for more details on how they handle data.
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-wider">Account Deletion</h3>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            You have the right to delete your account and all associated data at any time. You can request account deletion through the settings menu in your profile. Once deleted, your coins and history cannot be recovered.
          </p>
        </section>

        <div className="pt-6 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 font-medium text-center italic">
            Last updated: March 17, 2026. By using Play Banana, you agree to these terms.
          </p>
        </div>
      </Card>
    </div>
  );
}
