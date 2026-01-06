
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/db';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = db.getCurrentUser();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));
  const [config, setConfig] = useState(db.getDepositConfig());

  useEffect(() => {
    const interval = setInterval(() => {
      setConfig(db.getDepositConfig());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDark;
    setIsDark(newMode);
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sm_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sm_theme', 'light');
    }
  };

  const handleLogout = () => {
    db.setCurrentUser(null);
    navigate('/');
  };

  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);

  // Background Video Rendering
  const backgroundVideo = config.backgroundVideoUrl ? (
    <div className="fixed inset-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover"
        src={config.backgroundVideoUrl}
      />
      {/* Overlay to ensure text readability */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px]"></div>
    </div>
  ) : null;

  if (isAuthPage) return (
    <div className="relative min-h-screen">
      {backgroundVideo}
      <button 
        onClick={toggleDarkMode}
        className="fixed top-4 right-4 z-[60] w-10 h-10 flex items-center justify-center rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 hover:bg-white/30 transition-all"
      >
        <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
      </button>
      {children}
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-200 ${config.backgroundVideoUrl ? 'text-white' : 'bg-gray-50 dark:bg-gray-950'}`}>
      {backgroundVideo}
      
      <nav className={`border-b px-4 py-3 sticky top-0 z-50 shadow-sm ${config.backgroundVideoUrl ? 'bg-black/30 backdrop-blur-md border-white/10' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate(user?.role === UserRole.ADMIN ? '/admin' : '/dashboard')}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">S</div>
            <span className={`text-xl font-bold tracking-tight ${config.backgroundVideoUrl ? 'text-white' : 'text-gray-800 dark:text-white'}`}>SmartMine</span>
          </div>
          
          <div className="flex items-center space-x-3 md:space-x-6">
            {!config.backgroundVideoUrl && (
              <button 
                onClick={toggleDarkMode}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:text-blue-600 transition-all"
                title="Toggle Theme"
              >
                <i className={`fa-solid ${isDark ? 'fa-sun' : 'fa-moon'}`}></i>
              </button>
            )}
            {user?.role === UserRole.ADMIN && (
              <button 
                onClick={() => navigate('/admin')}
                className={`text-sm font-semibold hidden md:block ${location.pathname === '/admin' ? 'text-blue-600' : config.backgroundVideoUrl ? 'text-white/80 hover:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'}`}
              >
                Admin Panel
              </button>
            )}
            <button 
              onClick={() => navigate('/dashboard')}
              className={`text-sm font-semibold ${location.pathname === '/dashboard' ? 'text-blue-600' : config.backgroundVideoUrl ? 'text-white/80 hover:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-blue-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="text-sm font-semibold text-red-600 hover:text-red-700 dark:text-red-400 flex items-center"
            >
              <i className="fa-solid fa-power-off md:mr-1"></i> <span className="hidden md:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className={config.backgroundVideoUrl ? 'bg-black/20 backdrop-blur-md rounded-[2.5rem] p-6 min-h-full border border-white/5 shadow-2xl' : ''}>
          {children}
        </div>
      </main>

      <footer className={`border-t py-6 px-4 transition-colors ${config.backgroundVideoUrl ? 'bg-black/30 border-white/10 text-white/60' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'}`}>
        <div className="max-w-7xl mx-auto text-center text-xs">
          &copy; {new Date().getFullYear()} SmartMine USD. Secure Daily Earnings Platform.
        </div>
      </footer>
    </div>
  );
};
