
import { VIPLevel } from './types';

export const VIP_LEVELS: VIPLevel[] = [
  { id: 1, name: 'VIP 1', price: 25, dailyReturn: 1.50 },
  { id: 2, name: 'VIP 2', price: 50, dailyReturn: 3.20 },
  { id: 3, name: 'VIP 3', price: 75, dailyReturn: 5.00 },
  { id: 4, name: 'VIP 4', price: 100, dailyReturn: 7.50 },
  { id: 5, name: 'VIP 5', price: 150, dailyReturn: 12.00 },
  { id: 6, name: 'VIP 6', price: 200, dailyReturn: 18.00 },
  { id: 7, name: 'VIP 7', price: 300, dailyReturn: 28.00 },
  { id: 8, name: 'VIP 8', price: 400, dailyReturn: 38.00 },
  { id: 9, name: 'VIP 9', price: 500, dailyReturn: 50.00 },
];

export const ADMIN_CONFIG = {
  EMAIL: 'blessedsuccess68@gmail.com',
  PASSWORD: 'Blessed2007', // Note: This is for internal reference; users set their own password during signup
};

export const MIN_WITHDRAWAL = 10;
export const MINING_CYCLE_HOURS = 24;
