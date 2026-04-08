import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENTE' | 'GESTOR' | 'SUPORTE';
  customerId?: string;
  photoUrl?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Use the UID directly as the document ID for better security and performance
        const docRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
          } else {
            // Fallback for the first admin if doc doesn't exist yet
            if (firebaseUser.email === 'samuel.bagolin@setuptecnologia.com.br') {
              setProfile({
                id: firebaseUser.uid,
                uid: firebaseUser.uid,
                name: 'Samuel Bagolin',
                email: firebaseUser.email,
                role: 'ADMIN'
              });
            } else {
              setProfile(null);
              // Sign out if profile is missing (user was deleted)
              auth.signOut();
            }
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile snapshot error:", error);
          // If we get a permission error, it might be because the user was just created
          // and the document isn't there yet, or they really don't have access.
          setLoading(false);
        });

        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'GESTOR' || profile?.role === 'SUPORTE' || user?.email === 'samuel.bagolin@setuptecnologia.com.br';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
