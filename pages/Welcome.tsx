
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../services/db';

const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState(db.getDepositConfig());

  useEffect(() => {
    const interval = setInterval(() => {
      setConfig(db.getDepositConfig());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen text-white overflow-x-hidden">
      {/* Background Video */}
      {config.welcomeVideoUrl && (
        <div className="fixed inset-0 w-full h-full -z-20 overflow-hidden">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
            src={config.welcomeVideoUrl}
          />
        </div>
      )}
      
      {/* Overlay Layers */}
      <div className="fixed inset-0 bg-gradient-to-b from-blue-900/40 via-indigo-900/60 to-gray-950/90 -z-10 backdrop-blur-[1px]"></div>

      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-10">
        <div className="w-24 h-24 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center mb-10 shadow-2xl border border-white/20 animate-bounce-slow">
          <i className="fa-solid fa-bolt-lightning text-5xl text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]"></i>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter text-center uppercase">
          Smart<span className="text-blue-500">Mine</span> USD
        </h1>
        <p className="text-xl md:text-2xl font-light mb-12 text-blue-100/80 text-center max-w-2xl leading-relaxed">
          The world's most sophisticated cloud-hashing platform. Powering global digital wealth with sustainable technology.
        </p>

        <div className="w-full max-w-md flex flex-col space-y-4 mb-20">
          <button 
            onClick={() => navigate('/signup')}
            className="w-full py-5 bg-blue-600 text-white text-lg font-black rounded-2xl shadow-[0_10px_30px_rgba(37,99,235,0.4)] hover:bg-blue-500 hover:-translate-y-1 transition-all duration-300 uppercase tracking-widest active:scale-95"
          >
            Start Mining Now
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-5 bg-white/10 backdrop-blur-md border border-white/20 text-white text-lg font-bold rounded-2xl hover:bg-white/20 transition-all duration-300 uppercase tracking-widest active:scale-95"
          >
            Member Login
          </button>
        </div>

        <div className="animate-bounce mt-10">
          <i className="fa-solid fa-chevron-down text-2xl opacity-50"></i>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-24 px-6 bg-gray-950/80 backdrop-blur-md border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">About Our Enterprise</h2>
              <h3 className="text-4xl font-black leading-tight">Leading the Cloud Hashing Revolution Since 2024</h3>
              <p className="text-lg text-gray-400 leading-relaxed">
                SmartMine USD is a global leader in high-performance computational infrastructure. We democratize access to institutional-grade mining hardware through our proprietary "Fractional Hashing" technology.
              </p>
              <p className="text-lg text-gray-400 leading-relaxed">
                Our mission is simple: To provide individuals worldwide with the same earning potential as large-scale industrial mining farms. By leveraging renewable energy sources and custom-built ASIC clusters, we ensure that your daily USD returns are consistent, secure, and future-proof.
              </p>
              <div className="flex gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">1.2M+</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">$450M+</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Payouts Sent</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-black text-blue-400">100%</div>
                  <div className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Uptime Record</div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-square bg-blue-600/20 rounded-3xl flex flex-col items-center justify-center p-6 border border-blue-500/30 text-center">
                <i className="fa-solid fa-server text-4xl mb-4 text-blue-400"></i>
                <h4 className="font-black text-sm uppercase">Smart Infrastructure</h4>
              </div>
              <div className="aspect-square bg-indigo-600/20 rounded-3xl flex flex-col items-center justify-center p-6 border border-indigo-500/30 text-center mt-8">
                <i className="fa-solid fa-earth-africa text-4xl mb-4 text-indigo-400"></i>
                <h4 className="font-black text-sm uppercase">Global Nodes</h4>
              </div>
              <div className="aspect-square bg-sky-600/20 rounded-3xl flex flex-col items-center justify-center p-6 border border-sky-500/30 text-center -mt-8">
                <i className="fa-solid fa-shield-virus text-4xl mb-4 text-sky-400"></i>
                <h4 className="font-black text-sm uppercase">Bank-Grade Security</h4>
              </div>
              <div className="aspect-square bg-purple-600/20 rounded-3xl flex flex-col items-center justify-center p-6 border border-purple-500/30 text-center">
                <i className="fa-solid fa-money-bill-trend-up text-4xl mb-4 text-purple-400"></i>
                <h4 className="font-black text-sm uppercase">Daily USD Yields</h4>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-950/80 to-blue-950/40 border-t border-white/5">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-4">The Process</h2>
          <h3 className="text-4xl font-black mb-16">Four Steps to Financial Freedom</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="group space-y-4">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto group-hover:bg-blue-600 transition-colors duration-300">1</div>
              <h4 className="text-xl font-bold">Register</h4>
              <p className="text-sm text-gray-400">Create your secure SmartMine account in seconds with just an email.</p>
            </div>
            <div className="group space-y-4">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto group-hover:bg-blue-600 transition-colors duration-300">2</div>
              <h4 className="text-xl font-bold">Deposit</h4>
              <p className="text-sm text-gray-400">Add funds using USDT or USDC to activate your mining power.</p>
            </div>
            <div className="group space-y-4">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto group-hover:bg-blue-600 transition-colors duration-300">3</div>
              <h4 className="text-xl font-bold">Mine</h4>
              <p className="text-sm text-gray-400">Choose a VIP tier and watch our automated farm generate daily returns.</p>
            </div>
            <div className="group space-y-4">
              <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-2xl font-black mx-auto group-hover:bg-blue-600 transition-colors duration-300">4</div>
              <h4 className="text-xl font-bold">Withdraw</h4>
              <p className="text-sm text-gray-500">Claim your profits directly to your external wallet with zero delays.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Features Banner */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="space-y-3">
            <i className="fa-solid fa-certificate text-3xl text-yellow-500 mb-4"></i>
            <h3 className="font-black text-lg uppercase">Licensed & Registered</h3>
            <p className="text-sm text-gray-400">We operate under full compliance with global computational finance standards.</p>
          </div>
          <div className="space-y-3">
            <i className="fa-solid fa-microchip text-3xl text-green-500 mb-4"></i>
            <h3 className="font-black text-lg uppercase">Next-Gen Hardware</h3>
            <p className="text-sm text-gray-400">Our farms utilize the latest S21 & KS5 Antminers for maximum efficiency.</p>
          </div>
          <div className="space-y-3">
            <i className="fa-solid fa-headset text-3xl text-purple-500 mb-4"></i>
            <h3 className="font-black text-lg uppercase">Premium Support</h3>
            <p className="text-sm text-gray-400">Dedicated account managers available 24/7 via Telegram and live chat.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-20 px-6 bg-blue-900/20 backdrop-blur-3xl border-t border-white/5 text-center">
        <div className="max-w-4xl mx-auto space-y-10">
          <h2 className="text-4xl font-black">Ready to scale your earnings?</h2>
          <p className="text-gray-400">Join over a million users who trust SmartMine for their daily passive income. Start with as little as $25 and scale up to $500/day yields.</p>
          <button 
            onClick={() => navigate('/signup')}
            className="px-12 py-5 bg-white text-blue-900 font-black rounded-2xl hover:bg-blue-50 transition-all uppercase tracking-widest"
          >
            Create My Free Account
          </button>
          <div className="pt-10 flex justify-center space-x-10 text-gray-500 text-xs font-black uppercase tracking-widest">
            <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
            <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Audit Report</span>
          </div>
        </div>
      </footer>

      {/* Custom Styles */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Welcome;
