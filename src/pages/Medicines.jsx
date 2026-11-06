import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pill, Plus, Search, Filter, Edit, Trash2, CheckCircle2,
  AlertCircle, Download, Upload, Barcode, X, Layers, Save,
  RefreshCw, Check, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops',
  'Ointment', 'Cream', 'Gel', 'Inhaler', 'Sachet', 'Solution', 'Spray', 'Suppository', 'Other'
];

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDosage, setSelectedDosage] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeMed, setBarcodeMed] = useState(null);
  const [newBarcodeVal, setNewBarcodeVal] = useState('');
  const [medBarcodes, setMedBarcodes] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: '',
    generic_name: '',
    brand: '',
    category: '',
    dosage_form: 'Tablet',
    strength: '',
    pack_size: 1,
    unit_of_measure: 'Pcs',
    rack_shelf: '',
    manufacturer: '',
    min_stock_level: 10,
    reorder_level: 20,
    requires_prescription: 0,
    is_narcotic: 0,
    barcode: ''
  });

  const fileInputRef = useRef(null);

  const loadMedicines = useCallback(async () => {
    if (!api?.medicines) return;
    setLoading(true);
    try {
      const filters = {
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        dosage_form: selectedDosage || undefined,
        active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 1 : 0)
      };
      const list = await api.medicines.getAll(filters);
      setMedicines(list || []);

      const cats = await api.medicines.getCategories();
      setCategories(cats || []);
    } catch (err) {
      toast.error('Failed to load medicines: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, selectedDosage, statusFilter]);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setFormData({
      name: '',
      generic_name: '',
      brand: '',
      category: categories[0] || 'General',
      dosage_form: 'Tablet',
      strength: '',
      pack_size: 10,
      unit_of_measure: 'Pcs',
      rack_shelf: '',
      manufacturer: '',
      min_stock_level: 10,
      reorder_level: 20,
      requires_prescription: 0,
      is_narcotic: 0,
      barcode: ''
    });
    setEditModalOpen(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name || '',
      generic_name: med.generic_name || '',
      brand: med.brand || '',
      category: med.category || '',
      dosage_form: med.dosage_form || 'Tablet',
      strength: med.strength || '',
      pack_size: med.pack_size || 1,
      unit_of_measure: med.unit_of_measure || 'Pcs',
      rack_shelf: med.rack_shelf || '',
      manufacturer: med.manufacturer || '',
      min_stock_level: med.min_stock_level || 10,
      reorder_level: med.reorder_level || 20,
      requires_prescription: med.requires_prescription ? 1 : 0,
      is_narcotic: med.is_narcotic ? 1 : 0,
      barcode: ''
    });
    setEditModalOpen(true);
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Medicine name is required');
      return;
    }

    try {
      if (editingMedicine) {
        await api.medicines.update(editingMedicine.id, formData);
        toast.success(`Updated "${formData.name}" successfully!`);
      } else {
        await api.medicines.create(formData);
        toast.success(`Added "${formData.name}" successfully!`);
      }
      setEditModalOpen(false);
      loadMedicines();
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handleToggleActive = async (med) => {
    try {
      if (med.is_active) {
        if (window.confirm(`Deactivate medicine "${med.name}"?`)) {
          await api.medicines.deactivate(med.id);
          toast.success(`Deactivated "${med.name}"`);
          loadMedicines();
        }
      } else {
        await api.medicines.reactivate(med.id);
        toast.success(`Reactivated "${med.name}"`);
        loadMedicines();
      }
    } catch (err) {
      toast.error('Failed to change status: ' + err.message);
    }
  };

  // Barcode Manager Modal
  const handleOpenBarcodeModal = async (med) => {
    setBarcodeMed(med);
    setNewBarcodeVal('');
    try {
      const barcodes = await api.medicines.getBarcodes(med.id);
      setMedBarcodes(barcodes || []);
      setBarcodeModalOpen(true);
    } catch (err) {
      toast.error('Failed to load barcodes');
    }
  };

  const handleAddBarcode = async (e) => {
    e.preventDefault();
    if (!newBarcodeVal.trim() || !barcodeMed) return;
    try {
      await api.medicines.addBarcode({
        medicine_id: barcodeMed.id,
        barcode: newBarcodeVal.trim(),
        is_primary: medBarcodes.length === 0 ? 1 : 0
      });
      toast.success('Barcode added');
      setNewBarcodeVal('');
      const updated = await api.medicines.getBarcodes(barcodeMed.id);
      setMedBarcodes(updated || []);
      loadMedicines();
    } catch (err) {
      toast.error('Add barcode error: ' + err.message);
    }
  };

  const handleRemoveBarcode = async (barcodeId) => {
    try {
      await api.medicines.removeBarcode(barcodeId);
      toast.success('Barcode removed');
      const updated = await api.medicines.getBarcodes(barcodeMed.id);
      setMedBarcodes(updated || []);
      loadMedicines();
    } catch (err) {
      toast.error('Remove error: ' + err.message);
    }
  };

  // CSV Import / Export
  const handleExportCSV = () => {
    if (medicines.length === 0) {
      toast.error('No medicines to export');
      return;
    }
    const headers = ['Name', 'Generic Name', 'Brand', 'Category', 'Dosage Form', 'Strength', 'Pack Size', 'Rack/Shelf', 'Manufacturer', 'Min Stock', 'Total Stock', 'Active'];
    const rows = medicines.map(m => [
      `"${m.name || ''}"`,
      `"${m.generic_name || ''}"`,
      `"${m.brand || ''}"`,
      `"${m.category || ''}"`,
      `"${m.dosage_form || ''}"`,
      `"${m.strength || ''}"`,
      m.pack_size || 1,
      `"${m.rack_shelf || ''}"`,
      `"${m.manufacturer || ''}"`,
      m.min_stock_level || 0,
      m.total_stock || 0,
      m.is_active ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `pharmadesk_medicines_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Medicines catalog exported as CSV!');
  };

  const handleProcessCSVImport = async () => {
    if (!csvText.trim()) {
      toast.error('Please paste or upload CSV text');
      return;
    }
    try {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) {
        toast.error('CSV must have a header row and at least 1 data row');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = vals[idx] || '';
        });
        rows.push({
          name: row['name'] || row['medicine name'] || 'Unnamed Item',
          generic_name: row['generic name'] || row['generic'] || '',
          brand: row['brand'] || '',
          category: row['category'] || 'General',
          dosage_form: row['dosage form'] || row['form'] || 'Tablet',
          strength: row['strength'] || '',
          pack_size: parseInt(row['pack size'] || row['pack_size'] || '1', 10),
          rack_shelf: row['rack'] || row['shelf'] || row['rack/shelf'] || '',
          manufacturer: row['manufacturer'] || row['mfg'] || '',
          min_stock_level: parseInt(row['min stock'] || '10', 10),
          barcode: row['barcode'] || ''
        });
      }

      if (api?.medicines?.importCSV) {
        const res = await api.medicines.importCSV(rows);
        toast.success(`Imported ${res?.imported || rows.length} medicines successfully!`);
        setImportModalOpen(false);
        setCsvText('');
        loadMedicines();
      }
    } catch (err) {
      toast.error('Import error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ── Top Header & Actions ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Pill className="text-cyan-400" size={22} /> Medicines Master Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your drug database, generics, packaging, shelf locations, and barcodes
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Import CSV"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={handleOpenAddModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-bold shadow-lg shadow-cyan-900/30"
          >
            <Plus size={16} /> Add Medicine
          </button>
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by medicine name, generic, brand, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 pr-4 py-1.5 text-sm w-full"
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input py-1.5 text-sm w-44"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Dosage form filter */}
        <select
          value={selectedDosage}
          onChange={(e) => setSelectedDosage(e.target.value)}
          className="input py-1.5 text-sm w-36"
        >
          <option value="">All Dosages</option>
          {DOSAGE_FORMS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input py-1.5 text-sm w-32"
        >
          <option value="active">Active Only</option>
          <option value="all">All Records</option>
          <option value="inactive">Inactive Only</option>
        </select>

        <button
          onClick={loadMedicines}
          className="btn btn-secondary p-2"
          title="Refresh List"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* ── Medicines Table ── */}
      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400">
              <RefreshCw className="animate-spin mr-2" size={20} /> Loading medicines catalog...
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Pill size={36} className="mb-2 stroke-1" />
              <p>No medicines match your search filters.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-4/12">Medicine & Generic Details</th>
                  <th className="w-2/12">Category / Dosage</th>
                  <th className="w-1/12 text-center">Pack</th>
                  <th className="w-1/12 text-center">Rack / Shelf</th>
                  <th className="w-2/12 text-center">Stock Level</th>
                  <th className="w-2/12 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => {
                  const isLow = (m.total_stock || 0) <= (m.min_stock_level || 0);
                  return (
                    <tr key={m.id} className="hover:bg-slate-800/40">
                      <td>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{m.name}</span>
                          {m.strength && <span className="text-xs text-slate-400 font-normal">({m.strength})</span>}
                          {m.requires_prescription === 1 && (
                            <span className="badge badge-warning text-[10px] py-0 px-1.5" title="Requires Prescription">Rx</span>
                          )}
                          {m.is_narcotic === 1 && (
                            <span className="badge badge-danger text-[10px] py-0 px-1.5" title="Narcotic / Controlled Substance">Narcotic</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Generic: <span className="text-slate-300">{m.generic_name || '—'}</span>
                          {m.brand && <span> • Brand: {m.brand}</span>}
                          {m.manufacturer && <span> • Mfg: {m.manufacturer}</span>}
                        </div>
                      </td>

                      <td>
                        <div className="text-xs font-semibold text-slate-200">{m.category || 'General'}</div>
                        <div className="text-xs text-cyan-400 font-medium">{m.dosage_form || 'Tablet'}</div>
                      </td>

                      <td className="text-center text-xs text-slate-300">
                        {m.pack_size || 1} {m.unit_of_measure || 'Pcs'}
                      </td>

                      <td className="text-center text-xs font-mono text-amber-300">
                        {m.rack_shelf || '—'}
                      </td>

                      <td className="text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-bold text-sm ${isLow ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {m.total_stock || 0} units
                          </span>
                          <span className="text-[10px] text-slate-500">
                            Min Alert: {m.min_stock_level || 10}
                          </span>
                        </div>
                      </td>

                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBarcodeModal(m)}
                            className="btn btn-secondary btn-sm p-1.5"
                            title="Manage Barcodes"
                          >
                            <Barcode size={15} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(m)}
                            className="btn btn-secondary btn-sm p-1.5"
                            title="Edit Medicine"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => handleToggleActive(m)}
                            className={`btn btn-sm p-1.5 ${m.is_active ? 'btn-danger' : 'btn-success'}`}
                            title={m.is_active ? 'Deactivate' : 'Reactivate'}
                          >
                            {m.is_active ? <Trash2 size={15} /> : <CheckCircle2 size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-3 border-t border-slate-800 text-xs text-slate-400 flex justify-between bg-slate-900/50">
          <span>Showing {medicines.length} medicines in catalog</span>
          <span>Tip: Click barcode icon on any medicine to attach scanner codes</span>
        </div>
      </div>

      {/* ── Add / Edit Medicine Modal ── */}
      {editModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-2xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Pill size={20} className="text-cyan-400" />
                {editingMedicine ? `Edit: ${editingMedicine.name}` : 'Add New Medicine'}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMedicine} className="modal-body p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Medicine / Trade Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Panadol Extra"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Generic Formula Name
                  </label>
                  <input
                    type="text"
                    value={formData.generic_name}
                    onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
                    placeholder="e.g. Paracetamol + Caffeine"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Analgesic / Antibiotic"
                    className="input text-sm py-2 w-full"
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Dosage Form
                  </label>
                  <select
                    value={formData.dosage_form}
                    onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
                    className="input text-sm py-2 w-full"
                  >
                    {DOSAGE_FORMS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Strength
                  </label>
                  <input
                    type="text"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g. 500mg, 10ml, 250mg/5ml"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Pack Size (Units / Pack)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.pack_size}
                    onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value, 10) || 1 })}
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Rack / Shelf Location
                  </label>
                  <input
                    type="text"
                    value={formData.rack_shelf}
                    onChange={(e) => setFormData({ ...formData, rack_shelf: e.target.value })}
                    placeholder="e.g. Rack A-3, Shelf 2"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Manufacturer / Company
                  </label>
                  <input
                    type="text"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g. GSK, Abbott, Getz Pharma"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Min Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_stock_level}
                    onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value, 10) || 0 })}
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">
                    Primary Barcode {!editingMedicine && '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    disabled={!!editingMedicine}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder={editingMedicine ? 'Manage via Barcode icon' : 'Scan or type barcode'}
                    className="input text-sm py-2 w-full"
                  />
                </div>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6 pt-2 border-t border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.requires_prescription === 1}
                    onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span>Requires Doctor Prescription (Rx)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={formData.is_narcotic === 1}
                    onChange={(e) => setFormData({ ...formData, is_narcotic: e.target.checked ? 1 : 0 })}
                    className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-cyan-500"
                  />
                  <span className="text-rose-400 font-medium">Narcotic / Controlled Drug</span>
                </label>
              </div>

              <div className="modal-footer pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="btn btn-secondary py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary py-2 font-bold flex items-center gap-1.5"
                >
                  <Save size={16} /> Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Barcodes Manager Modal ── */}
      {barcodeModalOpen && barcodeMed && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Barcode size={20} className="text-cyan-400" /> Barcodes for {barcodeMed.name}
              </h3>
              <button onClick={() => setBarcodeModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body p-4 flex flex-col gap-4">
              <form onSubmit={handleAddBarcode} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Scan or enter barcode..."
                  value={newBarcodeVal}
                  autoFocus
                  onChange={(e) => setNewBarcodeVal(e.target.value)}
                  className="input text-sm py-2 flex-1"
                />
                <button type="submit" className="btn btn-primary btn-sm px-4 font-bold">
                  Add
                </button>
              </form>

              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
                {medBarcodes.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No barcodes assigned to this medicine yet.
                  </div>
                ) : (
                  medBarcodes.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 bg-slate-800 rounded flex items-center justify-between border border-slate-700"
                    >
                      <div>
                        <div className="font-mono text-white font-semibold text-sm">{b.barcode}</div>
                        {b.is_primary === 1 && (
                          <span className="badge badge-info text-[10px]">Primary Barcode</span>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveBarcode(b.id)}
                        className="text-slate-400 hover:text-rose-400 p-1"
                        title="Delete Barcode"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer p-4 border-t border-slate-800 flex justify-end">
              <button onClick={() => setBarcodeModalOpen(false)} className="btn btn-secondary py-1.5">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Modal ── */}
      {importModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-xl">
            <div className="modal-header">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Upload size={20} className="text-cyan-400" /> Bulk Import Medicines (CSV)
              </h3>
              <button onClick={() => setImportModalOpen(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body p-4 flex flex-col gap-3">
              <p className="text-xs text-slate-400">
                Paste CSV data below with column headers (e.g. <code>name, generic, brand, category, dosage form, pack size, rack, barcode</code>):
              </p>

              <textarea
                rows="8"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`Name,Generic,Category,Dosage Form,Pack Size,Rack,Barcode\nPanadol 500mg,Paracetamol,Analgesics,Tablet,20,A-1,8964000123456\nBrufen 400mg,Ibuprofen,NSAID,Tablet,30,A-2,8964000789012`}
                className="input font-mono text-xs p-3 w-full"
              />

              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Upload file instead:</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => setCsvText(event.target.result);
                      reader.readAsText(file);
                    }
                  }}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            </div>

            <div className="modal-footer p-4 border-t border-slate-800 flex justify-end gap-2">
              <button onClick={() => setImportModalOpen(false)} className="btn btn-secondary py-2">
                Cancel
              </button>
              <button onClick={handleProcessCSVImport} className="btn btn-primary py-2 font-bold">
                Process Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
