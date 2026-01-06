
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, Transaction, TransactionStatus, TransactionType, UserRole } from '../types';
import { VIP_LEVELS, ADMIN_CONFIG } from '../constants';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [activeView, setActiveView] = useState<'users' | 'deposits' | 'withdrawals' | 'broadcast'>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [broadcastInput, setBroadcastInput] = useState<string>(db.getBroadcastMessage() || '');

  const refreshData = () => {
    setUsers(db.getUsers());
    setTransactions(db.getTransactions());
  };

  const handleApproveTransaction = (tx: Transaction) => {
    const allUsers = db.getUsers();
    const allTxs = db.getTransactions();
    const targetUser = allUsers.find(u => u.id === tx.userId);

    if (!targetUser) return;

    let updatedUser = { ...targetUser };
    if (tx.type === TransactionType.DEPOSIT) {
      updatedUser.walletBalance += tx.amount;
    } else if (tx.type === TransactionType.WITHDRAWAL) {
      if (updatedUser.walletBalance < tx.amount) {
        alert('User has insufficient balance to approve this withdrawal!');
        return;
      }
      updatedUser.walletBalance -= tx.amount;
    }

    const updatedUsers = allUsers.map(u => u.id === updatedUser.id ? updatedUser : u);
    const updatedTxs = allTxs.map(t => t.id === tx.id ? { ...t, status: TransactionStatus.APPROVED } : t);

    db.setUsers(updatedUsers);
    db.setTransactions(updatedTxs);
    refreshData();
  };

  const handleRejectTransaction = (tx: Transaction) => {
    const allTxs = db.getTransactions();
    const updatedTxs = allTxs.map(t => t.id === tx.id ? { ...t, status: TransactionStatus.REJECTED } : t);
    db.setTransactions(updatedTxs);
    refreshData();
  };

  const handleUpdateBalance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editBalance) return;
    
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => u.id === editingUser.id ? { ...u, walletBalance: parseFloat(editBalance) } : u);
    
    db.setUsers(updatedUsers);
    refreshData();
    setEditingUser(null);
    setEditBalance('');
  };

  const handleToggleBan = (user: User) => {
    if (user.role === UserRole.ADMIN) return;
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, isBanned: !u.isBanned } : u);
    db.setUsers(updatedUsers);
    refreshData();
  };

  const handleUpdateBroadcast = () => {
    db.setBroadcastMessage(broadcastInput.trim() || null);
    alert('Broadcast message updated successfully!');
  };

  const pendingDeposits = transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING);
  const pendingWithdrawals = transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.PENDING);

  const stats = {
    totalUsers: users.length,
    totalDeposits: transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.APPROVED).reduce((acc, curr) => acc + curr.amount, 0),
    totalWithdrawals: transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.APPROVED).reduce((acc, curr) => acc + curr.amount, 0),
    totalMiningPayouts: transactions.filter(t => t.type === TransactionType.MINING_EARNING).reduce((acc, curr) => acc + curr.amount, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Admin Control Panel</h2>
        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 px-5 py-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          Operator: {ADMIN_CONFIG.EMAIL}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Total Network Users</p>
          <p className="text-3xl font-black text-blue-600 dark:text-blue-400">{stats.totalUsers}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Total Net Deposits</p>
          <p className="text-3xl font-black text-green-600 dark:text-green-400">${stats.totalDeposits.toFixed(0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Total Withdrawals</p>
          <p className="text-3xl font-black text-orange-600 dark:text-orange-400">${stats.totalWithdrawals.toFixed(0)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-widest mb-1">Total Rewards Paid</p>
          <p className="text-3xl font-black text-purple-600 dark:text-purple-400">${stats.totalMiningPayouts.toFixed(0)}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button 
            onClick={() => setActiveView('users')}
            className={`px-8 py-5 text-sm font-black transition-all ${activeView === 'users' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500'}`}
          >
            User Management
          </button>
          <button 
            onClick={() => setActiveView('deposits')}
            className={`px-8 py-5 text-sm font-black transition-all ${activeView === 'deposits' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500'}`}
          >
            Deposits ({pendingDeposits.length})
          </button>
          <button 
            onClick={() => setActiveView('withdrawals')}
            className={`px-8 py-5 text-sm font-black transition-all ${activeView === 'withdrawals' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500'}`}
          >
            Withdrawals ({pendingWithdrawals.length})
          </button>
          <button 
            onClick={() => setActiveView('broadcast')}
            className={`px-8 py-5 text-sm font-black transition-all ${activeView === 'broadcast' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'text-gray-500'}`}
          >
            Broadcast
          </button>
        </div>

        <div className="p-4 md:p-8">
          {activeView === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800">
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Account Tier</th>
                    <th className="px-6 py-4">Balance</th>
                    <th className="px-6 py-4">Management Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/20">
                      <td className="px-6 py-5">
                        <div className="font-black text-gray-800 dark:text-gray-200">{u.username}</div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-tight">{u.email}</div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border border-blue-200 dark:border-blue-800">
                          {u.activeVipId ? `VIP ${u.activeVipId}` : 'No Tier'}
                        </span>
                      </td>
                      <td className="px-6 py-5 font-mono font-black text-gray-700 dark:text-gray-300">${u.walletBalance.toFixed(2)}</td>
                      <td className="px-6 py-5 flex items-center gap-3">
                        <button 
                          onClick={() => { setEditingUser(u); setEditBalance(u.walletBalance.toString()); }}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-black uppercase transition-all"
                        >
                          Modify Balance
                        </button>
                        <button 
                          onClick={() => handleToggleBan(u)}
                          disabled={u.role === UserRole.ADMIN}
                          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${u.role === UserRole.ADMIN ? 'opacity-0 cursor-default' : u.isBanned ? 'bg-red-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600'}`}
                        >
                          {u.isBanned ? 'Lift Ban' : 'Restrict'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'deposits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDeposits.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{tx.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(tx.date).toLocaleString()}</span>
                    </div>
                    <div className="text-3xl font-black text-gray-800 dark:text-white mb-2">${tx.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-6">User: {users.find(u => u.id === tx.userId)?.email}</div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleApproveTransaction(tx)}
                      className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-500/20 active:scale-95"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRejectTransaction(tx)}
                      className="flex-1 py-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/40 transition-all active:scale-95"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingDeposits.length === 0 && <p className="text-gray-400 dark:text-gray-600 text-center py-20 font-bold italic col-span-full">No deposit requests awaiting approval.</p>}
            </div>
          )}

          {activeView === 'withdrawals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingWithdrawals.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">{tx.id}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{new Date(tx.date).toLocaleString()}</span>
                    </div>
                    <div className="text-3xl font-black text-gray-800 dark:text-white mb-1">${tx.amount.toFixed(2)}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-4">User: {users.find(u => u.id === tx.userId)?.email}</div>
                    <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700 font-mono text-[10px] text-blue-600 dark:text-blue-400 mb-6 break-all">
                      {tx.method}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleApproveTransaction(tx)}
                      className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                      Process Payout
                    </button>
                    <button 
                      onClick={() => handleRejectTransaction(tx)}
                      className="flex-1 py-4 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-200 dark:hover:bg-red-900/40 transition-all active:scale-95"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              {pendingWithdrawals.length === 0 && <p className="text-gray-400 dark:text-gray-600 text-center py-20 font-bold italic col-span-full">No pending payout requests.</p>}
            </div>
          )}

          {activeView === 'broadcast' && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-2">Compose Global Broadcast</h4>
                <p className="text-xs text-blue-600/80 dark:text-blue-300/60 leading-relaxed mb-6">
                  Compose a message that will be displayed at the top of every user's dashboard. Use this to announce maintenance, new VIP tiers, or urgent platform updates.
                </p>
                <textarea 
                  className="w-full h-40 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 font-medium resize-none"
                  placeholder="Enter broadcast message here..."
                  value={broadcastInput}
                  onChange={(e) => setBroadcastInput(e.target.value)}
                ></textarea>
                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={handleUpdateBroadcast}
                    className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    Send Broadcast
                  </button>
                  <button 
                    onClick={() => { setBroadcastInput(''); db.setBroadcastMessage(null); alert('Broadcast cleared!'); }}
                    className="px-8 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                  >
                    Clear Global Message
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-10 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800">
            <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Adjust Credit</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-8 font-bold uppercase tracking-widest">User: {editingUser.username}</p>
            <form onSubmit={handleUpdateBalance} className="space-y-6">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                <input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  className="w-full pl-8 pr-4 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 font-black text-xl"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all active:scale-95"
                >
                  Confirm
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-black rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
