
import React, { useState, useEffect } from 'react';
import { db } from '../services/db';
import { User, Transaction, TransactionStatus, TransactionType, UserRole } from '../types';
import { VIP_LEVELS, ADMIN_CONFIG } from '../constants';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [activeView, setActiveView] = useState<'users' | 'deposits' | 'withdrawals' | 'settings'>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');

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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Admin Control Panel</h2>
        <div className="text-sm font-medium text-gray-500 bg-white px-4 py-2 rounded-xl border border-gray-100">
          Super Admin: {ADMIN_CONFIG.EMAIL}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Users</p>
          <p className="text-3xl font-black text-blue-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Approved Deposits</p>
          <p className="text-3xl font-black text-green-600">${stats.totalDeposits.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Approved Withdrawals</p>
          <p className="text-3xl font-black text-orange-600">${stats.totalWithdrawals.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Mining Payouts</p>
          <p className="text-3xl font-black text-purple-600">${stats.totalMiningPayouts.toFixed(2)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveView('users')}
            className={`px-6 py-4 text-sm font-bold transition-colors ${activeView === 'users' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            User Management
          </button>
          <button 
            onClick={() => setActiveView('deposits')}
            className={`px-6 py-4 text-sm font-bold transition-colors ${activeView === 'deposits' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Pending Deposits ({pendingDeposits.length})
          </button>
          <button 
            onClick={() => setActiveView('withdrawals')}
            className={`px-6 py-4 text-sm font-bold transition-colors ${activeView === 'withdrawals' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}
          >
            Pending Withdrawals ({pendingWithdrawals.length})
          </button>
        </div>

        <div className="p-6">
          {activeView === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">VIP</th>
                    <th className="px-4 py-3">Balance</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-4">
                        <div className="font-bold text-gray-800">{u.username}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-xs font-bold">
                          {u.activeVipId ? `VIP ${u.activeVipId}` : 'None'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-mono font-bold">${u.walletBalance.toFixed(2)}</td>
                      <td className="px-4 py-4 space-x-2">
                        <button 
                          onClick={() => { setEditingUser(u); setEditBalance(u.walletBalance.toString()); }}
                          className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                        >
                          Edit Balance
                        </button>
                        <button 
                          onClick={() => handleToggleBan(u)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600'}`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'deposits' && (
            <div className="space-y-4">
              {pendingDeposits.map(tx => (
                <div key={tx.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-widest">{tx.id}</div>
                    <div className="font-bold text-lg text-gray-800">${tx.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">From: {users.find(u => u.id === tx.userId)?.email}</div>
                    <div className="text-xs text-gray-400">{new Date(tx.date).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveTransaction(tx)}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                    >
                      Approve
                    </button>
                    <button 
                      onClick={() => handleRejectTransaction(tx)}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingDeposits.length === 0 && <p className="text-gray-400 text-center py-8">No pending deposits.</p>}
            </div>
          )}

          {activeView === 'withdrawals' && (
            <div className="space-y-4">
              {pendingWithdrawals.map(tx => (
                <div key={tx.id} className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold text-orange-600 uppercase tracking-widest">{tx.id}</div>
                    <div className="font-bold text-lg text-gray-800">${tx.amount.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">To: {users.find(u => u.id === tx.userId)?.email}</div>
                    <div className="text-sm text-blue-600 font-mono mt-1">{tx.method}</div>
                    <div className="text-xs text-gray-400 mt-1">{new Date(tx.date).toLocaleString()}</div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveTransaction(tx)}
                      className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      Approve & Deduct
                    </button>
                    <button 
                      onClick={() => handleRejectTransaction(tx)}
                      className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
              {pendingWithdrawals.length === 0 && <p className="text-gray-400 text-center py-8">No pending withdrawals.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Edit Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-800 mb-2">Edit Wallet Balance</h3>
            <p className="text-sm text-gray-500 mb-6">User: {editingUser.username}</p>
            <form onSubmit={handleUpdateBalance} className="space-y-4">
              <input 
                type="number" 
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
              />
              <div className="flex gap-3">
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700"
                >
                  Save
                </button>
                <button 
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200"
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
