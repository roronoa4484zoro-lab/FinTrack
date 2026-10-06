export interface User {
  id: string;
  email: string;
  full_name?: string | null;
  created_at: string | Date;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  user_id?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  description: string;
  date: string | Date;
  account_id?: string | null;
  account_name?: string | null;
  created_at?: string | Date;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  spent?: number;
  remaining?: number;
  percentage?: number;
  month: string; // YYYY-MM
  created_at?: string | Date;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  progress_percentage?: number;
  created_at?: string | Date;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  category_id: string;
  category_name?: string;
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  next_date: string;
  is_active: boolean;
  created_at?: string | Date;
}

export interface FinancialAccount {
  id: string;
  user_id: string;
  name: string;
  type: 'bank' | 'cash' | 'upi' | 'credit_card' | 'savings';
  balance: number;
  created_at?: string | Date;
}

export interface AuthSession {
  userId: string;
  email?: string;
  role?: 'user' | 'admin';
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

