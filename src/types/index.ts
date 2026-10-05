export interface User {
  id: string;
  email: string;
  full_name: string;
  created_at: Date;
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
  amount: number; // We store the decrypted value in TS, but encrypted in DB
  description: string;
  date: Date;
  created_at: Date;
}

export interface AuthSession {
  userId: string;
  email: string;
  role: 'user' | 'admin';
}
