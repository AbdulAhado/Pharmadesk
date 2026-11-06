import React, { useState, useEffect, useCallback } from 'react';
import {
  TruckIcon, Plus, Search, DollarSign, Calendar,
  FileText, CheckCircle2, AlertCircle, X, Trash2, Eye,
  Building2, Phone, CreditCard, RefreshCw, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

export default function Purchases() {
  const [activeTab, setActiveTab] = useState('invoices'); // 'invoices' or 'suppliers'

  // Purchases Invoices State
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [licenseInfo, setLicenseInfo] = useState(null);

  useEffect(() => {
    if (window.api?.license?.getStatus) {
      window.api.license.getStatus().then(setLicenseInfo).catch(() => {});
    }
  }, []);

  // Modals
  const [newInvoiceModalOpen, setNewInvoiceModalOpen] = useState(false);
  const [viewInvoiceModal, setViewInvoiceModal] = useState(null);
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState(null);

  // New Invoice Form
  const [allMedicines, setAllMedicines] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [paidNow, setPaidNow] = useState('');
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [items, setItems] = useState([
    { medicine_id: '', batch_number: '', expiry_date: '', quantity_packs: 1, pack_size: 1, purchase_price: '', sale_price: '', total: 0 }
  ]);

  // Supplier Form
  const [supplierFormData, setSupplierFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadData = useCallback(async () => {
    if (!api?.purchases) return;
    setLoading(true);
    try {
      const [invList, suppList] = await Promise.all([
        api.purchases.getAll({ search: searchQuery.trim() || undefined }),
        api.purchases.getSuppliers()
      ]);
      setInvoices(invList || []);
      setSuppliers(suppList || []);
    } catch (err) {
      toast.error('Failed to load purchases: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    if (api?.medicines) {
      api.medicines.getAll({ active: 1 }).then((meds) => setAllMedicines(meds || [])).catch(() => {});
    }
  }, [loadData]);

  // Invoice Items Management
  const handleItemMedicineChange = (index, medId) => {
    const med = allMedicines.find((m) => m.id === medId);
    const updated = [...items];
    updated[index].medicine_id = medId;
    if (med) {
      updated[index].pack_size = med.pack_size || 1;
    }
    setItems(updated);
  };

  const handleItemFieldChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;

    const qty = parseFloat(updated[index].quantity_packs) || 0;
    const cost = parseFloat(updated[index].purchase_price) || 0;
    updated[index].total = qty * cost;

    setItems(updated);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { medicine_id: '', batch_number: '', expiry_date: '', quantity_packs: 1, pack_size: 1, purchase_price: '', sale_price: '', total: 0 }
    ]);
  };

  const removeItemRow = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const invoiceSubtotal = items.reduce((sum, it) => sum + (it.total || 0), 0);

  const handleOpenNewInvoice = () => {
    if (licenseInfo?.isReadOnly) {
      toast.error('Subscription Expired (Read-Only Mode): Creating new purchase orders is locked. Please renew subscription in Settings.', { duration: 5000 });
      return;
    }
    setSelectedSupplierId(suppliers[0]?.id || '');
    setInvoiceNumber(`PO-${Date.now().toString().slice(-6)}`);
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setItems([
      { medicine_id: allMedicines[0]?.id || '', batch_number: '', expiry_date: '', quantity_packs: 10, pack_size: allMedicines[0]?.pack_size || 1, purchase_price: '', sale_price: '', total: 0 }
    ]);
    setPaidNow('');
    setInvoiceNotes('');
    setNewInvoiceModalOpen(true);
  };

  const handleSaveInvoice = async (e) => {
    e.preventDefault();
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.medicine_id) {
        toast.error(`Please select medicine for item #${i + 1}`);
        return;
      }
      if (!it.batch_number.trim()) {
        toast.error(`Batch number required for item #${i + 1}`);
        return;
      }
      if (!it.expiry_date.trim()) {
        toast.error(`Expiry date required for item #${i + 1}`);
        return;
      }
      if (!it.purchase_price || parseFloat(it.purchase_price) <= 0) {
        toast.error(`Valid purchase price required for item #${i + 1}`);
        return;
      }
      if (!it.sale_price || parseFloat(it.sale_price) <= 0) {
        toast.error(`Valid retail/sale price required for item #${i + 1}`);
        return;
      }
    }

    const payload = {
      supplier_id: selectedSupplierId,
      invoice_number: invoiceNumber.trim(),
      invoice_date: invoiceDate,
      total_amount: invoiceSubtotal,
      paid_amount: parseFloat(paidNow) || 0,
      notes: invoiceNotes,
      items: items.map((it) => ({
        medicine_id: it.medicine_id,
        batch_number: it.batch_number.trim().toUpperCase(),
        expiry_date: it.expiry_date,
        quantity: (parseInt(it.quantity_packs, 10) || 1) * (parseInt(it.pack_size, 10) || 1), // Store in total loose units
        pack_size: parseInt(it.pack_size, 10) || 1,
        purchase_price: parseFloat(it.purchase_price) / (parseInt(it.pack_size, 10) || 1), // Per unit cost
        sale_price: parseFloat(it.sale_price) / (parseInt(it.pack_size, 10) || 1), // Per unit sale price
        unit_purchase_cost: parseFloat(it.purchase_price) / (parseInt(it.pack_size, 10) || 1),
        unit_selling_price: parseFloat(it.sale_price) / (parseInt(it.pack_size, 10) || 1)
      }))
    };

    try {
      await api.purchases.create(payload);
      toast.success('Purchase invoice recorded & inventory stock updated!');
      setNewInvoiceModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Failed to create purchase: ' + err.message);
    }
  };

  // Supplier CRUD
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierFormData({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      notes: ''
    });
    setSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup) => {
    setEditingSupplier(sup);
    setSupplierFormData({
      name: sup.name || '',
      contact_person: sup.contact_person || '',
      phone: sup.phone || '',
      email: sup.email || '',
      address: sup.address || '',
      notes: sup.notes || ''
    });
    setSupplierModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!supplierFormData.name.trim()) {
      toast.error('Supplier company name is required');
      return;
    }
    try {
      if (editingSupplier) {
        await api.purchases.updateSupplier(editingSupplier.id, supplierFormData);
        toast.success('Supplier updated!');
      } else {
        await api.purchases.createSupplier(supplierFormData);
        toast.success('Supplier created!');
      }
      setSupplierModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Save supplier failed: ' + err.message);
    }
  };

  // Record Payment
  const handleOpenRecordPayment = (sup) => {
    setPaymentSupplier(sup);
    setPaymentAmount(sup.balance > 0 ? sup.balance.toFixed(2) : '');
    setPaymentNotes('');
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    try {
      await api.purchases.recordPayment({
        supplier_id: paymentSupplier.id,
        amount: amount,
        payment_method: 'CASH',
        notes: paymentNotes
      });
      toast.success(`Payment of ${fmt(amount)} recorded!`);
      setPaymentModalOpen(false);
      loadData();
    } catch (err) {
      toast.error('Payment error: ' + err.message);
    }
  };

  const handleViewInvoiceDetails = async (inv) => {
    try {
      const details = await api.purchases.getById(inv.id);
      setViewInvoiceModal(details);
    } catch (err) {
      toast.error('Failed to load invoice details');
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Top Bar ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <TruckIcon className="text-cyan-400" size={22} /> Purchases & Supplier Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Receive incoming medicine batches, stock replenishment, and manage supplier accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'invoices' ? (
            <button
              onClick={handleOpenNewInvoice}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-lg shadow-cyan-900/30"
            >
              <Plus size={16} /> New Purchase Invoice
            </button>
          ) : (
            <button
              onClick={handleOpenAddSupplier}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-lg shadow-cyan-900/30"
            >
              <Plus size={16} /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs & Search Filter ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`btn btn-sm text-xs font-semibold py-1.5 px-3 ${
              activeTab === 'invoices' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            Purchase Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`btn btn-sm text-xs font-semibold py-1.5 px-3 ${
              activeTab === 'suppliers' ? 'btn-primary' : 'btn-secondary'
            }`}
          >
            Suppliers / Vendors ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 pr-3 py-1 text-xs w-full"
            />
          </div>
          <button onClick={loadData} className="btn btn-secondary p-1.5" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* ── Content View ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'invoices' ? (
            /* ── Purchase Invoices Table ── */
            loading ? (
              <div className="flex items-center justify-center h-48 text-slate-400">
                <RefreshCw className="animate-spin mr-2" size={20} /> Loading purchase records...
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                <FileText size={36} className="mb-2 stroke-1" />
                <p>No purchase invoices found.</p>
              </div>
            ) : (
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Supplier</th>
                    <th>Date</th>
                    <th className="text-right">Total Amount</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Balance Due</th>
                    <th className="text-center">Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40">
                        <td className="font-mono font-semibold text-white">{inv.invoice_number}</td>
                        <td className="font-semibold text-slate-200">{inv.supplier_name || '—'}</td>
                        <td className="text-xs text-slate-400">{inv.invoice_date}</td>
                        <td className="text-right font-medium text-white">{fmt(inv.total_amount)}</td>
                        <td className="text-right text-emerald-400">{fmt(inv.paid_amount)}</td>
                        <td className="text-right font-semibold text-rose-400">{fmt(balance)}</td>
                        <td className="text-center">
                          <span className={`badge text-[10px] ${
                            balance <= 0 ? 'badge-success' : (inv.paid_amount > 0 ? 'badge-warning' : 'badge-danger')
                          }`}>
                            {balance <= 0 ? 'Paid' : (inv.paid_amount > 0 ? 'Partial' : 'Unpaid')}
                          </span>
                        </td>
                        <td className="text-right">
                          <button
                            onClick={() => handleViewInvoiceDetails(inv)}
                            className="btn btn-secondary btn-sm p-1.5 text-cyan-400"
                            title="View items breakdown"
                          >
                            <Eye size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : (
            /* ── Suppliers Table ── */
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Supplier Name</th>
                  <th>Contact Person</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th className="text-right">Outstanding Balance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="font-bold text-white">{s.name}</td>
                    <td className="text-slate-300">{s.contact_person || '—'}</td>
                    <td className="font-mono text-xs text-slate-300">{s.phone || '—'}</td>
                    <td className="text-xs text-slate-400">{s.address || '—'}</td>
                    <td className={`text-right font-bold ${s.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {fmt(s.balance)}
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRecordPayment(s)}
                          className="btn btn-secondary btn-sm text-xs py-1 px-2 text-emerald-400"
                          title="Record payment made to supplier"
                        >
                          Pay
                        </button>
                        <button
                          onClick={() => handleOpenEditSupplier(s)}
                          className="btn btn-secondary btn-sm text-xs py-1 px-2"
                        >
                          Edit
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

      {/* ── New Purchase Invoice Modal ── */}
      {newInvoiceModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-4xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <TruckIcon size={20} className="text-cyan-400" /> New Purchase Invoice & Batch Entry
              </h3>
              <button onClick={() => setNewInvoiceModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="modal-body p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 bg-slate-900 p-3 rounded-lg border border-slate-800">
                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Supplier *</label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="input text-sm py-1.5 w-full"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Invoice / Bill # *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="input text-sm py-1.5 w-full font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="input text-sm py-1.5 w-full"
                  />
                </div>
              </div>

              {/* Medicine Batches List */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                    Medicines & Batches Received
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Medicine</label>
                        <select
                          value={it.medicine_id}
                          onChange={(e) => handleItemMedicineChange(idx, e.target.value)}
                          className="input text-xs py-1 w-full"
                        >
                          <option value="">Select Medicine</option>
                          {allMedicines.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.dosage_form || 'Tab'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Batch #</label>
                        <input
                          type="text"
                          placeholder="e.g. B-998"
                          value={it.batch_number}
                          onChange={(e) => handleItemFieldChange(idx, 'batch_number', e.target.value)}
                          className="input text-xs py-1 w-full font-mono uppercase"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Expiry Date</label>
                        <input
                          type="date"
                          value={it.expiry_date}
                          onChange={(e) => handleItemFieldChange(idx, 'expiry_date', e.target.value)}
                          className="input text-xs py-1 w-full"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Packs</label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity_packs}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity_packs', e.target.value)}
                          className="input text-xs py-1 w-full text-center"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Cost/Pack (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cost"
                          value={it.purchase_price}
                          onChange={(e) => handleItemFieldChange(idx, 'purchase_price', e.target.value)}
                          className="input text-xs py-1 w-full text-right"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">Sale/Pack</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Retail"
                          value={it.sale_price}
                          onChange={(e) => handleItemFieldChange(idx, 'sale_price', e.target.value)}
                          className="input text-xs py-1 w-full text-right"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length === 1}
                          className="text-slate-500 hover:text-rose-400 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Payment */}
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="text-xs text-slate-400">Total Purchase Amount:</div>
                  <div className="text-2xl font-black text-cyan-400">{fmt(invoiceSubtotal)}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">Paid Now (PKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paidNow}
                      onChange={(e) => setPaidNow(e.target.value)}
                      className="input text-sm py-1.5 w-40 text-right font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Balance Due</label>
                    <div className="text-sm font-bold text-rose-400 pt-1.5">
                      {fmt(Math.max(0, invoiceSubtotal - (parseFloat(paidNow) || 0)))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setNewInvoiceModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary py-2 font-bold">
                  Save Purchase & Receive Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Purchase Invoice Details Modal ── */}
      {viewInvoiceModal && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <FileText size={18} className="text-cyan-400" /> Invoice #{viewInvoiceModal.invoice_number}
              </h3>
              <button onClick={() => setViewInvoiceModal(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body p-4 flex flex-col gap-4">
              <div className="grid grid-cols-3 gap-2 bg-slate-900 p-3 rounded text-xs border border-slate-800">
                <div>Supplier: <span className="font-semibold text-white">{viewInvoiceModal.supplier_name}</span></div>
                <div>Date: <span className="text-slate-300">{viewInvoiceModal.invoice_date}</span></div>
                <div>Total: <span className="font-bold text-emerald-400">{fmt(viewInvoiceModal.total_amount)}</span></div>
              </div>

              <table className="table w-full text-xs">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch</th>
                    <th>Expiry</th>
                    <th className="text-center">Units Received</th>
                    <th className="text-right">Unit Cost</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoiceModal.items?.map((it, idx) => (
                    <tr key={idx}>
                      <td className="font-semibold text-white">{it.medicine_name}</td>
                      <td className="font-mono text-cyan-300">{it.batch_number}</td>
                      <td>{it.expiry_date}</td>
                      <td className="text-center">{it.quantity}</td>
                      <td className="text-right">{fmt(it.purchase_price)}</td>
                      <td className="text-right font-bold text-slate-200">{fmt(it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer p-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setViewInvoiceModal(null)} className="btn btn-secondary py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Supplier Modal ── */}
      {supplierModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Building2 size={18} className="text-cyan-400" /> {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button onClick={() => setSupplierModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="modal-body p-4 flex flex-col gap-3">
              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  placeholder="e.g. Allied Pharma Distributors"
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierFormData.contact_person}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                  placeholder="e.g. Muhammad Aslam"
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Office Address</label>
                <input
                  type="text"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  placeholder="e.g. Circular Road, Lahore"
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setSupplierModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary py-2 font-bold">
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {paymentModalOpen && paymentSupplier && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <CreditCard size={18} className="text-emerald-400" /> Record Supplier Payment
              </h3>
              <button onClick={() => setPaymentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="modal-body p-4 flex flex-col gap-4">
              <div className="bg-slate-900 p-3 rounded border border-slate-800 text-xs">
                <div className="font-bold text-white text-sm">{paymentSupplier.name}</div>
                <div className="text-slate-400 mt-1">
                  Current Outstanding Due: <span className="font-bold text-rose-400">{fmt(paymentSupplier.balance)}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Payment Amount (PKR) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input text-base font-bold py-2 w-full text-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 font-semibold block mb-1">Notes / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Transfer / Cheque #10293"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input text-sm py-2 w-full"
                />
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button type="button" onClick={() => setPaymentModalOpen(false)} className="btn btn-secondary py-2">
                  Cancel
                </button>
                <button type="submit" className="btn btn-success py-2 font-bold">
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
