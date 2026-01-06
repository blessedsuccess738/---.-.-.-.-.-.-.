
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum TransactionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
  VIP_PURCHASE = 'VIP_PURCHASE',
  MINING_EARNING = 'MINING_EARNING'
}

export interface VIPLevel {
  id: number;
  name: string;
  price: number;
  dailyReturn: number;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  date: string;
  method?: string;
  receiptUrl?: string;
  description?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  walletBalance: number;
  activeVipId: number | null;
  role: UserRole;
  miningTimerStart: string | null; // ISO string
  isBanned: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  isAdmin: boolean;
}

export interface TokenAddress {
  name: string;
  address: string;
}

export interface DepositConfig {
  mainAddress: string;
  tokens: TokenAddress[];
}

export interface AppStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalMiningPayouts: number;
}
