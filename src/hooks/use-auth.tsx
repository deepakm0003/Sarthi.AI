
'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, isFirebaseConfigured, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserProfile {
    uid: string;
    name: string;
    email: string;
    role: 'teacher' | 'student';
    class?: string;
    section?: string;
    rollNumber?: string;
    classroomId?: string;
}

export interface Classroom {
  id: string;
  grade: string;
  section: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  classrooms: Classroom[];
  loading: boolean;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function MissingConfigMessage() {
    return (
         <div className="flex h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-2xl rounded-lg border bg-card p-8 shadow-lg">
            <h1 className="text-2xl font-bold text-destructive mb-4">Firebase Configuration Required</h1>
            <p className="mt-4 text-muted-foreground mb-6">
              The application requires Firebase configuration to run. Please set up your environment variables.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-6 text-left">
              <p className="text-sm font-semibold mb-2">To fix this issue:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Create a <code className="bg-background px-1 py-0.5 rounded">.env.local</code> file in the project root</li>
                <li>Add the following environment variables with your Firebase credentials:</li>
              </ol>
              <pre className="mt-4 p-3 bg-background rounded text-xs overflow-x-auto">
{`NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id`}
              </pre>
              <p className="text-sm text-muted-foreground mt-4">
                Get your Firebase credentials from: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              After adding the configuration, restart the development server.
            </p>
          </div>
        </div>
    );
}

function FirebaseWarningBanner() {
  return (
    <div className="bg-yellow-500 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100 px-4 py-3 border-b border-yellow-600 dark:border-yellow-700">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">⚠️ Firebase Not Configured</span>
          <span className="text-sm">Some features may not work. Please configure Firebase environment variables.</span>
        </div>
        <a 
          href="https://console.firebase.google.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm underline hover:no-underline"
        >
          Setup Guide
        </a>
      </div>
    </div>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  
  // Use NODE_ENV which is consistent between server and client (replaced at build time)
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Set mounted state after hydration to avoid hydration mismatches
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (auth && db) {
      
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setUser(user);
        if (user && db) {
          // Fetch profile
          let userProfile: UserProfile | null = null;
          try {
            // Try fetching from 'teachers' collection first
            let docRef = doc(db!, 'teachers', user.uid);
            let docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                userProfile = docSnap.data() as UserProfile;
            } else {
                // If not found, try 'students' collection
                docRef = doc(db!, 'students', user.uid);
                docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    userProfile = docSnap.data() as UserProfile;
                }
            }
          } catch(e) {
            console.error("Failed to fetch user profile", e)
          }
          setProfile(userProfile);
          
          if (userProfile?.role === 'teacher' && db) {
            setClassrooms([]);
            try {
              const database = db; // Create a non-null reference for TypeScript
              const teacherRef = doc(database, 'teachers', user.uid);
              const teacherSnap = await getDoc(teacherRef);
              if (teacherSnap.exists()) {
                const teacherData = teacherSnap.data();
                if (teacherData.classroomIds && teacherData.classroomIds.length > 0) {
                  const classroomPromises = teacherData.classroomIds.map((id: string) => getDoc(doc(database, 'classrooms', id)));
                  const classroomDocs = await Promise.all(classroomPromises);
                  const classroomsData = classroomDocs
                    .filter(d => d.exists())
                    .map(d => ({ id: d.id, ...d.data() } as Classroom));
                  setClassrooms(classroomsData);
                }
              }
            } catch (error) {
              console.error("Error fetching classrooms:", error);
            }
          }
        } else {
          setProfile(null);
          setClassrooms([]);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  // In production, block the app if Firebase is not configured
  // In development, allow the app to run but show a warning
  // Wait for mount to avoid hydration mismatches
  if (!isFirebaseConfigured) {
    if (!isDevelopment) {
      return <MissingConfigMessage />;
    }
    // In development mode, show warning banner but allow app to run
    // Only show banner after mount to avoid hydration issues
    return (
      <>
        {isMounted && <FirebaseWarningBanner />}
        <AuthContext.Provider value={{
          user: null,
          profile: null,
          loading: false,
          classrooms: [],
          setProfile: () => {}
        }}>
          {children}
        </AuthContext.Provider>
      </>
    );
  }

  const authContextValue = useMemo(() => ({
    user,
    profile,
    loading,
    classrooms,
    setProfile
  }), [user, profile, loading, classrooms, setProfile]);

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
