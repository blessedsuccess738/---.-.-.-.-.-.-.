
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // Supabase automatically handles the verification session if the link is valid.
    // We just wait a moment to ensure the session is picked up.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setVerifying(false);
      } else {
        // If no session is found immediately, we wait a bit or let them try login
        setTimeout(() => setVerifying(false), 2000);
      }
    };
    checkSession();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md w-full p-10 rounded-[3rem] shadow-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-center animate-in fade-in zoom-in duration-500">
        {verifying ? (
          <div className="space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
            <h2 className="text-2xl font-black uppercase tracking-tight dark:text-white">Verifying Account...</h2>
            <p className="text-gray-500 text-sm">Synchronizing with our secure mining nodes.</p>
          </div>
        ) : (
          <>
            <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] flex items-center justify-center text-5xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 shadow-xl shadow-green-500/10">
              <i className="fa-solid fa-circle-check"></i>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight dark:text-white mb-4">Email Verified!</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-10 leading-relaxed font-medium">
              Your security check is complete. You are now authorized to access the SmartMine terminal and start your daily mining cycles.
            </p>
            <div className="space-y-4">
              <Link to="/login" className="block w-full py-5 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all text-lg">
                Enter Dashboard
              </Link>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Authorized Access Only
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
