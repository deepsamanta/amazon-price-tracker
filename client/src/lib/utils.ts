import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateDiscountPercentage(currentPrice: number, originalPrice: number): number {
  if (!originalPrice || originalPrice <= 0) return 0;
  return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
}

export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
}

export function validateAmazonUrl(url: string): boolean {
  // Allow both amazon.in and shortened amzn.in URLs
  return /^https?:\/\/(www\.)?(amazon\.in|amzn\.in)/.test(url);
}

export function shortenText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
