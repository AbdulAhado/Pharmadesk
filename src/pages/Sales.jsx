import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, Search, Calendar, DollarSign, Download,
  Printer, Eye, RefreshCw, X, CreditCard, User, CheckCircle2,
  RotateCcw, ArrowLeftRight, AlertCircle, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('today'); // 'today', 'week', 'month', 'all', 'custom'
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected Sale for Details & Reprint Modal
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);

  // Return / Refund Modal State
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [saleForReturn, setSaleForReturn] = useState(null);
  const [returnItemsState, setReturnItemsState] = useState([]);
  const [returnReason, setReturnReason] = useState('Customer Returned Sealed Medicine');
  const [returnMethod, setReturnMethod] = useState('CASH');
  const [processingReturn, setProcessingReturn] = useState(false);

  const loadSales = useCallback(async () => {
    if (!api?.sales) return;
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

      const filters = {
        search: search.trim() || undefined,
        from_date: from,
        to_date: to
      };

      const data = await api.sales.getAll(filters);
      setSales(data || []);
    } catch (err) {
      toast.error('Failed to load sales: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, dateRange, fromDate, toDate]);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const handleOpenDetails = async (sale) => {
    setSelectedSale(sale);
    try {
      const items = await api.sales.getItems(sale.id);
      setSaleItems(items || []);
      setDetailsModalOpen(true);
    } catch (err) {
      toast.error('Failed to load invoice items');
    }
  };

  const handleOpenReturn = async (sale) => {
    setSaleForReturn(sale);
    try {
      const items = await api.sales.getItems(sale.id);
      setReturnItemsState((items || []).map(it => ({
        ...it,
        returnQty: 0,
        maxQty: it.quantity,
        price: it.unit_selling_price !== undefined ? it.unit_selling_price : (it.unit_price || 0)
      })));
      setReturnReason('Customer Returned Sealed Medicine');
      setReturnMethod(sale.payment_method || 'CASH');
      setReturnModalOpen(true);
    } catch (err) {
      toast.error('Failed to load items for return: ' + err.message);
    }
  };

  const handleUpdateReturnQty = (index, delta) => {
    setReturnItemsState(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = Math.max(0, Math.min(item.maxQty, item.returnQty + delta));
      updated[index] = { ...item, returnQty: newQty };
      return updated;
    });
  };

  const handleSetExactReturnQty = (index, val) => {
    const parsed = parseInt(val, 10);
    setReturnItemsState(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = isNaN(parsed) ? 0 : Math.max(0, Math.min(item.maxQty, parsed));
      updated[index] = { ...item, returnQty: newQty };
      return updated;
    });
  };

  const totalRefundAmount = returnItemsState.reduce((sum, it) => sum + (it.returnQty * it.price), 0);

  const handleProcessRefund = async (e) => {
    e.preventDefault();
    const itemsToReturn = returnItemsState.filter(it => it.returnQty > 0);
    if (itemsToReturn.length === 0) {
      toast.error('Please select at least 1 unit of medicine to return');
      return;
    }

    setProcessingReturn(true);
    try {
      const payload = {
        sale_id: saleForReturn.id,
        items: itemsToReturn.map(it => ({
          sale_item_id: it.id,
          medicine_id: it.medicine_id,
          batch_id: it.batch_id,
          quantity: it.returnQty,
          refund_unit_price: it.price
        })),
        reason: returnReason,
        payment_method: returnMethod
      };

      await api.sales.processReturn(payload);
      toast.success(`Refund of ${fmt(totalRefundAmount)} processed and batch stock restored!`);
      setReturnModalOpen(false);
      loadSales();
    } catch (err) {
      toast.error('Return failed: ' + err.message);
    } finally {
      setProcessingReturn(false);
    }
  };

  const handleReprintReceipt = (sale, items) => {
    const receiptHtml = `
      <div style="font-family: monospace; font-size: 11px; padding: 10px; width: 280px; margin: auto;">
        <div style="text-align: center; border-bottom: 1px dashed black; padding-bottom: 6px;">
          <h3 style="margin: 0; font-size: 14px; text-transform: uppercase;">PharmaDesk Pharmacy</h3>
          <p style="margin: 2px 0;">Duplicate Receipt / Copy</p>
          <p style="margin: 2px 0;">Inv: ${sale.invoice_number}</p>
          <p style="margin: 2px 0;">Date: ${sale.created_at}</p>
          <p style="margin: 2px 0;">Customer: ${sale.customer_name || 'Walk-in'}</p>
        </div>
        <table style="width: 100%; font-size: 10px; margin: 8px 0; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid black;">
              <th style="text-align: left;">Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td style="padding: 2px 0;">${it.medicine_name || it.name}</td>
                <td style="text-align: center;">${it.quantity}</td>
                <td style="text-align: right;">${Number(it.unit_price).toFixed(0)}</td>
                <td style="text-align: right;">${Number(it.subtotal).toFixed(0)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="border-top: 1px dashed black; padding-top: 6px; font-size: 11px; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;">
            <span>Subtotal:</span><span>PKR ${Number(sale.subtotal).toFixed(2)}</span>
          </div>
          ${sale.discount_amount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Discount:</span><span>-PKR ${Number(sale.discount_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          ${sale.tax_amount > 0 ? `
            <div style="display: flex; justify-content: space-between;">
              <span>Tax/GST:</span><span>+PKR ${Number(sale.tax_amount).toFixed(2)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin-top: 4px; border-top: 1px solid black; padding-top: 4px;">
            <span>Total:</span><span>PKR ${Number(sale.total_amount).toFixed(2)}</span>
          </div>
        </div>
        <div style="text-align: center; margin-top: 10px; font-size: 9px; color: #555;">
          *** THANK YOU FOR YOUR PATRONAGE ***
        </div>
      </div>
    `;

    if (api?.print?.receipt) {
      api.print.receipt(receiptHtml);
      toast.success('Receipt sent to printer');
    } else {
      const win = window.open('', '_blank');
      win.document.write(receiptHtml);
      win.document.close();
      win.print();
    }
  };

  const handleExportCSV = () => {
    if (sales.length === 0) return;
    const headers = ['Invoice #', 'Date & Time', 'Customer Name', 'Phone', 'Payment Mode', 'Subtotal', 'Discount', 'Tax', 'Grand Total', 'Paid', 'Cashier'];
    const rows = sales.map(s => [
      `"${s.invoice_number}"`,
      `"${s.created_at}"`,
      `"${s.customer_name || 'Walk-in'}"`,
      `"${s.customer_phone || ''}"`,
      s.payment_method,
      s.subtotal || 0,
      s.discount_amount || 0,
      s.tax_amount || 0,
      s.total_amount || 0,
      s.paid_amount || 0,
      `"${s.cashier_name || 'Admin'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Sales ledger exported!');
  };

  // Metrics
  const totalSalesRevenue = sales.reduce((acc, s) => acc + (s.total_amount || 0), 0);
  const totalDiscounts = sales.reduce((acc, s) => acc + (s.discount_amount || 0), 0);
  const avgOrderValue = sales.length > 0 ? (totalSalesRevenue / sales.length) : 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="kpi-card" style={{ '--kpi-color': '#06b6d4', '--kpi-dim': 'rgba(6, 182, 212, 0.1)' }}>
          <div className="kpi-icon-wrap"><Receipt size={22} /></div>
          <div className="kpi-value">{sales.length}</div>
          <div className="kpi-label">Invoices Issued</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#10b981', '--kpi-dim': 'rgba(16, 185, 129, 0.1)' }}>
          <div className="kpi-icon-wrap"><DollarSign size={22} /></div>
          <div className="kpi-value">{fmt(totalSalesRevenue)}</div>
          <div className="kpi-label">Total Revenue</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#8b5cf6', '--kpi-dim': 'rgba(139, 92, 246, 0.1)' }}>
          <div className="kpi-icon-wrap"><CreditCard size={22} /></div>
          <div className="kpi-value">{fmt(avgOrderValue)}</div>
          <div className="kpi-label">Average Invoice Value</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#f43f5e', '--kpi-dim': 'rgba(244, 63, 94, 0.1)' }}>
          <div className="kpi-icon-wrap"><DollarSign size={22} /></div>
          <div className="kpi-value">{fmt(totalDiscounts)}</div>
          <div className="kpi-label">Total Discounts Given</div>
        </div>
      </div>

      {/* ── Filters & Time Horizon ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar size={14} /> Period:
          </span>
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Last 7 Days' },
            { id: 'month', label: 'Last 30 Days' },
            { id: 'all', label: 'All Time' },
            { id: 'custom', label: 'Custom' },
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

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="input py-1 text-xs"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="input py-1 text-xs"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search invoice # or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8 pr-3 py-1 text-xs w-full"
            />
          </div>
          <button onClick={loadSales} className="btn btn-secondary p-1.5" title="Refresh">
            <RefreshCw size={14} />
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      {/* ── Sales Invoices Table ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} /> Loading sales transactions...
            </div>
          ) : sales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Receipt size={36} className="mb-2 stroke-1" />
              <p>No sales found for this period.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Payment Method</th>
                  <th className="text-center">Items</th>
                  <th className="text-right">Total (PKR)</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-800/40">
                    <td className="font-mono font-semibold text-cyan-300">
                      {sale.invoice_number}
                    </td>

                    <td className="text-xs text-slate-400">
                      {sale.created_at}
                    </td>

                    <td>
                      <div className="font-semibold text-white text-xs">
                        {sale.customer_name || 'Walk-in Customer'}
                      </div>
                      {sale.customer_phone && (
                        <div className="text-[10px] text-slate-400">{sale.customer_phone}</div>
                      )}
                    </td>

                    <td>
                      <span className="badge badge-secondary text-xs uppercase font-medium">
                        {sale.payment_method}
                      </span>
                    </td>

                    <td className="text-center text-xs text-slate-300">
                      {sale.item_count || 1}
                    </td>

                    <td className="text-right font-bold text-emerald-400">
                      {fmt(sale.total_amount)}
                    </td>

                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReturn(sale)}
                          className="btn btn-secondary btn-sm p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-950/30"
                          title="Process Customer Return / Refund"
                        >
                          <RotateCcw size={15} />
                        </button>
                        <button
                          onClick={() => handleOpenDetails(sale)}
                          className="btn btn-secondary btn-sm p-1.5 text-cyan-400"
                          title="View Invoice Breakdown"
                        >
                          <Eye size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Invoice Details & Reprint Modal ── */}
      {detailsModalOpen && selectedSale && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Receipt size={18} className="text-cyan-400" /> Invoice #{selectedSale.invoice_number}
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body p-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-3 rounded text-xs border border-slate-800">
                <div>Customer: <span className="font-semibold text-white">{selectedSale.customer_name || 'Walk-in'}</span></div>
                <div>Date: <span className="text-slate-300">{selectedSale.created_at}</span></div>
                <div>Payment: <span className="font-bold text-cyan-400 uppercase">{selectedSale.payment_method}</span></div>
              </div>

              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Unit Price</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {saleItems.map((it, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-white">{it.medicine_name || it.name}</td>
                      <td className="font-mono text-cyan-300">{it.batch_number || '—'}</td>
                      <td className="text-center">{it.quantity}</td>
                      <td className="text-right">{fmt(it.unit_price)}</td>
                      <td className="text-right font-bold text-slate-200">{fmt(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                <div className="space-y-1">
                  <div>Subtotal: <span className="font-semibold text-white">{fmt(selectedSale.subtotal)}</span></div>
                  <div>Discount: <span className="font-semibold text-rose-400">-{fmt(selectedSale.discount_amount)}</span></div>
                  <div>Tax: <span className="font-semibold text-slate-300">+{fmt(selectedSale.tax_amount)}</span></div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Paid</span>
                  <span className="text-xl font-black text-emerald-400">{fmt(selectedSale.total_amount)}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer p-4 border-t border-slate-800 flex justify-between">
              <button
                onClick={() => handleReprintReceipt(selectedSale, saleItems)}
                className="btn btn-primary py-1.5 px-4 font-bold flex items-center gap-1.5"
              >
                <Printer size={15} /> Reprint Receipt
              </button>
              <button onClick={() => setDetailsModalOpen(false)} className="btn btn-secondary py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Return & Refund Modal ── */}
      {returnModalOpen && saleForReturn && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <RotateCcw size={18} className="text-amber-400" /> Process Sale Return – Inv #{saleForReturn.invoice_number}
              </h3>
              <button onClick={() => setReturnModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="modal-body p-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-3 rounded text-xs border border-slate-800">
                <div>Customer: <span className="font-semibold text-white">{saleForReturn.customer_name || 'Walk-in'}</span></div>
                <div>Sold At: <span className="text-slate-300">{saleForReturn.created_at || saleForReturn.sold_at}</span></div>
                <div>Original Total: <span className="font-bold text-emerald-400">{fmt(saleForReturn.total_amount)}</span></div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-2">
                  Select Items & Quantity to Return:
                </label>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="table w-full text-xs">
                    <thead>
                      <tr>
                        <th>Medicine</th>
                        <th>Batch</th>
                        <th className="text-center">Sold Qty</th>
                        <th className="text-center">Return Qty</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-right">Line Refund</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItemsState.map((it, idx) => (
                        <tr key={idx} className={it.returnQty > 0 ? 'bg-amber-950/20' : ''}>
                          <td className="font-semibold text-white">{it.medicine_name || it.name}</td>
                          <td className="font-mono text-cyan-300">{it.batch_number || '—'}</td>
                          <td className="text-center font-bold text-slate-400">{it.maxQty}</td>
                          <td className="text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleUpdateReturnQty(idx, -1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max={it.maxQty}
                                value={it.returnQty}
                                onChange={(e) => handleSetExactReturnQty(idx, e.target.value)}
                                className="w-12 h-6 text-center text-xs bg-slate-900 border border-slate-700 rounded text-white font-bold"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateReturnQty(idx, 1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="text-right">{fmt(it.price)}</td>
                          <td className="text-right font-bold text-amber-400">
                            {fmt(it.returnQty * it.price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="input text-xs py-2 w-full"
                  >
                    <option value="Customer Returned Sealed Medicine">Customer Returned Sealed Medicine</option>
                    <option value="Prescription Changed by Doctor">Prescription Changed by Doctor</option>
                    <option value="Wrong Medicine Dispensed">Wrong Medicine Dispensed</option>
                    <option value="Defective / Damaged Packaging">Defective / Damaged Packaging</option>
                    <option value="Customer Exchange">Customer Exchange</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Refund Payment Mode
                  </label>
                  <select
                    value={returnMethod}
                    onChange={(e) => setReturnMethod(e.target.value)}
                    className="input text-xs py-2 w-full"
                  >
                    <option value="CASH">Cash Refund (Drawer)</option>
                    <option value="STORE_CREDIT">Store Credit / Exchange Voucher</option>
                    <option value="BANK">Bank / Card Reversal</option>
                  </select>
                </div>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/50 p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-300 font-medium block">
                    Stock will be restored to original batches automatically.
                  </span>
                  <span className="text-[11px] text-slate-400">
                    A negative audit entry will be logged into Stock Movements.
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">Total Refund Due:</span>
                  <span className="text-xl font-black text-amber-400">{fmt(totalRefundAmount)}</span>
                </div>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="btn btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingReturn || totalRefundAmount <= 0}
                  className="btn btn-primary py-2 font-bold flex items-center gap-1.5 shadow-lg shadow-amber-900/30"
                >
                  <RotateCcw size={15} />
                  <span>{processingReturn ? 'Processing...' : 'Confirm Refund & Restock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
