
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    return mapProfile(profile);
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return (data || []).map(p => mapProfile(p)).filter((u): u is User => u !== null);
  },

  updateProfile: async (userId: string, updates: Partial<User>) => {
    const dbUpdates = mapProfileToDB(updates);
    await supabase.from('profiles').update(dbUpdates).eq('id', userId);
  },

  // To satisfy sync-style usage in legacy code
  setUsers: async (users: User[]) => {
    for (const user of users) {
      await db.updateProfile(user.id, user);
    }
  },

  // Transactions
  getTransactions: async (userId?: string): Promise<Transaction[]> => {
    let query = supabase.from('transactions').select('*').order('date', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    const { data } = await query;
    return (data || []).map(t => mapTransaction(t));
  },

  setTransactions: async (txs: Transaction[]) => {
    for (const tx of txs) {
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
    }
  },

  createTransaction: async (tx: Partial<Transaction>) => {
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
    return await supabase.from('transactions').insert(dbTx);
  },

  updateTransaction: async (txId: string, status: string) => {
    return await supabase.from('transactions').update({ status }).eq('id', txId);
  },

  // System Config
  getSystemConfig: async () => {
    const { data } = await supabase.from('system_config').select('*').eq('id', 'global').single();
    return data || null;
  },

  updateSystemConfig: async (updates: any) => {
    return await supabase.from('system_config').update(updates).eq('id', 'global');
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
    const { data } = await supabase.from('chats').select('*').eq('user_id', userId).order('timestamp', { ascending: true });
    return (data || []).map(m => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender_name,
      text: m.text,
      timestamp: m.timestamp,
      isAdmin: m.is_admin
    }));
  },

  getAllChatUserIds: async (): Promise<string[]> => {
    const { data } = await supabase.from('chats').select('user_id');
    const uniqueIds = Array.from(new Set((data || []).map((d: any) => d.user_id as string))) as string[];
    return uniqueIds;
  },

  addChatMessage: async (userId: string, msg: Partial<ChatMessage>) => {
    const dbMsg = {
      user_id: userId,
      sender_id: msg.senderId,
      sender_name: msg.senderName,
      text: msg.text,
      timestamp: msg.timestamp,
      is_admin: msg.isAdmin
    };
    return await supabase.from('chats').insert(dbMsg);
  },

  setCurrentUser: (user: User | null) => {
    // Auth is handled by Supabase
  }
};
