import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getDocFromServer, setDoc } from 'firebase/firestore';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { LedgerDetail } from './components/LedgerDetail';
import { Reports } from './components/Reports';
import { CustomerDetail } from './components/CustomerDetail';
import { OrderDetail } from './components/OrderDetail';
import { Settings } from './components/Settings';
import { Members } from './components/Members';
import { Layout } from './components/Layout';
import { User } from './types';

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as User;
            if (user.email?.trim().toLowerCase() === 'a254682099@gmail.com' && data.role !== 'admin') {
              data.role = 'admin';
              // Save to Firestore so security rules recognize the admin role
              try {
                await setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
              } catch (e) {
                console.error("Failed to update admin role in Firestore", e);
              }
            }
            setUserProfile(data);
          } else {
            // Fallback for users without a profile yet (e.g. first login)
            const newProfile: User = {
              uid: user.uid,
              displayName: user.displayName || '访客',
              email: user.email || '',
              role: user.email?.trim().toLowerCase() === 'a254682099@gmail.com' ? 'admin' : 'client',
              createdAt: new Date().toISOString()
            };
            setUserProfile(newProfile);
            // Try to save the fallback profile
            try {
              await setDoc(doc(db, 'users', user.uid), newProfile);
            } catch (e) {
              console.error("Failed to save fallback profile", e);
            }
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    // Test connection as required
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {!firebaseUser ? (
          <Routes>
            <Route path="*" element={<Auth />} />
          </Routes>
        ) : (
          <Layout user={firebaseUser} userProfile={userProfile}>
            <Routes>
              <Route path="/" element={<Dashboard userProfile={userProfile} />} />
              <Route path="/ledger/:id" element={<LedgerDetail userProfile={userProfile} />} />
              <Route path="/ledger/:ledgerId/customer/:customerId" element={<CustomerDetail userProfile={userProfile} />} />
              <Route path="/ledger/:ledgerId/order/:orderId" element={<OrderDetail userProfile={userProfile} />} />
              <Route path="/reports" element={<Reports userProfile={userProfile} />} />
              <Route path="/members" element={<Members userProfile={userProfile} />} />
              <Route path="/settings" element={<Settings userProfile={userProfile} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        )}
      </BrowserRouter>
    </ErrorBoundary>
  );
}
