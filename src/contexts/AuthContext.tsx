import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, onAuthStateChanged, db, doc, getDoc, signInAnonymously, onSnapshot, handleFirestoreError, OperationType, updateDoc } from '@/firebase';
import { User } from 'firebase/auth';
import { Company } from '@/types';

interface UserData {
  role: 'globaladmin' | 'company';
  companyId?: string;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  companyData: Company | null;
  loading: boolean;
  isGlobalAdmin: boolean;
  isAnonymous: boolean;
  isTrialExpired: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userData: null, 
  companyData: null,
  loading: true, 
  isGlobalAdmin: false,
  isAnonymous: false,
  isTrialExpired: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  useEffect(() => {
    let userDocUnsubscribe: (() => void) | null = null;
    let companyDocUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clean up previous listeners
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }
      if (companyDocUnsubscribe) {
        companyDocUnsubscribe();
        companyDocUnsubscribe = null;
      }

      if (!user) {
        setUser(null);
        setUserData(null);
        setCompanyData(null);
        setIsTrialExpired(false);
        // If no user, sign in anonymously for public access
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.error("Anonymous sign-in failed:", err);
          setLoading(false);
        }
        return;
      }

      setUser(user);
      
      if (!user.isAnonymous) {
        // Listen to user document changes
        userDocUnsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const uData = docSnap.data() as UserData;
            setUserData(uData);

            // If it's a company user, also listen to the company document
            if (uData.role === 'company' && uData.companyId) {
              if (companyDocUnsubscribe) companyDocUnsubscribe();
              
              companyDocUnsubscribe = onSnapshot(doc(db, 'companies', uData.companyId), async (compSnap) => {
                if (compSnap.exists()) {
                  const cData = { id: compSnap.id, ...compSnap.data() } as Company;
                  
                  // Migration: Initialize trial if missing
                  if (!cData.trialExpiresAt) {
                    const baseDate = cData.createdAt?.toDate ? cData.createdAt.toDate() : new Date();
                    const newExpiry = new Date(baseDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                    await updateDoc(doc(db, 'companies', compSnap.id), {
                      trialExpiresAt: newExpiry,
                      status: 'active'
                    });
                    // The snapshot will trigger again with the new data
                    return;
                  }

                  setCompanyData(cData);
                  
                  // Initial trial check
                  const expiry = cData.trialExpiresAt.toDate ? cData.trialExpiresAt.toDate() : new Date(cData.trialExpiresAt);
                  setIsTrialExpired(new Date() > expiry);
                } else {
                  setCompanyData(null);
                }
              }, (error) => {
                handleFirestoreError(error, OperationType.GET, `companies/${uData.companyId}`);
              });
            } else {
              setCompanyData(null);
              setIsTrialExpired(false);
            }
          } else {
            setUserData(null);
            setCompanyData(null);
            setIsTrialExpired(false);
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setUserData(null);
          setLoading(false);
        });
      } else {
        setUserData(null);
        setCompanyData(null);
        setIsTrialExpired(false);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) userDocUnsubscribe();
      if (companyDocUnsubscribe) companyDocUnsubscribe();
    };
  }, []);

  // 5-second trial check
  useEffect(() => {
    if (!companyData?.trialExpiresAt) return;

    const interval = setInterval(() => {
      const expiry = companyData.trialExpiresAt.toDate ? companyData.trialExpiresAt.toDate() : new Date(companyData.trialExpiresAt);
      const expired = new Date() > expiry;
      if (expired !== isTrialExpired) {
        setIsTrialExpired(expired);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [companyData, isTrialExpired]);

  const isGlobalAdmin = userData?.role === 'globaladmin';
  const isAnonymous = user?.isAnonymous || false;

  return (
    <AuthContext.Provider value={{ user, userData, companyData, loading, isGlobalAdmin, isAnonymous, isTrialExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
