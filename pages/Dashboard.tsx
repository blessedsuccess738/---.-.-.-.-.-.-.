
import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../services/db';
import { User, VIPLevel, TransactionType, TransactionStatus, Transaction } from '../types';
import { VIP_LEVELS, MINING_CYCLE_HOURS, MIN_WITHDRAWAL } from '../constants';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [isMiningComplete, setIsMiningComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vip' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Broadcast State
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(db.getBroadcastMessage());
  const [isBroadcastDismissed, setIsBroadcastDismissed] = useState(false);

  // VIP Purchase Modal State
  const [showVipModal, setShowVipModal] = useState(false);
  const [pendingVip, setPendingVip] = useState<VIPLevel | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');

  const refreshUserData = useCallback(() => {
    const currentUser = db.getCurrentUser();
    if (currentUser) {
      const users = db.getUsers();
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser) {
        setUser(updatedUser);
        db.setCurrentUser(updatedUser); // Persist updated user back to session storage
      }
    }
    // Also update broadcast message in case it changed
    setBroadcastMsg(db.getBroadcastMessage());
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (user?.miningTimerStart) {
        const startTime = new Date(user.miningTimerStart).getTime();
        const now = new Date().getTime();
        const diff = now - startTime;
        const cycleMs = MINING_CYCLE_HOURS * 60 * 60 * 1000;
        
        if (diff >= cycleMs) {
          setTimeLeft('00:00:00');
          setIsMiningComplete(true);
        } else {
          const remaining = cycleMs - diff;
          const h = Math.floor(remaining / (1000 * 60 * 60));
          const m = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((remaining % (1000 * 60)) / 1000);
          setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          setIsMiningComplete(false);
        }
      } else {
        setTimeLeft('00:00:00');
        setIsMiningComplete(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [user?.miningTimerStart]);

  const handleStartMining = () => {
    if (!user?.activeVipId) {
      setMessage({ type: 'error', text: 'You need an active VIP level to start mining.' });
      return;
    }
    const users = db.getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, miningTimerStart: new Date().toISOString() } : u);
    db.setUsers(updatedUsers);
    refreshUserData();
    setMessage({ type: 'success', text: 'Mining started successfully!' });
  };

  const handleClaimMining = () => {
    if (!user || !user.activeVipId) return;
    const vip = VIP_LEVELS.find(v => v.id === user.activeVipId);
    if (!vip) return;

    const users = db.getUsers();
    const transactions = db.getTransactions();

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      userId: user.id,
      amount: vip.dailyReturn,
      type: TransactionType.MINING_EARNING,
      status: TransactionStatus.APPROVED,
      date: new Date().toISOString()
    };

    const updatedUsers = users.map(u => u.id === user.id ? { 
      ...u, 
      walletBalance: u.walletBalance + vip.dailyReturn,
      miningTimerStart: null 
    } : u);

    db.setUsers(updatedUsers);
    db.setTransactions([newTransaction, ...transactions]);
    refreshUserData();
    setIsMiningComplete(false);
    setMessage({ type: 'success', text: `Claimed $${vip.dailyReturn.toFixed(2)} from mining!` });
  };

  const handlePurchaseVIP = (vip: VIPLevel) => {
    if (!user) return;
    
    // Safety check for downgrades or repurchases
    if (user.activeVipId && vip.id <= user.activeVipId) {
      setMessage({ type: 'error', text: 'You cannot downgrade or purchase your current VIP tier.' });
      return;
    }
    
    // Balance check
    if (user.walletBalance < vip.price) {
      setMessage({ type: 'error', text: 'Insufficient balance. Please deposit funds to upgrade.' });
      return;
    }

    setPendingVip(vip);
    setShowVipModal(true);
  };

  const confirmPurchase = () => {
    if (!user || !pendingVip) return;

    const allUsers = db.getUsers();
    const transactions = db.getTransactions();

    // Immediate debit and VIP tier update
    const updatedUsers = allUsers.map(u => u.id === user.id ? { 
      ...u, 
      walletBalance: u.walletBalance - pendingVip.price,
      activeVipId: pendingVip.id,
      miningTimerStart: null // Cancel any running mining on upgrade as per requirements
    } : u);

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      userId: user.id,
      amount: pendingVip.price,
      type: TransactionType.VIP_PURCHASE,
      status: TransactionStatus.APPROVED,
      date: new Date().toISOString(),
      description: `Upgrade to ${pendingVip.name}`
    };

    // Save state to main DB and TX log
    db.setUsers(updatedUsers);
    db.setTransactions([newTransaction, ...transactions]);
    
    // Important: Force update local user state and current session storage
    const updatedUser = updatedUsers.find(u => u.id === user.id);
    if (updatedUser) {
        db.setCurrentUser(updatedUser);
        setUser(updatedUser);
    }
    
    setShowVipModal(false);
    setPendingVip(null);
    setMessage({ 
      type: 'success', 
      text: `Successfully upgraded to ${pendingVip.name}! $${pendingVip.price.toFixed(2)} has been debited from your balance.` 
    });
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositAmount || parseFloat(depositAmount) <= 0) return;

    const transactions = db.getTransactions();
    const newTx: Transaction = {
      id: `DEP-${Date.now()}`,
      userId: user.id,
      amount: parseFloat(depositAmount),
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      date: new Date().toISOString(),
      method: 'Manual Payment',
      description: 'Deposit request pending admin approval.'
    };

    db.setTransactions([newTx, ...transactions]);
    setMessage({ type: 'success', text: 'Deposit request submitted. Please wait for admin approval.' });
    setDepositAmount('');
    setActiveTab('overview');
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(withdrawAmount);
    if (!user || !amount || amount < MIN_WITHDRAWAL) {
      setMessage({ type: 'error', text: `Minimum withdrawal is $${MIN_WITHDRAWAL}` });
      return;
    }
    if (amount > user.walletBalance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }

    const transactions = db.getTransactions();
    const newTx: Transaction = {
      id: `WD-${Date.now()}`,
      userId: user.id,
      amount: amount,
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
      date: new Date().toISOString(),
      method: withdrawMethod || 'Generic',
    };

    db.setTransactions([newTx, ...transactions]);
    setMessage({ type: 'success', text: 'Withdrawal request submitted. Balance will be deducted after admin approval.' });
    setWithdrawAmount('');
    setActiveTab('overview');
  };

  if (!user) return <div>Loading...</div>;

  const currentVIP = VIP_LEVELS.find(v => v.id === user.activeVipId);
  const userTransactions = db.getTransactions().filter(t => t.userId === user.id);

  return (
    <div className="space-y-6">
      {/* Global Broadcast Banner */}
      {broadcastMsg && !isBroadcastDismissed && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-400 p-2 rounded-xl mr-4 shrink-0">
            <i className="fa-solid fa-bullhorn"></i>
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-1">Official Announcement</h4>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 leading-relaxed">{broadcastMsg}</p>
          </div>
          <button 
            onClick={() => setIsBroadcastDismissed(true)}
            className="text-amber-500 hover:text-amber-700 dark:text-amber-600 dark:hover:text-amber-400 p-1"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* User Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-3 rounded-xl text-blue-600 dark:text-blue-400 w-fit mb-2 md:mb-0 transition-colors">
            <i className="fa-solid fa-wallet text-lg md:text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Balance</p>
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">${user.walletBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 md:p-3 rounded-xl text-purple-600 dark:text-purple-400 w-fit mb-2 md:mb-0 transition-colors">
            <i className="fa-solid fa-crown text-lg md:text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Active VIP</p>
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">{currentVIP ? currentVIP.name : 'NONE'}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 md:p-3 rounded-xl text-green-600 dark:text-green-400 w-fit mb-2 md:mb-0 transition-colors">
            <i className="fa-solid fa-chart-line text-lg md:text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Daily Return</p>
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">${currentVIP ? currentVIP.dailyReturn.toFixed(2) : '0.00'}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 md:p-3 rounded-xl text-orange-600 dark:text-orange-400 w-fit mb-2 md:mb-0 transition-colors">
            <i className="fa-solid fa-hourglass-half text-lg md:text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Mining Timer</p>
            <p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white font-mono transition-colors">{timeLeft}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'}`}>
          <div className="flex items-center">
            <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} mr-3`}></i>
            <span className="text-sm font-semibold">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-current opacity-60 hover:opacity-100 p-1">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide bg-gray-50/50 dark:bg-gray-800/20 transition-colors">
          {(['overview', 'vip', 'deposit', 'withdraw', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-white dark:bg-gray-900' : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-200'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-md">
                    <h3 className="text-3xl font-black mb-3">Mining Terminal</h3>
                    <p className="text-blue-100/80 leading-relaxed text-sm md:text-base">
                      Access high-frequency automated mining cycles. 
                      Upgrade your VIP level to unlock higher hash rates and maximize your daily USD returns.
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 min-w-[240px] shadow-2xl">
                    <span className="text-xs font-black uppercase tracking-[0.2em] mb-3 text-blue-200">Current Progress</span>
                    <span className="text-5xl font-mono font-black mb-6 drop-shadow-md">{timeLeft}</span>
                    {!user.miningTimerStart ? (
                      <button 
                        onClick={handleStartMining}
                        className="w-full py-4 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-95"
                      >
                        Start New Cycle
                      </button>
                    ) : isMiningComplete ? (
                      <button 
                        onClick={handleClaimMining}
                        className="w-full py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-all shadow-lg animate-pulse active:scale-95"
                      >
                        Claim ${currentVIP?.dailyReturn.toFixed(2)}
                      </button>
                    ) : (
                      <div className="w-full py-4 bg-white/20 text-white font-black rounded-2xl flex items-center justify-center cursor-wait backdrop-blur-sm">
                        <i className="fa-solid fa-gear fa-spin mr-3"></i> Mining...
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute -right-24 -bottom-24 w-80 h-80 bg-white/10 rounded-full blur-[80px]"></div>
                <div className="absolute -left-12 -top-12 w-48 h-48 bg-indigo-400/20 rounded-full blur-[60px]"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 bg-gray-50/50 dark:bg-gray-800/30 transition-colors">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center transition-colors">
                    <i className="fa-solid fa-bolt text-yellow-500 mr-2"></i> Recent Earnings
                  </h4>
                  <div className="space-y-3">
                    {userTransactions.filter(t => t.type === TransactionType.MINING_EARNING).slice(0, 3).map(tx => (
                      <div key={tx.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex justify-between items-center border border-gray-50 dark:border-gray-700/50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 text-xs transition-colors">
                            <i className="fa-solid fa-plus"></i>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700 dark:text-gray-200">Mining Reward</p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(tx.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-sm font-black text-green-500">+${tx.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {userTransactions.filter(t => t.type === TransactionType.MINING_EARNING).length === 0 && <p className="text-gray-400 dark:text-gray-500 text-center text-sm py-6 italic">No earnings history found.</p>}
                  </div>
                </div>
                <div className="border border-gray-100 dark:border-gray-800 rounded-2xl p-6 bg-gray-50/50 dark:bg-gray-800/30 transition-colors">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center transition-colors">
                    <i className="fa-solid fa-shield-halved text-blue-500 mr-2"></i> Platform Security
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-50 dark:border-gray-700/50 transition-colors">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Account Standing</span>
                      <span className="text-[10px] font-black px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 rounded-lg uppercase tracking-wider">Excellent</span>
                    </div>
                    <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-50 dark:border-gray-700/50 transition-colors">
                      <span className="text-sm text-gray-600 dark:text-gray-400">IP Protection</span>
                      <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 rounded-lg uppercase tracking-wider">Active</span>
                    </div>
                    <button className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                      Configure 2FA Security
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vip' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIP_LEVELS.map(vip => {
                const isActive = user.activeVipId === vip.id;
                const isLocked = user.activeVipId && vip.id < user.activeVipId;
                
                return (
                  <div key={vip.id} className={`relative p-8 rounded-3xl border transition-all duration-300 ${isActive ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10 ring-2 ring-blue-600 dark:ring-blue-500' : 'border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-900 shadow-sm'}`}>
                    {isActive && (
                      <div className="absolute top-6 right-6 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Active</div>
                    )}
                    <h4 className="text-xl font-black text-gray-800 dark:text-white mb-1 uppercase tracking-tight transition-colors">{vip.name}</h4>
                    <div className="flex items-baseline space-x-1 mb-6">
                      <span className="text-3xl font-black text-blue-600 dark:text-blue-400 transition-colors">${vip.price.toFixed(0)}</span>
                      <span className="text-xs text-gray-400 font-medium transition-colors">USD One-time</span>
                    </div>
                    
                    <ul className="space-y-4 mb-8">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3 text-[10px] transition-colors">
                          <i className="fa-solid fa-check"></i>
                        </div>
                        Daily Return: <span className="font-bold text-gray-800 dark:text-gray-200 ml-1 transition-colors">${vip.dailyReturn.toFixed(2)}</span>
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3 text-[10px] transition-colors">
                          <i className="fa-solid fa-check"></i>
                        </div>
                        Monthly: <span className="font-bold text-gray-800 dark:text-gray-200 ml-1 transition-colors">${(vip.dailyReturn * 30).toFixed(2)}</span>
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-400 transition-colors">
                        <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 mr-3 text-[10px] transition-colors">
                          <i className="fa-solid fa-check"></i>
                        </div>
                        Full Withdrawal Support
                      </li>
                    </ul>

                    <button 
                      disabled={isActive || isLocked}
                      onClick={() => handlePurchaseVIP(vip)}
                      className={`w-full py-4 rounded-2xl font-black transition-all shadow-md active:scale-95 ${
                        isActive 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : isLocked
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
                        : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 shadow-blue-500/20 transition-all'
                      }`}
                    >
                      {isActive ? 'Current Plan' : isLocked ? 'Locked (Higher Tier Required)' : 'Activate Now'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-blue-600 dark:bg-blue-700 rounded-3xl p-8 text-white text-center shadow-xl shadow-blue-500/20 transition-colors">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2 transition-colors">Funding Address (TRC-20)</p>
                <h4 className="text-xl font-black mb-6 transition-colors">SmartMine USD Vault</h4>
                <div className="bg-white/10 p-5 rounded-2xl font-mono break-all text-xs border border-white/20 select-all cursor-copy hover:bg-white/20 transition-all flex items-center justify-center" onClick={() => {
                  navigator.clipboard.writeText('TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n');
                  alert('Address copied to clipboard!');
                }}>
                  <span className="flex-1 transition-colors">TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n</span>
                  <i className="fa-regular fa-copy ml-3 opacity-60 transition-colors"></i>
                </div>
                <p className="text-[10px] mt-4 font-medium italic opacity-70 transition-colors">Deposits typically arrive within 5-15 minutes after network confirmation.</p>
              </div>

              <form onSubmit={handleDeposit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors">Amount to Deposit (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400 transition-colors">$</span>
                    <input 
                      type="number" 
                      required
                      min="1"
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors">Payment Receipt</label>
                  <label className="border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-10 text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-all bg-gray-50/50 dark:bg-gray-900/50 flex flex-col items-center transition-colors">
                    <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-400 mb-3 shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
                      <i className="fa-solid fa-cloud-arrow-up text-xl"></i>
                    </div>
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-400 transition-colors">Click to upload screenshot</p>
                    <p className="text-[10px] text-gray-400 mt-1 transition-colors">PNG, JPG or PDF up to 10MB</p>
                    <input type="file" className="hidden" />
                  </label>
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                >
                  Confirm Payment
                </button>
              </form>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-gray-100 dark:bg-gray-800/50 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-6 transition-colors">
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-black tracking-[0.2em] mb-1 transition-colors">Available for Payout</p>
                  <p className="text-4xl font-black text-gray-800 dark:text-white transition-colors">${user.walletBalance.toFixed(2)}</p>
                </div>
                <div className="text-center md:text-right space-y-1">
                  <div className="text-[10px] font-bold px-3 py-1 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-colors">Min: ${MIN_WITHDRAWAL}</div>
                  <div className="text-[10px] font-bold px-3 py-1 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 transition-colors">Processing Fee: 0%</div>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors">Withdraw Amount (USD)</label>
                  <input 
                    type="number" 
                    required
                    min={MIN_WITHDRAWAL}
                    max={user.walletBalance}
                    placeholder={`Enter amount (Min $${MIN_WITHDRAWAL})`}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 transition-colors">USDT Wallet Address (TRC-20)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your valid network address"
                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-mono font-medium"
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  Initiate Withdrawal
                </button>
              </form>

              <div className="bg-orange-50 dark:bg-orange-900/10 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex items-start transition-colors">
                <i className="fa-solid fa-circle-info text-orange-500 mt-1 mr-3 transition-colors"></i>
                <p className="text-xs text-orange-800 dark:text-orange-300 leading-relaxed font-medium transition-colors">
                  Withdrawals are audited manually to ensure platform stability. Funds usually arrive within 2-24 hours. Please verify your address carefully before submission.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto -mx-4 md:mx-0 transition-colors">
              <table className="w-full text-left min-w-[600px] transition-colors">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest transition-colors">
                    <th className="px-6 py-4">Transaction Date</th>
                    <th className="px-6 py-4">Type / Event</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Ref Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm transition-colors">
                  {userTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                    <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors">
                      <td className="px-6 py-5 text-gray-500 dark:text-gray-400 font-medium transition-colors">
                        {new Date(tx.date).toLocaleDateString()}
                        <div className="text-[10px] opacity-60 font-mono uppercase transition-colors">{new Date(tx.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </td>
                      <td className="px-6 py-5 transition-colors">
                        <p className="font-black text-gray-800 dark:text-gray-200 uppercase text-xs tracking-tight transition-colors">{tx.type.replace('_', ' ')}</p>
                        <p className="text-[10px] text-gray-400 font-mono transition-colors">{tx.id}</p>
                      </td>
                      <td className="px-6 py-5 transition-colors">
                        <span className={`text-sm font-black transition-colors ${
                          tx.type === TransactionType.WITHDRAWAL || tx.type === TransactionType.VIP_PURCHASE ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {tx.type === TransactionType.WITHDRAWAL || tx.type === TransactionType.VIP_PURCHASE ? '-' : '+'}${tx.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-5 transition-colors">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors ${
                          tx.status === TransactionStatus.APPROVED ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          tx.status === TransactionStatus.REJECTED ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {userTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-20 text-center text-gray-400 dark:text-gray-600 font-bold italic transition-colors">
                        No activity detected in your account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* VIP Purchase Confirmation Modal */}
      {showVipModal && pendingVip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 md:p-12 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800 animate-in zoom-in duration-300 transition-colors">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-3xl flex items-center justify-center text-3xl mb-8 shadow-inner transition-colors">
                <i className="fa-solid fa-crown transition-colors"></i>
              </div>
              
              <h3 className="text-3xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tight transition-colors">Upgrade Confirmation</h3>
              
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium transition-colors">
                You are about to activate <span className="text-blue-600 dark:text-blue-400 font-black">{pendingVip.name}</span>. 
                This will debit <span className="text-gray-900 dark:text-white font-black transition-colors">${pendingVip.price.toFixed(2)}</span> from your wallet balance immediately. 
                Existing mining cycles will be reset.
              </p>

              <div className="grid grid-cols-2 gap-4 w-full bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 mb-10 transition-colors">
                <div className="text-left border-r border-gray-200 dark:border-gray-700 pr-4 transition-colors">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 transition-colors">Price</p>
                  <p className="text-2xl font-black text-gray-900 dark:text-white transition-colors">${pendingVip.price.toFixed(0)}</p>
                </div>
                <div className="text-left pl-4 transition-colors">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1 transition-colors">Return</p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400 transition-colors">${pendingVip.dailyReturn.toFixed(2)}/day</p>
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <button 
                  onClick={confirmPurchase}
                  className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 uppercase tracking-widest text-xs transition-all"
                >
                  Confirm Purchase
                </button>
                <button 
                  onClick={() => { setShowVipModal(false); setPendingVip(null); }}
                  className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 uppercase tracking-widest text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
