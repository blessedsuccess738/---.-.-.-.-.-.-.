
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../services/supabase';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile in our public table
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username: formData.username,
        email: formData.email,
        wallet_balance: 0,
        role: 'USER'
      });

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }
    }

    navigate('/dashboard?new=true');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-8 rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
        <h2 className="text-3xl font-black uppercase tracking-tight text-center mb-8 dark:text-white">Register</h2>
        {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-xs font-bold mb-6">{error}</div>}
        <form onSubmit={handleSignup} className="space-y-4">
          <input type="text" placeholder="Username" required className="w-full px-5 py-3 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
          <input type="email" placeholder="Email" required className="w-full px-5 py-3 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <input type="password" placeholder="Password" required className="w-full px-5 py-3 rounded-2xl border dark:bg-gray-800 dark:border-gray-700 dark:text-white" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest">
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>
        <div className="mt-8 text-center text-xs">
          <Link to="/login" className="text-blue-500 font-black uppercase tracking-widest">Member Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
