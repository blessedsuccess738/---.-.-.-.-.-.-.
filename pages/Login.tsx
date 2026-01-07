
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { ADMIN_CONFIG } from '../constants';
import { UserRole } from '../types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pre-check for placeholder key
    if ((supabase as any).supabaseKey.includes('REPLACE_THIS_WITH_YOUR_ANON_KEY')) {
      setError('Setup Required: Please paste your Supabase "anon" key into services/supabase.ts');
      setLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (authError) {
        setError(authError.message === 'Invalid login credentials' ? 'Incorrect email or password.' : authError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        // Fetch current profile
        let profile = await db.getCurrentUser();
        
        // LAZY PROMOTION LOGIC:
        // If this user email matches the master admin email but they aren't marked as ADMIN, upgrade them now.
        const shouldBeAdmin = email.toLowerCase().trim() === ADMIN_CONFIG.EMAIL.toLowerCase().trim();
        
        if (shouldBeAdmin && profile?.role !== UserRole.ADMIN) {
          console.log("Admin email detected. Promoting user to ADMIN role...");
          await db.updateProfile(data.user.id, { role: UserRole.ADMIN });
          // Refresh profile after update
          profile = await db.getCurrentUser();
        }

        if (profile?.isBanned) {
          await supabase.auth.signOut();
          setError('Your account is currently suspended.');
          setLoading(false);
          return;
        }
      }

      navigate('/dashboard');
    } catch (err) {
      setError('Connection error. Please check your network and Supabase settings.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
            <i className="fa-solid fa-user-lock"></i>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight dark:text-white">Sign In</h2>
        </div>

        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-500/20 text-left leading-relaxed">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email Address</label>
            <input type="email" required className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Password</label>
              <Link to="/forgot-password" title="Click to reset password" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">Forgot password?</Link>
            </div>
            <input type="password" required className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all mt-2">
            {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : 'Authenticate'}
          </button>
        </form>
        <div className="mt-8 text-center text-xs">
          <p className="text-gray-500 mb-2">New to SmartMine?</p>
          <Link to="/signup" className="text-blue-500 font-black uppercase tracking-widest hover:underline">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
