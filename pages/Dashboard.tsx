
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../services/db';
import { User, VIPLevel, TransactionType, TransactionStatus, Transaction, ChatMessage } from '../types';
import { VIP_LEVELS, MINING_CYCLE_HOURS, MIN_WITHDRAWAL } from '../constants';

const Dashboard: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [isMiningComplete, setIsMiningComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vip' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Broadcast & Config State
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(db.getBroadcastMessage());
  const [isBroadcastDismissed, setIsBroadcastDismissed] = useState(false);
  const [depositConfig, setDepositConfig] = useState(db.getDepositConfig());

  // VIP Purchase Modal State
  const [showVipModal, setShowVipModal] = useState(false);
  const [pendingVip, setPendingVip] = useState<VIPLevel | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fix: Added currentVIP to derive the active VIP details from the user's state
  const currentVIP = VIP_LEVELS.find(v => v.id === user?.activeVipId);

  const refreshData = useCallback(() => {
    const currentUser = db.getCurrentUser();
    if (currentUser) {
      const users = db.getUsers();
      const updatedUser = users.find(u => u.id === currentUser.id);
      if (updatedUser) {
        setUser(updatedUser);
        db.setCurrentUser(updatedUser);
      }
      setChatMessages(db.getChats(currentUser.id));
    }
    setBroadcastMsg(db.getBroadcastMessage());
    setDepositConfig(db.getDepositConfig());
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 3000); // Faster polling for chat
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim()) return;

    const newMessage: ChatMessage = {
      id: `MSG-${Date.now()}`,
      senderId: user.id,
      senderName: user.username,
      text: chatInput,
      timestamp: new Date().toISOString(),
      isAdmin: false
    };

    db.addChatMessage(user.id, newMessage);
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
  };

  const handleStartMining = () => {
    if (!user?.activeVipId) {
      setMessage({ type: 'error', text: 'You need an active VIP level to start mining.' });
      return;
    }
    const users = db.getUsers();
    const updatedUsers = users.map(u => u.id === user.id ? { ...u, miningTimerStart: new Date().toISOString() } : u);
    db.setUsers(updatedUsers);
    refreshData();
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
      date: new Date().toISOString(),
      description: `Daily mining yield (${vip.name})`
    };

    const updatedUsers = users.map(u => u.id === user.id ? { 
      ...u, 
      walletBalance: u.walletBalance + vip.dailyReturn,
      miningTimerStart: null 
    } : u);

    db.setUsers(updatedUsers);
    db.setTransactions([newTransaction, ...transactions]);
    refreshData();
    setIsMiningComplete(false);
    setMessage({ type: 'success', text: `Claimed $${vip.dailyReturn.toFixed(2)} from mining!` });
  };

  const handlePurchaseVIP = (vip: VIPLevel) => {
    if (!user) return;
    if (user.activeVipId && vip.id <= user.activeVipId) {
      setMessage({ type: 'error', text: 'You cannot downgrade or purchase your current tier.' });
      return;
    }
    if (user.walletBalance < vip.price) {
      setMessage({ type: 'error', text: 'Insufficient balance to upgrade.' });
      return;
    }
    setPendingVip(vip);
    setShowVipModal(true);
  };

  const confirmPurchase = () => {
    if (!user || !pendingVip) return;
    const allUsers = db.getUsers();
    const transactions = db.getTransactions();
    const updatedUsers = allUsers.map(u => u.id === user.id ? { 
      ...u, 
      walletBalance: u.walletBalance - pendingVip.price,
      activeVipId: pendingVip.id,
      miningTimerStart: null 
    } : u);

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      userId: user.id,
      amount: pendingVip.price,
      type: TransactionType.VIP_PURCHASE,
      status: TransactionStatus.APPROVED,
      date: new Date().toISOString(),
      description: `Purchased ${pendingVip.name} license`
    };

    db.setUsers(updatedUsers);
    db.setTransactions([newTransaction, ...transactions]);
    refreshData();
    setShowVipModal(false);
    setPendingVip(null);
    setMessage({ type: 'success', text: `Successfully upgraded to ${pendingVip.name}!` });
  };

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !depositAmount || parseFloat(depositAmount) <= 0) return;
    const transactions = db.getTransactions();
    const currentToken = depositConfig.tokens[selectedTokenIndex];
    const newTx: Transaction = {
      id: `DEP-${Date.now()}`,
      userId: user.id,
      amount: parseFloat(depositAmount),
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      date: new Date().toISOString(),
      method: currentToken ? currentToken.name : 'Direct Transfer',
      description: 'Pending wallet deposit'
    };
    db.setTransactions([newTx, ...transactions]);
    setMessage({ type: 'success', text: 'Deposit request submitted. Awaiting network confirmation.' });
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
      description: 'User withdrawal request'
    };
    db.setTransactions([newTx, ...transactions]);
    setMessage({ type: 'success', text: 'Withdrawal request submitted for review.' });
    setWithdrawAmount('');
    setActiveTab('overview');
  };

  const userTransactions = db.getTransactions().filter(t => t.userId === user?.id);

  return (
    <div className="space-y-6 relative pb-20">
      {/* Global Broadcast Banner */}
      {broadcastMsg && !isBroadcastDismissed && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start shadow-sm transition-all">
          <div className="bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-400 p-2 rounded-xl mr-4 shrink-0">
            <i className="fa-solid fa-bullhorn"></i>
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-1">Official Announcement</h4>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 leading-relaxed">{broadcastMsg}</p>
          </div>
          <button onClick={() => setIsBroadcastDismissed(true)} className="text-amber-500 hover:text-amber-700 p-1"><i className="fa-solid fa-xmark"></i></button>
        </div>
      )}

      {/* User Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-3 rounded-xl text-blue-600 dark:text-blue-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-wallet text-lg md:text-xl"></i></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Balance</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">${user?.walletBalance.toFixed(2)}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 md:p-3 rounded-xl text-purple-600 dark:text-purple-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-crown text-lg md:text-xl"></i></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Active VIP</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">{currentVIP ? currentVIP.name : 'NONE'}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 md:p-3 rounded-xl text-green-600 dark:text-green-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-chart-line text-lg md:text-xl"></i></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Daily Return</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">${currentVIP ? currentVIP.dailyReturn.toFixed(2) : '0.00'}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 md:p-3 rounded-xl text-orange-600 dark:text-orange-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-hourglass-half text-lg md:text-xl"></i></div>
          <div><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Mining Timer</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white font-mono">{timeLeft}</p></div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'}`}>
          <div className="flex items-center"><i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} mr-3`}></i><span className="text-sm font-semibold">{message.text}</span></div>
          <button onClick={() => setMessage(null)} className="p-1">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide bg-gray-50/50 dark:bg-gray-800/20 transition-colors">
          {(['overview', 'vip', 'deposit', 'withdraw', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-white dark:bg-gray-900' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-md"><h3 className="text-3xl font-black mb-3">Mining Terminal</h3><p className="text-blue-100/80 leading-relaxed text-sm md:text-base">Access automated mining cycles. Upgrade VIP for higher hash rates.</p></div>
                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 min-w-[240px] shadow-2xl">
                    <span className="text-xs font-black uppercase tracking-[0.2em] mb-3 text-blue-200">Current Progress</span>
                    <span className="text-5xl font-mono font-black mb-6 drop-shadow-md">{timeLeft}</span>
                    {!user?.miningTimerStart ? <button onClick={handleStartMining} className="w-full py-4 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-95">Start New Cycle</button> : isMiningComplete ? <button onClick={handleClaimMining} className="w-full py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-all shadow-lg animate-pulse active:scale-95">Claim ${currentVIP?.dailyReturn.toFixed(2)}</button> : <div className="w-full py-4 bg-white/20 text-white font-black rounded-2xl flex items-center justify-center cursor-wait backdrop-blur-sm"><i className="fa-solid fa-gear fa-spin mr-3"></i> Mining...</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vip' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIP_LEVELS.map(vip => {
                const isActive = user?.activeVipId === vip.id;
                const isLocked = user?.activeVipId && vip.id < user.activeVipId;
                return (
                  <div key={vip.id} className={`p-6 rounded-3xl border transition-all ${isActive ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-800'}`}>
                    <h4 className="text-xl font-black mb-2 uppercase">{vip.name}</h4>
                    <div className="text-2xl font-black text-blue-600 mb-6">${vip.price} <span className="text-xs font-normal text-gray-500">USD</span></div>
                    <ul className="space-y-2 mb-8 text-sm text-gray-600 dark:text-gray-400">
                      <li><i className="fa-solid fa-check text-green-500 mr-2"></i> Daily: ${vip.dailyReturn.toFixed(2)}</li>
                      <li><i className="fa-solid fa-check text-green-500 mr-2"></i> Monthly: ${(vip.dailyReturn * 30).toFixed(2)}</li>
                    </ul>
                    <button disabled={isActive || isLocked} onClick={() => handlePurchaseVIP(vip)} className={`w-full py-3 rounded-xl font-bold ${isActive ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'}`}>{isActive ? 'Current Plan' : 'Activate'}</button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-blue-600 rounded-3xl p-8 text-white text-center shadow-xl shadow-blue-500/20">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Select Payment Token</p>
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {depositConfig.tokens.map((token, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedTokenIndex(idx)}
                      className={`px-4 py-2 rounded-full text-xs font-black uppercase transition-all ${selectedTokenIndex === idx ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                    >
                      {token.name}
                    </button>
                  ))}
                </div>
                <h4 className="text-sm font-bold opacity-80 mb-2">Deposit Address ({depositConfig.tokens[selectedTokenIndex]?.name})</h4>
                <div className="bg-white/10 p-5 rounded-2xl font-mono text-xs break-all border border-white/20 select-all cursor-copy" onClick={() => {
                  navigator.clipboard.writeText(depositConfig.tokens[selectedTokenIndex]?.address || '');
                  alert('Address copied!');
                }}>
                  {depositConfig.tokens[selectedTokenIndex]?.address || 'No Address Set'}
                </div>
              </div>

              <form onSubmit={handleDeposit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount to Deposit (USD)</label>
                  <input type="number" required min="1" className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="0.00" />
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20">Confirm Payment Request</button>
              </form>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl text-center border border-gray-200 dark:border-gray-700">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Available Balance</p>
                <p className="text-4xl font-black text-gray-800 dark:text-white">${user?.walletBalance.toFixed(2)}</p>
              </div>
              <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Withdraw Amount (USD)</label>
                  <input type="number" required min={MIN_WITHDRAWAL} max={user?.walletBalance} className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} placeholder={`Min $${MIN_WITHDRAWAL}`} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Wallet Address (TRC-20)</label>
                  <input type="text" required className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-mono" value={withdrawMethod} onChange={(e) => setWithdrawMethod(e.target.value)} placeholder="T..." />
                </div>
                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl">Request Withdrawal</button>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {userTransactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => (
                    <tr key={tx.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-6 py-5 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="px-6 py-5 font-medium">{tx.description || 'System transaction'}</td>
                      <td className="px-6 py-5 uppercase text-[10px] font-black text-gray-400">{tx.type.replace('_', ' ')}</td>
                      <td className="px-6 py-5 font-black text-gray-800 dark:text-gray-200">${tx.amount.toFixed(2)}</td>
                      <td className="px-6 py-5">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${tx.status === TransactionStatus.APPROVED ? 'bg-green-100 text-green-700' : tx.status === TransactionStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{tx.status}</span>
                      </td>
                    </tr>
                  ))}
                  {userTransactions.length === 0 && <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">No transactions found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Floating Support Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setShowChat(!showChat)}
          className="w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center text-2xl hover:scale-110 transition-transform active:scale-95"
        >
          {showChat ? <i className="fa-solid fa-xmark"></i> : <i className="fa-solid fa-headset"></i>}
          {chatMessages.some(m => m.isAdmin && !m.text.includes('dismissed')) && !showChat && (
            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
          )}
        </button>
      </div>

      {/* Chat UI */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col z-[60] overflow-hidden h-[500px] animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-user-tie"></i></div>
              <div><h4 className="font-bold text-sm">Live Support</h4><p className="text-[10px] opacity-80">We usually reply instantly</p></div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/20">
            {chatMessages.length === 0 && (
              <div className="text-center py-10">
                <p className="text-xs text-gray-400 italic">Hello! How can we help you today? Send us a message and our team will get back to you shortly.</p>
              </div>
            )}
            {chatMessages.map(m => (
              <div key={m.id} className={`flex ${m.isAdmin ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.isAdmin ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 shadow-sm' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/10'}`}>
                  <p className="leading-relaxed">{m.text}</p>
                  <p className={`text-[9px] mt-1 opacity-60 ${m.isAdmin ? 'text-gray-400' : 'text-blue-100'}`}>{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef}></div>
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input 
              type="text" 
              className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white outline-none text-sm" 
              placeholder="Type your message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center"><i className="fa-solid fa-paper-plane"></i></button>
          </form>
        </div>
      )}

      {/* Upgrade Modal */}
      {showVipModal && pendingVip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mb-8"><i className="fa-solid fa-crown"></i></div>
              <h3 className="text-3xl font-black mb-4 uppercase">Upgrade Tier</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">Activate <span className="text-blue-600 font-black">{pendingVip.name}</span> for <span className="text-gray-900 dark:text-white font-black">${pendingVip.price}</span>. Existing mining cycles will reset.</p>
              <div className="flex gap-4 w-full">
                <button onClick={confirmPurchase} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95">Confirm</button>
                <button onClick={() => { setShowVipModal(false); setPendingVip(null); }} className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-600 rounded-2xl active:scale-95">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
