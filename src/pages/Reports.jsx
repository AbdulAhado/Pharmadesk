import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, TrendingUp, DollarSign, Package, Download,
  Printer, Calendar, RefreshCw, Layers, PieChart as PieIcon,
  ShoppingBag, TruckIcon, AlertCircle
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function Reports() {
  const [activeReport, setActiveReport] = useState('sales'); // 'sales', 'profit', 'valuation', 'top_meds', 'payables'
  const [dateRange, setDateRange] = useState('month'); // 'today', 'week', 'month', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!api?.reports) return;
    setLoading(true);
    try {
      let from = undefined;
      let to = undefined;
      const now = new Date();

      if (dateRange === 'today') {
        from = now.toISOString().slice(0, 10);
        to = from;
      } else if (dateRange === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        from = d.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      } else if (dateRange === 'month') {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        from = d.toISOString().slice(0, 10);
        to = now.toISOString().slice(0, 10);
      } else if (dateRange === 'custom') {
        from = fromDate || undefined;
        to = toDate || undefined;
      }

      const filters = { from, to };

      if (activeReport === 'sales') {
        const res = await api.reports.getSalesSummary(filters);
        setReportData(res);
      } else if (activeReport === 'profit') {
        const res = await api.reports.getProfitReport(filters);
        setReportData(res);
      } else if (activeReport === 'valuation') {
        const res = await api.reports.getInventoryValuation();
        setReportData(res);
      } else if (activeReport === 'top_meds') {
        const res = await api.reports.getSalesByMedicine(filters);
        setReportData(res);
      } else if (activeReport === 'payables') {
        const res = await api.reports.getSupplierBalances();
        setReportData(res);
      }
    } catch (err) {
      toast.error('Failed to generate report: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [activeReport, dateRange, fromDate, toDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let headers = [];
    let rows = [];

    if (activeReport === 'sales' && Array.isArray(reportData?.daily)) {
      headers = ['Date', 'Invoices', 'Sales (PKR)', 'Discount (PKR)'];
      rows = reportData.daily.map(d => [d.date, d.count, d.total, d.discount]);
    } else if (activeReport === 'top_meds' && Array.isArray(reportData)) {
      headers = ['Medicine Name', 'Units Sold', 'Total Revenue (PKR)'];
      rows = reportData.map(m => [`"${m.medicine_name}"`, m.quantity_sold, m.total_revenue]);
    } else if (activeReport === 'payables' && Array.isArray(reportData)) {
      headers = ['Supplier Name', 'Phone', 'Outstanding Payable (PKR)'];
      rows = reportData.map(s => [`"${s.name}"`, `"${s.phone || ''}"`, s.balance]);
    } else {
      toast('Export formatted for this report', { icon: '📄' });
      return;
    }

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${activeReport}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Report exported to CSV!');
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Top Header & Report Tabs ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="text-cyan-400" size={22} /> Analytics & Reports Suite
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time financial performance, COGS profit margins, valuation, and sales metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Printer size={14} /> Print Report
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Report Selector Tabs ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
            { id: 'profit', label: 'Profit & Loss (COGS)', icon: DollarSign },
            { id: 'valuation', label: 'Inventory Valuation', icon: Package },
            { id: 'top_meds', label: 'Top Medicines', icon: ShoppingBag },
            { id: 'payables', label: 'Supplier Payables', icon: TruckIcon },
          ].map((rep) => {
            const Icon = rep.icon;
            return (
              <button
                key={rep.id}
                onClick={() => setActiveReport(rep.id)}
                className={`btn btn-sm text-xs font-semibold py-1.5 px-3 flex items-center gap-1.5 ${
                  activeReport === rep.id ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                <Icon size={14} />
                <span>{rep.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter (for reports that need dates) */}
        {activeReport !== 'valuation' && activeReport !== 'payables' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Period:</span>
            {['today', 'week', 'month', 'custom'].map((d) => (
              <button
                key={d}
                onClick={() => setDateRange(d)}
                className={`btn btn-sm text-xs py-1 px-2.5 capitalize ${
                  dateRange === d ? 'btn-primary' : 'btn-secondary'
                }`}
              >
                {d}
              </button>
            ))}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="input py-1 text-xs"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="input py-1 text-xs"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Report Content ── */}
      <div className="card flex-1 overflow-hidden flex flex-col p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            <RefreshCw className="animate-spin mr-2" size={24} /> Generating report data...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col gap-4">
            
            {/* 1. SALES SUMMARY REPORT */}
            {activeReport === 'sales' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Total Net Sales</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">
                      {fmt(reportData?.totals?.net_sales || reportData?.total_sales || 0)}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Invoices Generated</span>
                    <div className="text-2xl font-black text-cyan-400 mt-1">
                      {(reportData?.totals?.invoice_count || reportData?.invoice_count || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Discounts Conceded</span>
                    <div className="text-2xl font-black text-rose-400 mt-1">
                      {fmt(reportData?.totals?.total_discount || reportData?.total_discount || 0)}
                    </div>
                  </div>
                </div>

                {/* Sales Chart */}
                {reportData?.daily && reportData.daily.length > 0 && (
                  <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800 h-64">
                    <span className="text-xs font-semibold text-slate-300 block mb-2">Daily Revenue Trend</span>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={reportData.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} />
                        <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }} />
                        <Line type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={2} name="Sales (PKR)" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}

            {/* 2. PROFIT & LOSS REPORT */}
            {activeReport === 'profit' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Total Sales Revenue</span>
                    <div className="text-xl font-bold text-white mt-1">{fmt(reportData?.total_sales || 0)}</div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Cost of Goods Sold (COGS)</span>
                    <div className="text-xl font-bold text-amber-400 mt-1">{fmt(reportData?.total_cogs || 0)}</div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Gross Profit</span>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{fmt(reportData?.gross_profit || 0)}</div>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Net Profit Margin</span>
                    <div className="text-xl font-black text-cyan-400 mt-1">
                      {reportData?.total_sales ? (((reportData.gross_profit || 0) / reportData.total_sales) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs">
                  <h4 className="font-bold text-white text-sm mb-2">Profit Calculation Note:</h4>
                  <p className="text-slate-400 leading-relaxed">
                    COGS (Cost of Goods Sold) is computed automatically using the exact batch purchase price associated with each individual medicine sold via FEFO FIFO tracking.
                  </p>
                </div>
              </>
            )}

            {/* 3. INVENTORY VALUATION */}
            {activeReport === 'valuation' && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Total Purchase Cost Valuation</span>
                    <div className="text-2xl font-black text-amber-400 mt-1">{fmt(reportData?.total_purchase_cost || 0)}</div>
                    <span className="text-[10px] text-slate-500">Actual capital invested in current stock</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Total Retail Sale Valuation</span>
                    <div className="text-2xl font-black text-emerald-400 mt-1">{fmt(reportData?.total_retail_value || 0)}</div>
                    <span className="text-[10px] text-slate-500">Projected revenue upon full stock sale</span>
                  </div>
                  <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <span className="text-xs text-slate-400">Projected Unrealized Margin</span>
                    <div className="text-2xl font-black text-cyan-400 mt-1">
                      {fmt((reportData?.total_retail_value || 0) - (reportData?.total_purchase_cost || 0))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 4. TOP MEDICINES */}
            {activeReport === 'top_meds' && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  Top Selling Pharmaceuticals by Volume & Revenue
                </span>
                {(!reportData || reportData.length === 0) ? (
                  <div className="text-center py-10 text-slate-500 text-xs">No sales data for this period.</div>
                ) : (
                  <table className="table w-full text-xs">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Medicine</th>
                        <th className="text-center">Units Sold</th>
                        <th className="text-right">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="font-bold text-slate-400">#{idx + 1}</td>
                          <td className="font-semibold text-white">{m.medicine_name || m.name}</td>
                          <td className="text-center font-bold text-cyan-300">{m.quantity_sold}</td>
                          <td className="text-right font-bold text-emerald-400">{fmt(m.total_revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 5. SUPPLIER PAYABLES */}
            {activeReport === 'payables' && (
              <div className="flex flex-col gap-3">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Outstanding Payables Ledger (Distributors & Suppliers)
                </span>
                {(!reportData || reportData.length === 0) ? (
                  <div className="text-center py-10 text-slate-500 text-xs">No outstanding supplier balances. All clear!</div>
                ) : (
                  <table className="table w-full text-xs">
                    <thead>
                      <tr>
                        <th>Supplier / Distributor</th>
                        <th>Phone</th>
                        <th className="text-right">Outstanding Balance (PKR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((sup, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40">
                          <td className="font-bold text-white">{sup.name}</td>
                          <td className="text-slate-400">{sup.phone || '—'}</td>
                          <td className="text-right font-bold text-rose-400">{fmt(sup.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
