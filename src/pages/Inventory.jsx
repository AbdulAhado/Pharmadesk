import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Search, Filter, AlertTriangle, ArrowUpDown,
  ChevronDown, ChevronRight, PlusCircle, MinusCircle,
  Download, RefreshCw, Calendar, DollarSign, Layers, CheckCircle2, X
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function Inventory() {
  const [stockList, setStockList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all'); // 'all', 'low', 'out'
  const [expandedMedId, setExpandedMedId] = useState(null);
  const [batchDetails, setBatchDetails] = useState({});

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState(null);
  const [adjustData, setAdjustData] = useState({
    type: 'DAMAGED', // 'DAMAGED', 'EXPIRED_WRITE_OFF', 'AUDIT_CORRECTION', 'FOUND'
    quantity: 1,
    direction: 'decrease', // 'increase' or 'decrease'
    notes: ''
  });

  // Movements Audit Log Modal
  const [movementsModalOpen, setMovementsModalOpen] = useState(false);
  const [movementLogs, setMovementLogs] = useState([]);
  const [selectedMedForMovements, setSelectedMedForMovements] = useState(null);

  const loadStock = useCallback(async () => {
    if (!api?.inventory) return;
    setLoading(true);
    try {
      const filters = {
        search: search.trim() || undefined,
        low_stock: stockFilter === 'low' ? true : undefined,
        out_of_stock: stockFilter === 'out' ? true : undefined
      };
      const data = await api.inventory.getOverview(filters);
      setStockList(data || []);
    } catch (err) {
      toast.error('Failed to load inventory: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const toggleExpand = async (medId) => {
    if (expandedMedId === medId) {
      setExpandedMedId(null);
      return;
    }
    setExpandedMedId(medId);
    if (!batchDetails[medId] && api?.inventory) {
      try {
        const batches = await api.inventory.getBatches(medId);
        setBatchDetails((prev) => ({ ...prev, [medId]: batches || [] }));
      } catch (err) {
        toast.error('Failed to fetch batches');
      }
    }
  };

  const openAdjustModal = (batch, med) => {
    setSelectedBatchForAdjust({ batch, med });
    setAdjustData({
      type: 'AUDIT_CORRECTION',
      quantity: 1,
      direction: 'decrease',
      notes: ''
    });
    setAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e) => {
    e.preventDefault();
    if (!selectedBatchForAdjust || !api?.inventory) return;

    const qty = parseInt(adjustData.quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error('Quantity must be greater than 0');
      return;
    }

    const signedQty = adjustData.direction === 'decrease' ? -qty : qty;
    if (adjustData.direction === 'decrease' && qty > selectedBatchForAdjust.batch.current_stock) {
      toast.error(`Cannot deduct more than current batch stock (${selectedBatchForAdjust.batch.current_stock})`);
      return;
    }

    try {
      await api.inventory.adjustStock({
        batch_id: selectedBatchForAdjust.batch.id,
        quantity: signedQty,
        reason: adjustData.type,
        notes: adjustData.notes
      });
      toast.success('Stock adjusted successfully!');
      setAdjustModalOpen(false);

      // Refresh batches for this medicine
      const updatedBatches = await api.inventory.getBatches(selectedBatchForAdjust.med.id);
      setBatchDetails((prev) => ({ ...prev, [selectedBatchForAdjust.med.id]: updatedBatches }));
      loadStock();
    } catch (err) {
      toast.error('Adjustment failed: ' + err.message);
    }
  };

  const openMovementsModal = async (med) => {
    setSelectedMedForMovements(med);
    try {
      const logs = await api.inventory.getMovements({ medicine_id: med.id });
      setMovementLogs(logs || []);
      setMovementsModalOpen(true);
    } catch (err) {
      toast.error('Failed to load movements log');
    }
  };

  const handleExportCSV = () => {
    if (stockList.length === 0) return;
    const headers = ['Medicine Name', 'Category', 'Dosage Form', 'Rack', 'Total Stock', 'Avg Cost (PKR)', 'Retail Value (PKR)', 'Min Stock Level'];
    const rows = stockList.map((s) => [
      `"${s.name}"`,
      `"${s.category || ''}"`,
      `"${s.dosage_form || ''}"`,
      `"${s.rack_shelf || ''}"`,
      s.total_stock || 0,
      s.avg_purchase_price || 0,
      s.estimated_retail_value || 0,
      s.min_stock_level || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory_stock_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Inventory report exported!');
  };

  // KPI calculations
  const totalStockItems = stockList.reduce((acc, it) => acc + (it.total_stock || 0), 0);
  const totalRetailVal = stockList.reduce((acc, it) => acc + (it.estimated_retail_value || 0), 0);
  const lowStockCount = stockList.filter((it) => (it.total_stock || 0) <= (it.min_stock_level || 10)).length;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card" style={{ '--kpi-color': '#06b6d4', '--kpi-dim': 'rgba(6, 182, 212, 0.1)' }}>
          <div className="kpi-icon-wrap"><Package size={22} /></div>
          <div className="kpi-value">{totalStockItems.toLocaleString()}</div>
          <div className="kpi-label">Total Units in Stock</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#10b981', '--kpi-dim': 'rgba(16, 185, 129, 0.1)' }}>
          <div className="kpi-icon-wrap"><DollarSign size={22} /></div>
          <div className="kpi-value">{fmt(totalRetailVal)}</div>
          <div className="kpi-label">Total Retail Stock Value</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-dim': 'rgba(245, 158, 11, 0.1)' }}>
          <div className="kpi-icon-wrap"><AlertTriangle size={22} /></div>
          <div className="kpi-value">{lowStockCount}</div>
          <div className="kpi-label">Low Stock Medicines</div>
        </div>
      </div>

      {/* ── Filters & Actions ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search stock by medicine name, generic, or rack..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 pr-4 py-1.5 text-sm w-full"
            />
          </div>

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="input py-1.5 text-sm w-40"
          >
            <option value="all">All Medicines</option>
            <option value="low">Low Stock Alert</option>
            <option value="out">Out of Stock Only</option>
          </select>

          <button onClick={loadStock} className="btn btn-secondary p-2" title="Refresh">
            <RefreshCw size={15} />
          </button>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Inventory Stock Table with Batch Drill-down ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} /> Loading stock inventory...
            </div>
          ) : stockList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Package size={36} className="mb-2 stroke-1" />
              <p>No inventory records found matching your filters.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-10"></th>
                  <th className="w-4/12">Medicine / Generic</th>
                  <th className="w-2/12">Rack / Shelf</th>
                  <th className="w-2/12 text-center">Total Stock</th>
                  <th className="w-2/12 text-right">Retail Value</th>
                  <th className="w-2/12 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stockList.map((item) => {
                  const isExpanded = expandedMedId === item.id;
                  const isLow = (item.total_stock || 0) <= (item.min_stock_level || 10);
                  const isOut = (item.total_stock || 0) === 0;

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-800/40 cursor-pointer" onClick={() => toggleExpand(item.id)}>
                        <td className="text-center text-slate-400">
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </td>

                        <td>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{item.name}</span>
                            {item.dosage_form && (
                              <span className="badge badge-info text-[10px] py-0 px-1.5">{item.dosage_form}</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {item.generic_name && <span>{item.generic_name} • </span>}
                            <span>Pack of {item.pack_size || 1}</span>
                          </div>
                        </td>

                        <td>
                          <span className="font-mono text-xs text-amber-300">
                            {item.rack_shelf || '—'}
                          </span>
                        </td>

                        <td className="text-center">
                          <span className={`font-bold text-sm ${isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {item.total_stock || 0}
                          </span>
                          {isLow && !isOut && (
                            <span className="block text-[10px] text-amber-400 font-semibold">Low Stock</span>
                          )}
                          {isOut && (
                            <span className="block text-[10px] text-rose-400 font-semibold">Out of Stock</span>
                          )}
                        </td>

                        <td className="text-right font-medium text-slate-200">
                          {fmt(item.estimated_retail_value)}
                        </td>

                        <td className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openMovementsModal(item)}
                              className="btn btn-secondary btn-sm text-xs py-1 px-2"
                              title="Audit movements log"
                            >
                              Log
                            </button>
                            <button
                              onClick={() => toggleExpand(item.id)}
                              className="btn btn-secondary btn-sm text-xs py-1 px-2"
                            >
                              Batches
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Sub-table for Batches ── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="6" className="bg-slate-950 p-4 border-y border-slate-800">
                            <div className="text-xs font-bold text-cyan-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                              <Layers size={14} /> Batches for {item.name}
                            </div>

                            {(!batchDetails[item.id] || batchDetails[item.id].length === 0) ? (
                              <div className="text-xs text-slate-500 py-3 text-center">
                                No active batches available for this medicine. Add a purchase invoice to receive stock.
                              </div>
                            ) : (
                              <table className="table w-full text-xs bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                                <thead>
                                  <tr className="bg-slate-800/80">
                                    <th>Batch Number</th>
                                    <th>Expiry Date</th>
                                    <th>Days Left</th>
                                    <th className="text-right">Purchase Price</th>
                                    <th className="text-right">Sale Price</th>
                                    <th className="text-center">Current Stock</th>
                                    <th className="text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batchDetails[item.id].map((b) => {
                                    const isExpired = b.days_to_expiry <= 0;
                                    const isExpiringSoon = b.days_to_expiry <= 60 && !isExpired;

                                    return (
                                      <tr key={b.id} className="border-b border-slate-800/40">
                                        <td className="font-mono font-semibold text-white">
                                          {b.batch_number}
                                        </td>
                                        <td>
                                          <span className={isExpired ? 'text-rose-400 font-bold' : isExpiringSoon ? 'text-amber-400 font-semibold' : 'text-slate-300'}>
                                            {b.expiry_date}
                                          </span>
                                        </td>
                                        <td>
                                          {isExpired ? (
                                            <span className="badge badge-danger text-[10px]">Expired</span>
                                          ) : isExpiringSoon ? (
                                            <span className="badge badge-warning text-[10px]">{b.days_to_expiry} days</span>
                                          ) : (
                                            <span className="text-slate-400">{b.days_to_expiry} days</span>
                                          )}
                                        </td>
                                        <td className="text-right text-slate-400">{fmt(b.purchase_price)}</td>
                                        <td className="text-right text-emerald-400 font-medium">{fmt(b.sale_price)}</td>
                                        <td className="text-center font-bold text-white">{b.current_stock}</td>
                                        <td className="text-right">
                                          <button
                                            onClick={() => openAdjustModal(b, item)}
                                            className="btn btn-secondary btn-sm text-[11px] py-1 px-2 text-cyan-400"
                                            title="Stock adjustment / audit recount"
                                          >
                                            Adjust Stock
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Stock Adjustment Modal ── */}
      {adjustModalOpen && selectedBatchForAdjust && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <ArrowUpDown size={18} className="text-cyan-400" /> Stock Adjustment
              </h3>
              <button onClick={() => setAdjustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="modal-body p-4 flex flex-col gap-4">
              <div className="bg-slate-900 p-3 rounded border border-slate-800 text-xs">
                <div className="font-bold text-white text-sm">{selectedBatchForAdjust.med.name}</div>
                <div className="text-slate-400 mt-1">
                  Batch: <span className="font-mono text-cyan-300">{selectedBatchForAdjust.batch.batch_number}</span> • Current Stock: <span className="font-bold text-emerald-400">{selectedBatchForAdjust.batch.current_stock}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Adjustment Type / Reason</label>
                <select
                  value={adjustData.type}
                  onChange={(e) => setAdjustData({ ...adjustData, type: e.target.value })}
                  className="input text-sm py-2 w-full"
                >
                  <option value="AUDIT_CORRECTION">Audit / Physical Recount Correction</option>
                  <option value="DAMAGED">Damaged / Broken Packaging</option>
                  <option value="EXPIRED_WRITE_OFF">Expired Product Write-off</option>
                  <option value="FOUND">Found Stock / Inventory Bonus</option>
                  <option value="RETURN">Customer Return Adjustment</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Direction</label>
                  <select
                    value={adjustData.direction}
                    onChange={(e) => setAdjustData({ ...adjustData, direction: e.target.value })}
                    className="input text-sm py-2 w-full"
                  >
                    <option value="decrease">Deduct / Decrease (-)</option>
                    <option value="increase">Add / Increase (+)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: parseInt(e.target.value, 10) || 1 })}
                    className="input text-sm py-2 w-full font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Audit Notes / Comments</label>
                <input
                  type="text"
                  placeholder="e.g. Broken bottle during restocking"
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setAdjustModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary py-2 font-bold">
                  Save Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Movements Audit Log Modal ── */}
      {movementsModalOpen && selectedMedForMovements && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Calendar size={18} className="text-cyan-400" /> Stock Audit Log: {selectedMedForMovements.name}
              </h3>
              <button onClick={() => setMovementsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body p-4 max-h-96 overflow-y-auto">
              {movementLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No stock transactions recorded yet for this item.
                </div>
              ) : (
                <table className="table w-full text-xs">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Type</th>
                      <th className="text-center">Qty Change</th>
                      <th>Reference</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movementLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="text-slate-400">{log.created_at}</td>
                        <td>
                          <span className={`badge text-[10px] ${
                            log.movement_type === 'SALE' ? 'badge-info' :
                            log.movement_type === 'PURCHASE' ? 'badge-success' :
                            'badge-warning'
                          }`}>
                            {log.movement_type}
                          </span>
                        </td>
                        <td className={`text-center font-bold ${log.quantity > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </td>
                        <td className="font-mono text-slate-300">{log.reference_number || '—'}</td>
                        <td className="text-slate-400">{log.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer p-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setMovementsModalOpen(false)} className="btn btn-secondary py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
