
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
        db.setCurrentUser(updatedUser);
      }
    }
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
    if (user.activeVipId && vip.id <= user.activeVipId) {
      setMessage({ type: 'error', text: 'You cannot downgrade or purchase the same VIP level.' });
      return;
    }
    if (user.walletBalance < vip.price) {
      setMessage({ type: 'error', text: 'Insufficient balance to upgrade.' });
      return;
    }

    const confirm = window.confirm(`Confirm purchase of ${vip.name} for $${vip.price}? This will cancel your previous VIP.`);
    if (!confirm) return;

    const users = db.getUsers();
    const transactions = db.getTransactions();

    const updatedUsers = users.map(u => u.id === user.id ? { 
      ...u, 
      walletBalance: u.walletBalance - vip.price,
      activeVipId: vip.id,
      miningTimerStart: null // Reset mining on upgrade
    } : u);

    const newTransaction: Transaction = {
      id: `TX-${Date.now()}`,
      userId: user.id,
      amount: vip.price,
      type: TransactionType.VIP_PURCHASE,
      status: TransactionStatus.APPROVED,
      date: new Date().toISOString(),
      description: `Upgrade to ${vip.name}`
    };

    db.setUsers(updatedUsers);
    db.setTransactions([newTransaction, ...transactions]);
    refreshUserData();
    setMessage({ type: 'success', text: `Successfully upgraded to ${vip.name}!` });
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

    // We don't deduct balance until admin approval
    db.setTransactions([newTx, ...transactions]);
    setMessage({ type: 'success', text: 'Withdrawal request submitted. Your balance will be deducted once approved.' });
    setWithdrawAmount('');
    setActiveTab('overview');
  };

  if (!user) return <div>Loading...</div>;

  const currentVIP = VIP_LEVELS.find(v => v.id === user.activeVipId);
  const userTransactions = db.getTransactions().filter(t => t.userId === user.id);

  return (
    <div className="space-y-6">
      {/* User Stats Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <i className="fa-solid fa-wallet text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase">Balance</p>
            <p className="text-2xl font-bold text-gray-800">${user.walletBalance.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-purple-100 p-3 rounded-xl text-purple-600">
            <i className="fa-solid fa-crown text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase">Active VIP</p>
            <p className="text-2xl font-bold text-gray-800">{currentVIP ? currentVIP.name : 'NONE'}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-green-100 p-3 rounded-xl text-green-600">
            <i className="fa-solid fa-chart-line text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase">Daily Income</p>
            <p className="text-2xl font-bold text-gray-800">${currentVIP ? currentVIP.dailyReturn.toFixed(2) : '0.00'}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="bg-orange-100 p-3 rounded-xl text-orange-600">
            <i className="fa-solid fa-hourglass-half text-xl"></i>
          </div>
          <div>
            <p className="text-gray-500 text-xs font-medium uppercase">Mining Timer</p>
            <p className="text-2xl font-bold text-gray-800 font-mono">{timeLeft}</p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center justify-between ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          <div className="flex items-center">
            <i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} mr-3`}></i>
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {(['overview', 'vip', 'deposit', 'withdraw', 'history'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-4 text-sm font-semibold transition-colors border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-gray-500 border-transparent hover:text-gray-700'}`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Mining Terminal</h3>
                    <p className="text-blue-100 opacity-80 max-w-md">
                      SmartMine protocols are ready. Claim your daily USD returns or start a new cycle. 
                      Only one active mining session is permitted per account.
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 min-w-[200px]">
                    <span className="text-xs font-bold uppercase tracking-wider mb-2 text-blue-200">Session Progress</span>
                    <span className="text-4xl font-mono font-bold mb-4">{timeLeft}</span>
                    {!user.miningTimerStart ? (
                      <button 
                        onClick={handleStartMining}
                        className="w-full py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg"
                      >
                        Start Mining
                      </button>
                    ) : isMiningComplete ? (
                      <button 
                        onClick={handleClaimMining}
                        className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600 transition-all shadow-lg animate-pulse"
                      >
                        Claim Earnings
                      </button>
                    ) : (
                      <div className="w-full py-3 bg-white/20 text-white font-bold rounded-xl flex items-center justify-center cursor-not-allowed">
                        <i className="fa-solid fa-spinner fa-spin mr-2"></i> Mining...
                      </div>
                    )}
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                    <i className="fa-solid fa-circle-info text-blue-500 mr-2"></i> Recent Activity
                  </h4>
                  <div className="space-y-3">
                    {userTransactions.slice(0, 3).map(tx => (
                      <div key={tx.id} className="bg-white p-3 rounded-xl shadow-xs flex justify-between items-center border border-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">{tx.type.replace('_', ' ')}</p>
                          <p className="text-xs text-gray-400">{new Date(tx.date).toLocaleDateString()}</p>
                        </div>
                        <span className={`text-sm font-bold ${tx.type === TransactionType.WITHDRAWAL || tx.type === TransactionType.VIP_PURCHASE ? 'text-red-500' : 'text-green-500'}`}>
                          {tx.type === TransactionType.WITHDRAWAL || tx.type === TransactionType.VIP_PURCHASE ? '-' : '+'}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                    {userTransactions.length === 0 && <p className="text-gray-400 text-center text-sm py-4">No recent activity found.</p>}
                  </div>
                </div>
                <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50/50">
                  <h4 className="font-bold text-gray-800 mb-4 flex items-center">
                    <i className="fa-solid fa-shield-check text-green-500 mr-2"></i> Security Status
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Account Verified</span>
                      <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-lg">Level 1</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Login Sessions</span>
                      <span className="text-xs text-gray-400">1 Active Session</span>
                    </div>
                    <button className="w-full py-2 bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                      Update Profile Settings
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vip' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIP_LEVELS.map(vip => (
                <div key={vip.id} className={`relative p-6 rounded-2xl border ${user.activeVipId === vip.id ? 'border-blue-600 bg-blue-50/20 ring-1 ring-blue-600' : 'border-gray-200 hover:border-blue-300 bg-white transition-all'}`}>
                  {user.activeVipId === vip.id && (
                    <div className="absolute top-4 right-4 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter">Current</div>
                  )}
                  <h4 className="text-xl font-extrabold text-gray-800 mb-1">{vip.name}</h4>
                  <p className="text-2xl font-black text-blue-600 mb-4">${vip.price.toFixed(0)}</p>
                  
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-center text-sm text-gray-600">
                      <i className="fa-solid fa-check text-green-500 mr-2 text-xs"></i> 
                      Daily Return: <span className="font-bold text-gray-800 ml-1">${vip.dailyReturn.toFixed(2)}</span>
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <i className="fa-solid fa-check text-green-500 mr-2 text-xs"></i> 
                      Monthly Estimate: <span className="font-bold text-gray-800 ml-1">${(vip.dailyReturn * 30).toFixed(2)}</span>
                    </li>
                    <li className="flex items-center text-sm text-gray-600">
                      <i className="fa-solid fa-check text-green-500 mr-2 text-xs"></i> 
                      Withdrawal Access
                    </li>
                  </ul>

                  <button 
                    disabled={user.activeVipId ? vip.id <= user.activeVipId : false}
                    onClick={() => handlePurchaseVIP(vip)}
                    className={`w-full py-3 rounded-xl font-bold transition-all ${
                      user.activeVipId === vip.id 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : user.activeVipId && vip.id < user.activeVipId
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100'
                    }`}
                  >
                    {user.activeVipId === vip.id ? 'Active' : user.activeVipId && vip.id < user.activeVipId ? 'Locked' : 'Purchase Upgrade'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="max-w-xl mx-auto space-y-8">
              <div className="bg-blue-600 rounded-2xl p-6 text-white text-center">
                <p className="text-sm opacity-80 mb-1">Send your deposit to the address below</p>
                <h4 className="text-lg font-bold">SmartMine USD Funding Wallet</h4>
                <div className="mt-4 bg-white/10 p-4 rounded-xl font-mono break-all text-xs border border-white/20 select-all cursor-pointer" onClick={() => {
                  navigator.clipboard.writeText('TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n');
                  alert('Address copied to clipboard!');
                }}>
                  TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n (TRC-20)
                </div>
                <p className="text-[10px] mt-2 opacity-60">* Only USDT (TRC-20) or USD equivalents accepted.</p>
              </div>

              <form onSubmit={handleDeposit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                  <input 
                    type="number" 
                    required
                    min="1"
                    placeholder="Enter amount to deposit"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Confirmation (Optional)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 transition-colors bg-gray-50">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl text-gray-300 mb-2"></i>
                    <p className="text-xs text-gray-500">Click to upload payment receipt or screenshot</p>
                    <input type="file" className="hidden" />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                >
                  I Have Paid
                </button>
              </form>
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="bg-gray-100 rounded-2xl p-6 border border-gray-200 flex justify-between items-center">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Withdrawable Balance</p>
                  <p className="text-3xl font-black text-gray-800">${user.walletBalance.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Min: ${MIN_WITHDRAWAL}</p>
                  <p className="text-[10px] text-gray-400">Fee: 0.00%</p>
                </div>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (USD)</label>
                  <input 
                    type="number" 
                    required
                    min={MIN_WITHDRAWAL}
                    max={user.walletBalance}
                    placeholder={`Min: $${MIN_WITHDRAWAL}`}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Withdrawal Method (Wallet/Email)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Enter your USDT TRC-20 Address"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                    value={withdrawMethod}
                    onChange={(e) => setWithdrawMethod(e.target.value)}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                >
                  Submit Withdrawal Request
                </button>
              </form>

              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <i className="fa-solid fa-triangle-exclamation mr-2"></i>
                  Withdrawals are processed manually by our admin team within 12-24 hours. Your balance will be updated once approved.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {userTransactions.map(tx => (
                    <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-4 text-gray-500">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 font-semibold text-gray-700">{tx.type.replace('_', ' ')}</td>
                      <td className="px-4 py-4 font-bold text-gray-800">${tx.amount.toFixed(2)}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                          tx.status === TransactionStatus.APPROVED ? 'bg-green-100 text-green-700' :
                          tx.status === TransactionStatus.REJECTED ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {userTransactions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-400">No transactions yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
