import React, { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn, UserCircle2, AlertCircle, User, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { memberService } from '../services/memberService';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginType, setLoginType] = useState<'google' | 'member'>('google');

  const handleMemberLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const member = await memberService.loginMember(username, password);
      // For system members, we use anonymous auth and store their info in localStorage
      // This is a workaround since we can't easily create real Firebase users from client
      const result = await signInAnonymously(auth);
      const user = result.user;
      
      // Store member info in Firestore linked to this anonymous UID
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: `${username}@system.local`,
        displayName: member.displayName,
        role: member.role,
        isSystemMember: true,
        memberId: member.id,
        accessibleLedgerIds: member.accessibleLedgerIds,
        createdAt: new Date().toISOString()
      });
      
      localStorage.setItem('system_member_id', member.id);
    } catch (error: any) {
      console.error('Member login failed:', error);
      setError(error.message || '账号或密码错误');
    } finally {
      setLoading(false);
    }
  };

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
          role: user.email?.trim().toLowerCase() === 'a254682099@gmail.com' ? 'admin' : 'ledger_admin', // Default role
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

        <div className="flex gap-2 mb-8 p-1 bg-neutral-100 rounded-2xl">
          <button
            onClick={() => setLoginType('google')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              loginType === 'google' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            Google 登录
          </button>
          <button
            onClick={() => setLoginType('member')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              loginType === 'member' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            账号密码登录
          </button>
        </div>

        {loginType === 'member' ? (
          <form onSubmit={handleMemberLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">用户名</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入用户名"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <User className="absolute left-4 top-4 text-neutral-400 w-5 h-5" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">密码</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
                <Lock className="absolute left-4 top-4 text-neutral-400 w-5 h-5" />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </form>
        ) : (
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
        )}
        
        <p className="mt-8 text-xs text-neutral-400">
          登录即表示您同意我们的服务条款和隐私政策。
        </p>
      </motion.div>
    </div>
  );
};
