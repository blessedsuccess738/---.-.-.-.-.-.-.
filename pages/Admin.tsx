
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { db } from '../services/db';
import { User, Transaction, TransactionStatus, TransactionType, UserRole, ChatMessage, TokenAddress, DepositConfig } from '../types';
import { VIP_LEVELS, ADMIN_CONFIG } from '../constants';

const PREDEFINED_TOKENS = [
  "USDT (TRC-20)", "USDT (ERC-20)", "USDT (BEP-20)", "E0 Token", "BTC (Bitcoin)", 
  "ETH (Ethereum)", "SOL (Solana)", "USDC (USD Coin)", "BNB (Binance Coin)", "XRP (Ripple)", 
  "ADA (Cardano)", "DOGE (Dogecoin)", "TRX (TRON)", "DOT (Polkadot)", "MATIC (Polygon)", 
  "LTC (Litecoin)", "SHIB (Shiba Inu)", "DAI (Stablecoin)", "BCH (Bitcoin Cash)", "AVAX (Avalanche)", 
  "LINK (Chainlink)", "ATOM (Cosmos)", "UNI (Uniswap)", "XMR (Monero)", "ETC (Ethereum Classic)", 
  "TON (Toncoin)", "ICP (Internet Computer)", "FIL (Filecoin)", "NEAR (Near Protocol)", 
  "ARB (Arbitrum)", "OP (Optimism)", "PEPE (Pepe Coin)"
];

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeView, setActiveView] = useState<'users' | 'deposits' | 'withdrawals' | 'broadcast' | 'support' | 'payments'>('users');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState<string>('');
  const [broadcastInput, setBroadcastInput] = useState<string>('');
  const [chatUserIds, setChatUserIds] = useState<string[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, ChatMessage>>({});

  // Search & Purge State
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [purgeEmail, setPurgeEmail] = useState('');

  // Warning Modal State
  const [warningUser, setWarningUser] = useState<User | null>(null);
  const [warningText, setWarningText] = useState('');

  // Payment Configuration State
  const [paymentConfig, setPaymentConfig] = useState<DepositConfig>({ mainAddress: '', tokens: [], blocklist: [] });
  const [newTokens, setNewTokens] = useState<TokenAddress[]>([]);
  const [blocklistInput, setBlocklistInput] = useState('');
  const [tokenSearch, setTokenSearch] = useState('');
  const [showTokenSelector, setShowTokenSelector] = useState(false);

  const [tgSupport, setTgSupport] = useState('');
  const [tgChannel, setTgChannel] = useState('');
  const [miningVideo, setMiningVideo] = useState('');
  const [bgVideo, setBgVideo] = useState('');
  const [welcomeVideo, setWelcomeVideo] = useState('');
  const [authVideo, setAuthVideo] = useState('');
  const [withdrawMaint, setWithdrawMaint] = useState(false);

  // Support Chat State
  const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fullscreen Image Modal State
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    try {
      const allUsers = await db.getUsers();
      setUsers(allUsers);
      const allTxs = await db.getTransactions();
      setTransactions(allTxs);
      
      const uids = await db.getAllChatUserIds();
      setChatUserIds(uids);

      const lastMsgs: Record<string, ChatMessage> = {};
      for (const uid of uids) {
        const msgs = await db.getChats(uid);
        if (msgs.length > 0) {
          lastMsgs[uid] = msgs[msgs.length - 1];
        }
      }
      setLastMessages(lastMsgs);

      if (selectedChatUserId) {
        const msgs = await db.getChats(selectedChatUserId);
        setChatMessages(msgs);
      }
      
      const broadcast = await db.getBroadcastMessage();
      setBroadcastInput(broadcast || '');
      
      const config = await db.getDepositConfig();
      setPaymentConfig(config);
      
      if (newTokens.length === 0) setNewTokens(config.tokens || []);
      if (!blocklistInput) setBlocklistInput((config.blocklist || []).join('\n'));
      
      setTgSupport(config.telegramSupport || '');
      setTgChannel(config.telegramChannel || '');
      setMiningVideo(config.miningVideoUrl || '');
      setBgVideo(config.backgroundVideoUrl || '');
      setWelcomeVideo(config.welcomeVideoUrl || '');
      setAuthVideo(config.authVideoUrl || '');
      setWithdrawMaint(config.withdrawalMaintenance || false);
    } catch (err) {
      console.warn('Admin background refresh failed:', err);
    }
  }, [selectedChatUserId, newTokens.length, blocklistInput]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const filteredUsers = useMemo(() => {
    if (!userSearchTerm.trim()) return users;
    const term = userSearchTerm.toLowerCase();
    return users.filter(u => 
      u.email.toLowerCase().includes(term) || 
      u.username.toLowerCase().includes(term) ||
      u.id.toLowerCase().includes(term)
    );
  }, [users, userSearchTerm]);

  // Fix: added filteredPredefined memo to filter the list of tokens available to add
  const filteredPredefined = useMemo(() => {
    return PREDEFINED_TOKENS.filter(name => 
      name.toLowerCase().includes(tokenSearch.toLowerCase())
    );
  }, [tokenSearch]);

  const handleApproveTransaction = async (tx: Transaction) => {
    const targetUser = users.find(u => u.id === tx.userId);
    if (!targetUser) return;
    try {
      if (tx.type === TransactionType.DEPOSIT) {
        await db.updateProfile(targetUser.id, { walletBalance: (targetUser.walletBalance || 0) + tx.amount });
      } else if (tx.type === TransactionType.WITHDRAWAL) {
        if (targetUser.walletBalance < tx.amount) {
          alert('Insufficient balance!');
          return;
        }
        await db.updateProfile(targetUser.id, { walletBalance: (targetUser.walletBalance || 0) - tx.amount });
      }
      await db.updateTransaction(tx.id, TransactionStatus.APPROVED);
      await refreshData();
    } catch (err) {
      alert('Transaction approval failed.');
    }
  };

  const handleRejectTransaction = async (tx: Transaction) => {
    try {
      await db.updateTransaction(tx.id, TransactionStatus.REJECTED);
      await refreshData();
    } catch (err) {
      alert('Action failed.');
    }
  };

  const handleUpdateBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await db.updateProfile(editingUser.id, { walletBalance: parseFloat(editBalance) });
      setEditingUser(null);
      await refreshData();
    } catch (err) {
      alert('Update failed.');
    }
  };

  const handleToggleBan = async (user: User) => {
    if (user.role === UserRole.ADMIN) {
      alert("Cannot restrict another administrator.");
      return;
    }
    const confirmMsg = user.isBanned ? "Lift suspension?" : "Suspend this user account?";
    if (confirm(confirmMsg)) {
      try {
        await db.updateProfile(user.id, { isBanned: !user.isBanned });
        await refreshData();
      } catch (err) {
        alert('Action failed.');
      }
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.role === UserRole.ADMIN) {
      alert("Cannot delete an administrator profile.");
      return;
    }
    if (confirm(`PERMANENT DELETE: This nukes ${user.username} (${user.email}) forever. Records will be erased. Proceed?`)) {
      try {
        await db.deleteUser(user.id);
        alert('User has been permanently erased.');
        await refreshData();
      } catch (err) {
        alert('Deletion failed.');
      }
    }
  };

  const handlePurgeByEmail = async () => {
    if (!purgeEmail.trim()) return;
    if (confirm(`DANGER: Nuke account matching ${purgeEmail} permanently?`)) {
      try {
        await db.deleteUserByEmail(purgeEmail);
        alert(`Account erased.`);
        setPurgeEmail('');
        await refreshData();
      } catch (err: any) {
        alert(err.message || 'Purge failed.');
      }
    }
  };

  const handleSendWarning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningUser) return;
    try {
      await db.updateProfile(warningUser.id, { warning: warningText || null });
      setWarningUser(null);
      setWarningText('');
      alert('Warning applied.');
      await refreshData();
    } catch (err) {
      alert('Action failed.');
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChatUserId || !chatInput.trim()) return;
    try {
      const newMessage: Partial<ChatMessage> = {
        senderId: 'admin',
        senderName: 'Support Agent',
        text: chatInput,
        timestamp: new Date().toISOString(),
        isAdmin: true
      };
      await db.addChatMessage(selectedChatUserId, newMessage);
      setChatInput('');
      await refreshData();
    } catch (err) {
      alert('Failed to send message.');
    }
  };

  const savePaymentConfig = async () => {
    try {
      const blocklistArray = blocklistInput.split('\n').map(e => e.trim().toLowerCase()).filter(e => e !== '');
      await db.setDepositConfig({ 
        ...paymentConfig, 
        tokens: newTokens,
        blocklist: blocklistArray,
        telegramSupport: tgSupport,
        telegramChannel: tgChannel,
        miningVideoUrl: miningVideo,
        backgroundVideoUrl: bgVideo,
        welcomeVideoUrl: welcomeVideo,
        authVideoUrl: authVideo,
        withdrawalMaintenance: withdrawMaint
      });
      alert('Platform configuration saved.');
      await refreshData();
    } catch (err) {
      alert('Save failed.');
    }
  };

  const handleTokenChange = (index: number, field: 'name' | 'address', value: string) => {
    const updated = [...newTokens];
    updated[index] = { ...updated[index], [field]: value };
    setNewTokens(updated);
  };

  const addToken = (name: string) => {
    if (newTokens.some(t => t.name === name)) {
      alert(`${name} is already in the list.`);
      return;
    }
    setNewTokens([...newTokens, { name, address: '' }]);
    setShowTokenSelector(false);
    setTokenSearch('');
  };

  const handleUpdateBroadcast = async () => {
    try {
      await db.setBroadcastMessage(broadcastInput);
      alert('Broadcast published.');
      await refreshData();
    } catch (err) {
      alert('Broadcast update failed.');
    }
  };

  const pendingDeposits = transactions.filter(t => t.type === TransactionType.DEPOSIT && t.status === TransactionStatus.PENDING);
  const pendingWithdrawals = transactions.filter(t => t.type === TransactionType.WITHDRAWAL && t.status === TransactionStatus.PENDING);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Admin Control Panel</h2>
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
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-red-50/10 dark:bg-red-950/5 rounded-3xl border border-red-100 dark:border-red-900/30">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase tracking-widest text-red-600 flex items-center gap-2">
                    <i className="fa-solid fa-burst"></i> Instant Purge Tool
                  </h4>
                  <p className="text-[10px] text-gray-500 font-medium italic">Hard-delete any profile by exact email address.</p>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Enter email to nuke..." 
                    className="flex-1 px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-red-100 dark:border-red-900/50 text-xs font-mono dark:text-white outline-none focus:ring-2 focus:ring-red-500"
                    value={purgeEmail}
                    onChange={(e) => setPurgeEmail(e.target.value)}
                  />
                  <button onClick={handlePurgeByEmail} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-md">Purge</button>
                </div>
              </div>

              <div className="relative max-w-md">
                <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="text" 
                  placeholder="Filter users..." 
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white font-medium"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-800">
                      <th className="px-6 py-4">User Identity</th>
                      <th className="px-6 py-4 text-center">Status</th>
                      <th className="px-6 py-4">Wallet</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={`border-b border-gray-50 dark:border-gray-800/50 transition-colors ${u.isBanned ? 'opacity-60 bg-red-50/10' : ''}`}>
                        <td className="px-6 py-5">
                          <div className="font-black text-gray-800 dark:text-white flex items-center gap-2">
                            {u.username} {u.role === UserRole.ADMIN && <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-full uppercase">Admin</span>}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono select-all">{u.email}</div>
                          {u.warning && <div className="text-[9px] text-amber-600 font-bold uppercase mt-1">Warn: {u.warning.substring(0, 30)}...</div>}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${u.isBanned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{u.isBanned ? 'Suspended' : 'Active'}</span>
                            <span className="text-[9px] text-gray-400 uppercase font-black">{u.activeVipId ? `VIP ${u.activeVipId}` : 'Unlicensed'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 font-mono font-black dark:text-gray-300 text-lg">${(u.walletBalance || 0).toFixed(2)}</td>
                        <td className="px-6 py-5 text-right space-x-2">
                          <button onClick={() => { setEditingUser(u); setEditBalance((u.walletBalance || 0).toString()); }} className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg"><i className="fa-solid fa-coins"></i></button>
                          <button onClick={() => { setWarningUser(u); setWarningText(u.warning || ''); }} className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg"><i className="fa-solid fa-triangle-exclamation"></i></button>
                          <button onClick={() => handleToggleBan(u)} className={`p-2 ${u.isBanned ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} rounded-lg`}><i className={`fa-solid ${u.isBanned ? 'fa-user-check' : 'fa-user-slash'}`}></i></button>
                          <button onClick={() => handleDeleteUser(u)} className="p-2 bg-red-600 text-white rounded-lg"><i className="fa-solid fa-trash-can"></i></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeView === 'payments' && (
            <div className="max-w-4xl mx-auto space-y-10 py-4 text-left">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30">
                <h4 className="text-sm font-black text-blue-700 uppercase tracking-widest mb-6 flex items-center gap-2"><i className="fa-solid fa-gear"></i> Platform Config</h4>
                
                <div className="bg-white dark:bg-gray-800/40 p-6 rounded-3xl border border-red-100 dark:border-red-900/30 mb-10 shadow-sm">
                   <h5 className="text-[10px] font-black uppercase text-red-600 mb-4 tracking-widest border-b border-red-100 pb-2">User Blocklist</h5>
                   <p className="text-[11px] text-gray-500 mb-4">Emails here cannot register. One per line.</p>
                   <textarea 
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-red-50 dark:border-red-900/50 text-xs font-mono dark:text-white outline-none focus:ring-2 focus:ring-red-500 min-h-[100px]"
                    placeholder="example@gmail.com"
                    value={blocklistInput}
                    onChange={(e) => setBlocklistInput(e.target.value)}
                   />
                </div>

                <div className="bg-white dark:bg-gray-800/40 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 mb-10">
                  <h5 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest border-b pb-2">System Switches</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-950/20 p-5 rounded-2xl border border-orange-100">
                      <div><h6 className="font-black text-sm text-orange-700 uppercase">Withdrawal Maintenance</h6><p className="text-[10px] text-orange-600">Block all payouts</p></div>
                      <button onClick={() => setWithdrawMaint(!withdrawMaint)} className={`w-14 h-8 rounded-full relative transition-colors ${withdrawMaint ? 'bg-orange-600' : 'bg-gray-300'}`}><div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${withdrawMaint ? 'left-7' : 'left-1'}`}></div></button>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Global Background Video</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border dark:bg-gray-900 text-sm font-medium dark:text-white" value={bgVideo} onChange={(e) => setBgVideo(e.target.value)} placeholder="MP4 URL" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800/40 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/50 mb-10">
                  <h5 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest border-b pb-2">Screen Media Links</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Welcome Video</label><input type="text" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 text-xs" value={welcomeVideo} onChange={(e) => setWelcomeVideo(e.target.value)} placeholder="URL" /></div>
                    <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Auth Video</label><input type="text" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 text-xs" value={authVideo} onChange={(e) => setAuthVideo(e.target.value)} placeholder="URL" /></div>
                    <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Mining Farm Video</label><input type="text" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 text-xs" value={miningVideo} onChange={(e) => setMiningVideo(e.target.value)} placeholder="URL" /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                  <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Telegram Support</label><input type="text" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 text-xs" value={tgSupport} onChange={(e) => setTgSupport(e.target.value)} placeholder="https://t.me/..." /></div>
                  <div><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Telegram Channel</label><input type="text" className="w-full px-4 py-2 rounded-lg border dark:bg-gray-900 text-xs" value={tgChannel} onChange={(e) => setTgChannel(e.target.value)} placeholder="https://t.me/..." /></div>
                </div>

                <div className="space-y-6">
                  <h5 className="text-[10px] font-black uppercase text-gray-400 mb-4 tracking-widest border-b pb-2 flex justify-between items-center">
                    Deposit Assets Management
                    <button onClick={() => setShowTokenSelector(!showTokenSelector)} className="text-blue-600 font-black text-xs uppercase">{showTokenSelector ? 'Close' : '+ Add Token'}</button>
                  </h5>
                  {showTokenSelector && (
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-3xl border border-blue-100 shadow-xl">
                      <input type="text" placeholder="Search tokens..." className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-900 border text-sm mb-4" value={tokenSearch} onChange={(e) => setTokenSearch(e.target.value)} />
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {filteredPredefined.map(name => <button key={name} onClick={() => addToken(name)} className="text-left px-4 py-2 rounded-xl text-[10px] font-black uppercase border hover:bg-blue-600 hover:text-white transition-all">{name}</button>)}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {newTokens.map((token, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100">
                        <div className="md:col-span-3"><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Asset</label><div className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-950 text-xs font-black text-blue-600 uppercase border">{token.name}</div></div>
                        <div className="md:col-span-7"><label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Company Address</label><input type="text" className="w-full px-4 py-2 rounded-xl border dark:bg-gray-950 text-[10px] font-mono dark:text-white outline-none" value={token.address} onChange={(e) => handleTokenChange(idx, 'address', e.target.value)} placeholder="Wallet Address" /></div>
                        <div className="md:col-span-2"><button onClick={() => setNewTokens(newTokens.filter((_, i) => i !== idx))} className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-black uppercase">Remove</button></div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-10 flex gap-4">
                  <button onClick={savePaymentConfig} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95">Save All Configuration</button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'deposits' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {pendingDeposits.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 flex flex-col">
                  <div className="flex justify-between mb-4"><span className="text-[10px] font-black text-blue-600 uppercase">{tx.id}</span><span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleString()}</span></div>
                  <div className="text-3xl font-black mb-2">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-4 font-bold uppercase">User: {users.find(u => u.id === tx.userId)?.email}</div>
                  {tx.receiptUrl && <button onClick={() => setViewingReceiptUrl(tx.receiptUrl || null)} className="relative w-full aspect-video rounded-2xl overflow-hidden border mb-4"><img src={tx.receiptUrl} alt="Receipt" className="w-full h-full object-cover" /></button>}
                  <div className="flex gap-3"><button onClick={() => handleApproveTransaction(tx)} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs">Approve</button><button onClick={() => handleRejectTransaction(tx)} className="flex-1 py-4 bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs">Reject</button></div>
                </div>
              ))}
              {pendingDeposits.length === 0 && <p className="text-gray-400 text-center py-20 italic col-span-full">No pending deposits.</p>}
            </div>
          )}

          {activeView === 'withdrawals' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {pendingWithdrawals.map(tx => (
                <div key={tx.id} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-3xl border border-gray-100 flex flex-col">
                  <div className="flex justify-between mb-4"><span className="text-[10px] font-black text-orange-600 uppercase">{tx.id}</span><span className="text-[10px] text-gray-400">{new Date(tx.date).toLocaleString()}</span></div>
                  <div className="text-3xl font-black mb-1">${tx.amount.toFixed(2)}</div>
                  <div className="text-xs text-gray-500 mb-4 font-bold uppercase">To: {users.find(u => u.id === tx.userId)?.email}</div>
                  <div className="mb-6 p-4 bg-white dark:bg-gray-900 rounded-2xl border text-xs font-mono break-all">{tx.method}</div>
                  <div className="flex gap-3"><button onClick={() => handleApproveTransaction(tx)} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black uppercase text-xs">Mark Paid</button><button onClick={() => handleRejectTransaction(tx)} className="flex-1 py-4 bg-red-100 text-red-600 rounded-2xl font-black uppercase text-xs">Reject</button></div>
                </div>
              ))}
              {pendingWithdrawals.length === 0 && <p className="text-gray-400 text-center py-20 italic col-span-full">No pending withdrawals.</p>}
            </div>
          )}

          {activeView === 'broadcast' && (
            <div className="max-w-2xl mx-auto space-y-6 text-left">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100">
                <h4 className="text-lg font-black mb-2 uppercase tracking-tight text-gray-800 dark:text-white">Broadcast Message</h4>
                <textarea className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-900 text-sm outline-none min-h-[120px]" placeholder="Update all users..." value={broadcastInput} onChange={(e) => setBroadcastInput(e.target.value)} />
                <button onClick={handleUpdateBroadcast} className="w-full mt-4 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95 transition-all">Publish</button>
              </div>
            </div>
          )}

          {activeView === 'support' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[600px]">
              <div className="md:col-span-4 border-r pr-4 overflow-y-auto space-y-2 text-left">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">Conversations</h4>
                {chatUserIds.map(uid => {
                  const chatUser = users.find(u => u.id === uid);
                  const lastMsg = lastMessages[uid];
                  return (
                    <button key={uid} onClick={() => setSelectedChatUserId(uid)} className={`w-full p-4 rounded-2xl text-left transition-all flex items-center gap-3 ${selectedChatUserId === uid ? 'bg-blue-600 text-white' : 'bg-gray-50 dark:bg-gray-800'}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${selectedChatUserId === uid ? 'bg-white/20' : 'bg-blue-600 text-white'}`}>{chatUser?.username.charAt(0).toUpperCase() || 'U'}</div>
                      <div className="flex-1 min-w-0"><div className="font-black text-sm truncate">{chatUser?.username || 'User'}</div><div className="text-[10px] truncate opacity-80">{lastMsg?.text || '...'}</div></div>
                    </button>
                  );
                })}
              </div>
              <div className="md:col-span-8 flex flex-col h-full bg-gray-50 dark:bg-gray-950 rounded-3xl border">
                {selectedChatUserId ? (
                  <>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {chatMessages.map(m => (
                        <div key={m.id} className={`flex ${m.isAdmin ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] p-3 rounded-2xl text-sm ${m.isAdmin ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800'}`}><p className="leading-relaxed text-left">{m.text}</p><p className="text-[9px] mt-1 opacity-60 text-right">{new Date(m.timestamp).toLocaleTimeString()}</p></div></div>
                      ))}
                      <div ref={chatEndRef}></div>
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t flex gap-2"><input type="text" className="flex-1 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 outline-none text-sm" placeholder="Reply..." value={chatInput} onChange={(e) => setChatInput(e.target.value)} /><button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-xl font-black uppercase text-xs active:scale-95">Send</button></form>
                  </>
                ) : <div className="flex-1 flex items-center justify-center text-gray-400 italic">Select a chat</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateBalance} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-2 uppercase text-gray-800 dark:text-white">Adjust Balance</h3>
            <p className="text-sm text-gray-500 mb-8 font-medium">Updating wallet for <span className="text-blue-600">{editingUser.username}</span></p>
            <input type="number" step="0.01" className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 text-xl font-black dark:text-white outline-none mb-6" value={editBalance} onChange={(e) => setEditBalance(e.target.value)} />
            <div className="flex gap-3"><button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95">Save</button><button type="button" onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl uppercase tracking-widest active:scale-95">Cancel</button></div>
          </form>
        </div>
      )}

      {warningUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <form onSubmit={handleSendWarning} className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-2 uppercase text-gray-800 dark:text-white">User Warning</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Issue warning to <span className="text-amber-600">{warningUser.username}</span></p>
            <textarea className="w-full px-5 py-4 rounded-2xl border dark:bg-gray-800 text-sm outline-none mb-6 min-h-[100px]" placeholder="Reason..." value={warningText} onChange={(e) => setWarningText(e.target.value)} />
            <div className="flex gap-3"><button type="submit" className="flex-1 py-4 bg-amber-600 text-white font-black rounded-2xl uppercase tracking-widest active:scale-95">Apply</button><button type="button" onClick={() => { setWarningUser(null); setWarningText(''); }} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl uppercase tracking-widest active:scale-95">Cancel</button></div>
          </form>
        </div>
      )}

      {viewingReceiptUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6 md:p-12 cursor-zoom-out" onClick={() => setViewingReceiptUrl(null)}>
          <img src={viewingReceiptUrl} alt="Receipt Full" className="max-w-full max-h-full object-contain shadow-2xl rounded-xl animate-in zoom-in duration-300" />
          <button className="absolute top-8 right-8 text-white text-4xl hover:scale-110 transition-transform"><i className="fa-solid fa-circle-xmark"></i></button>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
