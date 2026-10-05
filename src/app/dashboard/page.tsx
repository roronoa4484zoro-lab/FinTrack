'use client';
import React, { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Plus } from 'lucide-react';

export default function Dashboard() {
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0, balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="flex items-center justify-center h-screen">Loading Secure Dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Financial Overview</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
          <Plus size={20} /> Add Transaction
        </button>
      </header>

      {/* Stat Tiles */}
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

      {/* Transaction List */}
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
