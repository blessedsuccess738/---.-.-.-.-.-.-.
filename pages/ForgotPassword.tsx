
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/#/login', // Redirect back to login after reset link click
      });

      if (error) {
        setMessage({ type: 'error', text: error.message });
      } else {
        setMessage({ type: 'success', text: 'Password reset link sent! Please check your inbox (and spam folder).' });
        setEmail('');
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'An unexpected error occurred. Please try again later.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-8 rounded-[2.5rem] shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl bg-blue-600 text-white shadow-xl shadow-blue-500/20">
            <i className="fa-solid fa-key"></i>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight dark:text-white">Reset Password</h2>
          <p className="text-xs text-gray-500 mt-2 font-bold uppercase tracking-widest">Secure Account Recovery</p>
        </div>

        {message && (
          <div className={`p-4 rounded-2xl text-xs font-bold mb-6 border ${message.type === 'success' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'} text-left leading-relaxed`}>
            <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} mr-2`}></i>
            {message.text}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-6 text-left">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-2">Registered Email Address</label>
            <input 
              type="email" 
              required 
              className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
              placeholder="Enter your account email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            {loading ? <i className="fa-solid fa-spinner fa-spin mr-2"></i> : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-10 text-center">
          <Link to="/login" className="text-gray-500 text-xs font-black uppercase tracking-widest hover:text-blue-500 transition-colors">
            <i className="fa-solid fa-arrow-left mr-2"></i> Back to Authentication
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
