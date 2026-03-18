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
      setError(error.message || 'Failed to sign in with Google.');
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
      setError('Guest login failed. Please ensure Anonymous Auth is enabled in the Firebase Console (Authentication -> Sign-in method).');
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
        <h1 className="text-3xl font-bold text-neutral-900 mb-2">Smart Ledger</h1>
        <p className="text-neutral-500 mb-8">Collaborative finance management for teams.</p>
        
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
            {loading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-neutral-200"></div>
            <span className="flex-shrink-0 mx-4 text-neutral-400 text-sm">or</span>
            <div className="flex-grow border-t border-neutral-200"></div>
          </div>

          <button
            onClick={handleGuestLogin}
            disabled={loading}
            className="w-full py-4 px-6 bg-white border-2 border-neutral-200 hover:border-emerald-500 hover:text-emerald-600 text-neutral-700 font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
          >
            <UserCircle2 className="w-6 h-6" />
            {loading ? 'Signing in...' : 'Test as Guest (No Login)'}
          </button>
        </div>
        
        <p className="mt-8 text-xs text-neutral-400">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};
