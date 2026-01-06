
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const config = db.getDepositConfig();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
      if (user.isBanned) {
        setError('Your account has been suspended. Please contact support.');
        return;
      }
      db.setCurrentUser(user);
      navigate('/dashboard');
    } else {
      setError('Invalid email or password.');
    }
  };

  const hasVideo = !!config.authVideoUrl;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${hasVideo ? '' : 'bg-gray-50 dark:bg-gray-950'}`}>
      <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl border transition-all ${hasVideo ? 'bg-black/30 backdrop-blur-xl border-white/20 text-white' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white'}`}>
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${hasVideo ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
            <i className="fa-solid fa-user-lock"></i>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Login</h2>
          <p className={`${hasVideo ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} text-sm mt-2 font-medium uppercase tracking-widest`}>Manage your mining assets</p>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-500/30 flex items-center">
            <i className="fa-solid fa-circle-exclamation mr-3 text-lg"></i> {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Email Address</label>
            <input 
              type="email" 
              required
              className={`w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-2 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Password</label>
            <input 
              type="password" 
              required
              className={`w-full px-5 py-4 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest text-sm"
          >
            Sign In
          </button>
        </form>

        <div className="mt-10 text-center text-xs">
          <span className={hasVideo ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}>Don't have an account? </span>
          <Link to="/signup" className="text-blue-500 font-black hover:underline uppercase tracking-widest ml-1">Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
