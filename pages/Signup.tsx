
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { ADMIN_CONFIG } from '../constants';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) {
        if (authError.message.toLowerCase().includes('api key') || authError.status === 403) {
          setError('Invalid Supabase API Key. Please verify services/supabase.ts.');
        } else {
          setError(authError.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Auto-assign admin role if email matches the one in constants
        const isAdmin = formData.email.toLowerCase().trim() === ADMIN_CONFIG.EMAIL.toLowerCase().trim();
        
        // Create profile in our public table
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: formData.username,
          email: formData.email.toLowerCase().trim(),
          wallet_balance: 0,
          role: isAdmin ? 'ADMIN' : 'USER'
        });

        if (profileError) {
          setError(`Database Error: ${profileError.message}`);
          setLoading(false);
          return;
        }
      }

      navigate('/dashboard?new=true');
    } catch (err: any) {
      setError('Connection failed. Please check your network and Supabase settings.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <h2 className="text-3xl font-black uppercase tracking-tight text-center mb-2 dark:text-white">Register</h2>
        <p className="text-xs text-gray-500 mb-8 text-center uppercase font-bold tracking-widest">Join SmartMine Network</p>
        
        {error && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-500/20 text-left">
            <i className="fa-solid fa-triangle-exclamation mr-2"></i>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSignup} className="space-y-4 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Display Name</label>
            <input type="text" placeholder="JohnDoe" required className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Email Address</label>
            <input type="email" placeholder="name@example.com" required className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Secure Password</label>
              <Link to="/forgot-password" title="Click to reset password" data-testid="forgot-password-link" className="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:underline">Forgot password?</Link>
            </div>
            <input type="password" placeholder="Min 6 characters" required className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-50 mt-4">
            {loading ? <i className="fa-solid fa-circle-notch fa-spin mr-2"></i> : 'Initialize Account'}
          </button>
        </form>
        <div className="mt-8 text-center text-xs">
          <p className="text-gray-500 mb-2">Already a member?</p>
          <Link to="/login" className="text-blue-500 font-black uppercase tracking-widest hover:underline">Sign In Here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
