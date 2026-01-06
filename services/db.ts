
import { User, Transaction, UserRole, ChatMessage, DepositConfig } from '../types';
import { ADMIN_CONFIG } from '../constants';

const DB_KEYS = {
  USERS: 'sm_users',
  TRANSACTIONS: 'sm_transactions',
  CURRENT_USER: 'sm_auth_user',
  BROADCAST: 'sm_broadcast_msg',
  CHATS: 'sm_chats',
  DEPOSIT_CONFIG: 'sm_deposit_config'
};

const DEFAULT_DEPOSIT_CONFIG: DepositConfig = {
  mainAddress: 'TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n',
  tokens: [
    { name: 'USDT (TRC-20)', address: 'TX47zQvT9KxL2mR5s8pB2vA9mX8wH6qZ3n' },
    { name: 'USDC (ERC-20)', address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e' }
  ],
  telegramSupport: 'https://t.me/SmartMineSupport',
  telegramChannel: 'https://t.me/SmartMineNews',
  miningVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', 
  backgroundVideoUrl: '', 
  welcomeVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
  authVideoUrl: 'https://www.w3schools.com/html/movie.mp4',
  withdrawalMaintenance: false
};

export const db = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(DB_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  setUsers: (users: User[]) => {
    localStorage.setItem(DB_KEYS.USERS, JSON.stringify(users));
  },

  getTransactions: (): Transaction[] => {
    const data = localStorage.getItem(DB_KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  },

  setTransactions: (transactions: Transaction[]) => {
    localStorage.setItem(DB_KEYS.TRANSACTIONS, JSON.stringify(transactions));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(DB_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser: (user: User | null) => {
    if (user) {
      localStorage.setItem(DB_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(DB_KEYS.CURRENT_USER);
    }
  },

  getBroadcastMessage: (): string | null => {
    return localStorage.getItem(DB_KEYS.BROADCAST);
  },

  setBroadcastMessage: (msg: string | null) => {
    if (msg) {
      localStorage.setItem(DB_KEYS.BROADCAST, msg);
    } else {
      localStorage.removeItem(DB_KEYS.BROADCAST);
    }
  },

  getChats: (userId: string): ChatMessage[] => {
    const data = localStorage.getItem(`${DB_KEYS.CHATS}_${userId}`);
    return data ? JSON.parse(data) : [];
  },

  getAllChatUserIds: (): string[] => {
    const ids: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DB_KEYS.CHATS)) {
        ids.push(key.replace(`${DB_KEYS.CHATS}_`, ''));
      }
    }
    return ids;
  },

  addChatMessage: (userId: string, msg: ChatMessage) => {
    const current = db.getChats(userId);
    localStorage.setItem(`${DB_KEYS.CHATS}_${userId}`, JSON.stringify([...current, msg]));
  },

  getDepositConfig: (): DepositConfig => {
    const data = localStorage.getItem(DB_KEYS.DEPOSIT_CONFIG);
    return data ? JSON.parse(data) : DEFAULT_DEPOSIT_CONFIG;
  },

  setDepositConfig: (config: DepositConfig) => {
    localStorage.setItem(DB_KEYS.DEPOSIT_CONFIG, JSON.stringify(config));
  },

  // Initialize Admin if not exists
  init: () => {
    const users = db.getUsers();
    const adminExists = users.some(u => u.email === ADMIN_CONFIG.EMAIL);
    if (!adminExists) {
      const admin: User = {
        id: 'admin-001',
        username: 'SuperAdmin',
        email: ADMIN_CONFIG.EMAIL,
        password: ADMIN_CONFIG.PASSWORD,
        walletBalance: 0,
        activeVipId: null,
        role: UserRole.ADMIN,
        miningTimerStart: null,
        isBanned: false,
        createdAt: new Date().toISOString()
      };
      db.setUsers([...users, admin]);
    }
  }
};

db.init();
