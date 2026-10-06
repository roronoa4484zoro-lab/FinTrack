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
} from 'lucide-react';

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
    description: '',
    date: new Date().toISOString().slice(0, 10),
  });

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

  async function loadDashboardData() {
    try {
      setLoading(true);
      const [sumRes, txRes, catRes, bRes, gRes] = await Promise.all([
        fetch('/api/transactions/summary'),
        fetch('/api/transactions/list?limit=50'),
        fetch('/api/transactions/category'),
        fetch('/api/budgets'),
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
      if (catRes.ok) setCategories(await catRes.json());
      if (bRes.ok) {
        const bData = await bRes.json();
        setBudgets(bData.budgets || []);
      }
      if (gRes.ok) setGoals(await gRes.json());
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
    if (!newTx.amount || !newTx.category_id) {
      setFeedbackMsg({ type: 'error', text: 'Please fill amount and category' });
      return;
    }

    setTxSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx),
      });

      if (!res.ok) {
        const err = await res.json();
        setFeedbackMsg({ type: 'error', text: err.error || 'Failed to record transaction' });
        return;
      }

      setShowAddTxModal(false);
      setNewTx({ amount: '', category_id: '', description: '', date: new Date().toISOString().slice(0, 10) });
      loadDashboardData();
      setFeedbackMsg({ type: 'success', text: 'Transaction recorded securely!' });
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Error connecting to server' });
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
    if (!newBudget.amount || !newBudget.category_id) return;
    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBudget),
      });
      if (res.ok) {
        setShowAddBudgetModal(false);
        setNewBudget({ category_id: '', amount: '', month: new Date().toISOString().slice(0, 7) });
        loadDashboardData();
      }
    } catch (err: any) {
      console.error('Budget error:', err?.message);
    }
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoal.title || !newGoal.target_amount) return;
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newGoal),
      });
      if (res.ok) {
        setShowAddGoalModal(false);
        setNewGoal({ title: '', target_amount: '', current_amount: '0', target_date: '' });
        loadDashboardData();
      }
    } catch (err: any) {
      console.error('Goal error:', err?.message);
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
              onClick={() => setShowAddTxModal(true)}
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
                            {t.type === 'income' ? '+' : '-'}${Number(t.amount).toFixed(2)}
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Category Spending Limits</h2>
                <p className="text-xs text-slate-500">Track and constrain monthly spending with automatic alerts</p>
              </div>
              <button
                onClick={() => setShowAddBudgetModal(true)}
                className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition"
              >
                + New Budget
              </button>
            </div>

            {budgets.length === 0 ? (
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
                        <span>Spent: ${b.spent.toFixed(2)}</span>
                        <span>Limit: ${b.amount.toFixed(2)}</span>
                      </div>
                    </div>

                    {b.is_exceeded && (
                      <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">
                        ⚠️ Budget exceeded by ${(b.spent - b.amount).toFixed(2)}!
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
                onClick={() => setShowAddGoalModal(true)}
                className="bg-blue-600 text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-xl hover:bg-blue-700 transition"
              >
                + New Goal
              </button>
            </div>

            {goals.length === 0 ? (
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
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                        {g.progress_percentage}%
                      </span>
                    </div>

                    <div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${Math.min(100, g.progress_percentage)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs font-medium text-slate-500 mt-2">
                        <span>Saved: ${g.current_amount.toFixed(2)}</span>
                        <span>Goal: ${g.target_amount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL 1: Add Transaction */}
      {showAddTxModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900">Record New Transaction</h3>
              <button onClick={() => setShowAddTxModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTx.category_id}
                  onChange={(e) => setNewTx({ ...newTx, category_id: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Description / Note</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly Grocery Shopping"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Date</label>
                <input
                  type="date"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  value={newTx.date}
                  onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="w-1/2 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting}
                  className="w-1/2 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-md disabled:opacity-50"
                >
                  {txSubmitting ? 'Saving...' : 'Save Securely'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add Budget */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900">Add Monthly Budget</h3>
              <button onClick={() => setShowAddBudgetModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddBudget} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Category</label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
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
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Budget Limit ($)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="5000"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newBudget.amount}
                  onChange={(e) => setNewBudget({ ...newBudget, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Month</label>
                <input
                  type="month"
                  required
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newBudget.month}
                  onChange={(e) => setNewBudget({ ...newBudget, month: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition mt-2"
              >
                Create Budget
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Goal */}
      {showAddGoalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900">Create Savings Goal</h3>
              <button onClick={() => setShowAddGoalModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Goal Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. New Laptop"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Amount ($)</label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="1500"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Already Saved ($)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="200"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newGoal.current_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Target Date</label>
                <input
                  type="date"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition mt-2"
              >
                Create Goal
              </button>
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
        <p className={`text-2xl font-bold ${color} mt-1`}>${(amount || 0).toFixed(2)}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>
      </div>
    </div>
  );
}

