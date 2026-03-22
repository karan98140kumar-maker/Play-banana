import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCoins(amount: number) {
  return `${amount.toLocaleString()} Coins`;
}

export function coinsToRupees(amount: number) {
  // 1400 coins = ₹10 (140 coins = ₹1)
  return (amount / 140).toFixed(2);
}
