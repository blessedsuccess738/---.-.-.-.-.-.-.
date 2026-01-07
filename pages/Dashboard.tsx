
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../services/db';
import { User, VIPLevel, TransactionType, TransactionStatus, Transaction, ChatMessage, DepositConfig } from '../types';
import { VIP_LEVELS, MINING_CYCLE_HOURS, MIN_WITHDRAWAL } from '../constants';

const WITHDRAW_TOKENS = [
  "USDT (TRC-20)", "E0 Token", "BTC (Bitcoin)", "ETH (Ethereum)", "SOL (Solana)",
  "USDC (USD Coin)", "BNB (Binance Coin)", "XRP (Ripple)", "ADA (Cardano)", "DOGE (Dogecoin)",
  "TRX (TRON)", "DOT (Polkadot)", "MATIC (Polygon)", "LTC (Litecoin)", "SHIB (Shiba Inu)",
  "DAI (Stablecoin)", "BCH (Bitcoin Cash)", "AVAX (Avalanche)", "LINK (Chainlink)", "ATOM (Cosmos)",
  "UNI (Uniswap)", "XMR (Monero)", "ETC (Ethereum Classic)", "TON (Toncoin)", "ICP (Internet Computer)",
  "FIL (Filecoin)", "NEAR (Near Protocol)", "ARB (Arbitrum)", "OP (Optimism)", "PEPE (Pepe Coin)"
];

