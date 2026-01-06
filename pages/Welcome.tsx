
import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900 text-white px-4">
      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-6 shadow-2xl">
        <i className="fa-solid fa-bolt-lightning text-4xl text-blue-600"></i>
      </div>
      
      <h1 className="text-4xl md:text-5xl font-extrabold mb-2 tracking-tight">SmartMine</h1>
      <p className="text-xl md:text-2xl font-light mb-12 text-blue-100 opacity-90">Earn daily with smart mining</p>

      <div className="w-full max-w-sm flex flex-col space-y-4">
        <button 
          onClick={() => navigate('/signup')}
          className="w-full py-4 bg-white text-blue-700 font-bold rounded-xl shadow-lg hover:bg-blue-50 transition-colors"
        >
          Get Started - Sign Up
        </button>
        <button 
          onClick={() => navigate('/login')}
          className="w-full py-4 bg-transparent border-2 border-white/30 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
        >
          Login to Account
        </button>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl text-center">
        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md">
          <i className="fa-solid fa-shield-halved text-2xl mb-3"></i>
          <h3 className="font-semibold mb-1">Secure</h3>
          <p className="text-sm text-blue-100">Advanced encryption for all transactions.</p>
        </div>
        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md">
          <i className="fa-solid fa-clock text-2xl mb-3"></i>
          <h3 className="font-semibold mb-1">24/7 Mining</h3>
          <p className="text-sm text-blue-100">Automated mining cycles for consistent returns.</p>
        </div>
        <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-md">
          <i className="fa-solid fa-wallet text-2xl mb-3"></i>
          <h3 className="font-semibold mb-1">Instant USD</h3>
          <p className="text-sm text-blue-100">Direct wallet deposits in USD currency.</p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
