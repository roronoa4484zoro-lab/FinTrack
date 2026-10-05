'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // AI State
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [summaryRes, transRes] = await Promise.all([
          fetch('/api/transactions/summary'),
          fetch('/api/transactions/list')
        ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (transRes.ok) setTransactions(await transRes.json());
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

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
    } catch (e) {
      setAiResponse('Error connecting to the AI assistant.');
    } finally {
      setLoadingAi(false);
    }
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Secure Dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Financial Overview</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={20} /> Add Transaction
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatTile
              title="Total Balance"
              amount={summary.balance}
              icon={<Wallet className="text-blue-500" />}
              color="text-blue-600"
            />
            <StatTile
              title="Total Income"
              amount={summary.totalIncome}
              icon={<ArrowUpCircle className="text-green-500" />}
              color="text-green-600"
            />
            <StatTile
              title="Total Expenses"
              amount={summary.totalExpense}
              icon={<ArrowDownCircle className="text-red-500" />}
              color="text-red-600"
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-semibold text-gray-700">Recent Transactions</div>
            <div className="divide-y divide-gray-50">
              {transactions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No transactions found. Start adding some!</div>
              ) : (
                transactions.map((t: any) => (
                  <div key={t.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-800">{t.description || 'No description'}</p>
                      <p className="text-xs text-gray-400">{t.category_name} • {new Date(t.date).toLocaleDateString()}</p>
                    </div>
                    <p className={`font-bold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {t.amount > 0 ? '+' : ''}${t.amount}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 h-fit sticky top-6">
          <div className="flex items-center gap-2 mb-4 text-blue-600">
            <div className="p-2 bg-blue-100 rounded-lg">✨</div>
            <h2 className="font-bold text-lg">AI Finance Coach</h2>
          </div>
          <p className="text-sm text-gray-500 mb-4">Ask me about your spending patterns or get budgeting advice.</p>

          <div className="space-y-4">
            <div className="bg-white p-3 rounded-lg border border-gray-200 text-sm min-h-[100px] max-h-[300px] overflow-y-auto">
              {aiResponse || <span className="text-gray-400 italic">Waiting for your question...</span>}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ask AI..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
              />
              <button
                onClick={handleAiAsk}
                disabled={loadingAi}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm"
              >
                {loadingAi ? '...' : 'Ask'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({ title, amount, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className="p-3 bg-gray-50 rounded-full">{icon}</div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>${amount.toFixed(2)}</p>
      </div>
    </div>
  );
}
