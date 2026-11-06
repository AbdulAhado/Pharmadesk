import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Plus, Calendar, Download, Trash2, Edit,
  RefreshCw, CheckCircle2, AlertCircle, X, Lock, Unlock,
  Wallet, TrendingDown, Tag
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cashSession, setCashSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateRange, setDateRange] = useState('month'); // 'today', 'week', 'month', 'all'

  // Modals
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [openSessionModalOpen, setOpenSessionModalOpen] = useState(false);
  const [closeSessionModalOpen, setCloseSessionModalOpen] = useState(false);

  // Form State
  const [expenseFormData, setExpenseFormData] = useState({
    title: '',
    category: 'Miscellaneous',
    amount: '',
    payment_method: 'CASH', // 'CASH' or 'BANK'
    expense_date: new Date().toISOString().slice(0, 10),
    notes: ''
  });

  const [openingFloat, setOpeningFloat] = useState('5000');
  const [closingActual, setClosingActual] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!api?.expenses) return;
    setLoading(true);
    try {
      let from = undefined;
      const now = new Date();
      if (dateRange === 'today') {
        from = now.toISOString().slice(0, 10);
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10);
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from = d.toISOString().slice(0, 10);
      }

      const [expList, cats, session] = await Promise.all([
        api.expenses.getAll({
          from_date: from,
          category: selectedCategory || undefined
        }),
        api.expenses.getCategories(),
        api.expenses.getCashSession()
      ]);

      setExpenses(expList || []);
      setCategories(cats || []);
      setCashSession(session || null);
    } catch (err) {
      toast.error('Failed to load expenses data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cash Session Handlers
  const handleOpenCashSession = async (e) => {
    e.preventDefault();
    const floatVal = parseFloat(openingFloat) || 0;
    try {
      await api.expenses.openCashSession({ opening_balance: floatVal });
      toast.success(`Cash session opened with float of ${fmt(floatVal)}!`);
      setOpenSessionModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to open cash session: ' + err.message);
    }
  };

  const handleCloseCashSession = async (e) => {
    e.preventDefault();
    const actual = parseFloat(closingActual) || 0;
    try {
      await api.expenses.closeCashSession({
        closing_balance: actual,
        notes: closingNotes
      });
      toast.success('Cash session closed successfully!');
      setCloseSessionModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to close session: ' + err.message);
    }
  };

  // Expense Handlers
  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amountVal = parseFloat(expenseFormData.amount);
    if (!amountVal || amountVal <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!expenseFormData.title.trim()) {
      toast.error('Expense title is required');
      return;
    }

    try {
      await api.expenses.create({
        ...expenseFormData,
        amount: amountVal
      });
      toast.success('Expense recorded successfully!');
      setExpenseModalOpen(false);
      setExpenseFormData({
        title: '',
        category: categories[0] || 'Miscellaneous',
        amount: '',
        payment_method: 'CASH',
        expense_date: new Date().toISOString().slice(0, 10),
        notes: ''
      });
      loadData();
    } catch (err) {
      toast.error('Failed to save expense: ' + err.message);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await api.expenses.delete(id);
      toast.success('Expense deleted');
      loadData();
    } catch (err) {
      toast.error('Failed to delete expense: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (expenses.length === 0) return;
    const headers = ['Title', 'Category', 'Amount (PKR)', 'Payment Method', 'Date', 'Notes'];
    const rows = expenses.map(e => [
      `"${e.title}"`,
      `"${e.category}"`,
      e.amount || 0,
      e.payment_method,
      e.expense_date,
      `"${e.notes || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Expenses exported!');
  };

  const totalExpenseVal = expenses.reduce((acc, it) => acc + (it.amount || 0), 0);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Cash Register Session Banner ── */}
      <div className="card p-4 bg-slate-900 border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${cashSession ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
              {cashSession ? <Unlock size={22} /> : <Lock size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-white">Daily Cash Drawer Session</span>
                <span className={`badge ${cashSession ? 'badge-success' : 'badge-danger'} text-xs`}>
                  {cashSession ? 'ACTIVE / OPEN' : 'CLOSED'}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                {cashSession ? `Opened on ${cashSession.opened_at || 'Today'} with opening float of ${fmt(cashSession.opening_balance)}` : 'Open a cash drawer session to track drawer float and reconciliation'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {cashSession ? (
              <button
                onClick={() => {
                  setClosingActual('');
                  setClosingNotes('');
                  setCloseSessionModalOpen(true);
                }}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 text-rose-400 border-rose-900/50 hover:bg-rose-900/20"
              >
                <Lock size={15} /> Close Drawer / End Day
              </button>
            ) : (
              <button
                onClick={() => setOpenSessionModalOpen(true)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-lg shadow-cyan-900/30"
              >
                <Unlock size={15} /> Open Cash Drawer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Header & Actions ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <DollarSign className="text-cyan-400" size={22} /> Expenses & Cash Register
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Log pharmacy overhead expenses, utility bills, salaries, supplies, and petty cash
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpenseModalOpen(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-lg shadow-cyan-900/30"
          >
            <Plus size={16} /> Log Expense
          </button>
        </div>
      </div>

      {/* ── Filters & Metrics ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar size={14} /> Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Expenses' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateRange(tab.id)}
              className={`btn btn-sm text-xs font-semibold py-1.5 px-3 ${
                dateRange === tab.id ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input py-1 text-xs w-44 ml-2"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-slate-400">
            Total Spent: <span className="font-bold text-rose-400 text-sm">{fmt(totalExpenseVal)}</span>
          </div>
          <button onClick={loadData} className="btn btn-secondary p-1.5" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Expenses Table ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} /> Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <DollarSign size={36} className="mb-2 stroke-1" />
              <p>No expense entries logged for this period.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Expense Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th>Payment Mode</th>
                  <th>Notes</th>
                  <th className="text-right">Amount</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-800/40">
                    <td className="font-bold text-white text-xs">{exp.title}</td>
                    <td>
                      <span className="badge badge-info text-xs">{exp.category}</span>
                    </td>
                    <td className="text-xs text-slate-400">{exp.expense_date}</td>
                    <td>
                      <span className="badge badge-secondary text-xs uppercase">{exp.payment_method}</span>
                    </td>
                    <td className="text-xs text-slate-400">{exp.notes || '—'}</td>
                    <td className="text-right font-bold text-rose-400">{fmt(exp.amount)}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete expense"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Log Expense Modal ── */}
      {expenseModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <DollarSign size={18} className="text-cyan-400" /> Log Pharmacy Expense
              </h3>
              <button onClick={() => setExpenseModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="modal-body p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electric Bill, Tea/Refreshment, Staff Salary"
                  value={expenseFormData.title}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, title: e.target.value })}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Category</label>
                  <input
                    type="text"
                    list="expense-categories"
                    value={expenseFormData.category}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, category: e.target.value })}
                    className="input text-sm py-2 w-full"
                  />
                  <datalist id="expense-categories">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Amount (PKR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseFormData.amount}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, amount: e.target.value })}
                    className="input text-sm py-2 w-full font-bold text-rose-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Paid From</label>
                  <select
                    value={expenseFormData.payment_method}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, payment_method: e.target.value })}
                    className="input text-sm py-2 w-full"
                  >
                    <option value="CASH">Cash Drawer (Register)</option>
                    <option value="BANK">Bank Account / Online</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={expenseFormData.expense_date}
                    onChange={(e) => setExpenseFormData({ ...expenseFormData, expense_date: e.target.value })}
                    className="input text-sm py-2 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Notes / Receipt #</label>
                <input
                  type="text"
                  placeholder="Optional details or reference"
                  value={expenseFormData.notes}
                  onChange={(e) => setExpenseFormData({ ...expenseFormData, notes: e.target.value })}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setExpenseModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary py-2 font-bold">
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Open Cash Drawer Modal ── */}
      {openSessionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Unlock size={18} className="text-emerald-400" /> Open Cash Session
              </h3>
              <button onClick={() => setOpenSessionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleOpenCashSession} className="modal-body p-4 flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Opening Float Cash (PKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(e.target.value)}
                  className="input text-lg font-bold py-2 w-full text-emerald-400"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  The initial petty cash placed in the register for change.
                </span>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setOpenSessionModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary py-2 font-bold">
                  Open Drawer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Close Cash Drawer Modal ── */}
      {closeSessionModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-sm">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Lock size={18} className="text-rose-400" /> End Day & Close Register
              </h3>
              <button onClick={() => setCloseSessionModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCloseCashSession} className="modal-body p-4 flex flex-col gap-4">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Actual Cash Counted in Drawer (PKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="Count physical cash"
                  value={closingActual}
                  onChange={(e) => setClosingActual(e.target.value)}
                  className="input text-lg font-bold py-2 w-full text-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Reconciliation Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 PKR shortage or all balanced"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setCloseSessionModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger py-2 font-bold">
                  Close & Reconcile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
