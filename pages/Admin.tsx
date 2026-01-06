
import React, { useState, useEffect, useRef } from 'react';
import { db } from '../services/db';
import { User, Transaction, TransactionStatus, TransactionType, UserRole, ChatMessage, TokenAddress, DepositConfig } from '../types';
import { VIP_LEVELS, ADMIN_CONFIG } from '../constants';

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [activeView, setActiveView] = useState<'users' | 'deposits' | 'withdrawals' | 'broadcast' | 'support' | 'payments'>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [broadcastInput, setBroadcastInput] = useState<string>(db.getBroadcastMessage() || '');

  // Payment Configuration State
  const [paymentConfig, setPaymentConfig] = useState<DepositConfig>(db.getDepositConfig());
  const [newTokens, setNewTokens] = useState<TokenAddress[]>(paymentConfig.tokens);
  const [tgSupport, setTgSupport] = useState(paymentConfig.telegramSupport || '');
  const [tgChannel, setTgChannel] = useState(paymentConfig.telegramChannel || '');
  const [miningVideo, setMiningVideo] = useState(paymentConfig.miningVideoUrl || '');

  // Support Chat State
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fullscreen Image Modal State
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const refreshData = () => {
    const allUsers = db.getUsers();
    setUsers(allUsers);
    setTransactions(db.getTransactions());
    if (selectedChatUserId) {
      setChatMessages(db.getChats(selectedChatUserId));
    }
  };

  useEffect(() => {
    const interval = setInterval(refreshData, 3000);
    return () => clearInterval(interval);
  }, [selectedChatUserId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

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
        alert('Insufficient balance!');
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
    if (!editingUser) return;
    const allUsers = db.getUsers();
    const updatedUsers = allUsers.map(u => u.id === editingUser.id ? { ...u, walletBalance: parseFloat(editBalance) } : u);
    db.setUsers(updatedUsers);
    refreshData();
    setEditingUser(null);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUserId || !chatInput.trim()) return;
    const newMessage: ChatMessage = {
      id: `MSG-${Date.now()}`,
      senderId: 'admin',
      senderName: 'Support Agent',
      text: chatInput,
      timestamp: new Date().toISOString(),
      isAdmin: true
    };
    db.addChatMessage(selectedChatUserId, newMessage);
    setChatMessages(prev => [...prev, newMessage]);
    setChatInput('');
  };

  const savePaymentConfig = () => {
    db.setDepositConfig({ 
      ...paymentConfig, 
      tokens: newTokens,
      telegramSupport: tgSupport,
      telegramChannel: tgChannel,
      miningVideoUrl: miningVideo
    });
    alert('Platform configuration updated successfully!');
  };

  const handleTokenChange = (index: number, field: 'name' | 'address', value: string) => {
    const updated = [...newTokens];
    updated[index] = { ...updated[index], [field]: value };
    setNewTokens(updated);
  };

  const addTokenRow = () => {
    if (newTokens.length >= 5) {
      alert('Maximum 5 tokens reached.');
      return;
    }
    setNewTokens([...newTokens, { name: '', address: '' }]);
  };

  const handleUpdateBroadcast = () => {
    db.setBroadcastMessage(broadcastInput);
    alert('Broadcast updated successfully!');
  };

  const chatUserIds = db.getAllChatUserIds();
  const pendingDeposits = transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING);
  const pendingWithdrawals = transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.PENDING);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight text-gray-800 dark:text-white">Admin Control Panel</h2>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide">
          {(['users', 'deposits', 'withdrawals', 'broadcast', 'support', 'payments'] as const).map(view => (
            <button 
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-8 py-5 text-sm font-black transition-all uppercase tracking-widest ${activeView === view ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/30' : 'text-gray-500'}`}
            >
              {view} {view === 'deposits' && `(${pendingDeposits.length})`} {view === 'withdrawals' && `(${pendingWithdrawals.length})`}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeView === 'users' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800">
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Tier</th>
                    <th className="px-6 py-4">Balance</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="px-6 py-5"><div className="font-black">{u.username}</div><div className="text-[10px] text-gray-400">{u.email}</div></td>
                      <td className="px-6 py-5 uppercase font-black text-[10px]">{u.activeVipId ? `VIP ${u.activeVipId}` : 'NONE'}</td>
                      <td className="px-6 py-5 font-mono font-black">${u.walletBalance.toFixed(2)}</td>
                      <td className="px-6 py-5"><button onClick={() => { setEditingUser(u); setEditBalance(u.walletBalance.toString()); }} className="text-blue-600 font-black uppercase text-[10px] hover:underline">Adjust Balance</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeView === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
              <div className="md:col-span-4 border-r border-gray-100 dark:border-gray-800 pr-4 overflow-y-auto space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Active Conversations</h4>
                {chatUserIds.map(uid => {
                  const chatUser = users.find(u => u.id === uid);
                  const lastMsg = db.getChats(uid).slice(-1)[0];
                  return (
                    <button 
                      key={uid}
                      onClick={() => setSelectedChatUserId(uid)}
                      className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 ${selectedChatUserId === uid ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedChatUserId === uid ? 'bg-white/20' : 'bg-blue-600 text-white'}`}>
                        {chatUser?.username.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="font-black text-sm truncate">{chatUser?.username || 'Unknown User'}</div>
                        <div className={`text-[10px] truncate ${selectedChatUserId === uid ? 'opacity-80' : 'text-gray-400'}`}>{lastMsg?.text || 'No messages'}</div>
                      </div>
                    </button>
                  );
                })}
                {chatUserIds.length === 0 && <p className="text-center py-20 text-xs text-gray-400 italic">No user chats found.</p>}
              </div>
              <div className="md:col-span-8 flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-800">
                {selectedChatUserId ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {chatMessages.map(m => (
                        <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.isAdmin ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/10' : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-100 dark:border-gray-700 shadow-sm'}`}>
                            <p className="leading-relaxed">{m.text}</p>
                            <p className="text-[9px] mt-1 opacity-60 text-right">{new Date(m.timestamp).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={chatEndRef}></div>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-2">
                      <input type="text" className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white outline-none text-sm" placeholder="Type a reply..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} />
                      <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs tracking-widest active:scale-95">Send Reply</button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-400 italic text-sm">Select a user to start chatting</div>
                )}
              </div>
            </div>
          )}

          {activeView === 'payments' && (
            <div className="max-w-4xl mx-auto space-y-10 py-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-700 uppercase tracking-widest mb-6 flex items-center gap-2"><i className="fa-solid fa-wallet text-blue-600"></i> Global Settings & Payments</h4>
                
                {/* Telegram Links Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Telegram Support Link</label>
                    <div className="relative">
                      <i className="fa-brands fa-telegram absolute left-4 top-1/2 -translate-y-1/2 text-sky-500"></i>
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
                        value={tgSupport}
                        onChange={(e) => setTgSupport(e.target.value)}
                        placeholder="https://t.me/..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Telegram Channel Link</label>
                    <div className="relative">
                      <i className="fa-solid fa-bullhorn absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500"></i>
                      <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
                        value={tgChannel}
                        onChange={(e) => setTgChannel(e.target.value)}
                        placeholder="https://t.me/..."
                      />
                    </div>
                  </div>
                </div>

                {/* Video URL Configuration */}
                <div className="mb-10">
                  <label className="block text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest">Mining Farm Video URL (Direct MP4 Link)</label>
                  <div className="relative">
                    <i className="fa-solid fa-video absolute left-4 top-1/2 -translate-y-1/2 text-blue-600"></i>
                    <input 
                      type="text" 
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium"
                      value={miningVideo}
                      onChange={(e) => setMiningVideo(e.target.value)}
                      placeholder="https://example.com/mining.mp4"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest border-b pb-2">Deposit Tokens</h5>
                  {newTokens.map((token, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="md:col-span-3 text-left">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Token Name</label>
                        <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-bold" value={token.name} onChange={(e) => handleTokenChange(idx, 'name', e.target.value)} placeholder="e.g. USDT (TRC-20)" />
                      </div>
                      <div className="md:col-span-7 text-left">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1 tracking-widest">Wallet Address</label>
                        <input type="text" className="w-full px-4 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm font-mono" value={token.address} onChange={(e) => handleTokenChange(idx, 'address', e.target.value)} placeholder="Wallet Address" />
                      </div>
                      <div className="md:col-span-2 flex gap-2">
                        <button onClick={() => setNewTokens(newTokens.filter((_, i) => i !== idx))} className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs hover:bg-red-100 transition-all"><i className="fa-solid fa-trash"></i></button>
                      </div>
                    </div>
                  ))}
                  <button onClick={addTokenRow} disabled={newTokens.length >= 5} className="w-full py-4 border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl text-xs font-black uppercase hover:bg-blue-50 transition-all disabled:opacity-50">+ Add Custom Token Address</button>
                </div>
                <div className="mt-10 flex gap-4">
                  <button onClick={savePaymentConfig} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Save Platform Configuration</button>
                  <button onClick={() => {
                    const cfg = db.getDepositConfig();
                    setNewTokens(cfg.tokens);
                    setTgSupport(cfg.telegramSupport || '');
                    setTgChannel(cfg.telegramChannel || '');
                    setMiningVideo(cfg.miningVideoUrl || '');
                  }} className="px-8 py-5 bg-gray-100 text-gray-600 rounded-2xl font-black uppercase tracking-widest active:scale-95">Reset</button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'deposits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingDeposits.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col text-left">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{tx.id}</span>
                    <span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleString()}</span>
                  </div>
                  <div className="text-3xl font-black mb-2 text-gray-800 dark:text-white">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-4 font-bold uppercase">From: {users.find(u => u.id === tx.userId)?.email}</div>
                  
                  {tx.receiptUrl && (
                    <div className="mb-6">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Payment Receipt</p>
                      <button 
                        onClick={() => setViewingReceiptUrl(tx.receiptUrl || null)}
                        className="relative w-full aspect-video rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white group cursor-zoom-in"
                      >
                        <img src={tx.receiptUrl} alt="Receipt" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <i className="fa-solid fa-expand text-white text-2xl"></i>
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => handleApproveTransaction(tx)} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-green-500/20 active:scale-95">Approve</button>
                    <button onClick={() => handleRejectTransaction(tx)} className="flex-1 py-4 bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95">Reject</button>
                  </div>
                </div>
              ))}
              {pendingDeposits.length === 0 && <p className="text-gray-400 text-center py-20 italic col-span-full">No pending deposit requests.</p>}
            </div>
          )}

          {activeView === 'withdrawals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingWithdrawals.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col text-left">
                  <div className="flex justify-between mb-4">
                    <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{tx.id}</span>
                    <span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleString()}</span>
                  </div>
                  <div className="text-3xl font-black mb-1 text-gray-800 dark:text-white">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-4 font-bold uppercase">To User: {users.find(u => u.id === tx.userId)?.email}</div>
                  <div className="p-3 bg-white dark:bg-gray-950 rounded-xl font-mono text-[10px] text-blue-600 mb-6 break-all border border-gray-100 dark:border-gray-800">{tx.method}</div>
                  <div className="flex gap-3">
                    <button onClick={() => handleApproveTransaction(tx)} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 text-white">Process Payout</button>
                    <button onClick={() => handleRejectTransaction(tx)} className="flex-1 py-4 bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95">Decline</button>
                  </div>
                </div>
              ))}
              {pendingWithdrawals.length === 0 && <p className="text-gray-400 text-center py-20 italic col-span-full">No pending payout requests.</p>}
            </div>
          )}

          {activeView === 'broadcast' && (
            <div className="max-w-2xl mx-auto py-8">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-700 uppercase tracking-widest mb-4 text-left">Send Global Announcement</h4>
                <textarea className="w-full h-40 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 outline-none text-sm font-medium resize-none shadow-sm dark:text-white" placeholder="Enter message for all users..." value={broadcastInput} onChange={(e) => setBroadcastInput(e.target.value)} />
                <div className="mt-6 flex gap-3">
                  <button onClick={handleUpdateBroadcast} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 text-white">Push Broadcast</button>
                  <button onClick={() => { setBroadcastInput(''); db.setBroadcastMessage(null); alert('Broadcast cleared!'); }} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95">Clear Message</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Adjust Balance Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-2 uppercase text-gray-900 dark:text-white">Adjust Credit</h3>
            <p className="text-xs text-gray-400 mb-8 font-black uppercase tracking-widest">User: {editingUser.username}</p>
            <form onSubmit={handleUpdateBalance} className="space-y-6">
              <input type="number" step="0.01" autoFocus className="w-full px-5 py-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-black text-2xl outline-none dark:text-white" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
              <div className="flex gap-4">
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl active:scale-95 text-white">Confirm</button>
                <button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Viewer Modal */}
      {viewingReceiptUrl && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4" onClick={() => setViewingReceiptUrl(null)}>
          <div className="absolute top-6 right-6 flex gap-4">
            <a href={viewingReceiptUrl} download="receipt.png" className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
              <i className="fa-solid fa-download"></i>
            </a>
            <button className="w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
          <img src={viewingReceiptUrl} alt="Receipt Fullscreen" className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()} />
          <p className="mt-8 text-white/60 text-sm font-black uppercase tracking-widest">Click anywhere to close</p>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
