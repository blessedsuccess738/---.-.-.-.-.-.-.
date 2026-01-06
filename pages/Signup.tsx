
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../services/db';
import { User, UserRole } from '../types';

const Signup: React.FC = () => {
  const navigate = useNavigate();
  const config = db.getDepositConfig();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const { username, email, password, confirmPassword } = formData;

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const users = db.getUsers();
    if (users.some(u => u.email === email)) {
      setError('Email already registered');
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      username,
      email,
      password,
      walletBalance: 0,
      activeVipId: null,
      role: UserRole.USER,
      miningTimerStart: null,
      isBanned: false,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...users, newUser];
    db.setUsers(updatedUsers);
    
    // Auto-login after signup to show welcome message
    db.setCurrentUser(newUser);
    navigate('/dashboard?new=true');
  };

  const hasVideo = !!config.authVideoUrl;

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 py-10 ${hasVideo ? '' : 'bg-gray-50 dark:bg-gray-950'}`}>
      <div className={`max-w-md w-full p-8 rounded-3xl shadow-2xl border transition-all ${hasVideo ? 'bg-black/30 backdrop-blur-xl border-white/20 text-white' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-900 dark:text-white'}`}>
        <div className="text-center mb-8">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${hasVideo ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'}`}>
            <i className="fa-solid fa-user-plus"></i>
          </div>
          <h2 className="text-3xl font-black uppercase tracking-tight">Register</h2>
          <p className={`${hasVideo ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'} text-sm mt-2 font-medium uppercase tracking-widest text-center`}>Start earning daily with smart mining</p>
        </div>

        {error && (
          <div className="bg-red-500/20 text-red-200 p-4 rounded-2xl text-xs font-bold mb-6 border border-red-500/30 flex items-center">
            <i className="fa-solid fa-circle-exclamation mr-3 text-lg"></i> {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Username</label>
            <input 
              type="text" 
              required
              className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="your_name"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Email Address</label>
            <input 
              type="email" 
              required
              className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Password</label>
            <input 
              type="password" 
              required
              className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <div>
            <label className={`block text-[10px] font-black uppercase tracking-widest mb-1 ${hasVideo ? 'text-white/60' : 'text-gray-500'}`}>Confirm Password</label>
            <input 
              type="password" 
              required
              className={`w-full px-5 py-3 rounded-2xl border outline-none transition-all font-medium ${hasVideo ? 'bg-white/10 border-white/10 text-white focus:bg-white/20 focus:border-white/30' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:border-blue-500'}`}
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full py-4 mt-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest text-sm"
          >
            Create My Account
          </button>
        </form>

        <div className="mt-10 text-center text-xs">
          <span className={hasVideo ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}>Already have an account? </span>
          <Link to="/login" className="text-blue-500 font-black hover:underline uppercase tracking-widest ml-1">Login</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
