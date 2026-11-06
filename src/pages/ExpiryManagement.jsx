import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, ShieldAlert, Calendar, DollarSign,
  Trash2, ArrowRight, Download, RefreshCw, CheckCircle2,
  Package, X, AlertOctagon
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function ExpiryManagement() {
  const [filterPeriod, setFilterPeriod] = useState('30'); // 'expired', '30', '60', '90', 'all'
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // Write-off modal
  const [writeOffModalOpen, setWriteOffModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [writeOffReason, setWriteOffReason] = useState('DISPOSED'); // 'DISPOSED', 'RETURNED_TO_VENDOR', 'DESTROYED'
  const [writeOffNotes, setWriteOffNotes] = useState('');

  const loadExpiryData = useCallback(async () => {
    if (!api?.inventory) return;
    setLoading(true);
    try {
      const days = filterPeriod === 'expired' ? 0 : parseInt(filterPeriod, 10) || 90;
      const data = await api.inventory.getExpiryAlerts(days);

      let filtered = (data || []).map(b => ({
        ...b,
        days_to_expiry: b.days_to_expiry !== undefined ? b.days_to_expiry : (b.days_until_expiry !== undefined ? b.days_until_expiry : 0)
      }));

      if (filterPeriod === 'expired') {
        filtered = filtered.filter((b) => b.days_to_expiry <= 0);
      } else if (filterPeriod === '30') {
        filtered = filtered.filter((b) => b.days_to_expiry > 0 && b.days_to_expiry <= 30);
      } else if (filterPeriod === '60') {
        filtered = filtered.filter((b) => b.days_to_expiry > 30 && b.days_to_expiry <= 60);
      } else if (filterPeriod === '90') {
        filtered = filtered.filter((b) => b.days_to_expiry > 60 && b.days_to_expiry <= 90);
      }

      setBatches(filtered);
    } catch (err) {
      toast.error('Failed to load expiry data: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterPeriod]);

  useEffect(() => {
    loadExpiryData();
  }, [loadExpiryData]);

  const handleOpenWriteOff = (batch) => {
    setSelectedBatch(batch);
    setWriteOffReason(batch.supplier_id ? 'RETURNED_TO_VENDOR' : 'DISPOSED');
    setWriteOffNotes('');
    setWriteOffModalOpen(true);
  };

  const handleConfirmWriteOff = async (e) => {
    e.preventDefault();
    if (!selectedBatch || !api?.inventory) return;

    try {
      if (writeOffReason === 'RETURNED_TO_VENDOR' && api.inventory.returnToSupplier && selectedBatch.supplier_id) {
        await api.inventory.returnToSupplier({
          batch_id: selectedBatch.id,
          supplier_id: selectedBatch.supplier_id,
          quantity: selectedBatch.current_stock,
          reason: 'EXPIRED',
          notes: writeOffNotes
        });
        toast.success(`Batch ${selectedBatch.batch_number} returned to supplier (${selectedBatch.supplier_name || 'Vendor'})!`);
      } else if (api.inventory.writeOffExpired) {
        await api.inventory.writeOffExpired({
          batch_id: selectedBatch.id,
          reason: writeOffReason,
          notes: writeOffNotes
        });
        toast.success(`Batch ${selectedBatch.batch_number} written off successfully!`);
      } else {
        await api.inventory.adjustStock({
          batch_id: selectedBatch.id,
          quantity: -selectedBatch.current_stock,
          reason: 'EXPIRED_WRITE_OFF',
          notes: `${writeOffReason}: ${writeOffNotes}`
        });
        toast.success(`Batch ${selectedBatch.batch_number} written off successfully!`);
      }
      setWriteOffModalOpen(false);
      loadExpiryData();
    } catch (err) {
      toast.error('Write off failed: ' + err.message);
    }
  };

  const handleExportCSV = () => {
    if (batches.length === 0) return;
    const headers = ['Medicine Name', 'Batch Number', 'Expiry Date', 'Days to Expiry', 'Stock Remaining', 'Purchase Cost (PKR)', 'Potential Loss (PKR)', 'Supplier'];
    const rows = batches.map(b => [
      `"${b.name || b.medicine_name}"`,
      `"${b.batch_number}"`,
      b.expiry_date,
      b.days_to_expiry,
      b.current_stock,
      b.purchase_price || 0,
      ((b.current_stock || 0) * (b.purchase_price || 0)).toFixed(2),
      `"${b.supplier_name || 'N/A'}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `expiry_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Expiry audit report exported!');
  };

  // Metrics
  const totalUnitsAtRisk = batches.reduce((acc, b) => acc + (b.current_stock || 0), 0);
  const totalCostAtRisk = batches.reduce((acc, b) => acc + ((b.current_stock || 0) * (b.purchase_price || 0)), 0);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="kpi-card" style={{ '--kpi-color': '#f43f5e', '--kpi-dim': 'rgba(244, 63, 94, 0.1)' }}>
          <div className="kpi-icon-wrap"><AlertOctagon size={22} /></div>
          <div className="kpi-value">{batches.length}</div>
          <div className="kpi-label">Batches in Current Horizon</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#f59e0b', '--kpi-dim': 'rgba(245, 158, 11, 0.1)' }}>
          <div className="kpi-icon-wrap"><Package size={22} /></div>
          <div className="kpi-value">{totalUnitsAtRisk.toLocaleString()}</div>
          <div className="kpi-label">Total Units Impacted</div>
        </div>

        <div className="kpi-card" style={{ '--kpi-color': '#ef4444', '--kpi-dim': 'rgba(239, 68, 68, 0.1)' }}>
          <div className="kpi-icon-wrap"><DollarSign size={22} /></div>
          <div className="kpi-value">{fmt(totalCostAtRisk)}</div>
          <div className="kpi-label">Estimated Financial Loss Value</div>
        </div>
      </div>

      {/* ── Horizon Tabs & Actions ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
            <Calendar size={14} /> Filter Horizon:
          </span>
          {[
            { id: 'expired', label: 'Expired (Past Due)', badge: 'badge-danger' },
            { id: '30', label: '< 30 Days (Critical)', badge: 'badge-danger' },
            { id: '60', label: '31 - 60 Days (Warning)', badge: 'badge-warning' },
            { id: '90', label: '61 - 90 Days (Upcoming)', badge: 'badge-info' },
            { id: 'all', label: 'All within 90 Days', badge: 'badge-secondary' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterPeriod(tab.id)}
              className={`btn btn-sm text-xs font-semibold py-1.5 px-3 ${
                filterPeriod === tab.id ? 'btn-primary' : 'btn-secondary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={loadExpiryData} className="btn btn-secondary p-1.5" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm flex items-center gap-1.5">
            <Download size={14} /> Export Expiry Report
          </button>
        </div>
      </div>

      {/* ── Expiry List Table ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} /> Checking expiry dates...
            </div>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <CheckCircle2 size={36} className="mb-2 text-emerald-400" />
              <p className="text-slate-300 font-medium">No medicines expiring in this horizon!</p>
              <p className="text-xs text-slate-500 mt-1">Your pharmacy inventory is safe.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-4/12">Medicine / Strength</th>
                  <th className="w-2/12">Batch Number</th>
                  <th className="w-2/12">Expiry Date</th>
                  <th className="w-1/12 text-center">Remaining</th>
                  <th className="w-2/12 text-right">Loss Value</th>
                  <th className="w-1/12 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const isExpired = b.days_to_expiry <= 0;
                  const lossVal = (b.current_stock || 0) * (b.purchase_price || 0);

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{b.name || b.medicine_name}</span>
                          {b.strength && <span className="text-xs text-slate-400 font-normal">({b.strength})</span>}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Rack: <span className="font-mono text-amber-300">{b.rack_shelf || '—'}</span> • Supplier: {b.supplier_name || 'N/A'}
                        </div>
                      </td>

                      <td>
                        <span className="font-mono font-semibold text-cyan-300 text-xs">
                          {b.batch_number}
                        </span>
                      </td>

                      <td>
                        <div className={`font-semibold text-xs ${isExpired ? 'text-rose-400' : 'text-amber-400'}`}>
                          {b.expiry_date}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isExpired ? 'Already Expired' : `${b.days_to_expiry} days remaining`}
                        </div>
                      </td>

                      <td className="text-center font-bold text-white">
                        {b.current_stock}
                      </td>

                      <td className="text-right font-medium text-rose-400">
                        {fmt(lossVal)}
                      </td>

                      <td className="text-right">
                        <button
                          onClick={() => handleOpenWriteOff(b)}
                          className="btn btn-danger btn-sm text-xs py-1 px-2.5 flex items-center gap-1"
                          title="Write off or quarantine expired batch"
                        >
                          <Trash2 size={12} />
                          <span>Write Off</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Write-Off Confirmation Modal ── */}
      {writeOffModalOpen && selectedBatch && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Trash2 size={18} className="text-rose-400" /> Write-Off Expired Batch
              </h3>
              <button onClick={() => setWriteOffModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleConfirmWriteOff} className="modal-body p-4 flex flex-col gap-4">
              <div className="bg-slate-900 p-3 rounded border border-slate-800 text-xs">
                <div className="font-bold text-white text-sm">{selectedBatch.name || selectedBatch.medicine_name}</div>
                <div className="text-slate-400 mt-1">
                  Batch: <span className="font-mono text-cyan-300">{selectedBatch.batch_number}</span> • Units: <span className="font-bold text-rose-400">{selectedBatch.current_stock}</span> • Value: <span className="font-bold text-slate-200">{fmt((selectedBatch.current_stock || 0) * (selectedBatch.purchase_price || 0))}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Disposal / Write-Off Action
                </label>
                <select
                  value={writeOffReason}
                  onChange={(e) => setWriteOffReason(e.target.value)}
                  className="input text-sm py-2 w-full"
                >
                  <option value="DISPOSED">Destroyed & Disposed on Site</option>
                  <option value="RETURNED_TO_VENDOR">Returned to Supplier / Vendor Credit</option>
                  <option value="QUARANTINED">Moved to Quarantine / Segregated Area</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">
                  Disposal Notes & Authorization
                </label>
                <input
                  type="text"
                  placeholder="e.g. Incinerated per pharmacy regulation #4"
                  value={writeOffNotes}
                  onChange={(e) => setWriteOffNotes(e.target.value)}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setWriteOffModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-danger py-2 font-bold flex items-center gap-1.5">
                  <Trash2 size={15} /> Confirm Write-Off
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
