import React, { useState, useEffect, useCallback } from 'react';
import {
  TruckIcon, Plus, Search, DollarSign, Calendar,
  FileText, CheckCircle2, AlertCircle, X, Trash2, Eye,
  Building2, Phone, CreditCard, RefreshCw, Layers, Check
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
      window.api.license.getStatus().then(setLicenseInfo).catch(() => { });
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
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('CASH');
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
      api.medicines.getAll({ active: 1 }).then((meds) => setAllMedicines(meds || [])).catch(() => { });
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
      opening_balance: '',
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
      opening_balance: sup.opening_balance || '',
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
        await api.purchases.createSupplier({
          ...supplierFormData,
          opening_balance: parseFloat(supplierFormData.opening_balance) || 0
        });
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
    const bal = parseFloat(sup.balance) || 0;
    setPaymentAmount(bal > 0 ? bal.toFixed(2) : '');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('CASH');
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
        payment_date: paymentDate || new Date().toISOString().slice(0, 10),
        payment_method: paymentMethod || 'CASH',
        method: paymentMethod || 'CASH',
        notes: paymentNotes
      });
      toast.success(`Payment of ${fmt(amount)} recorded successfully!`);
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
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TruckIcon className="text-teal-700" size={22} /> Purchases & Supplier Ledger
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Receive incoming medicine batches, stock replenishment, and manage supplier accounts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'invoices' ? (
            <button
              onClick={handleOpenNewInvoice}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
            >
              <Plus size={16} /> New Purchase Invoice
            </button>
          ) : (
            <button
              onClick={handleOpenAddSupplier}
              className="btn btn-primary btn-sm flex items-center gap-1.5 font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
            >
              <Plus size={16} /> Add Supplier
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs & Search Filter ── */}
      <div className="card p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${activeTab === 'invoices'
              ? 'border border-gray-200 bg-white text-teal-800 shadow-sm'
              : 'border border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <FileText size={14} /> Purchase Invoices ({invoices.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold ${activeTab === 'suppliers'
              ? 'border border-gray-200 bg-white text-teal-800 shadow-sm'
              : 'border border-transparent text-gray-500 hover:text-gray-800'
              }`}
          >
            <Building2 size={14} /> Suppliers / Vendors ({suppliers.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Search purchases or suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-8 pr-3 py-1.5 text-xs w-full border-gray-300"
            />
          </div>
          <button onClick={loadData} className="btn btn-secondary p-1.5 text-gray-600 hover:text-gray-900" title="Refresh">
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
              <div className="flex items-center justify-center h-48 text-gray-400">
                <RefreshCw className="animate-spin mr-2" size={20} /> Loading purchase records...
              </div>
            ) : invoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                <FileText size={36} className="mb-2 stroke-1 text-gray-300" />
                <p className="text-sm font-medium">No purchase invoices found.</p>
                <p className="text-xs text-gray-400 mt-1">Click "New Purchase Invoice" to record incoming stock.</p>
              </div>
            ) : (
              <table className="table w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Supplier</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Total Amount</th>
                    <th className="py-2.5 px-3 text-right">Paid</th>
                    <th className="py-2.5 px-3 text-right">Balance Due</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((inv) => {
                    const balance = (inv.total_amount || 0) - (inv.paid_amount || 0);
                    return (
                      <tr key={inv.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-semibold text-gray-900">{inv.invoice_number}</td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">{inv.supplier_name || '—'}</td>
                        <td className="py-2.5 px-3 text-xs text-gray-500">{inv.invoice_date}</td>
                        <td className="py-2.5 px-3 text-right font-medium text-gray-900">{fmt(inv.total_amount)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{fmt(inv.paid_amount)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold text-rose-600">{fmt(balance)}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${balance <= 0
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : inv.paid_amount > 0
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                            {balance <= 0 ? 'Paid' : inv.paid_amount > 0 ? 'Partial' : 'Unpaid'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleViewInvoiceDetails(inv)}
                            className="btn btn-secondary btn-sm p-1.5 text-teal-700 hover:text-teal-900 hover:bg-teal-50"
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
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-xs">
                  <th className="py-2.5 px-3">Supplier Name</th>
                  <th className="py-2.5 px-3">Contact Person</th>
                  <th className="py-2.5 px-3">Phone</th>
                  <th className="py-2.5 px-3">Address</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Balance</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-gray-900">{s.name}</td>
                    <td className="py-2.5 px-3 text-gray-700">{s.contact_person || '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-xs text-gray-600">{s.phone || '—'}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-500">{s.address || '—'}</td>
                    <td className={`py-2.5 px-3 text-right font-bold ${parseFloat(s.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {fmt(s.balance)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenRecordPayment(s)}
                          className="btn btn-secondary btn-sm text-xs py-1 px-2.5 text-teal-700 hover:text-teal-800 hover:bg-teal-50 border border-teal-200 font-semibold flex items-center gap-1 shadow-sm"
                          title="Record payment made to supplier"
                        >
                          <CreditCard size={13} /> Pay
                        </button>
                        <button
                          onClick={() => handleOpenEditSupplier(s)}
                          className="btn btn-secondary btn-sm text-xs py-1 px-2.5 text-gray-700 hover:text-gray-900 font-semibold"
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
          <div className="modal-content max-w-4xl bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="modal-header px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="modal-title text-base font-bold text-gray-900 flex items-center gap-2">
                <TruckIcon size={18} className="text-teal-700" /> New Purchase Invoice & Batch Entry
              </h3>
              <button
                type="button"
                onClick={() => setNewInvoiceModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="modal-body p-5 flex flex-col gap-4 max-h-[80vh] overflow-y-auto bg-white">
              <div className="grid grid-cols-3 gap-3 border-0 bg-gray-50 p-3.5 rounded-lg ">
                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">
                    Supplier <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="input text-xs py-1.5 w-full border-gray-300 bg-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">
                    Invoice / Bill # <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="input text-xs py-1.5 w-full font-mono border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">
                    Invoice Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="input text-xs py-1.5 w-full border-gray-300"
                  />
                </div>
              </div>

              {/* Medicine Batches List */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
                    Medicines & Batches Received
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="btn btn-secondary btn-sm text-xs flex items-center gap-1 border-teal-200 text-teal-700 hover:bg-teal-50"
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {items.map((it, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200 grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-3">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Medicine</label>
                        <select
                          value={it.medicine_id}
                          onChange={(e) => handleItemMedicineChange(idx, e.target.value)}
                          className="input text-xs py-1 w-full border-gray-300 bg-white"
                        >
                          <option value="">Select Medicine</option>
                          {allMedicines.map((m) => (
                            <option key={m.id} value={m.id}>{m.name} ({m.dosage_form || 'Tab'})</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Batch #</label>
                        <input
                          type="text"
                          placeholder="e.g. B-998"
                          value={it.batch_number}
                          onChange={(e) => handleItemFieldChange(idx, 'batch_number', e.target.value)}
                          className="input text-xs py-1 w-full font-mono uppercase border-gray-300"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Expiry Date</label>
                        <input
                          type="date"
                          value={it.expiry_date}
                          onChange={(e) => handleItemFieldChange(idx, 'expiry_date', e.target.value)}
                          className="input text-xs py-1 w-full border-gray-300"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Packs</label>
                        <input
                          type="number"
                          min="1"
                          value={it.quantity_packs}
                          onChange={(e) => handleItemFieldChange(idx, 'quantity_packs', e.target.value)}
                          className="input text-xs py-1 w-full text-center border-gray-300"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Cost/Pack (PKR)</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Cost"
                          value={it.purchase_price}
                          onChange={(e) => handleItemFieldChange(idx, 'purchase_price', e.target.value)}
                          className="input text-xs py-1 w-full text-right border-gray-300"
                        />
                      </div>

                      <div className="col-span-1">
                        <label className="text-[10px] text-gray-500 font-medium block mb-0.5">Sale/Pack</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Retail"
                          value={it.sale_price}
                          onChange={(e) => handleItemFieldChange(idx, 'sale_price', e.target.value)}
                          className="input text-xs py-1 w-full text-right border-gray-300"
                        />
                      </div>

                      <div className="col-span-1 text-center pt-3">
                        <button
                          type="button"
                          onClick={() => removeItemRow(idx)}
                          disabled={items.length === 1}
                          className="text-gray-400 hover:text-rose-600 p-1 disabled:opacity-30"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals & Payment */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500 font-medium">Total Purchase Amount:</div>
                  <div className="text-2xl font-black text-teal-800">{fmt(invoiceSubtotal)}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div>
                    <label className="text-xs text-gray-700 font-semibold block mb-1">Paid Now (PKR)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={paidNow}
                      onChange={(e) => setPaidNow(e.target.value)}
                      className="input text-sm py-1.5 w-40 text-right font-bold text-emerald-700 border-gray-300"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-medium block mb-1">Balance Due</label>
                    <div className="text-sm font-bold text-rose-600 pt-1.5">
                      {fmt(Math.max(0, invoiceSubtotal - (parseFloat(paidNow) || 0)))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="modal-footer pt-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setNewInvoiceModalOpen(false)}
                  className="btn btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary py-2 px-4 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
                >
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
          <div className="modal-content max-w-2xl bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="modal-header px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="modal-title text-base font-bold text-gray-900 flex items-center gap-2">
                <FileText size={18} className="text-teal-700" /> Invoice #{viewInvoiceModal.invoice_number}
              </h3>
              <button
                type="button"
                onClick={() => setViewInvoiceModal(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body p-5 flex flex-col gap-4 bg-white">
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-lg text-xs border border-gray-200">
                <div>
                  <span className="text-gray-500">Supplier:</span>{' '}
                  <span className="font-semibold text-gray-900">{viewInvoiceModal.supplier_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>{' '}
                  <span className="font-medium text-gray-800">{viewInvoiceModal.purchase_date || viewInvoiceModal.invoice_date}</span>
                </div>
                <div>
                  <span className="text-gray-500">Total:</span>{' '}
                  <span className="font-bold text-teal-800">{fmt(viewInvoiceModal.total_amount)}</span>
                </div>
              </div>

              <table className="table w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                    <th className="py-2 px-2.5">Medicine</th>
                    <th className="py-2 px-2.5">Batch</th>
                    <th className="py-2 px-2.5">Expiry</th>
                    <th className="py-2 px-2.5 text-center">Units Received</th>
                    <th className="py-2 px-2.5 text-right">Unit Cost</th>
                    <th className="py-2 px-2.5 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {viewInvoiceModal.items?.map((it, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/60">
                      <td className="py-2 px-2.5 font-semibold text-gray-900">{it.medicine_name}</td>
                      <td className="py-2 px-2.5 font-mono text-teal-700">{it.batch_number}</td>
                      <td className="py-2 px-2.5 text-gray-600">{it.expiry_date}</td>
                      <td className="py-2 px-2.5 text-center font-medium">{it.quantity}</td>
                      <td className="py-2 px-2.5 text-right">{fmt(it.unit_purchase_cost || it.purchase_price)}</td>
                      <td className="py-2 px-2.5 text-right font-bold text-gray-800">{fmt(it.line_total || it.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-footer p-4 border-t border-gray-100 flex justify-end bg-gray-50">
              <button
                type="button"
                onClick={() => setViewInvoiceModal(null)}
                className="btn btn-secondary py-1.5 px-4 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Supplier Modal ── */}
      {supplierModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="modal-header px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="modal-title text-base font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-teal-700" /> {editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
              </h3>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="modal-body p-5 flex flex-col gap-3.5 bg-white">
              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">
                  Company / Supplier Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={supplierFormData.name}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                  placeholder="e.g. Allied Pharma Distributors"
                  className="input text-xs py-2 w-full border-gray-300"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Contact Person</label>
                <input
                  type="text"
                  value={supplierFormData.contact_person}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, contact_person: e.target.value })}
                  placeholder="e.g. Muhammad Aslam"
                  className="input text-xs py-2 w-full border-gray-300"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={supplierFormData.phone}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                  placeholder="0300-1234567"
                  className="input text-xs py-2 w-full border-gray-300 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Office Address</label>
                <input
                  type="text"
                  value={supplierFormData.address}
                  onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                  placeholder="e.g. Circular Road, Lahore"
                  className="input text-xs py-2 w-full border-gray-300"
                />
              </div>

              {!editingSupplier && (
                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">Opening Balance (PKR)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={supplierFormData.opening_balance}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, opening_balance: e.target.value })}
                    placeholder="0.00 (previous unpaid ledger balance)"
                    className="input text-xs py-2 w-full border-gray-300"
                  />
                </div>
              )}

              <div className="modal-footer pt-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="btn btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary py-2 px-4 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white shadow-sm"
                >
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
          <div className="modal-content max-w-md bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
            <div className="modal-header px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="modal-title text-base font-bold text-gray-900 flex items-center gap-2">
                <CreditCard size={18} className="text-teal-700" /> Record Supplier Payment
              </h3>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="modal-body p-5 flex flex-col gap-4 bg-white">
              {/* Supplier info banner */}
              <div className="bg-teal-50/60 border border-teal-100/80 p-3.5 rounded-lg text-xs">
                <div className="font-bold text-gray-900 text-sm">{paymentSupplier.name}</div>
                <div className="text-gray-600 mt-1 flex items-center justify-between">
                  <span>Current Outstanding Due:</span>
                  <span className={`font-bold text-sm ${parseFloat(paymentSupplier.balance) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {fmt(paymentSupplier.balance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">
                  Payment Amount (PKR) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="input text-base font-bold py-2 w-full text-teal-800 border-gray-300 focus:border-teal-700 focus:ring-1 focus:ring-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="input text-xs py-2 w-full border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-700 font-semibold block mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="input text-xs py-2 w-full border-gray-300 bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online / Card</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-700 font-semibold block mb-1">Notes / Cheque #</label>
                <input
                  type="text"
                  placeholder="e.g. Bank Transfer Ref / Cheque #10293"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="input text-xs py-2 w-full border-gray-300"
                />
              </div>

              <div className="modal-footer pt-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 -mx-5 -mb-5 px-5 py-3">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary py-2 px-4 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Check size={16} /> Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
