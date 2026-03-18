import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export const Auth: React.FC = () => {
  const handleLogin = async () => {
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
          email: user.email,
          displayName: user.displayName,
          role: 'ledger_admin', // Default role
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
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
        
        <button
          onClick={handleLogin}
          className="w-full py-4 px-6 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl active:scale-95"
        >
          <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-6 h-6 invert" alt="" />
          Continue with Google
        </button>
        
        <p className="mt-8 text-xs text-neutral-400">
          By signing in, you agree to our terms of service and privacy policy.
        </p>
      </motion.div>
    </div>
  );
};
