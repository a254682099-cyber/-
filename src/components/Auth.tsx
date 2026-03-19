import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn, UserCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Create user profile if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          role: 'ledger_admin', // Default role
          createdAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setError(error.message || '使用 Google 登录失败。');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;
      
      // Create user profile if it doesn't exist
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: 'guest@example.com',
          displayName: 'Guest User',
          role: 'ledger_admin', // Default role
          createdAt: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Guest login failed:', error);
      setError('访客登录失败。请确保在 Firebase 控制台中启用了匿名身份验证（Authentication -> Sign-in method）。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full p-8 bg-white rounded-3xl shadow-2xl border border-neutral-100 text-center"
      >
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <LogIn className="text-emerald-600 w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">智能账本</h1>
        <p className="text-neutral-500 mb-8">团队协作财务管理。</p>
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 bg-white rounded-full p-0.5" alt="Google" />
            {loading ? '登录中...' : '使用 Google 继续'}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">或</span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white border-2 border-neutral-200 hover:border-emerald-500 hover:text-emerald-600 text-neutral-700 font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            <UserCircle2 className="w-6 h-6" />
            {loading ? '登录中...' : '作为访客测试（免登录）'}
          </button>
        </div>
        
        <p className="mt-8 text-xs text-neutral-400">
          登录即表示您同意我们的服务条款和隐私政策。
        </p>
      </motion.div>
    </div>
  );
};
