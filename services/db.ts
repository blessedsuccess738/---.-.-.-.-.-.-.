
import { supabase } from './supabase';
import { User, Transaction, ChatMessage, DepositConfig, UserRole } from '../types';

// Helper to map DB profile to User object
const mapProfile = (p: any): User | null => {
  if (!p) return null;
  return {
    id: p.id,
    username: p.username,
    email: p.email,
    walletBalance: Number(p.wallet_balance || 0),
    activeVipId: p.active_vip_id,
    role: p.role as UserRole,
    miningTimerStart: p.mining_timer_start,
    isBanned: p.is_banned || false,
    warning: p.warning || null,
    createdAt: p.created_at
  };
};

// Helper to map User object updates to DB profile
const mapProfileToDB = (u: Partial<User>): any => {
  const mapped: any = {};
  if (u.username !== undefined) mapped.username = u.username;
  if (u.email !== undefined) mapped.email = u.email;
  if (u.walletBalance !== undefined) mapped.wallet_balance = u.walletBalance;
  if (u.activeVipId !== undefined) mapped.active_vip_id = u.activeVipId;
  if (u.role !== undefined) mapped.role = u.role;
  if (u.miningTimerStart !== undefined) mapped.mining_timer_start = u.miningTimerStart;
  if (u.isBanned !== undefined) mapped.is_banned = u.isBanned;
  if (u.warning !== undefined) mapped.warning = u.warning;
  return mapped;
};

// Helper to map DB transaction to Transaction object
const mapTransaction = (t: any): Transaction => ({
  id: t.id,
  userId: t.user_id,
  amount: Number(t.amount),
  type: t.type,
  status: t.status,
  date: t.date,
  method: t.method,
  receiptUrl: t.receipt_url,
  description: t.description
});

export const db = {
  // Auth
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return null;
      
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profError) return null;
      return mapProfile(profile);
    } catch (e) {
      console.error('db.getCurrentUser failed:', e);
      return null;
    }
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(p => mapProfile(p)).filter((u): u is User => u !== null);
    } catch (e) {
      console.error('db.getUsers failed:', e);
      return [];
    }
  },

  updateProfile: async (userId: string, updates: Partial<User>) => {
    try {
      const dbUpdates = mapProfileToDB(updates);
      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', userId);
      if (error) throw error;
    } catch (e) {
      console.error('db.updateProfile failed:', e);
    }
  },

  deleteUser: async (userId: string) => {
    try {
      // PERMANENT SYSTEM-WIDE DELETE
      // 1. Delete all transactions
      await supabase.from('transactions').delete().eq('user_id', userId);
      // 2. Delete all chat messages
      await supabase.from('chats').delete().eq('user_id', userId);
      // 3. Delete the profile row (This triggers logout for user in App.tsx)
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      console.log(`User ${userId} has been completely erased from the platform databases.`);
    } catch (e) {
      console.error('db.deleteUser failed:', e);
      throw e;
    }
  },

  deleteUserByEmail: async (email: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (error || !profile) {
        throw new Error('User not found.');
      }

      await db.deleteUser(profile.id);
    } catch (e) {
      console.error('db.deleteUserByEmail failed:', e);
      throw e;
    }
  },

  // To satisfy sync-style usage in legacy code
  setUsers: async (users: User[]) => {
    for (const user of users) {
      await db.updateProfile(user.id, user);
    }
  },

  // Transactions
  getTransactions: async (userId?: string): Promise<Transaction[]> => {
    try {
      let query = supabase.from('transactions').select('*').order('date', { ascending: false });
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(t => mapTransaction(t));
    } catch (e) {
      console.error('db.getTransactions failed:', e);
      return [];
    }
  },

  setTransactions: async (txs: Transaction[]) => {
    for (const tx of txs) {
      try {
        const dbTx = {
          id: tx.id,
          user_id: tx.userId,
          amount: tx.amount,
          type: tx.type,
          status: tx.status,
          date: tx.date,
          method: tx.method,
          receipt_url: tx.receiptUrl,
          description: tx.description
        };
        await supabase.from('transactions').upsert(dbTx);
      } catch (e) {
        console.error('db.setTransactions item failed:', e);
      }
    }
  },

  createTransaction: async (tx: Partial<Transaction>) => {
    try {
      const dbTx = {
        user_id: tx.userId,
        amount: tx.amount,
        type: tx.type,
        status: tx.status,
        date: tx.date,
        method: tx.method,
        receipt_url: tx.receiptUrl,
        description: tx.description
      };
      const { error } = await supabase.from('transactions').insert(dbTx);
      if (error) throw error;
    } catch (e) {
      console.error('db.createTransaction failed:', e);
      throw e;
    }
  },

  updateTransaction: async (txId: string, status: string) => {
    try {
      const { error } = await supabase.from('transactions').update({ status }).eq('id', txId);
      if (error) throw error;
    } catch (e) {
      console.error('db.updateTransaction failed:', e);
    }
  },

  // System Config
  getSystemConfig: async () => {
    try {
      const { data, error } = await supabase.from('system_config').select('*').eq('id', 'global').single();
      if (error) return null;
      return data || null;
    } catch (e) {
      console.error('db.getSystemConfig failed:', e);
      return null;
    }
  },

  updateSystemConfig: async (updates: any) => {
    try {
      const { error } = await supabase.from('system_config').update(updates).eq('id', 'global');
      if (error) throw error;
    } catch (e) {
      console.error('db.updateSystemConfig failed:', e);
    }
  },

  // Broadcast & Deposit Config Helpers
  getBroadcastMessage: async (): Promise<string | null> => {
    const config = await db.getSystemConfig();
    return config?.broadcast_message || null;
  },

  setBroadcastMessage: async (msg: string | null) => {
    return await db.updateSystemConfig({ broadcast_message: msg });
  },

  getDepositConfig: async (): Promise<DepositConfig> => {
    const config = await db.getSystemConfig();
    return config?.deposit_config || { mainAddress: '', tokens: [] };
  },

  setDepositConfig: async (config: DepositConfig) => {
    return await db.updateSystemConfig({ deposit_config: config });
  },

  // Chats
  getChats: async (userId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase.from('chats').select('*').eq('user_id', userId).order('timestamp', { ascending: true });
      if (error) throw error;
      return (data || []).map(m => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: m.sender_name,
        text: m.text,
        timestamp: m.timestamp,
        is_admin: m.is_admin
      }));
    } catch (e) {
      console.error('db.getChats failed:', e);
      return [];
    }
  },

  getAllChatUserIds: async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase.from('chats').select('user_id');
      if (error) throw error;
      const uniqueIds = Array.from(new Set((data || []).map((d: any) => d.user_id as string))) as string[];
      return uniqueIds;
    } catch (e) {
      console.error('db.getAllChatUserIds failed:', e);
      return [];
    }
  },

  addChatMessage: async (userId: string, msg: Partial<ChatMessage>) => {
    try {
      const dbMsg = {
        user_id: userId,
        sender_id: msg.senderId,
        sender_name: msg.senderName,
        text: msg.text,
        timestamp: msg.timestamp,
        is_admin: msg.isAdmin
      };
      const { error } = await supabase.from('chats').insert(dbMsg);
      if (error) throw error;
    } catch (e) {
      console.error('db.addChatMessage failed:', e);
    }
  },

  setCurrentUser: (user: User | null) => {
    // Auth is handled by Supabase
  }
};