const Dashboard: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('00:00:00');
  const [isMiningComplete, setIsMiningComplete] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vip' | 'deposit' | 'withdraw' | 'history'>('overview');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Persistent Broadcast dismissal logic
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const [isBroadcastDismissed, setIsBroadcastDismissed] = useState(false);

  const [depositConfig, setDepositConfig] = useState<DepositConfig>({ mainAddress: '', tokens: [] });
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);

  // VIP Purchase Modal State
  const [showVipModal, setShowVipModal] = useState(false);
  const [pendingVip, setPendingVip] = useState<VIPLevel | null>(null);

  // Form states
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAddress, setWithdrawAddress] = useState('');
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState('USDT (TRC-20)');
  const [tokenSearch, setTokenSearch] = useState('');
  const [depositTokenSearch, setDepositTokenSearch] = useState('');
  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);

  // Deposit Multi-step state
  const [depositStep, setDepositStep] = useState<'input' | 'payment' | 'receipt'>('input');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);

  // Chat State
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Welcome Modal State
  const [showWelcome, setShowWelcome] = useState(false);

  // Derived state
  const currentVIP = VIP_LEVELS.find(v => v.id === user?.activeVipId);

  // Address Validation Logic
  const isAddressValid = useMemo(() => {
    const addr = withdrawAddress.trim();
    if (!addr) return false;
    
    // TRC-20 Validation
    if (selectedWithdrawMethod.includes('TRC-20')) {
      return /^T[a-zA-Z0-9]{33}$/.test(addr);
    }
    
    // E0 Token Validation (Custom rule: alphanumeric, 30-50 chars)
    if (selectedWithdrawMethod === 'E0 Token') {
      return /^[a-zA-Z0-9]{30,50}$/.test(addr);
    }

    // Generic fallback for other 28 tokens
    return addr.length >= 26 && addr.length <= 100;
  }, [withdrawAddress, selectedWithdrawMethod]);

  const filteredWithdrawTokens = useMemo(() => {
    return WITHDRAW_TOKENS.filter(t => t.toLowerCase().includes(tokenSearch.toLowerCase()));
  }, [tokenSearch]);

  const filteredDepositTokens = useMemo(() => {
    return (depositConfig.tokens || []).filter(t => t.name.toLowerCase().includes(depositTokenSearch.toLowerCase()));
  }, [depositTokenSearch, depositConfig.tokens]);

  const refreshData = useCallback(async () => {
    try {
      const currentUser = await db.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        const chats = await db.getChats(currentUser.id);
        setChatMessages(chats);
        const txs = await db.getTransactions(currentUser.id);
        setUserTransactions(txs);
      }
      const newBroadcast = await db.getBroadcastMessage();
      setBroadcastMsg(newBroadcast);
      const lastDismissed = localStorage.getItem('sm_dismissed_broadcast');
      if (newBroadcast !== lastDismissed) {
        setIsBroadcastDismissed(false);
      }
      
      const cfg = await db.getDepositConfig();
      setDepositConfig(cfg);
    } catch (err) {
      console.warn('Dashboard background refresh failed (possibly network issue):', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 5000); 
    return () => clearInterval(interval);
  }, [refreshData]);

  useEffect(() => {
    if (showChat) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, showChat]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('new') === 'true') {
      setShowWelcome(true);
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !chatInput.trim()) return;

    try {
      const newMessage: Partial<ChatMessage> = {
        id: `MSG-${Date.now()}`,
        senderId: user.id,
        senderName: user.username,
        text: chatInput,
        timestamp: new Date().toISOString(),
        isAdmin: false
      };

      await db.addChatMessage(user.id, newMessage);
      setChatInput('');
      await refreshData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send message. Please check connection.' });
    }
  };

  const handleStartMining = async () => {
    if (!user?.activeVipId) {
      setMessage({ type: 'error', text: 'You need an active VIP level to start mining.' });
      return;
    }
    try {
      await db.updateProfile(user.id, { miningTimerStart: new Date().toISOString() });
      await refreshData();
      setMessage({ type: 'success', text: 'Mining started successfully!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to start mining. Please try again.' });
    }
  };

  const handleClaimMining = async () => {
    if (!user || !user.activeVipId) return;
    const vip = VIP_LEVELS.find(v => v.id === user.activeVipId);
    if (!vip) return;

    try {
      const newTransaction: Partial<Transaction> = {
        id: `TX-${Date.now()}`,
        userId: user.id,
        amount: vip.dailyReturn,
        type: TransactionType.MINING_EARNING,
        status: TransactionStatus.APPROVED,
        date: new Date().toISOString(),
        description: `Daily mining yield (${vip.name})`
      };

      await db.createTransaction(newTransaction);
      await db.updateProfile(user.id, { 
        walletBalance: (user.walletBalance || 0) + vip.dailyReturn,
        miningTimerStart: null 
      });

      await refreshData();
      setIsMiningComplete(false);
      setMessage({ type: 'success', text: `Claimed $${vip.dailyReturn.toFixed(2)} from mining!` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to claim earnings. Please try again.' });
    }
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

  const confirmPurchase = async () => {
    if (!user || !pendingVip) return;
    
    try {
      const newTransaction: Partial<Transaction> = {
        id: `TX-${Date.now()}`,
        userId: user.id,
        amount: pendingVip.price,
        type: TransactionType.VIP_PURCHASE,
        status: TransactionStatus.APPROVED,
        date: new Date().toISOString(),
        description: `Purchased ${pendingVip.name} license`
      };

      await db.createTransaction(newTransaction);
      await db.updateProfile(user.id, { 
        walletBalance: (user.walletBalance || 0) - pendingVip.price,
        activeVipId: pendingVip.id,
        miningTimerStart: null 
      });

      await refreshData();
      setShowVipModal(false);
      setPendingVip(null);
      setMessage({ type: 'success', text: `Successfully upgraded to ${pendingVip.name}!` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Upgrade failed. Please check connection.' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const submitDeposit = async () => {
    if (!user || !depositAmount || parseFloat(depositAmount) <= 0 || !receiptBase64) return;
    try {
      const currentToken = depositConfig.tokens[selectedTokenIndex];
      const newTx: Partial<Transaction> = {
        id: `DEP-${Date.now()}`,
        userId: user.id,
        amount: parseFloat(depositAmount),
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        date: new Date().toISOString(),
        method: currentToken ? currentToken.name : 'Direct Transfer',
        description: 'Pending wallet deposit',
        receiptUrl: receiptBase64
      };
      await db.createTransaction(newTx);
      setMessage({ type: 'success', text: 'Payment submitted successfully! Admin will verify soon.' });
      setDepositAmount('');
      setDepositStep('input');
      setReceiptBase64(null);
      setActiveTab('overview');
      await refreshData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to submit payment. Please try again.' });
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (depositConfig.withdrawalMaintenance) return;
    const amount = parseFloat(withdrawAmount);
    if (!user || !amount || amount < MIN_WITHDRAWAL) {
      setMessage({ type: 'error', text: `Minimum withdrawal is $${MIN_WITHDRAWAL}` });
      return;
    }
    if (amount > user.walletBalance) {
      setMessage({ type: 'error', text: 'Insufficient balance' });
      return;
    }
    if (!isAddressValid) {
      setMessage({ type: 'error', text: `Invalid ${selectedWithdrawMethod} address format.` });
      return;
    }

    try {
      const newTx: Partial<Transaction> = {
        id: `WD-${Date.now()}`,
        userId: user.id,
        amount: amount,
        type: TransactionType.WITHDRAWAL,
        status: TransactionStatus.PENDING,
        date: new Date().toISOString(),
        method: `${selectedWithdrawMethod}: ${withdrawAddress}`,
        description: `Withdrawal via ${selectedWithdrawMethod}`
      };
      await db.createTransaction(newTx);
      setMessage({ type: 'success', text: 'Withdrawal request submitted for review.' });
      setWithdrawAmount('');
      setWithdrawAddress('');
      setActiveTab('overview');
      await refreshData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Withdrawal request failed. Please check connection.' });
    }
  };

  const dismissBroadcast = () => {
    if (broadcastMsg) {
      localStorage.setItem('sm_dismissed_broadcast', broadcastMsg);
      setIsBroadcastDismissed(true);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Account Warning Banner */}
      {user?.warning && (
        <div className="bg-red-600 text-white p-5 rounded-2xl flex items-center shadow-xl shadow-red-500/20 border border-white/10 animate-pulse">
          <div className="bg-white/20 p-3 rounded-xl mr-4"><i className="fa-solid fa-triangle-exclamation text-xl"></i></div>
          <div className="flex-1 text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-1">Administrative Account Warning</h4>
            <p className="text-sm font-black leading-relaxed">{user.warning}</p>
          </div>
        </div>
      )}

      {/* Global Broadcast Banner */}
      {broadcastMsg && !isBroadcastDismissed && (
        <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex items-start shadow-sm transition-all animate-in slide-in-from-top duration-300">
          <div className="bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-400 p-2 rounded-xl mr-4 shrink-0">
            <i className="fa-solid fa-bullhorn"></i>
          </div>
          <div className="flex-1 text-left">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-500 mb-1">Official Announcement</h4>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 leading-relaxed">{broadcastMsg}</p>
          </div>
          <button 
            onClick={dismissBroadcast} 
            className="text-amber-500 hover:text-amber-700 p-2 rounded-lg hover:bg-amber-200/50 transition-colors"
            title="Dismiss Announcement"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      )}

      {/* User Stats Card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-2 md:p-3 rounded-xl text-blue-600 dark:text-blue-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-wallet text-lg md:text-xl"></i></div>
          <div className="text-left"><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Balance</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">${user?.walletBalance.toFixed(2) || '0.00'}</p></div>
        </div>
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 md:p-3 rounded-xl text-purple-600 dark:text-purple-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-crown text-lg md:text-xl"></i></div>
          <div className="text-left"><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Active VIP</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">{currentVIP ? currentVIP.name : 'NONE'}</p></div>
        </div>
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 md:p-3 rounded-xl text-green-600 dark:text-green-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-chart-line text-lg md:text-xl"></i></div>
          <div className="text-left"><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Daily Return</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white transition-colors">${currentVIP ? currentVIP.dailyReturn.toFixed(2) : '0.00'}</p></div>
        </div>
        <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center md:space-x-4 transition-all">
          <div className="bg-orange-100 dark:bg-orange-900/30 p-2 md:p-3 rounded-xl text-orange-600 dark:text-orange-400 w-fit mb-2 md:mb-0"><i className="fa-solid fa-hourglass-half text-lg md:text-xl"></i></div>
          <div className="text-left"><p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-wider">Mining Timer</p><p className="text-xl md:text-2xl font-black text-gray-800 dark:text-white font-mono transition-colors">{timeLeft}</p></div>
        </div>
      </div>

      {/* Telegram Buttons Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a 
          href={depositConfig.telegramSupport} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-sky-500 hover:bg-sky-600 text-white p-5 rounded-3xl flex items-center justify-center space-x-3 shadow-lg shadow-sky-500/20 transition-all active:scale-95 group"
        >
          <i className="fa-brands fa-telegram text-2xl group-hover:rotate-12 transition-transform"></i>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 text-white">Support</p>
            <p className="text-lg font-black text-white">Contact Admin via Telegram</p>
          </div>
        </a>
        <a 
          href={depositConfig.telegramChannel} 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-indigo-500 hover:bg-indigo-600 text-white p-5 rounded-3xl flex items-center justify-center space-x-3 shadow-lg shadow-indigo-500/20 transition-all active:scale-95 group"
        >
          <i className="fa-solid fa-bullhorn text-2xl group-hover:rotate-12 transition-transform"></i>
          <div className="text-left">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 text-white">Community</p>
            <p className="text-lg font-black text-white">Official Telegram Channel</p>
          </div>
        </a>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50' : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50'}`}>
          <div className="flex items-center text-left"><i className={`fa-solid ${message.type === 'success' ? 'fa-circle-check' : 'fa-circle-xmark'} mr-3`}></i><span className="text-sm font-semibold">{message.text}</span></div>
          <button onClick={() => setMessage(null)} className="p-1">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">
        <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto whitespace-nowrap scrollbar-hide bg-gray-50/50 dark:bg-gray-800/20 transition-colors">
          {(['overview', 'vip', 'deposit', 'withdraw', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${activeTab === tab ? 'text-blue-600 border-blue-600 bg-white/50 dark:bg-gray-900/50' : 'text-gray-500 border-transparent hover:text-gray-700'}`}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-6 md:p-10 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="max-w-md text-left"><h3 className="text-3xl font-black mb-3 text-white">Mining Terminal</h3><p className="text-blue-100/80 leading-relaxed text-sm md:text-base">Access automated mining cycles. Upgrade VIP for higher hash rates.</p></div>
                  <div className="flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/20 min-w-[240px] shadow-2xl">
                    <span className="text-xs font-black uppercase tracking-[0.2em] mb-3 text-blue-200">Current Progress</span>
                    <span className="text-5xl font-mono font-black mb-6 drop-shadow-md">{timeLeft}</span>
                    {!user?.miningTimerStart ? <button onClick={handleStartMining} className="w-full py-4 bg-white text-blue-700 font-black rounded-2xl hover:bg-blue-50 transition-all shadow-lg active:scale-95">Start New Cycle</button> : isMiningComplete ? <button onClick={handleClaimMining} className="w-full py-4 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-all shadow-lg animate-pulse active:scale-95">Claim ${currentVIP?.dailyReturn.toFixed(2)}</button> : <div className="w-full py-4 bg-white/20 text-white font-black rounded-2xl flex items-center justify-center cursor-wait backdrop-blur-sm"><i className="fa-solid fa-gear fa-spin mr-3"></i> Mining...</div>}
                  </div>
                </div>
              </div>

              {/* Mining Farm Video Section */}
              {depositConfig.miningVideoUrl && (
                <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all overflow-hidden">
                  <h4 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-widest mb-4 flex items-center">
                    <i className="fa-solid fa-microchip text-blue-600 mr-2"></i> Live Mining Farm Status
                  </h4>
                  <div className="aspect-video rounded-2xl overflow-hidden bg-black border border-gray-100 dark:border-gray-800 relative group">
                    <video 
                      src={depositConfig.miningVideoUrl} 
                      className="w-full h-full object-cover" 
                      controls 
                      autoPlay 
                      muted 
                      loop
                      playsInline
                    >
                      Your browser does not support the video tag.
                    </video>
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                      Live Feed
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 font-medium italic text-left">
                    Real-time monitoring of our cloud hashing facilities. Your VIP level determines your slice of this processing power.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'vip' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {VIP_LEVELS.map(vip => {
                const isActive = user?.activeVipId === vip.id;
                const isLocked = user?.activeVipId && vip.id < user.activeVipId;
                return (
                  <div key={vip.id} className={`p-6 rounded-3xl border transition-all ${isActive ? 'border-blue-600 bg-blue-50/30 dark:bg-blue-900/10' : 'border-gray-100 dark:border-gray-800 bg-white/40 dark:bg-gray-800/40'}`}>
                    <h4 className="text-xl font-black mb-2 uppercase text-left text-gray-800 dark:text-white">{vip.name}</h4>
                    <div className="text-2xl font-black text-blue-600 mb-6 text-left">${vip.price} <span className="text-xs font-normal text-gray-500">USD</span></div>
                    <ul className="space-y-2 mb-8 text-sm text-gray-600 dark:text-gray-400 text-left">
                      <li><i className="fa-solid fa-check text-green-500 mr-2"></i> Daily: ${vip.dailyReturn.toFixed(2)}</li>
                      <li><i className="fa-solid fa-check text-green-500 mr-2"></i> Monthly: ${(vip.dailyReturn * 30).toFixed(2)}</li>
                    </ul>
                    <button disabled={isActive || isLocked} onClick={() => handlePurchaseVIP(vip)} className={`w-full py-3 rounded-xl font-bold ${isActive ? 'bg-gray-100 text-gray-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 active:scale-95'}`}>{isActive ? 'Current Plan' : 'Activate'}</button>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="max-w-xl mx-auto space-y-8">
              {depositStep === 'input' && (
                <div className="space-y-6">
                  <div className="bg-blue-50/50 dark:bg-blue-900/20 p-8 rounded-3xl border border-blue-100 dark:border-blue-800 text-center">
                    <h3 className="text-2xl font-black text-blue-700 dark:text-blue-400 mb-2">Initialize Deposit</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enter the amount you wish to credit to your account.</p>
                  </div>
                  <div className="text-left">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Amount to Deposit (USD)</label>
                    <input 
                      type="number" 
                      required 
                      min="1" 
                      className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold text-xl dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                      value={depositAmount} 
                      onChange={(e) => setDepositAmount(e.target.value)} 
                      placeholder="0.00" 
                    />
                  </div>
                  <button 
                    onClick={() => { if(parseFloat(depositAmount) > 0) setDepositStep('payment'); }}
                    className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95"
                  >
                    Select Payment Method
                  </button>
                </div>
              )}

              {depositStep === 'payment' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-blue-600 rounded-3xl p-8 text-white text-center shadow-xl shadow-blue-500/20">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-4">Choose Payment Asset</p>
                    
                    <div className="mb-6 relative">
                       <input 
                        type="text" 
                        placeholder="Search assets..." 
                        className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-xs text-white placeholder:text-white/60 outline-none focus:bg-white/20 transition-all"
                        value={depositTokenSearch}
                        onChange={(e) => setDepositTokenSearch(e.target.value)}
                       />
                       <div className="mt-3 flex flex-wrap justify-center gap-2 max-h-32 overflow-y-auto scrollbar-hide">
                        {filteredDepositTokens.map((token, idx) => {
                          const originalIdx = depositConfig.tokens.indexOf(token);
                          return (
                            <button 
                              key={idx} 
                              onClick={() => setSelectedTokenIndex(originalIdx)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${originalIdx === selectedTokenIndex ? 'bg-white text-blue-600' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                            >
                              {token.name}
                            </button>
                          );
                        })}
                        {filteredDepositTokens.length === 0 && <p className="text-[10px] opacity-60">No matching assets found</p>}
                       </div>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/10 mb-8 text-left">
                       <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Selected:</span>
                          <span className="text-xs font-black uppercase text-white">{depositConfig.tokens[selectedTokenIndex]?.name}</span>
                       </div>
                       <div className="bg-white/10 p-4 rounded-xl font-mono text-[10px] break-all border border-white/10 select-all cursor-copy mb-2" onClick={() => {
                        navigator.clipboard.writeText(depositConfig.tokens[selectedTokenIndex]?.address || '');
                        alert('Address copied!');
                       }}>
                        {depositConfig.tokens[selectedTokenIndex]?.address || 'Admin hasn\'t set this address yet'}
                       </div>
                       <p className="text-[8px] font-bold opacity-50 text-center uppercase tracking-widest">Click address to copy</p>
                    </div>

                    <div className="space-y-1">
                       <p className="text-[10px] font-bold opacity-70">Transfer exactly</p>
                       <p className="text-3xl font-black underline decoration-white/30 decoration-2 underline-offset-4">${parseFloat(depositAmount).toFixed(2)} USD</p>
                       <p className="text-[10px] font-bold opacity-70">to the address above</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={() => {
                         if (!depositConfig.tokens[selectedTokenIndex]?.address) {
                            alert('This payment method is currently unavailable. Select another asset.');
                         } else {
                            setDepositStep('receipt');
                         }
                      }}
                      className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95"
                    >
                      I have made payment
                    </button>
                    <button 
                      onClick={() => setDepositStep('input')}
                      className="w-full py-4 text-gray-500 font-bold hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                    >
                      Cancel & Go Back
                    </button>
                  </div>
                </div>
              )}

              {depositStep === 'receipt' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 text-center">
                    <i className="fa-solid fa-camera text-4xl text-blue-600 mb-4"></i>
                    <h3 className="text-xl font-black mb-2 text-gray-800 dark:text-white">Upload Proof of Payment</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Take a screenshot of your successful transaction and upload it below.</p>
                    
                    <label className="block text-left">
                      <span className="sr-only">Choose screenshot</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-6 file:rounded-full file:border-0 file:text-sm file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                      />
                    </label>

                    {receiptBase64 && (
                      <div className="mt-6 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-48">
                        <img src={receiptBase64} alt="Receipt Preview" className="w-full h-full object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <button 
                      onClick={submitDeposit}
                      disabled={!receiptBase64}
                      className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Payment Successful
                    </button>
                    <button 
                      onClick={() => setDepositStep('payment')}
                      className="w-full py-4 text-gray-500 font-bold hover:text-gray-700 transition-colors"
                    >
                      Back to details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'withdraw' && (
            <div className="max-w-xl mx-auto space-y-8 text-left">
              {depositConfig.withdrawalMaintenance ? (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-10 rounded-[2.5rem] border border-orange-100 dark:border-orange-800 text-center">
                  <div className="w-20 h-20 bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <i className="fa-solid fa-screwdriver-wrench text-3xl"></i>
                  </div>
                  <h3 className="text-2xl font-black text-orange-700 dark:text-orange-400 mb-2 uppercase tracking-tight">Withdrawals Disabled</h3>
                  <p className="text-orange-600 dark:text-orange-500 leading-relaxed font-medium">
                    Our withdrawal system is currently under maintenance for system upgrades. Please check back later.
                  </p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-100 dark:bg-gray-800 p-8 rounded-3xl text-center border border-gray-200 dark:border-gray-700">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Available Balance</p>
                    <p className="text-4xl font-black text-gray-800 dark:text-white">${user?.walletBalance.toFixed(2) || '0.00'}</p>
                  </div>
                  
                  <div className="bg-white/50 dark:bg-gray-800/50 p-6 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-500 mb-6">Withdrawal Setup</h4>
                    <form onSubmit={handleWithdraw} className="space-y-6">
                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Select Asset to Sell</label>
                        <div className="relative group">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <i className="fa-solid fa-magnifying-glass"></i>
                          </div>
                          <input 
                            type="text"
                            placeholder="Search among 30 tokens..."
                            className="w-full pl-10 pr-4 py-3 rounded-t-2xl border-x border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-white"
                            value={tokenSearch}
                            onChange={(e) => setTokenSearch(e.target.value)}
                          />
                          <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-b-2xl bg-white dark:bg-gray-950 scrollbar-hide">
                            {filteredWithdrawTokens.length > 0 ? (
                              filteredWithdrawTokens.map(token => (
                                <button
                                  key={token}
                                  type="button"
                                  onClick={() => setSelectedWithdrawMethod(token)}
                                  className={`w-full text-left px-4 py-3 text-xs font-bold transition-colors border-b border-gray-50 dark:border-gray-800 last:border-0 ${selectedWithdrawMethod === token ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900'}`}
                                >
                                  {token} {selectedWithdrawMethod === token && <i className="fa-solid fa-check float-right"></i>}
                                </button>
                              ))
                            ) : (
                              <div className="p-4 text-center text-gray-400 text-xs italic">No matching tokens found.</div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                         <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-blue-700 dark:text-blue-400">Selected Asset</span>
                            <span className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase">{selectedWithdrawMethod}</span>
                         </div>
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Amount to Withdraw (USD)</label>
                        <input 
                          type="number" 
                          required 
                          min={MIN_WITHDRAWAL} 
                          max={user?.walletBalance} 
                          className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 font-bold dark:text-white outline-none focus:ring-2 focus:ring-blue-500" 
                          value={withdrawAmount} 
                          onChange={(e) => setWithdrawAmount(e.target.value)} 
                          placeholder={`Min $${MIN_WITHDRAWAL}`} 
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">
                          {selectedWithdrawMethod} Destination Address
                        </label>
                        <input 
                          type="text" 
                          required 
                          className={`w-full px-5 py-4 rounded-2xl border bg-white dark:bg-gray-900 font-mono dark:text-white outline-none focus:ring-2 transition-all ${withdrawAddress && !isAddressValid ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 dark:border-gray-800 focus:ring-blue-500'}`} 
                          value={withdrawAddress} 
                          onChange={(e) => setWithdrawAddress(e.target.value)} 
                          placeholder={selectedWithdrawMethod.includes('TRC-20') ? "Starts with T (34 chars)..." : `Enter ${selectedWithdrawMethod} wallet address...`} 
                        />
                        {withdrawAddress && !isAddressValid && (
                          <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-widest">Invalid {selectedWithdrawMethod} address format</p>
                        )}
                      </div>

                      <button 
                        type="submit" 
                        disabled={!isAddressValid || !withdrawAmount || parseFloat(withdrawAmount) < MIN_WITHDRAWAL}
                        className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl active:scale-95 shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale transition-all"
                      >
                        {isAddressValid ? 'Request Payout' : 'Input Valid Address to Continue'}
                      </button>
                    </form>
                  </div>
                </>
              )}
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
                      <td className="px-6 py-5 text-gray-500 dark:text-gray-400">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="px-6 py-5 font-medium text-gray-800 dark:text-gray-200">{tx.description || 'System transaction'}</td>
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

      {/* Welcome Message Modal */}
      {showWelcome && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 text-right">
              <button onClick={() => setShowWelcome(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><i className="fa-solid fa-xmark text-2xl"></i></button>
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-blue-600 text-white rounded-[2rem] flex items-center justify-center text-4xl mb-8 shadow-xl shadow-blue-500/20 rotate-6 transition-transform hover:rotate-0"><i className="fa-solid fa-hand-sparkles"></i></div>
              <h3 className="text-4xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tight">Welcome to SmartMine</h3>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 leading-relaxed font-medium text-center">
                Welcome to the future of smart earning! SmartMine allows you to rent computational hashing power to earn USD daily.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-10">
                <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-800 text-left">
                  <h4 className="font-black text-blue-600 uppercase text-xs mb-2 tracking-widest">Platform Overview</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Our automated cloud mining farms run 24/7. Just activate a license, and our servers do the work for you.</p>
                </div>
                <div className="p-6 bg-purple-50 dark:bg-purple-900/20 rounded-3xl border border-purple-100 dark:border-purple-800 text-left">
                  <h4 className="font-black text-purple-600 uppercase text-xs mb-2 tracking-widest">VIP Earning Tiers</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Choose from 9 VIP levels. Higher levels unlock massive daily USD returns and priority payouts.</p>
                </div>
              </div>

              <div className="w-full space-y-3">
                <button 
                  onClick={() => { setShowWelcome(false); setActiveTab('vip'); }}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 text-lg uppercase tracking-widest"
                >
                  View VIP Plans
                </button>
                <button 
                  onClick={() => setShowWelcome(false)}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                >
                  Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat UI */}
      {showChat && (
        <div className="fixed bottom-24 right-6 w-80 md:w-96 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl flex flex-col z-[60] overflow-hidden h-[500px] animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-blue-600 text-white flex justify-between items-center">
            <div className="flex items-center space-x-3 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><i className="fa-solid fa-user-tie"></i></div>
              <div className="text-left"><h4 className="font-bold text-sm text-white">Live Support</h4><p className="text-[10px] opacity-80 text-white">We usually reply instantly</p></div>
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
                  <p className="leading-relaxed text-left">{m.text}</p>
                  <p className={`text-[9px] mt-1 opacity-60 text-right ${m.isAdmin ? 'text-gray-400' : 'text-blue-100'}`}>{new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef}></div>
          </div>
          <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-2">
            <input 
              type="text" 
              className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 dark:text-white outline-none text-sm focus:ring-2 focus:ring-blue-500" 
              placeholder="Type your message..." 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform"><i className="fa-solid fa-paper-plane"></i></button>
          </form>
        </div>
      )}

      {/* Upgrade Modal */}
      {showVipModal && pendingVip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/40 text-blue-600 rounded-3xl flex items-center justify-center text-3xl mb-8"><i className="fa-solid fa-crown"></i></div>
              <h3 className="text-3xl font-black mb-4 uppercase text-gray-900 dark:text-white">Upgrade Tier</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">Activate <span className="text-blue-600 font-black">{pendingVip.name}</span> for <span className="text-gray-900 dark:text-white font-black">${pendingVip.price}</span>. Existing mining cycles will reset.</p>
              <div className="flex gap-4 w-full">
                <button onClick={confirmPurchase} className="flex-1 py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95">Confirm</button>
                <button onClick={() => { setShowVipModal(false); setPendingVip(null); }} className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl active:scale-95">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
