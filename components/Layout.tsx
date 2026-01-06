
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { db } from '../services/db';
import { UserRole } from '../types';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = db.getCurrentUser();

  const handleLogout = () => {
    db.setCurrentUser(null);
    navigate('/');
  };

  const isAuthPage = ['/', '/login', '/signup'].includes(location.pathname);

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate(user?.role === UserRole.ADMIN ? '/admin' : '/dashboard')}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold tracking-tight text-gray-800">SmartMine</span>
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.role === UserRole.ADMIN && (
              <button 
                onClick={() => navigate('/admin')}
                className={`text-sm font-medium ${location.pathname === '/admin' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
              >
                Admin Panel
              </button>
            )}
            <button 
              onClick={() => navigate('/dashboard')}
              className={`text-sm font-medium ${location.pathname === '/dashboard' ? 'text-blue-600' : 'text-gray-600 hover:text-blue-600'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={handleLogout}
              className="text-sm font-medium text-red-600 hover:text-red-700"
            >
              <i className="fa-solid fa-right-from-bracket mr-1"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 px-4">
        <div className="max-w-7xl mx-auto text-center text-gray-500 text-xs">
          &copy; {new Date().getFullYear()} SmartMine USD. Secure Daily Earnings Platform.
        </div>
      </footer>
    </div>
  );
};
