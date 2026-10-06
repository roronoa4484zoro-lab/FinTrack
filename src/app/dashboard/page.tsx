'use client';
import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  LogOut,
  Download,
  Search,
  Filter,
  PieChart,
  Target,
  Sparkles,
  TrendingUp,
  X,
  Trash2,
  Calendar,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency, CURRENCY_CONFIG } from '@/lib/currency';

interface SummaryData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate?: number;
  transactionCount?: number;
}

interface TransactionItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  category_id: string;
  category_name: string;
  type: 'income' | 'expense';
}

interface CategoryItem {
  id: string;
  name: string;
  type: 'income' | 'expense';
}

interface BudgetItem {
  id: string;
  category_id: string;
  category_name: string;
  amount: number;
  spent: number;
  remaining: number;
  percentage: number;
  month?: string;
  is_exceeded: boolean;
}

interface GoalItem {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date?: string | null;
  progress_percentage: number;
}

export default function Dashboard() {
  const [summary, setSummary] = useState<SummaryData>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    savingsRate: 0,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // AI State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);

  // Form states
  const [newTx, setNewTx] = useState({
    amount: '',
    category_id: '',
    type: 'expense' as 'income' | 'expense',
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

  const [selectedBudgetMonth, setSelectedBudgetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [budgetModalError, setBudgetModalError] = useState<string | null>(null);
  const [goalModalError, setGoalModalError] = useState<string | null>(null);
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);
  const [goalSubmitting, setGoalSubmitting] = useState(false);
  const [loadingBudgets, setLoadingBudgets] = useState(false);
  const [loadingGoals, setLoadingGoals] = useState(false);

  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  const [newBudget, setNewBudget] = useState({
    category_id: '',
    amount: '',
    month: new Date().toISOString().slice(0, 7),
  });

  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
  });

  const [txSubmitting, setTxSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active View Tab: 'overview' | 'budgets' | 'goals'
  const [activeTab, setActiveTab] = useState<'overview' | 'budgets' | 'goals'>('overview');

  useEffect(() => {
    let isMounted = true;
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 4000);

    loadDashboardData();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, []);

  async function fetchUserCategories() {
    try {
      setLoadingCategories(true);
      setCategoriesError(null);
      const catRes = await fetch('/api/transactions/category');
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
      } else {
        setCategoriesError('Could not load categories. Please retry.');
      }
    } catch {
      setCategoriesError('Network error loading categories.');
    } finally {
      setLoadingCategories(false);
    }
  }

  async function fetchBudgets(month?: string) {
    try {
      setLoadingBudgets(true);
      const targetM = month || selectedBudgetMonth;
      const res = await fetch(`/api/budgets?month=${targetM}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data.budgets || []);
      }
    } catch (err: any) {
      console.error('Fetch budgets error:', err?.message);
    } finally {
      setLoadingBudgets(false);
    }
  }

  async function fetchGoals() {
    try {
      setLoadingGoals(true);
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        setGoals(Array.isArray(data) ? data : (data.goals || []));
      }
    } catch (err: any) {
      console.error('Fetch goals error:', err?.message);
    } finally {
      setLoadingGoals(false);
    }
  }

  async function loadDashboardData(targetMonth?: string) {
    try {
      setLoading(true);
      const bMonth = targetMonth || selectedBudgetMonth;
      const [sumRes, txRes, catRes, bRes, gRes] = await Promise.all([
        fetch('/api/transactions/summary'),
        fetch('/api/transactions/list?limit=50'),
        fetch('/api/transactions/category'),
        fetch(`/api/budgets?month=${bMonth}`),
        fetch('/api/goals'),
      ]);

      if (sumRes.status === 401 || txRes.status === 401) {
        window.location.replace('/login');
        return;
      }

      if (sumRes.ok) setSummary(await sumRes.json());
      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData.transactions || txData || []);
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(Array.isArray(catData) ? catData : []);
        setCategoriesError(null);
      } else {
        setCategoriesError('Could not load categories');
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBudgets(bData.budgets || []);
      }
      if (gRes.ok) {
        const gData = await gRes.json();
        setGoals(Array.isArray(gData) ? gData : (gData.goals || []));
      }
    } catch (e: any) {
      console.error('Error fetching dashboard records:', e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.replace('/login');
    } catch {
      window.location.replace('/login');
    }
  }

  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    if (!newTx.amount || parseFloat(newTx.amount) <= 0) {
      setModalError('Please enter a valid amount greater than 0');
      return;
    }

    if (!newTx.category_id) {
      setModalError('Please select a valid category from the list');
      return;
    }

    if (!newTx.date) {
      setModalError('Please select a valid transaction date');
      return;
    }

    setTxSubmitting(true);
    setModalError(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newTx.amount).toFixed(2),
          category_id: newTx.category_id,
          type: newTx.type,
          description: newTx.description.trim(),
          date: newTx.date,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        let errMsg = err.error || 'Failed to record transaction';
        if (res.status === 401) {
          errMsg = 'Your session has expired. Please sign in again.';
        } else if (res.status === 403) {
          errMsg = "You don't have access to this category.";
        } else if (res.status === 404) {
          errMsg = 'Category not found.';
        } else if (res.status === 422) {
          errMsg = 'Please check the transaction details.';
        } else if (res.status === 429) {
          errMsg = 'Too many requests. Please try again later.';
        }
        setModalError(errMsg);
        return;
      }

      setShowAddTxModal(false);
      setModalError(null);
      setNewTx({
        amount: '',
        category_id: '',
        type: 'expense',
        description: '',
        date: new Date().toISOString().slice(0, 10),
      });
      await loadDashboardData();
      setFeedbackMsg({ type: 'success', text: 'Transaction recorded securely!' });
    } catch {
      setModalError('Error connecting to server. Please try again.');
    } finally {
      setTxSubmitting(false);
    }
  }

  async function handleDeleteTransaction(id: string) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadDashboardData();
      }
    } catch (err: any) {
      console.error('Delete error:', err?.message);
    }
  }

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    if (!newBudget.amount || parseFloat(newBudget.amount) <= 0) {
      setBudgetModalError('Please enter a budget amount greater than 0');
      return;
    }
    if (!newBudget.category_id) {
      setBudgetModalError('Please select an expense category');
      return;
    }

    setBudgetSubmitting(true);
    setBudgetModalError(null);
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = errData.error || 'Failed to create budget';
        if (res.status === 409) {
          errMsg = 'Budget already exists for this category this month.';
        } else if (res.status === 403) {
          errMsg = 'This category is unavailable or access denied.';
        }
        setBudgetModalError(errMsg);
        return;
      }

      setShowAddBudgetModal(false);
      setBudgetModalError(null);
      setNewBudget({
        category_id: '',
        amount: '',
        month: selectedBudgetMonth,
      });
      await fetchBudgets(newBudget.month || selectedBudgetMonth);
      setFeedbackMsg({ type: 'success', text: 'Budget created successfully!' });
    } catch {
      setBudgetModalError('Could not save budget. Please try again.');
    } finally {
      setBudgetSubmitting(false);
    }
  }

  async function handleDeleteBudget(id: string) {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    try {
      const res = await fetch(`/api/budgets?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchBudgets(selectedBudgetMonth);
        setFeedbackMsg({ type: 'success', text: 'Budget deleted successfully' });
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete budget');
      }
    } catch (err: any) {
      console.error('Delete budget error:', err?.message);
    }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.title.trim()) {
      setGoalModalError('Goal title is required');
      return;
    }
    if (!newGoal.target_amount || parseFloat(newGoal.target_amount) <= 0) {
      setGoalModalError('Target amount must be greater than 0');
      return;
    }

    setGoalSubmitting(true);
    setGoalModalError(null);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setGoalModalError(errData.error || 'Could not save goal. Please try again.');
        return;
      }

      setShowAddGoalModal(false);
      setGoalModalError(null);
      setNewGoal({ title: '', target_amount: '', current_amount: '0', target_date: '' });
      await fetchGoals();
      setFeedbackMsg({ type: 'success', text: 'Savings goal created successfully!' });
    } catch {
      setGoalModalError('Could not save goal. Please try again.');
    } finally {
      setGoalSubmitting(false);
    }
  }

  async function handleDeleteGoal(id: string) {
    if (!confirm('Are you sure you want to delete this savings goal?')) return;
    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchGoals();
        setFeedbackMsg({ type: 'success', text: 'Savings goal deleted successfully' });
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to delete goal');
      }
    } catch (err: any) {
      console.error('Delete goal error:', err?.message);
    }
  }

  async function handleAiAsk() {
    if (!aiQuery.trim()) return;
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: aiQuery }),
      });
      const data = await res.json();
      setAiResponse(data.answer || 'The AI could not provide an answer.');
    } catch {
      setAiResponse('Error connecting to the AI assistant.');
    } finally {
      setLoadingAi(false);
    }
  }

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesQuery =
      searchQuery === '' ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || t.type === selectedType;
    const matchesCat = selectedCategory === 'all' || t.category_name === selectedCategory;

    return matchesQuery && matchesType && matchesCat;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-700 p-4">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-semibold text-lg text-slate-800">Loading FinTrack Security Vault...</p>
        <p className="text-xs text-slate-400 mt-1 mb-4">Verifying session encryption & access credentials</p>
        <div className="flex gap-3">
          <a
            href="/login"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
          >
            Go to Login
          </a>
          <button
            onClick={() => setLoading(false)}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm">
              F
            </div>
            <div>
              <span className="font-bold text-xl text-slate-900 tracking-tight">FinTrack</span>
              <span className="ml-2 text-xs bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                AES-256 Secured
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="/api/export"
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
              download
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
            </a>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Financial Overview</h1>
            <p className="text-sm text-slate-500">Live bank-grade encrypted wealth tracking & insights</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const defaultCat = categories.find((c) => c.type === 'expense') || categories[0];
                setNewTx({
                  amount: '',
                  category_id: defaultCat ? defaultCat.id : '',
                  type: 'expense',
                  description: '',
                  date: new Date().toISOString().slice(0, 10),
                });
                setModalError(null);
                setShowAddTxModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 text-white font-medium text-sm px-4 py-2.5 rounded-xl hover:bg-blue-700 shadow-sm transition active:scale-95"
            >
              <Plus size={18} /> Add Transaction
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`p-4 rounded-xl text-sm font-medium flex justify-between items-center ${
              feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            <span>{feedbackMsg.text}</span>
            <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatTile
            title="Total Balance"
            amount={summary.balance}
            icon={<Wallet className="text-blue-600" size={24} />}
            color={summary.balance >= 0 ? 'text-blue-600' : 'text-red-600'}
            subtext="Available Liquid Net Worth"
          />
          <StatTile
            title="Total Income"
            amount={summary.totalIncome}
            icon={<ArrowUpCircle className="text-emerald-600" size={24} />}
            color="text-emerald-600"
            subtext="Inflows Recorded"
          />
          <StatTile
            title="Total Expenses"
            amount={summary.totalExpense}
            icon={<ArrowDownCircle className="text-rose-600" size={24} />}
            color="text-rose-600"
            subtext="Outflows Recorded"
          />
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Savings Rate</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{summary.savingsRate || 0}%</p>
              <p className="text-xs text-slate-400 mt-0.5">Of gross income retained</p>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'overview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Transactions & Analytics
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'budgets' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Monthly Budgets ({budgets.length})
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`pb-3 text-sm font-semibold transition border-b-2 ${
              activeTab === 'goals' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Savings Goals ({goals.length})
          </button>
        </div>

        {/* TAB 1: Transactions & AI */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Search, Filter & List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filter Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search transactions by note or category..."
                    className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                  >
                    <option value="all">All Types</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </select>

                  <select
                    className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transactions Table / List */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h3 className="font-semibold text-slate-800 text-sm">
                    Recent Records ({filteredTransactions.length})
                  </h3>
                  <span className="text-xs text-slate-500">Live decrypted from vault</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredTransactions.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                      <p className="font-medium">No transactions matched your criteria.</p>
                      <p className="text-xs mt-1">Try resetting filters or clicking Add Transaction above.</p>
                    </div>
                  ) : (
                    filteredTransactions.map((t) => (
                      <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`p-2.5 rounded-xl ${
                              t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-sm">{t.description || 'General Transaction'}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {t.category_name}
                              </span>
                              <span>{new Date(t.date).toLocaleDateString()}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <p
                            className={`font-bold text-sm sm:text-base ${
                              t.type === 'income' ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                          </p>
                          <button
                            onClick={() => handleDeleteTransaction(t.id)}
                            className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
                            title="Delete record"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Col: AI Finance Coach */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-lg border border-slate-700 h-fit sticky top-24">
                <div className="flex items-center gap-2 mb-2 text-blue-400">
                  <div className="p-2 bg-blue-500/20 rounded-xl">
                    <Sparkles size={20} />
                  </div>
                  <h2 className="font-bold text-lg text-white">FinTrack AI Assistant</h2>
                </div>
                <p className="text-xs text-slate-300 mb-5">
                  Private, anonymized financial advisor grounded strictly in your personal records.
                </p>

                <div className="space-y-4">
                  <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-700/60 text-xs sm:text-sm min-h-[140px] max-h-[340px] overflow-y-auto whitespace-pre-wrap text-slate-200">
                    {aiResponse || <span className="text-slate-500 italic">Ask anything about your spending breakdown, budgets, or savings optimization!</span>}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. How much did I spend this month?"
                      className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm bg-slate-800/90 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
                    />
                    <button
                      onClick={handleAiAsk}
                      disabled={loadingAi}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2.5 rounded-xl disabled:opacity-50 transition text-xs sm:text-sm shadow-md"
                    >
                      {loadingAi ? 'Thinking...' : 'Ask'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Budgets */}
        {activeTab === 'budgets' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Category Spending Limits</h2>
                <p className="text-xs text-slate-500">Track and constrain monthly spending with automatic alerts</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="month"
                  value={selectedBudgetMonth}
                  onChange={(e) => {
                    const m = e.target.value;
                    setSelectedBudgetMonth(m);
                    fetchBudgets(m);
                  }}
                  className="text-xs sm:text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    const firstExpCat = categories.find((c) => c.type === 'expense') || categories[0];
                    setNewBudget({
                      category_id: firstExpCat ? firstExpCat.id : '',
                      amount: '',
                      month: selectedBudgetMonth,
                    });
                    setBudgetModalError(null);
                    setShowAddBudgetModal(true);
                  }}
                  className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={16} /> New Budget
                </button>
              </div>
            </div>

            {loadingBudgets ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-2 text-blue-600 animate-spin" />
                <p className="font-semibold text-slate-700">Loading budgets...</p>
              </div>
            ) : budgets.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <PieChart size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No active budgets for this month.</p>
                <p className="text-xs mt-1">Set monthly limits to maintain control over discretionary expenses.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {budgets.map((b) => (
                  <div key={b.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{b.category_name}</h4>
                        <p className="text-xs text-slate-400">{b.month}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            b.is_exceeded
                              ? 'bg-rose-100 text-rose-700'
                              : b.percentage >= 80
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {b.percentage}%
                        </span>
                        <button
                          onClick={() => handleDeleteBudget(b.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                          title="Delete budget"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            b.is_exceeded ? 'bg-rose-600' : b.percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, b.percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                        <span>Spent: {formatCurrency(b.spent)}</span>
                        <span>Limit: {formatCurrency(b.amount)}</span>
                      </div>
                    </div>

                    {b.is_exceeded && (
                      <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">
                        ⚠️ Budget exceeded by {formatCurrency(b.spent - b.amount)}!
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Goals */}
        {activeTab === 'goals' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Savings Milestones</h2>
                <p className="text-xs text-slate-500">Plan and track progress toward major financial goals</p>
              </div>
              <button
                onClick={() => {
                  setNewGoal({ title: '', target_amount: '', current_amount: '0', target_date: '' });
                  setGoalModalError(null);
                  setShowAddGoalModal(true);
                }}
                className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={16} /> New Goal
              </button>
            </div>

            {loadingGoals ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <RefreshCw size={32} className="mx-auto mb-2 text-blue-600 animate-spin" />
                <p className="font-semibold text-slate-700">Loading savings goals...</p>
              </div>
            ) : goals.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <Target size={40} className="mx-auto mb-2 text-slate-300" />
                <p className="font-semibold text-slate-700">No savings goals created.</p>
                <p className="text-xs mt-1">Create targets for vacation, emergency funds, or gadgets!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {goals.map((g) => (
                  <div key={g.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{g.title}</h4>
                        {g.target_date && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar size={12} /> Target: {new Date(g.target_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                          {g.progress_percentage}%
                        </span>
                        <button
                          onClick={() => handleDeleteGoal(g.id)}
                          className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                          title="Delete goal"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                        <span>Saved: {formatCurrency(g.current_amount)}</span>
                        <span>Goal: {formatCurrency(g.target_amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Add Transaction (Accessible, Non-Overlapping, Type-Segmented) */}
      {showAddTxModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-add-tx-title"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddTxModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowAddTxModal(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 id="modal-add-tx-title" className="font-bold text-xl text-slate-900">
                  Record New Transaction
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Field-level encrypted & isolated to your account</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTxModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between mb-4">
                <span>{modalError}</span>
                <button
                  type="button"
                  onClick={() => setModalError(null)}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleAddTransaction} className="space-y-5">
              {/* Transaction Type Segmented Control */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Transaction Type
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      const firstIncomeCat = categories.find((c) => c.type === 'income');
                      setNewTx({
                        ...newTx,
                        type: 'income',
                        category_id: firstIncomeCat ? firstIncomeCat.id : newTx.category_id,
                      });
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                      newTx.type === 'income'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowUpCircle size={16} /> Income (Inflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstExpenseCat = categories.find((c) => c.type === 'expense');
                      setNewTx({
                        ...newTx,
                        type: 'expense',
                        category_id: firstExpenseCat ? firstExpenseCat.id : newTx.category_id,
                      });
                    }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition ${
                      newTx.type === 'expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowDownCircle size={16} /> Expense (Outflow)
                  </button>
                </div>
              </div>

              {/* Amount Field */}
              <div>
                <label htmlFor="tx-amount" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Amount ({CURRENCY_CONFIG.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">
                    {CURRENCY_CONFIG.symbol}
                  </span>
                  <input
                    id="tx-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100000000"
                    required
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                    value={newTx.amount}
                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  />
                </div>
              </div>

              {/* Category Field with Dynamic States */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="tx-category" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category
                  </label>
                  {categoriesError && (
                    <button
                      type="button"
                      onClick={fetchUserCategories}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                    >
                      <RefreshCw size={12} /> Retry Loading
                    </button>
                  )}
                </div>

                {loadingCategories ? (
                  <div className="w-full px-3.5 py-2.5 text-xs text-slate-500 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 animate-pulse">
                    <RefreshCw size={14} className="animate-spin text-blue-600" />
                    Loading your categories...
                  </div>
                ) : categoriesError ? (
                  <div className="w-full p-2.5 text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{categoriesError}</span>
                  </div>
                ) : (
                  <select
                    id="tx-category"
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900 cursor-pointer"
                    value={newTx.category_id}
                    onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                  >
                    <option value="">Select Category</option>
                    {categories
                      .filter((c) => c.type === newTx.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    {categories.filter((c) => c.type === newTx.type).length === 0 && (
                      <option disabled value="">
                        No {newTx.type} categories found
                      </option>
                    )}
                  </select>
                )}
              </div>

              {/* Description / Note Field */}
              <div>
                <label htmlFor="tx-desc" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Description / Note (Optional)
                </label>
                <input
                  id="tx-desc"
                  type="text"
                  maxLength={255}
                  placeholder="e.g. Monthly Grocery Shopping"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                />
              </div>

              {/* Date Field */}
              <div>
                <label htmlFor="tx-date" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Transaction Date
                </label>
                <input
                  id="tx-date"
                  type="date"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-3 flex gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="w-1/2 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting || loadingCategories}
                  className="w-1/2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {txSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Securely'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Budget */}
      {showAddBudgetModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddBudgetModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowAddBudgetModal(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Add Monthly Budget</h3>
                <p className="text-xs text-slate-500 mt-0.5">Constrain category spending for {selectedBudgetMonth}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBudgetModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {budgetModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between mb-4">
                <span>{budgetModalError}</span>
                <button
                  type="button"
                  onClick={() => setBudgetModalError(null)}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Expense Category</label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newBudget.category_id}
                  onChange={(e) => setNewBudget({ ...newBudget, category_id: e.target.value })}
                >
                  <option value="">Select Expense Category</option>
                  {categories
                    .filter((c) => c.type === 'expense')
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Monthly Limit ({CURRENCY_CONFIG.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">
                    {CURRENCY_CONFIG.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="5000"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                    value={newBudget.amount}
                    onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Target Month</label>
                <input
                  type="month"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newBudget.month}
                  onChange={(e) => setNewBudget({ ...newBudget, month: e.target.value })}
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddBudgetModal(false)}
                  className="w-1/2 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={budgetSubmitting}
                  className="w-1/2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {budgetSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Budget'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Goal */}
      {showAddGoalModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddGoalModal(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowAddGoalModal(false);
          }}
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-xl text-slate-900">Create Savings Goal</h3>
                <p className="text-xs text-slate-500 mt-0.5">Track financial milestones with real progress</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGoalModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {goalModalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between mb-4">
                <span>{goalModalError}</span>
                <button
                  type="button"
                  onClick={() => setGoalModalError(null)}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Goal Title</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  placeholder="e.g. Emergency Fund / Laptop"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Target Amount ({CURRENCY_CONFIG.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">
                    {CURRENCY_CONFIG.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="60000"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                    value={newGoal.target_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Already Saved ({CURRENCY_CONFIG.symbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-400 font-bold text-sm">
                    {CURRENCY_CONFIG.symbol}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="10000"
                    className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                    value={newGoal.current_amount}
                    onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Target Date (Optional)</label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-900"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                />
              </div>
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddGoalModal(false)}
                  className="w-1/2 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={goalSubmitting}
                  className="w-1/2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {goalSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" /> Saving...
                    </>
                  ) : (
                    'Save Goal'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({ title, amount, icon, color, subtext }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <p className={`text-2xl font-bold ${color} mt-1`}>{formatCurrency(amount || 0)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

