
import React, { useEffect, useState, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.tsx';
import Welcome from './pages/Welcome.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import VerifyEmail from './pages/VerifyEmail.tsx';
import ForgotPassword from './pages/ForgotPassword.tsx';
import Dashboard from './pages/Dashboard.tsx';
import AdminPanel from './pages/Admin.tsx';
import { db } from './services/db.ts';
import { User, UserRole } from './types.ts';
import { supabase } from './services/supabase.ts';
import { ADMIN_CONFIG } from './constants.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAndPromoteAdmin = useCallback(async (profile: User | null) => {
    if (profile && profile.email.toLowerCase().trim() === ADMIN_CONFIG.EMAIL.toLowerCase().trim()) {
      if (profile.role !== UserRole.ADMIN) {
        console.log("Admin email detected. Synchronizing role...");
        await db.updateProfile(profile.id, { role: UserRole.ADMIN });
        const updatedProfile = await db.getCurrentUser();
        setUser(updatedProfile);
        return updatedProfile;
      }
    }
    return profile;
  }, []);

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      setUser(null);
      setLoading(false);
      return null;
    }

    const profile = await db.getCurrentUser();
    
    // If the admin has permanently deleted the profile row, or banned them
    if (!profile || profile.isBanned) {
      console.log("Account no longer active or restriction detected. Terminating session...");
      await supabase.auth.signOut();
      setUser(null);
      setLoading(false);
      return null;
    }

    const checkedProfile = await checkAndPromoteAdmin(profile);
    setUser(checkedProfile);
    setLoading(false);
    return checkedProfile;
  }, [checkAndPromoteAdmin]);

  useEffect(() => {
    refreshUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    // Background sync check for bans or deletions (every 10s)
    const syncInterval = setInterval(refreshUser, 10000);

    return () => {
      subscription.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [refreshUser]);

  // We remove the pulsed loading screen and just return the router immediately.
  // Routes will handle the protection based on the user object once loading is false.
  if (loading) return null; 

  return (
    <Router>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/dashboard" />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={user?.role === UserRole.ADMIN ? <AdminPanel /> : <Navigate to="/dashboard" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
