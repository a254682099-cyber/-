import React, { useState, useEffect } from 'react';
import { User, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  User as UserIcon, 
  Mail, 
  Shield, 
  Save, 
  Camera,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserProfile } from '../types';

interface SettingsProps {
  userProfile: UserProfile | null;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile: initialProfile }) => {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(initialProfile);
  const [loading, setLoading] = useState(!initialProfile);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setUserProfile(initialProfile);
      setLoading(false);
    }
  }, [initialProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName,
        photoURL
      });

      // Update Firestore user document
      const docRef = doc(db, 'users', user.uid);
      await updateDoc(docRef, {
        name: displayName,
        photoURL,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: '个人资料更新成功！' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: error.message || '更新个人资料失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mr-3"></div>
        正在加载设置...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-neutral-900">设置</h2>
        <p className="text-neutral-500 mt-2">管理您的帐户偏好和个人资料信息。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Sidebar */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 text-center">
            <div className="relative inline-block mb-6">
              <img 
                src={photoURL || `https://ui-avatars.com/api/?name=${displayName || '访客'}`} 
                alt="Profile" 
                className="w-32 h-32 rounded-full border-4 border-emerald-50 object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-0 right-0 bg-emerald-600 p-2 rounded-full text-white shadow-lg border-2 border-white">
                <Camera className="w-5 h-5" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-neutral-900">{displayName || '访客用户'}</h3>
            <p className="text-sm text-neutral-500">{user?.email}</p>
            
            <div className="mt-6 pt-6 border-t border-neutral-100 flex items-center justify-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                {userProfile?.role === 'ledger_admin' ? '账本管理员' : 
                 userProfile?.role === 'auditor' ? '审计员' : 
                 userProfile?.role === 'collector' ? '催收员' : 
                 userProfile?.role === 'readonly' ? '只读' : 
                 userProfile?.role?.replace('_', ' ') || '用户'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Settings Form */}
        <div className="md:col-span-2">
          <form onSubmit={handleSave} className="bg-white p-8 rounded-3xl shadow-sm border border-neutral-100 space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <UserIcon className="w-4 h-4" />
                  全名
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="张三"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  电子邮件地址
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500 cursor-not-allowed outline-none"
                />
                <p className="text-[10px] text-neutral-400 mt-1 italic">Google 帐户无法更改电子邮件。</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-neutral-700 mb-2 flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  个人资料照片 URL
                </label>
                <input
                  type="text"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}
              >
                {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{message.text}</span>
              </motion.div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full md:w-auto px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    保存更改
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
