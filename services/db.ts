
import { User, Transaction, UserRole } from '../types';
import { ADMIN_CONFIG } from '../constants';

const DB_KEYS = {
  USERS: 'sm_users',
  TRANSACTIONS: 'sm_transactions',
  CURRENT_USER: 'sm_auth_user'
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
