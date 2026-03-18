import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserProfile {
  id?: string;
  uid: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CLIENTE' | 'GESTOR';
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
        // Query by email to handle cases where UID might not match document ID (common in manual setup)
        const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
        const unsubProfile = onSnapshot(q, (snapshot) => {
          if (!snapshot.empty) {
            const docSnap = snapshot.docs[0];
            setProfile({ id: docSnap.id, uid: firebaseUser.uid, ...docSnap.data() } as UserProfile);
          } else {
            // Fallback for the first admin if doc doesn't exist yet
            if (firebaseUser.email === 'samuel.bagolin@setuptecnologia.com.br') {
              setProfile({
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

  const isAdmin = profile?.role === 'ADMIN' || profile?.role === 'GESTOR' || user?.email === 'samuel.bagolin@setuptecnologia.com.br';

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
