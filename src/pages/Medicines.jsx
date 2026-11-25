// import React, { useState, useEffect, useCallback, useRef } from 'react';
// import {
//   Pill, Plus, Search, Filter, Edit, Trash2, CheckCircle2,
//   AlertCircle, Download, Upload, Barcode, X, Layers, Save,
//   RefreshCw, Check, AlertTriangle, Package, Clock, History,
//   Activity, Calendar, DollarSign, Hash, ShieldAlert
// } from 'lucide-react';
// import toast from 'react-hot-toast';

// const api = window.api;
// const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
// const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

// const DOSAGE_FORMS = [
//   'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops',
//   'Ointment', 'Cream', 'Gel', 'Inhaler', 'Sachet', 'Solution', 'Spray', 'Suppository', 'Other'
// ];

// const ADJUSTMENT_REASONS = [
//   'Physical Stock Correction',
//   'Damaged Stock',
//   'Expired Stock Write-off',
//   'Stock Received / Found',
//   'Returned to Supplier',
//   'Internal Transfer',
//   'Other'
// ];

// // ─── Batch Status Badge ────────────────────────────────────────
// function BatchStatusBadge({ batch }) {
//   if (batch.is_expired) {
//     return <span className="badge badge-danger">EXPIRED</span>;
//   }
//   const st = batch.status || 'ACTIVE';
//   if (st === 'ACTIVE') return <span className="badge badge-success">ACTIVE</span>;
//   if (st === 'BLOCKED') return <span className="badge badge-danger">BLOCKED</span>;
//   if (st === 'QUARANTINED') return <span className="badge badge-warning">QUARANTINED</span>;
//   return <span className="badge badge-secondary">{st}</span>;
// }

// // ─── Stock Status Indicator ────────────────────────────────────
// function StockIndicator({ med }) {
//   const saleable = Number(med.saleable_stock !== undefined ? med.saleable_stock : (med.total_stock || 0));
//   const min = Number(med.min_stock_level || 10);
//   const expired = Number(med.expired_stock || 0);
//   const nearExpiry = Number(med.near_expiry_stock || 0);

//   let badgeClass = 'badge-success';
//   let label = 'Healthy Stock';

//   if (saleable <= 0) {
//     badgeClass = 'badge-danger';
//     label = 'Out of Stock';
//   } else if (saleable <= min) {
//     badgeClass = 'badge-warning';
//     label = 'Low Stock';
//   } else if (nearExpiry > 0) {
//     badgeClass = 'badge-warning';
//     label = 'Near Expiry';
//   }

//   return (
//     <div className="flex flex-col items-center gap-0.5">
//       <span className={`text-sm font-bold ${saleable <= 0 ? 'text-red-600' : saleable <= min ? 'text-amber-600' : 'text-emerald-700'}`}>
//         {saleable} units
//       </span>
//       <span className={`badge ${badgeClass} text-[10px] py-0.5 px-2`}>
//         {label}
//       </span>
//       {expired > 0 && (
//         <span className="text-[10px] font-medium text-red-500">
//           ({expired} expired)
//         </span>
//       )}
//     </div>
//   );
// }

// export default function Medicines() {
//   const [medicines, setMedicines] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [suppliers, setSuppliers] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Filters
//   const [search, setSearch] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('');
//   const [selectedDosage, setSelectedDosage] = useState('');
//   const [statusFilter, setStatusFilter] = useState('active');

//   // Modals
//   const [editModalOpen, setEditModalOpen] = useState(false);
//   const [editingMedicine, setEditingMedicine] = useState(null);
//   const [editTab, setEditTab] = useState('info'); // 'info' | 'batches'

//   const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
//   const [barcodeMed, setBarcodeMed] = useState(null);
//   const [newBarcodeVal, setNewBarcodeVal] = useState('');
//   const [medBarcodes, setMedBarcodes] = useState([]);
//   const [importModalOpen, setImportModalOpen] = useState(false);
//   const [csvText, setCsvText] = useState('');

//   // Batch Management State
//   const [batchModalOpen, setBatchModalOpen] = useState(false);
//   const [batchMedicine, setBatchMedicine] = useState(null);
//   const [batches, setBatches] = useState([]);
//   const [batchesLoading, setBatchesLoading] = useState(false);

//   // Sub-modals for batch operations
//   const [addBatchOpen, setAddBatchOpen] = useState(false);
//   const [editBatchOpen, setEditBatchOpen] = useState(false);
//   const [editingBatch, setEditingBatch] = useState(null);
//   const [adjustStockOpen, setAdjustStockOpen] = useState(false);
//   const [adjustingBatch, setAdjustingBatch] = useState(null);
//   const [historyOpen, setHistoryOpen] = useState(false);
//   const [historyBatch, setHistoryBatch] = useState(null);
//   const [historyData, setHistoryData] = useState([]);

//   // Batch form
//   const [batchForm, setBatchForm] = useState({
//     batch_number: '',
//     mfg_date: '',
//     expiry_date: '',
//     purchase_price: '',
//     sale_price: '',
//     initial_quantity: '',
//     supplier_id: '',
//     status: 'ACTIVE'
//   });

//   // Adjust form
//   const [adjustForm, setAdjustForm] = useState({
//     new_quantity: '',
//     reason: '',
//     notes: ''
//   });

//   // Form State for Add / Edit Medicine
//   const [formData, setFormData] = useState({
//     name: '',
//     generic_name: '',
//     brand: '',
//     category: '',
//     dosage_form: 'Tablet',
//     strength: '',
//     pack_size: 1,
//     unit_of_measure: 'Pcs',
//     rack_shelf: '',
//     manufacturer: '',
//     min_stock_level: 10,
//     reorder_level: 20,
//     requires_prescription: 0,
//     is_narcotic: 0,
//     barcode: '',
//     // Initial stock fields (Add mode only)
//     initial_stock: '',
//     initial_batch_number: '',
//     initial_expiry_date: '',
//     initial_mfg_date: '',
//     initial_purchase_price: '',
//     initial_selling_price: ''
//   });

//   const fileInputRef = useRef(null);

//   const loadMedicines = useCallback(async () => {
//     if (!api?.medicines) return;
//     setLoading(true);
//     try {
//       const filters = {
//         search: search.trim() || undefined,
//         category: selectedCategory || undefined,
//         dosage_form: selectedDosage || undefined,
//         active: statusFilter === 'all' ? undefined : (statusFilter === 'active' ? 1 : 0)
//       };
//       const list = await api.medicines.getAll(filters);
//       setMedicines(list || []);

//       const cats = await api.medicines.getCategories();
//       setCategories(cats || []);
//     } catch (err) {
//       toast.error('Failed to load medicines: ' + err.message);
//     } finally {
//       setLoading(false);
//     }
//   }, [search, selectedCategory, selectedDosage, statusFilter]);

//   const loadSuppliers = useCallback(async () => {
//     try {
//       if (api?.purchases?.getSuppliers) {
//         const s = await api.purchases.getSuppliers({});
//         setSuppliers(s || []);
//       }
//     } catch (_) { }
//   }, []);

//   useEffect(() => { loadMedicines(); }, [loadMedicines]);
//   useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

//   // Safe Batch loader (with fallback to inventory:getBatches)
//   const loadBatches = useCallback(async (medId) => {
//     if (!medId) return;
//     setBatchesLoading(true);
//     try {
//       let b = [];
//       if (api?.batches?.getByMedicine) {
//         b = await api.batches.getByMedicine(medId);
//       } else if (api?.inventory?.getBatches) {
//         b = await api.inventory.getBatches(medId);
//       }
//       setBatches(b || []);
//     } catch (err) {
//       console.warn('Batches load error, trying fallback:', err);
//       try {
//         if (api?.inventory?.getBatches) {
//           const fallbackList = await api.inventory.getBatches(medId);
//           setBatches(fallbackList || []);
//           return;
//         }
//       } catch (_) { }
//       toast.error('Unable to load batches: ' + err.message);
//     } finally {
//       setBatchesLoading(false);
//     }
//   }, []);

//   // ─── Medicine CRUD Handlers ──────────────────────────────────
//   const handleOpenAddModal = () => {
//     setEditingMedicine(null);
//     setEditTab('info');
//     setFormData({
//       name: '',
//       generic_name: '',
//       brand: '',
//       category: categories[0] || 'General',
//       dosage_form: 'Tablet',
//       strength: '',
//       pack_size: 10,
//       unit_of_measure: 'Pcs',
//       rack_shelf: '',
//       manufacturer: '',
//       min_stock_level: 10,
//       reorder_level: 20,
//       requires_prescription: 0,
//       is_narcotic: 0,
//       barcode: '',
//       purchase_price: '',
//       selling_price: '',
//       initial_stock: '',
//       initial_batch_number: 'OPENING-001',
//       initial_expiry_date: '',
//       initial_mfg_date: '',
//       initial_purchase_price: '',
//       initial_selling_price: ''
//     });
//     setEditModalOpen(true);
//   };

//   const handleOpenEditModal = async (med) => {
//     setEditingMedicine(med);
//     setEditTab('info');
//     setFormData({
//       name: med.name || '',
//       generic_name: med.generic_name || '',
//       brand: med.brand || '',
//       category: med.category || '',
//       dosage_form: med.dosage_form || 'Tablet',
//       strength: med.strength || '',
//       pack_size: med.pack_size || 1,
//       unit_of_measure: med.unit_of_measure || 'Pcs',
//       rack_shelf: med.rack_shelf || '',
//       manufacturer: med.manufacturer || '',
//       min_stock_level: med.min_stock_level || 10,
//       reorder_level: med.reorder_level || 20,
//       requires_prescription: med.requires_prescription ? 1 : 0,
//       is_narcotic: med.is_narcotic ? 1 : 0,
//       barcode: med.primary_barcode || '',
//       purchase_price: med.purchase_price !== undefined && med.purchase_price !== null && med.purchase_price !== 0
//         ? med.purchase_price
//         : (med.default_purchase_price || ''),
//       selling_price: med.selling_price !== undefined && med.selling_price !== null && med.selling_price !== 0
//         ? med.selling_price
//         : (med.default_selling_price || med.sale_price || ''),
//       initial_stock: '',
//       initial_batch_number: '',
//       initial_expiry_date: '',
//       initial_mfg_date: '',
//       initial_purchase_price: '',
//       initial_selling_price: ''
//     });
//     setEditModalOpen(true);
//     loadBatches(med.id);
//   };

//   const handleSaveMedicine = async (e) => {
//     e.preventDefault();
//     if (!formData.name.trim()) {
//       toast.error('Medicine name is required');
//       return;
//     }

//     try {
//       const parsedCost = parseFloat(formData.purchase_price) || 0;
//       const parsedSale = parseFloat(formData.selling_price) || 0;

//       const payload = {
//         ...formData,
//         purchase_price: parsedCost,
//         selling_price: parsedSale,
//         default_purchase_price: parsedCost,
//         default_selling_price: parsedSale,
//       };

//       if (!editingMedicine) {
//         if (payload.initial_stock && parseInt(payload.initial_stock, 10) > 0) {
//           payload.initial_stock = parseInt(payload.initial_stock, 10);
//           payload.batch_number = payload.initial_batch_number || 'OPENING-001';
//           payload.expiry_date = payload.initial_expiry_date || null;
//           payload.mfg_date = payload.initial_mfg_date || null;
//           payload.purchase_price = parsedCost || parseFloat(payload.initial_purchase_price) || 0;
//           payload.selling_price = parsedSale || parseFloat(payload.initial_selling_price) || 0;
//         }
//         await api.medicines.create(payload);
//         toast.success(`Medicine "${formData.name}" added successfully!`);
//       } else {
//         await api.medicines.update(editingMedicine.id, payload);
//         toast.success(`Medicine "${formData.name}" and prices updated successfully!`);
//       }
//       setEditModalOpen(false);
//       loadMedicines();
//     } catch (err) {
//       toast.error('Save failed: ' + err.message);
//     }
//   };

//   const handleToggleActive = async (med) => {
//     try {
//       if (med.is_active) {
//         if (window.confirm(`Deactivate medicine "${med.name}"?`)) {
//           await api.medicines.deactivate(med.id);
//           toast.success(`Deactivated "${med.name}"`);
//           loadMedicines();
//         }
//       } else {
//         await api.medicines.reactivate(med.id);
//         toast.success(`Reactivated "${med.name}"`);
//         loadMedicines();
//       }
//     } catch (err) {
//       toast.error('Failed to update status: ' + err.message);
//     }
//   };

//   // ─── Barcode Manager ─────────────────────────────────────────
//   const handleOpenBarcodeModal = async (med) => {
//     setBarcodeMed(med);
//     setNewBarcodeVal('');
//     try {
//       const barcodes = await api.medicines.getBarcodes(med.id);
//       setMedBarcodes(barcodes || []);
//       setBarcodeModalOpen(true);
//     } catch (err) {
//       toast.error('Failed to load barcodes');
//     }
//   };

//   const handleAddBarcode = async (e) => {
//     e.preventDefault();
//     if (!newBarcodeVal.trim() || !barcodeMed) return;
//     try {
//       await api.medicines.addBarcode({
//         medicine_id: barcodeMed.id,
//         barcode: newBarcodeVal.trim(),
//         is_primary: medBarcodes.length === 0 ? 1 : 0
//       });
//       toast.success('Barcode added');
//       setNewBarcodeVal('');
//       const updated = await api.medicines.getBarcodes(barcodeMed.id);
//       setMedBarcodes(updated || []);
//       loadMedicines();
//     } catch (err) {
//       toast.error('Add barcode error: ' + err.message);
//     }
//   };

//   const handleRemoveBarcode = async (barcodeId) => {
//     try {
//       await api.medicines.removeBarcode(barcodeId);
//       toast.success('Barcode removed');
//       const updated = await api.medicines.getBarcodes(barcodeMed.id);
//       setMedBarcodes(updated || []);
//       loadMedicines();
//     } catch (err) {
//       toast.error('Remove error: ' + err.message);
//     }
//   };

//   // ─── CSV Import / Export ─────────────────────────────────────
//   const handleExportCSV = () => {
//     if (medicines.length === 0) {
//       toast.error('No medicines to export');
//       return;
//     }
//     const headers = ['Name', 'Generic Name', 'Brand', 'Category', 'Dosage Form', 'Strength', 'Pack Size', 'Rack/Shelf', 'Manufacturer', 'Min Stock', 'Total Stock', 'Active'];
//     const rows = medicines.map(m => [
//       `"${m.name || ''}"`,
//       `"${m.generic_name || ''}"`,
//       `"${m.brand || ''}"`,
//       `"${m.category || ''}"`,
//       `"${m.dosage_form || ''}"`,
//       `"${m.strength || ''}"`,
//       m.pack_size || 1,
//       `"${m.rack_shelf || ''}"`,
//       `"${m.manufacturer || ''}"`,
//       m.min_stock_level || 0,
//       m.total_stock || 0,
//       m.is_active ? 'Yes' : 'No'
//     ]);
//     const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
//     const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement('a');
//     link.href = url;
//     link.download = `pharmadesk_medicines_${new Date().toISOString().slice(0, 10)}.csv`;
//     link.click();
//     toast.success('Medicines catalog exported as CSV!');
//   };

//   const handleProcessCSVImport = async () => {
//     if (!csvText.trim()) {
//       toast.error('Please paste or upload CSV text');
//       return;
//     }
//     try {
//       const lines = csvText.trim().split('\n');
//       if (lines.length < 2) {
//         toast.error('CSV must have a header row and at least 1 data row');
//         return;
//       }
//       const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
//       const rows = [];
//       for (let i = 1; i < lines.length; i++) {
//         const line = lines[i].trim();
//         if (!line) continue;
//         const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
//         const row = {};
//         headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
//         rows.push({
//           name: row['name'] || row['medicine name'] || 'Unnamed Item',
//           generic_name: row['generic name'] || row['generic'] || '',
//           brand: row['brand'] || '',
//           category: row['category'] || 'General',
//           dosage_form: row['dosage form'] || row['form'] || 'Tablet',
//           strength: row['strength'] || '',
//           pack_size: parseInt(row['pack size'] || row['pack_size'] || '1', 10),
//           rack_shelf: row['rack'] || row['shelf'] || row['rack/shelf'] || '',
//           manufacturer: row['manufacturer'] || row['mfg'] || '',
//           min_stock_level: parseInt(row['min stock'] || '10', 10),
//           barcode: row['barcode'] || ''
//         });
//       }
//       if (api?.medicines?.importCSV) {
//         const res = await api.medicines.importCSV(rows);
//         toast.success(`Imported ${res?.imported || rows.length} medicines successfully!`);
//         setImportModalOpen(false);
//         setCsvText('');
//         loadMedicines();
//       }
//     } catch (err) {
//       toast.error('Import error: ' + err.message);
//     }
//   };

//   // ─── Batch Manager Handlers ──────────────────────────────────
//   const handleOpenBatchManager = async (med) => {
//     setBatchMedicine(med);
//     setBatchModalOpen(true);
//     await loadBatches(med.id);
//   };

//   const handleOpenAddBatch = () => {
//     setBatchForm({
//       batch_number: '',
//       mfg_date: '',
//       expiry_date: '',
//       purchase_price: '',
//       sale_price: '',
//       initial_quantity: '',
//       supplier_id: '',
//       status: 'ACTIVE'
//     });
//     setAddBatchOpen(true);
//   };

//   const handleCreateBatch = async (e) => {
//     e.preventDefault();
//     if (!batchForm.batch_number.trim()) {
//       toast.error('Batch number is required');
//       return;
//     }
//     if (!batchForm.expiry_date) {
//       toast.error('Expiry date is required');
//       return;
//     }
//     const medId = batchMedicine?.id || editingMedicine?.id;
//     if (!medId) return;

//     try {
//       if (api?.batches?.create) {
//         await api.batches.create({
//           medicine_id: medId,
//           batch_number: batchForm.batch_number.trim(),
//           mfg_date: batchForm.mfg_date || null,
//           expiry_date: batchForm.expiry_date,
//           purchase_cost: parseFloat(batchForm.purchase_price) || 0,
//           selling_price: parseFloat(batchForm.sale_price) || 0,
//           initial_quantity: parseInt(batchForm.initial_quantity, 10) || 0,
//           supplier_id: batchForm.supplier_id || null,
//           status: batchForm.status
//         });
//         toast.success(`Batch "${batchForm.batch_number}" created!`);
//         setAddBatchOpen(false);
//         await loadBatches(medId);
//         loadMedicines();
//       } else {
//         toast.error('Batch creation service unavailable');
//       }
//     } catch (err) {
//       toast.error(err.message);
//     }
//   };

//   const handleOpenEditBatch = (batch) => {
//     setEditingBatch(batch);
//     setBatchForm({
//       batch_number: batch.batch_number || '',
//       mfg_date: batch.mfg_date ? String(batch.mfg_date).slice(0, 10) : '',
//       expiry_date: batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : '',
//       purchase_price: batch.purchase_price !== undefined ? batch.purchase_price : (batch.purchase_cost || ''),
//       sale_price: batch.sale_price !== undefined ? batch.sale_price : (batch.selling_price || ''),
//       initial_quantity: batch.initial_quantity || batch.received_quantity || '',
//       supplier_id: batch.supplier_id || '',
//       status: batch.status || 'ACTIVE'
//     });
//     setEditBatchOpen(true);
//   };

//   const handleUpdateBatch = async (e) => {
//     e.preventDefault();
//     const medId = batchMedicine?.id || editingMedicine?.id;
//     try {
//       if (api?.batches?.update) {
//         await api.batches.update(editingBatch.id, {
//           batch_number: batchForm.batch_number.trim(),
//           mfg_date: batchForm.mfg_date || null,
//           expiry_date: batchForm.expiry_date,
//           purchase_cost: parseFloat(batchForm.purchase_price) || 0,
//           selling_price: parseFloat(batchForm.sale_price) || 0,
//           status: batchForm.status,
//           supplier_id: batchForm.supplier_id || null
//         });
//         toast.success('Stock & expiry updated!');
//         setEditBatchOpen(false);
//         setEditingBatch(null);
//         if (medId) await loadBatches(medId);
//         loadMedicines();
//       }
//     } catch (err) {
//       toast.error(err.message);
//     }
//   };

//   const handleOpenAdjustStock = (batch) => {
//     setAdjustingBatch(batch);
//     const current = batch.current_stock !== undefined ? batch.current_stock : (batch.available_quantity || 0);
//     setAdjustForm({
//       new_quantity: current,
//       reason: '',
//       notes: ''
//     });
//     setAdjustStockOpen(true);
//   };

//   const handleAdjustStock = async (e) => {
//     e.preventDefault();
//     if (!adjustForm.reason) {
//       toast.error('Adjustment reason is required');
//       return;
//     }
//     const medId = batchMedicine?.id || editingMedicine?.id;
//     try {
//       if (api?.batches?.adjustStock) {
//         const result = await api.batches.adjustStock({
//           batch_id: adjustingBatch.id,
//           new_quantity: parseInt(adjustForm.new_quantity, 10),
//           reason: adjustForm.reason,
//           notes: adjustForm.notes
//         });
//         toast.success(`Stock adjusted: ${result.old_quantity} → ${result.new_quantity}`);
//         setAdjustStockOpen(false);
//         setAdjustingBatch(null);
//         if (medId) await loadBatches(medId);
//         loadMedicines();
//       }
//     } catch (err) {
//       toast.error(err.message);
//     }
//   };

//   const handleOpenHistory = async (batch) => {
//     setHistoryBatch(batch);
//     setHistoryOpen(true);
//     try {
//       if (api?.batches?.getHistory) {
//         const h = await api.batches.getHistory(batch.id);
//         setHistoryData(h || []);
//       }
//     } catch (err) {
//       toast.error('Failed to load batch history');
//     }
//   };

//   const handleDeleteBatch = async (batch) => {
//     const msg = `Remove batch "${batch.batch_number}"?\n\nIf this batch has sales/purchases, it will be marked as BLOCKED to protect historical invoices.`;
//     if (!window.confirm(msg)) return;
//     const medId = batchMedicine?.id || editingMedicine?.id;
//     try {
//       if (api?.batches?.delete) {
//         const res = await api.batches.delete(batch.id);
//         toast.success(res.message || 'Batch removed');
//         if (medId) await loadBatches(medId);
//         loadMedicines();
//       }
//     } catch (err) {
//       toast.error(err.message);
//     }
//   };

//   // Computed stats
//   const batchStats = {
//     totalPhysical: batches.reduce((s, b) => s + Number(b.current_stock !== undefined ? b.current_stock : (b.available_quantity || 0)), 0),
//     saleable: batches.filter(b => (b.status === 'ACTIVE' || !b.status) && !b.is_expired).reduce((s, b) => s + Number(b.current_stock !== undefined ? b.current_stock : (b.available_quantity || 0)), 0),
//     expired: batches.filter(b => b.is_expired || b.status === 'EXPIRED').reduce((s, b) => s + Number(b.current_stock !== undefined ? b.current_stock : (b.available_quantity || 0)), 0),
//     activeBatches: batches.filter(b => (b.status === 'ACTIVE' || !b.status) && !b.is_expired).length,
//     nearExpiry: batches.filter(b => b.is_near_expiry).length,
//   };

//   return (
//     <div className="flex flex-col h-full gap-4">
//       {/* ── Page Header Card ── */}
//       <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
//         <div>
//           <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
//             <Pill className="text-teal-700" size={22} /> Medicines Master Catalog
//           </h1>
//           <p className="text-xs text-gray-500 mt-0.5">
//             Manage drugs, formulations, pricing, shelf locations, and FEFO stock batches
//           </p>
//         </div>
//         <div className="flex items-center gap-2 flex-wrap">
//           <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" title="Export Catalog as CSV">
//             <Download size={14} /> Export CSV
//           </button>
//           <button onClick={() => setImportModalOpen(true)} className="btn btn-secondary btn-sm" title="Import CSV">
//             <Upload size={14} /> Import CSV
//           </button>
//           <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm font-semibold">
//             <Plus size={16} /> Add Medicine
//           </button>
//         </div>
//       </div>

//       {/* ── Filters Bar Card ── */}
//       <div className="card p-3 flex flex-wrap items-center gap-3">
//         <div className="flex-1 min-w-[260px] relative">
//           <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
//           <input
//             type="text"
//             placeholder="Search by medicine name, generic formula, brand, or barcode..."
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="input pl-9 pr-4 py-1.5 text-xs w-full"
//           />
//         </div>

//         <select
//           value={selectedCategory}
//           onChange={(e) => setSelectedCategory(e.target.value)}
//           className="input py-1.5 text-xs w-44"
//         >
//           <option value="">All Categories</option>
//           {categories.map((c) => <option key={c} value={c}>{c}</option>)}
//         </select>

//         <select
//           value={selectedDosage}
//           onChange={(e) => setSelectedDosage(e.target.value)}
//           className="input py-1.5 text-xs w-36"
//         >
//           <option value="">All Dosages</option>
//           {DOSAGE_FORMS.map((d) => <option key={d} value={d}>{d}</option>)}
//         </select>

//         <select
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value)}
//           className="input py-1.5 text-xs w-32"
//         >
//           <option value="active">Active Only</option>
//           <option value="all">All Records</option>
//           <option value="inactive">Inactive Only</option>
//         </select>

//         <button onClick={loadMedicines} className="btn btn-secondary p-2" title="Refresh List">
//           <RefreshCw size={15} />
//         </button>
//       </div>

//       {/* ── Main Catalog Table Card ── */}
//       <div className="card flex-1 overflow-hidden flex flex-col">
//         <div className="flex-1 overflow-y-auto">
//           {loading ? (
//             <div className="flex items-center justify-center h-48 text-gray-400">
//               <RefreshCw className="animate-spin mr-2" size={18} /> Loading medicines catalog...
//             </div>
//           ) : medicines.length === 0 ? (
//             <div className="flex flex-col items-center justify-center h-48 text-gray-400">
//               <Pill size={36} className="mb-2 stroke-1" />
//               <p className="text-sm font-medium">No medicines found matching the filters.</p>
//             </div>
//           ) : (
//             <table className="table w-full">
//               <thead>
//                 <tr>
//                   <th className="w-4/12">Medicine & Generic Details</th>
//                   <th className="w-2/12">Category / Form</th>
//                   <th className="w-1/12 text-center">Pack</th>
//                   <th className="w-1/12 text-center">Rack / Shelf</th>
//                   <th className="w-1/12 text-center">Batches</th>
//                   <th className="w-2/12 text-center">Stock Level</th>
//                   <th className="w-1/12 text-right">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {medicines.map((m) => (
//                   <tr key={m.id}>
//                     <td>
//                       <div className="font-semibold text-gray-900 flex items-center gap-1.5 flex-wrap">
//                         <span>{m.name}</span>
//                         {m.strength && <span className="text-xs text-gray-500 font-normal">({m.strength})</span>}
//                         {m.requires_prescription === 1 && (
//                           <span className="badge badge-warning text-[10px] py-0 px-1.5" title="Requires Prescription">Rx</span>
//                         )}
//                         {m.is_narcotic === 1 && (
//                           <span className="badge badge-danger text-[10px] py-0 px-1.5" title="Narcotic / Controlled">Narcotic</span>
//                         )}
//                       </div>
//                       <div className="text-xs text-gray-500 mt-0.5">
//                         Generic: <span className="text-gray-700 font-medium">{m.generic_name || '—'}</span>
//                         {m.brand && <span> • Brand: {m.brand}</span>}
//                         {m.manufacturer && <span> • Mfg: {m.manufacturer}</span>}
//                       </div>
//                     </td>

//                     <td>
//                       <div className="text-xs font-semibold text-gray-800">{m.category || 'General'}</div>
//                       <div className="text-xs text-teal-700 font-medium">{m.dosage_form || 'Tablet'}</div>
//                     </td>

//                     <td className="text-center text-xs text-gray-600">
//                       {m.pack_size || 1} {m.unit_of_measure || 'Pcs'}
//                     </td>

//                     <td className="text-center text-xs font-mono font-medium text-amber-700">
//                       {m.rack_shelf || '—'}
//                     </td>

//                     <td className="text-center">
//                       <button
//                         onClick={() => handleOpenBatchManager(m)}
//                         className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 transition-colors"
//                         title="View & Manage Batches"
//                       >
//                         <Layers size={12} />
//                         <span>{m.batch_count || 0}</span>
//                       </button>
//                     </td>

//                     <td className="text-center">
//                       <StockIndicator med={m} />
//                     </td>

//                     <td className="text-right">
//                       <div className="flex items-center justify-end gap-1">
//                         <button
//                           onClick={() => handleOpenBatchManager(m)}
//                           className="btn btn-secondary btn-sm p-1.5"
//                           title="Manage Batches"
//                         >
//                           <Layers size={14} />
//                         </button>
//                         <button
//                           onClick={() => handleOpenBarcodeModal(m)}
//                           className="btn btn-secondary btn-sm p-1.5"
//                           title="Manage Barcodes"
//                         >
//                           <Barcode size={14} />
//                         </button>
//                         <button
//                           onClick={() => handleOpenEditModal(m)}
//                           className="btn btn-secondary btn-sm p-1.5"
//                           title="Edit Medicine"
//                         >
//                           <Edit size={14} />
//                         </button>
//                         <button
//                           onClick={() => handleToggleActive(m)}
//                           className={`btn btn-sm p-1.5 ${m.is_active ? 'btn-danger' : 'btn-success'}`}
//                           title={m.is_active ? 'Deactivate' : 'Reactivate'}
//                         >
//                           {m.is_active ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           )}
//         </div>
//         <div className="p-3 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center bg-gray-50">
//           <span>Showing <b>{medicines.length}</b> medicines</span>
//           <span className="text-gray-400">Click <b>Batches pill</b> to view batch records and make stock adjustments</span>
//         </div>
//       </div>

//       {/* ════════════════════════════════════════════════════════════
//           ADD / EDIT MEDICINE MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {editModalOpen && (
//         <div className="modal-backdrop">
//           <div className="modal-content" style={{ maxWidth: editingMedicine ? '900px' : '620px' }}>
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Pill size={18} className="text-teal-700" />
//                 {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Add New Medicine'}
//               </h3>
//               <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>

//             {/* Sleek Segmented Tab Switcher */}
//             {editingMedicine && (
//               <div className="px-5 pt-3.5 pb-1 bg-white border-b border-gray-100">
//                 <div
//                   style={{
//                     display: 'inline-flex',
//                     alignItems: 'center',
//                     padding: '3px',
//                     borderRadius: '10px',
//                     gap: '4px',
//                   }}
//                 >
//                   <button
//                     type="button"
//                     onClick={() => setEditTab('info')}
//                     style={{
//                       display: 'inline-flex',
//                       alignItems: 'center',
//                       gap: '7px',
//                       padding: '7px 16px',
//                       borderRadius: '8px',
//                       fontSize: '12.5px',
//                       fontWeight: editTab === 'info' ? 700 : 500,
//                       background: editTab === 'info' ? '#FFFFFF' : 'transparent',
//                       color: editTab === 'info' ? '#0F766E' : '#475467',
//                       border: editTab === 'info' ? '1px solid #CBD5E1' : '1px solid transparent',
//                       boxShadow: editTab === 'info' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
//                       cursor: 'pointer',
//                       transition: 'all 0.15s ease',
//                     }}
//                   >
//                     <Pill size={14} color={editTab === 'info' ? '#0F766E' : '#64748B'} />
//                     <span>Medicine Information</span>
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => { setEditTab('batches'); loadBatches(editingMedicine.id); }}
//                     style={{
//                       display: 'inline-flex',
//                       alignItems: 'center',
//                       gap: '7px',
//                       padding: '7px 16px',
//                       borderRadius: '8px',
//                       fontSize: '12.5px',
//                       fontWeight: editTab === 'batches' ? 700 : 500,
//                       background: editTab === 'batches' ? '#FFFFFF' : 'transparent',
//                       color: editTab === 'batches' ? '#0F766E' : '#475467',
//                       border: editTab === 'batches' ? '1px solid #CBD5E1' : '1px solid transparent',
//                       boxShadow: editTab === 'batches' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
//                       cursor: 'pointer',
//                       transition: 'all 0.15s ease',
//                     }}
//                   >
//                     <Layers size={14} color={editTab === 'batches' ? '#0F766E' : '#64748B'} />
//                     <span>Batches & Stock</span>
//                     <span
//                       style={{
//                         padding: '1px 8px',
//                         borderRadius: '999px',
//                         fontSize: '10.5px',
//                         fontWeight: 700,
//                         background: editTab === 'batches' ? '#CCFBF1' : '#E2E8F0',
//                         color: editTab === 'batches' ? '#0F766E' : '#475467',
//                         marginLeft: '2px',
//                       }}
//                     >
//                       {batches.length}
//                     </span>
//                   </button>
//                 </div>
//               </div>
//             )}

//             {/* Tab A: Medicine Information Form */}
//             {editTab === 'info' && (
//               <form onSubmit={handleSaveMedicine} className="modal-body flex flex-col gap-4">
//                 <div className="grid grid-cols-2 gap-3">
//                   <div className="col-span-2 sm:col-span-1">
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">
//                       Medicine / Trade Name *
//                     </label>
//                     <input
//                       type="text"
//                       required
//                       value={formData.name}
//                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                       placeholder="e.g. Panadol Extra"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div className="col-span-2 sm:col-span-1">
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">
//                       Generic Formula
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.generic_name}
//                       onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
//                       placeholder="e.g. Paracetamol + Caffeine"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Brand</label>
//                     <input
//                       type="text"
//                       value={formData.brand}
//                       onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
//                       placeholder="e.g. GSK, Abbott"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Category</label>
//                     <input
//                       type="text"
//                       list="cat-suggestions"
//                       value={formData.category}
//                       onChange={(e) => setFormData({ ...formData, category: e.target.value })}
//                       placeholder="e.g. Analgesic"
//                       className="input w-full"
//                     />
//                     <datalist id="cat-suggestions">
//                       {categories.map((c) => <option key={c} value={c} />)}
//                     </datalist>
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Dosage Form</label>
//                     <select
//                       value={formData.dosage_form}
//                       onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })}
//                       className="input w-full"
//                     >
//                       {DOSAGE_FORMS.map((d) => <option key={d} value={d}>{d}</option>)}
//                     </select>
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Strength</label>
//                     <input
//                       type="text"
//                       value={formData.strength}
//                       onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
//                       placeholder="e.g. 500mg, 10ml"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Pack Size (Units/Pack)</label>
//                     <input
//                       type="number"
//                       min="1"
//                       value={formData.pack_size}
//                       onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value, 10) || 1 })}
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Rack / Shelf Location</label>
//                     <input
//                       type="text"
//                       value={formData.rack_shelf}
//                       onChange={(e) => setFormData({ ...formData, rack_shelf: e.target.value })}
//                       placeholder="e.g. A-3 Shelf 2"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Manufacturer</label>
//                     <input
//                       type="text"
//                       value={formData.manufacturer}
//                       onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
//                       placeholder="e.g. Getz Pharma"
//                       className="input w-full"
//                     />
//                   </div>

//                   <div>
//                     <label className="text-xs font-semibold text-gray-700 block mb-1">Min Stock Alert Level</label>
//                     <input
//                       type="number"
//                       min="0"
//                       value={formData.min_stock_level}
//                       onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value, 10) || 0 })}
//                       className="input w-full"
//                     />
//                   </div>

//                   {/* ── Medicine Pricing Section (Editable anytime) ── */}

//                   <div className="col-span-2 mt-0.5 rounded-lg border border-teal-200 bg-teal-50/40 p-2.5">
//                     <div className="flex items-center justify-between gap-2 mb-2">
//                       <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
//                         <span>Medicine Pricing</span>
//                       </div>

//                       {formData.selling_price && formData.purchase_price &&
//                         parseFloat(formData.selling_price) > 0 && (
//                           <div className="flex items-center gap-1.5 text-[10px]">
//                             <span className="text-gray-500">Profit / unit:</span>
//                             <span className={`font-bold rounded px-1.5 py-0.5 ${parseFloat(formData.selling_price) >= parseFloat(formData.purchase_price)
//                               ? 'bg-emerald-100 text-emerald-800'
//                               : 'bg-red-100 text-red-800'
//                               }`}>
//                               Rs. {(parseFloat(formData.selling_price) - parseFloat(formData.purchase_price || 0)).toFixed(2)}
//                             </span>
//                           </div>
//                         )}
//                     </div>

//                     <div className="grid grid-cols-2 gap-2.5">
//                       <div>
//                         <label className="block text-[11px] font-medium text-gray-600 mb-1">
//                           Purchase Price (PKR)
//                         </label>
//                         <input
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={formData.purchase_price}
//                           onChange={(e) => setFormData({
//                             ...formData,
//                             purchase_price: e.target.value
//                           })}
//                           placeholder="0.00"
//                           className="input w-full text-sm font-medium"
//                         />
//                       </div>

//                       <div>
//                         <label className="block text-[11px] font-medium text-gray-600 mb-1">
//                           Selling Price (PKR) *
//                         </label>
//                         <input
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={formData.selling_price}
//                           onChange={(e) => setFormData({
//                             ...formData,
//                             selling_price: e.target.value
//                           })}
//                           placeholder="0.00"
//                           className="input w-full text-sm font-semibold text-teal-900"
//                         />
//                       </div>
//                     </div>

//                     {editingMedicine && (
//                       <p className="mt-2 text-[10px] text-teal-800/80">
//                         💡 Updates default catalog pricing. Batch-specific prices should remain independent.
//                       </p>
//                     )}
//                   </div>


//                   {!editingMedicine && (
//                     <div className="col-span-2">
//                       <label className="text-xs font-semibold text-gray-700 block mb-1">Primary Barcode (Optional)</label>
//                       <input
//                         type="text"
//                         value={formData.barcode}
//                         onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
//                         placeholder="Scan or type barcode"
//                         className="input w-full"
//                       />
//                     </div>
//                   )}
//                 </div>

//                 {/* Prescription & Narcotic Flags */}
//                 <div className="flex gap-6 py-2 border-t border-gray-200">
//                   <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
//                     <input
//                       type="checkbox"
//                       checked={formData.requires_prescription === 1}
//                       onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked ? 1 : 0 })}
//                       className="rounded text-teal-600 focus:ring-teal-500"
//                     />
//                     <span>Requires Doctor Prescription (Rx)</span>
//                   </label>

//                   <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
//                     <input
//                       type="checkbox"
//                       checked={formData.is_narcotic === 1}
//                       onChange={(e) => setFormData({ ...formData, is_narcotic: e.target.checked ? 1 : 0 })}
//                       className="rounded text-red-600 focus:ring-red-500"
//                     />
//                     <span className="text-red-700 font-semibold">Narcotic / Controlled Substance</span>
//                   </label>
//                 </div>

//                 {/* ── Initial Opening Stock (Add Mode Only) ── */}
//                 {!editingMedicine && (
//                   <div className="border border-teal-200 rounded-lg p-3 bg-teal-50/50">
//                     <h4 className="text-xs font-bold text-teal-900 mb-1 flex items-center gap-1.5">
//                       <Package size={14} className="text-teal-700" /> Initial Opening Stock (Optional)
//                     </h4>
//                     <p className="text-[11px] text-gray-500 mb-3">
//                       Enter opening inventory details to immediately record available stock for this new medicine.
//                     </p>
//                     <div className="grid grid-cols-3 gap-2.5">
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Quantity</label>
//                         <input
//                           type="number"
//                           min="0"
//                           value={formData.initial_stock}
//                           onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })}
//                           placeholder="0"
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Batch Number</label>
//                         <input
//                           type="text"
//                           value={formData.initial_batch_number}
//                           onChange={(e) => setFormData({ ...formData, initial_batch_number: e.target.value })}
//                           placeholder="OPENING-001"
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Expiry Date</label>
//                         <input
//                           type="date"
//                           value={formData.initial_expiry_date}
//                           onChange={(e) => setFormData({ ...formData, initial_expiry_date: e.target.value })}
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Mfg Date</label>
//                         <input
//                           type="date"
//                           value={formData.initial_mfg_date}
//                           onChange={(e) => setFormData({ ...formData, initial_mfg_date: e.target.value })}
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Purchase Price (PKR)</label>
//                         <input
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={formData.initial_purchase_price}
//                           onChange={(e) => setFormData({ ...formData, initial_purchase_price: e.target.value })}
//                           placeholder="0.00"
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                       <div>
//                         <label className="text-[11px] font-semibold text-gray-600 block mb-1">Sale Price (PKR)</label>
//                         <input
//                           type="number"
//                           min="0"
//                           step="0.01"
//                           value={formData.initial_selling_price}
//                           onChange={(e) => setFormData({ ...formData, initial_selling_price: e.target.value })}
//                           placeholder="0.00"
//                           className="input w-full py-1 text-xs"
//                         />
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 <div className="modal-footer -mx-5 -mb-5 mt-2">
//                   <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
//                     Cancel
//                   </button>
//                   <button type="submit" className="btn btn-primary font-semibold">
//                     <Save size={15} /> Save Medicine
//                   </button>
//                 </div>
//               </form>
//             )}

//             {/* Tab B: Batches & Stock Section */}
//             {editTab === 'batches' && editingMedicine && (
//               <div className="modal-body flex flex-col gap-4">
//                 {/* Stock Stats Row */}
//                 <div className="grid grid-cols-4 gap-3">
//                   <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
//                     <div className="text-xl font-bold text-emerald-800">{batchStats.saleable}</div>
//                     <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Saleable Stock</div>
//                   </div>
//                   <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center">
//                     <div className="text-xl font-bold text-gray-900">{batchStats.totalPhysical}</div>
//                     <div className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Physical Stock</div>
//                   </div>
//                   <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-center">
//                     <div className={`text-xl font-bold ${batchStats.expired > 0 ? 'text-red-700' : 'text-gray-400'}`}>{batchStats.expired}</div>
//                     <div className="text-[11px] font-semibold text-red-600 uppercase tracking-wide">Expired Stock</div>
//                   </div>
//                   <div className="p-3 rounded-lg border border-teal-200 bg-teal-50 text-center">
//                     <div className="text-xl font-bold text-teal-800">{batchStats.activeBatches}</div>
//                     <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Active Batches</div>
//                   </div>
//                 </div>

//                 {/* Batches Table Header & Actions */}
//                 <div className="flex justify-between items-center mt-1">
//                   <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
//                     Batches List ({batches.length})
//                   </h4>
//                   <button onClick={handleOpenAddBatch} className="btn btn-primary btn-sm">
//                     <Plus size={13} /> Add New Batch
//                   </button>
//                 </div>

//                 {/* Batches Table */}
//                 {batchesLoading ? (
//                   <div className="text-center py-8 text-gray-400">
//                     <RefreshCw className="animate-spin inline mr-2" size={16} /> Loading batches...
//                   </div>
//                 ) : batches.length === 0 ? (
//                   <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg text-gray-500">
//                     <Package size={30} className="mx-auto mb-2 text-gray-400 stroke-1" />
//                     <p className="text-xs font-medium">No batches recorded for this medicine yet.</p>
//                     <button onClick={handleOpenAddBatch} className="btn btn-secondary btn-sm mt-2">
//                       <Plus size={13} /> Add First Batch
//                     </button>
//                   </div>
//                 ) : (
//                   <div className="border border-gray-200 rounded-lg overflow-hidden">
//                     <table className="table w-full text-xs">
//                       <thead>
//                         <tr>
//                           <th>Batch #</th>
//                           <th>Expiry Date</th>
//                           <th className="text-right">Purchase Price</th>
//                           <th className="text-right">Sale Price</th>
//                           <th className="text-center">Initial</th>
//                           <th className="text-center">Available</th>
//                           <th>Status</th>
//                           <th className="text-right">Actions</th>
//                         </tr>
//                       </thead>
//                       <tbody>
//                         {batches.map((b) => (
//                           <tr key={b.id} className={b.is_expired ? 'bg-red-50/40' : ''}>
//                             <td className="font-mono font-bold text-gray-900">{b.batch_number}</td>
//                             <td>
//                               <span className={b.is_expired ? 'text-red-600 font-bold' : b.is_near_expiry ? 'text-amber-700 font-semibold' : 'text-gray-700'}>
//                                 {fmtDate(b.expiry_date)}
//                               </span>
//                               {b.days_until_expiry !== null && b.days_until_expiry !== undefined && b.days_until_expiry <= 90 && b.days_until_expiry > 0 && (
//                                 <span className="block text-[10px] text-amber-600 font-medium">({b.days_until_expiry}d left)</span>
//                               )}
//                             </td>
//                             <td className="text-right text-gray-700">{fmt(b.purchase_price || b.purchase_cost)}</td>
//                             <td className="text-right font-semibold text-emerald-700">{fmt(b.sale_price || b.selling_price)}</td>
//                             <td className="text-center text-gray-500">{b.initial_quantity || b.received_quantity || 0}</td>
//                             <td className="text-center font-bold text-gray-900">
//                               <span className={(b.current_stock || b.available_quantity || 0) <= 0 ? 'text-red-600' : 'text-emerald-700'}>
//                                 {b.current_stock !== undefined ? b.current_stock : (b.available_quantity || 0)}
//                               </span>
//                             </td>
//                             <td><BatchStatusBadge batch={b} /></td>
//                             <td className="text-right">
//                               <div className="flex items-center justify-end gap-1">
//                                 <button onClick={() => handleOpenEditBatch(b)} className="btn btn-secondary p-1" title="Edit Batch Details">
//                                   <Edit size={13} />
//                                 </button>
//                                 <button onClick={() => handleOpenAdjustStock(b)} className="btn btn-secondary p-1" title="Adjust Stock">
//                                   <Activity size={13} />
//                                 </button>
//                                 <button onClick={() => handleOpenHistory(b)} className="btn btn-secondary p-1" title="Audit History">
//                                   <History size={13} />
//                                 </button>
//                                 <button onClick={() => handleDeleteBatch(b)} className="btn btn-danger p-1" title="Delete or Block">
//                                   <Trash2 size={13} />
//                                 </button>
//                               </div>
//                             </td>
//                           </tr>
//                         ))}
//                       </tbody>
//                     </table>
//                   </div>
//                 )}

//                 <div className="modal-footer -mx-5 -mb-5 mt-2">
//                   <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary">
//                     Close
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           STANDALONE BATCH & STOCK MANAGER MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {batchModalOpen && batchMedicine && (
//         <div className="modal-backdrop">
//           <div className="modal-content" style={{ maxWidth: '940px' }}>
//             <div className="modal-header">
//               <div>
//                 <h3 className="modal-title flex items-center gap-2">
//                   <Layers size={18} className="text-teal-700" />
//                   Batches & Stock Management: <span className="text-teal-900">{batchMedicine.name}</span>
//                 </h3>
//                 <div className="text-xs text-gray-500 mt-0.5">
//                   Generic: {batchMedicine.generic_name || '—'} {batchMedicine.strength && `(${batchMedicine.strength})`}
//                 </div>
//               </div>
//               <button onClick={() => { setBatchModalOpen(false); setBatchMedicine(null); }} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>

//             <div className="modal-body flex flex-col gap-4">
//               {/* Stock KPI Cards Row */}
//               <div className="grid grid-cols-5 gap-2.5">
//                 <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-center">
//                   <div className="text-xl font-bold text-emerald-800">{batchStats.saleable}</div>
//                   <div className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wide">Saleable Stock</div>
//                 </div>
//                 <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-center">
//                   <div className="text-xl font-bold text-gray-900">{batchStats.totalPhysical}</div>
//                   <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Physical Stock</div>
//                 </div>
//                 <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-center">
//                   <div className={`text-xl font-bold ${batchStats.expired > 0 ? 'text-red-700' : 'text-gray-400'}`}>{batchStats.expired}</div>
//                   <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Expired Stock</div>
//                 </div>
//                 <div className="p-3 rounded-lg border border-teal-200 bg-teal-50 text-center">
//                   <div className="text-xl font-bold text-teal-800">{batchStats.activeBatches}</div>
//                   <div className="text-[10px] font-semibold text-teal-700 uppercase tracking-wide">Active Batches</div>
//                 </div>
//                 <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-center">
//                   <div className={`text-xl font-bold ${batchStats.nearExpiry > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{batchStats.nearExpiry}</div>
//                   <div className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">Near Expiry</div>
//                 </div>
//               </div>

//               {/* Batches Table Header */}
//               <div className="flex justify-between items-center mt-1">
//                 <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
//                   Available Batches ({batches.length})
//                 </h4>
//                 <button onClick={handleOpenAddBatch} className="btn btn-primary btn-sm font-semibold">
//                   <Plus size={14} /> Add New Batch
//                 </button>
//               </div>

//               {/* Batches Table */}
//               {batchesLoading ? (
//                 <div className="text-center py-8 text-gray-400">
//                   <RefreshCw className="animate-spin inline mr-2" size={16} /> Loading batches...
//                 </div>
//               ) : batches.length === 0 ? (
//                 <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg text-gray-500">
//                   <Package size={30} className="mx-auto mb-2 text-gray-400 stroke-1" />
//                   <p className="text-xs font-medium">No batches found for this medicine.</p>
//                   <button onClick={handleOpenAddBatch} className="btn btn-secondary btn-sm mt-2">
//                     <Plus size={13} /> Add New Batch
//                   </button>
//                 </div>
//               ) : (
//                 <div className="border border-gray-200 rounded-lg overflow-hidden">
//                   <table className="table w-full text-xs">
//                     <thead>
//                       <tr>
//                         <th>Batch Number</th>
//                         <th>Mfg Date</th>
//                         <th>Expiry Date</th>
//                         <th className="text-right">Cost Price</th>
//                         <th className="text-right">Sale Price</th>
//                         <th className="text-center">Initial Qty</th>
//                         <th className="text-center">Available Stock</th>
//                         <th>Status</th>
//                         <th>Supplier</th>
//                         <th className="text-right">Actions</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {batches.map((b) => (
//                         <tr key={b.id} className={b.is_expired ? 'bg-red-50/40' : ''}>
//                           <td className="font-mono font-bold text-gray-900">{b.batch_number}</td>
//                           <td className="text-gray-500">{fmtDate(b.mfg_date)}</td>
//                           <td>
//                             <span className={b.is_expired ? 'text-red-600 font-bold' : b.is_near_expiry ? 'text-amber-700 font-semibold' : 'text-gray-700'}>
//                               {fmtDate(b.expiry_date)}
//                             </span>
//                             {b.days_until_expiry !== null && b.days_until_expiry !== undefined && b.days_until_expiry <= 90 && b.days_until_expiry > 0 && (
//                               <span className="block text-[10px] text-amber-600 font-medium">({b.days_until_expiry}d left)</span>
//                             )}
//                           </td>
//                           <td className="text-right text-gray-700">{fmt(b.purchase_price || b.purchase_cost)}</td>
//                           <td className="text-right font-semibold text-emerald-700">{fmt(b.sale_price || b.selling_price)}</td>
//                           <td className="text-center text-gray-500">{b.initial_quantity || b.received_quantity || 0}</td>
//                           <td className="text-center font-bold">
//                             <span className={(b.current_stock || b.available_quantity || 0) <= 0 ? 'text-red-600' : 'text-emerald-700'}>
//                               {b.current_stock !== undefined ? b.current_stock : (b.available_quantity || 0)}
//                             </span>
//                           </td>
//                           <td><BatchStatusBadge batch={b} /></td>
//                           <td className="text-gray-500 truncate max-w-[100px]" title={b.supplier_name}>{b.supplier_name || '—'}</td>
//                           <td className="text-right">
//                             <div className="flex items-center justify-end gap-1">
//                               <button onClick={() => handleOpenEditBatch(b)} className="btn btn-secondary p-1" title="Edit Batch">
//                                 <Edit size={13} />
//                               </button>
//                               <button onClick={() => handleOpenAdjustStock(b)} className="btn btn-secondary p-1" title="Adjust Stock">
//                                 <Activity size={13} />
//                               </button>
//                               <button onClick={() => handleOpenHistory(b)} className="btn btn-secondary p-1" title="Audit History">
//                                 <History size={13} />
//                               </button>
//                               <button onClick={() => handleDeleteBatch(b)} className="btn btn-danger p-1" title="Delete / Block">
//                                 <Trash2 size={13} />
//                               </button>
//                             </div>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               )}

//               <div className="modal-footer -mx-5 -mb-5 mt-2">
//                 <button onClick={() => { setBatchModalOpen(false); setBatchMedicine(null); }} className="btn btn-secondary">
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           ADD BATCH SUB-MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {addBatchOpen && (
//         <div className="modal-backdrop" style={{ zIndex: 1100 }}>
//           <div className="modal-content modal-md">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Plus size={16} className="text-teal-700" /> Add New Medicine Batch
//               </h3>
//               <button onClick={() => setAddBatchOpen(false)} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>
//             <form onSubmit={handleCreateBatch} className="modal-body flex flex-col gap-3">
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Batch Number *</label>
//                   <input
//                     type="text"
//                     required
//                     value={batchForm.batch_number}
//                     onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
//                     placeholder="e.g. BR001"
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Quantity Received</label>
//                   <input
//                     type="number"
//                     min="0"
//                     value={batchForm.initial_quantity}
//                     onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })}
//                     placeholder="0"
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Manufacturing Date</label>
//                   <input
//                     type="date"
//                     value={batchForm.mfg_date}
//                     onChange={(e) => setBatchForm({ ...batchForm, mfg_date: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Expiry Date *</label>
//                   <input
//                     type="date"
//                     required
//                     value={batchForm.expiry_date}
//                     onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Purchase Cost (PKR)</label>
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={batchForm.purchase_price}
//                     onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })}
//                     placeholder="0.00"
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Sale Price (PKR)</label>
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={batchForm.sale_price}
//                     onChange={(e) => setBatchForm({ ...batchForm, sale_price: e.target.value })}
//                     placeholder="0.00"
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Supplier</label>
//                   <select
//                     value={batchForm.supplier_id}
//                     onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })}
//                     className="input w-full"
//                   >
//                     <option value="">— Select Supplier —</option>
//                     {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                   </select>
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Batch Status</label>
//                   <select
//                     value={batchForm.status}
//                     onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
//                     className="input w-full"
//                   >
//                     <option value="ACTIVE">ACTIVE</option>
//                     <option value="QUARANTINED">QUARANTINED</option>
//                     <option value="BLOCKED">BLOCKED</option>
//                   </select>
//                 </div>
//               </div>
//               <div className="modal-footer -mx-5 -mb-5 mt-2">
//                 <button type="button" onClick={() => setAddBatchOpen(false)} className="btn btn-secondary">
//                   Cancel
//                 </button>
//                 <button type="submit" className="btn btn-primary font-semibold">
//                   <Plus size={14} /> Create Batch
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           EDIT BATCH SUB-MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {editBatchOpen && editingBatch && (
//         <div className="modal-backdrop" style={{ zIndex: 1100 }}>
//           <div className="modal-content modal-md">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Edit size={16} className="text-teal-700" /> Edit Batch: {editingBatch.batch_number}
//               </h3>
//               <button onClick={() => { setEditBatchOpen(false); setEditingBatch(null); }} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>
//             <form onSubmit={handleUpdateBatch} className="modal-body flex flex-col gap-3">
//               <div className="grid grid-cols-2 gap-3">
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Batch Number</label>
//                   <input
//                     type="text"
//                     required
//                     value={batchForm.batch_number}
//                     onChange={(e) => setBatchForm({ ...batchForm, batch_number: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Status</label>
//                   <select
//                     value={batchForm.status}
//                     onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })}
//                     className="input w-full"
//                   >
//                     <option value="ACTIVE">ACTIVE</option>
//                     <option value="BLOCKED">BLOCKED</option>
//                     <option value="EXPIRED">EXPIRED</option>
//                     <option value="QUARANTINED">QUARANTINED</option>
//                   </select>
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Mfg Date</label>
//                   <input
//                     type="date"
//                     value={batchForm.mfg_date}
//                     onChange={(e) => setBatchForm({ ...batchForm, mfg_date: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Expiry Date *</label>
//                   <input
//                     type="date"
//                     required
//                     value={batchForm.expiry_date}
//                     onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Purchase Cost</label>
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={batchForm.purchase_price}
//                     onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div>
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Sale Price</label>
//                   <input
//                     type="number"
//                     min="0"
//                     step="0.01"
//                     value={batchForm.sale_price}
//                     onChange={(e) => setBatchForm({ ...batchForm, sale_price: e.target.value })}
//                     className="input w-full"
//                   />
//                 </div>
//                 <div className="col-span-2">
//                   <label className="text-xs font-semibold text-gray-700 block mb-1">Supplier</label>
//                   <select
//                     value={batchForm.supplier_id}
//                     onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })}
//                     className="input w-full"
//                   >
//                     <option value="">— Select Supplier —</option>
//                     {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
//                   </select>
//                 </div>
//               </div>
//               <div className="modal-footer -mx-5 -mb-5 mt-2">
//                 <button type="button" onClick={() => { setEditBatchOpen(false); setEditingBatch(null); }} className="btn btn-secondary">
//                   Cancel
//                 </button>
//                 <button type="submit" className="btn btn-primary font-semibold">
//                   <Save size={14} /> Update Batch
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           ADJUST STOCK SUB-MODAL (Mandatory Reason)
//           ════════════════════════════════════════════════════════════ */}
//       {adjustStockOpen && adjustingBatch && (
//         <div className="modal-backdrop" style={{ zIndex: 1100 }}>
//           <div className="modal-content modal-md">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Activity size={16} className="text-amber-600" /> Adjust Stock: Batch {adjustingBatch.batch_number}
//               </h3>
//               <button onClick={() => { setAdjustStockOpen(false); setAdjustingBatch(null); }} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>
//             <form onSubmit={handleAdjustStock} className="modal-body flex flex-col gap-3">
//               <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex justify-between items-center text-center">
//                 <div>
//                   <div className="text-[11px] font-semibold text-gray-500 uppercase">Current Quantity</div>
//                   <div className="text-xl font-bold text-gray-900">
//                     {adjustingBatch.current_stock !== undefined ? adjustingBatch.current_stock : (adjustingBatch.available_quantity || 0)}
//                   </div>
//                 </div>
//                 <div className="text-gray-400 text-lg">→</div>
//                 <div>
//                   <div className="text-[11px] font-semibold text-gray-500 uppercase">New Quantity</div>
//                   <div className="text-xl font-bold text-teal-700">
//                     {adjustForm.new_quantity || 0}
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 <label className="text-xs font-semibold text-gray-700 block mb-1">
//                   New Physical Count Quantity *
//                 </label>
//                 <input
//                   type="number"
//                   min="0"
//                   required
//                   value={adjustForm.new_quantity}
//                   onChange={(e) => setAdjustForm({ ...adjustForm, new_quantity: e.target.value })}
//                   className="input w-full font-semibold"
//                 />
//               </div>

//               <div>
//                 <label className="text-xs font-semibold text-gray-700 block mb-1">
//                   Adjustment Reason *
//                 </label>
//                 <select
//                   required
//                   value={adjustForm.reason}
//                   onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
//                   className="input w-full"
//                 >
//                   <option value="">— Select Mandatory Reason —</option>
//                   {ADJUSTMENT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
//                 </select>
//               </div>

//               <div>
//                 <label className="text-xs font-semibold text-gray-700 block mb-1">
//                   Audit Notes (Optional)
//                 </label>
//                 <textarea
//                   value={adjustForm.notes}
//                   onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })}
//                   placeholder="Additional details about this physical stock discrepancy..."
//                   rows="2"
//                   className="textarea w-full"
//                 />
//               </div>

//               <div className="modal-footer -mx-5 -mb-5 mt-2">
//                 <button type="button" onClick={() => { setAdjustStockOpen(false); setAdjustingBatch(null); }} className="btn btn-secondary">
//                   Cancel
//                 </button>
//                 <button type="submit" className="btn btn-primary font-semibold">
//                   <Check size={14} /> Confirm Adjustment
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           BATCH HISTORY SUB-MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {historyOpen && historyBatch && (
//         <div className="modal-backdrop" style={{ zIndex: 1100 }}>
//           <div className="modal-content modal-lg">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <History size={16} className="text-teal-700" /> Audit Log: Batch {historyBatch.batch_number}
//               </h3>
//               <button
//                 onClick={() => { setHistoryOpen(false); setHistoryBatch(null); setHistoryData([]); }}
//                 className="text-gray-400 hover:text-gray-600"
//               >
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="modal-body max-h-[60vh] overflow-y-auto">
//               {historyData.length === 0 ? (
//                 <div className="text-center py-8 text-gray-400">
//                   <History size={32} className="mx-auto mb-2 text-gray-300 stroke-1" />
//                   <p className="text-xs font-medium">No stock movement logs recorded for this batch yet.</p>
//                 </div>
//               ) : (
//                 <div className="flex flex-col gap-2">
//                   {historyData.map((h) => (
//                     <div key={h.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-start gap-3">
//                       <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${h.quantity_change > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
//                         {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
//                       </div>
//                       <div className="flex-1 min-w-0">
//                         <div className="flex items-center gap-2 text-xs">
//                           <span className="font-bold text-gray-900">{h.movement_type?.replace(/_/g, ' ')}</span>
//                           <span className="badge badge-secondary text-[10px]">
//                             {h.old_quantity ?? '?'} → {h.new_quantity ?? '?'}
//                           </span>
//                         </div>
//                         {h.reason && <div className="text-xs text-gray-600 mt-0.5">{h.reason}</div>}
//                         <div className="text-[10px] text-gray-400 mt-1">
//                           {fmtDate(h.created_at)} {h.created_at ? new Date(h.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : ''}
//                           {h.user_name && <span> • by {h.user_name}</span>}
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//             <div className="modal-footer -mx-5 -mb-5">
//               <button
//                 onClick={() => { setHistoryOpen(false); setHistoryBatch(null); setHistoryData([]); }}
//                 className="btn btn-secondary"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           BARCODES MANAGER MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {barcodeModalOpen && barcodeMed && (
//         <div className="modal-backdrop">
//           <div className="modal-content modal-md">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Barcode size={18} className="text-teal-700" /> Barcodes for {barcodeMed.name}
//               </h3>
//               <button onClick={() => setBarcodeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="modal-body flex flex-col gap-3">
//               <form onSubmit={handleAddBarcode} className="flex gap-2">
//                 <input
//                   type="text"
//                   placeholder="Scan or enter barcode number..."
//                   value={newBarcodeVal}
//                   autoFocus
//                   onChange={(e) => setNewBarcodeVal(e.target.value)}
//                   className="input flex-1 text-xs"
//                 />
//                 <button type="submit" className="btn btn-primary font-semibold text-xs">
//                   Add Barcode
//                 </button>
//               </form>
//               <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mt-1">
//                 {medBarcodes.length === 0 ? (
//                   <div className="text-center py-6 text-gray-400 text-xs">
//                     No barcodes assigned to this medicine yet.
//                   </div>
//                 ) : (
//                   medBarcodes.map((b) => (
//                     <div key={b.id} className="p-2.5 bg-gray-50 rounded-lg flex items-center justify-between border border-gray-200">
//                       <div>
//                         <div className="font-mono font-semibold text-gray-900 text-xs">{b.barcode}</div>
//                         {b.is_primary === 1 && <span className="badge badge-info text-[9px]">Primary Barcode</span>}
//                       </div>
//                       <button
//                         onClick={() => handleRemoveBarcode(b.id)}
//                         className="text-gray-400 hover:text-red-600 p-1"
//                         title="Remove Barcode"
//                       >
//                         <Trash2 size={14} />
//                       </button>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>
//             <div className="modal-footer -mx-5 -mb-5">
//               <button onClick={() => setBarcodeModalOpen(false)} className="btn btn-secondary">
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ════════════════════════════════════════════════════════════
//           CSV IMPORT MODAL
//           ════════════════════════════════════════════════════════════ */}
//       {importModalOpen && (
//         <div className="modal-backdrop">
//           <div className="modal-content modal-lg">
//             <div className="modal-header">
//               <h3 className="modal-title flex items-center gap-2">
//                 <Upload size={18} className="text-teal-700" /> Bulk Import Medicines (CSV)
//               </h3>
//               <button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600">
//                 <X size={18} />
//               </button>
//             </div>
//             <div className="modal-body flex flex-col gap-3">
//               <p className="text-xs text-gray-600">
//                 Paste CSV formatted text below (headers: <code>name, generic, brand, category, dosage form, pack size, rack, barcode</code>):
//               </p>
//               <textarea
//                 rows="8"
//                 value={csvText}
//                 onChange={(e) => setCsvText(e.target.value)}
//                 placeholder={`Name,Generic,Category,Dosage Form,Pack Size,Rack,Barcode\nPanadol 500mg,Paracetamol,Analgesics,Tablet,20,A-1,8964000123456\nBrufen 400mg,Ibuprofen,NSAID,Tablet,30,A-2,8964000789012`}
//                 className="textarea font-mono text-xs w-full"
//               />
//               <div className="flex justify-between items-center text-xs text-gray-500">
//                 <span>Upload CSV file from disk:</span>
//                 <input
//                   type="file"
//                   accept=".csv,.txt"
//                   ref={fileInputRef}
//                   onChange={(e) => {
//                     const file = e.target.files?.[0];
//                     if (file) {
//                       const reader = new FileReader();
//                       reader.onload = (ev) => setCsvText(ev.target.result);
//                       reader.readAsText(file);
//                     }
//                   }}
//                   className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
//                 />
//               </div>
//             </div>
//             <div className="modal-footer -mx-5 -mb-5">
//               <button onClick={() => setImportModalOpen(false)} className="btn btn-secondary">
//                 Cancel
//               </button>
//               <button onClick={handleProcessCSVImport} className="btn btn-primary font-semibold">
//                 Process CSV Import
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }






import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Pill, Plus, Search, Edit, Trash2, CheckCircle2, Download, Upload,
  Barcode, X, Layers, Save, RefreshCw, Check, Package, History,
  Activity, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;
const fmt = (n) => `PKR ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2 })}`;
const fmtDate = (d) => d
  ? new Date(d).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
  : '—';

const DOSAGE_FORMS = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Drops',
  'Ointment', 'Cream', 'Gel', 'Inhaler', 'Sachet', 'Solution', 'Spray', 'Suppository', 'Other'
];

const ADJUSTMENT_REASONS = [
  'Physical Stock Correction', 'Damaged Stock', 'Expired Stock Write-off',
  'Stock Received / Found', 'Returned to Supplier', 'Internal Transfer', 'Other'
];

function BatchStatusBadge({ batch }) {
  if (batch.is_expired) return <span className="badge badge-danger">EXPIRED</span>;
  const status = batch.status || 'ACTIVE';
  if (status === 'ACTIVE') return <span className="badge badge-success">ACTIVE</span>;
  if (status === 'BLOCKED') return <span className="badge badge-danger">BLOCKED</span>;
  if (status === 'QUARANTINED') return <span className="badge badge-warning">QUARANTINED</span>;
  return <span className="badge badge-secondary">{status}</span>;
}

function StockIndicator({ med }) {
  const saleable = Number(med.saleable_stock !== undefined ? med.saleable_stock : (med.total_stock || 0));
  const min = Number(med.min_stock_level || 10);
  const expired = Number(med.expired_stock || 0);
  const nearExpiry = Number(med.near_expiry_stock || 0);

  let badgeClass = 'badge-success';
  let label = 'Healthy Stock';
  if (saleable <= 0) {
    badgeClass = 'badge-danger';
    label = 'Out of Stock';
  } else if (saleable <= min) {
    badgeClass = 'badge-warning';
    label = 'Low Stock';
  } else if (nearExpiry > 0) {
    badgeClass = 'badge-warning';
    label = 'Near Expiry';
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-sm font-bold ${saleable <= 0 ? 'text-red-600' : saleable <= min ? 'text-amber-600' : 'text-emerald-700'}`}>
        {saleable} units
      </span>
      <span className={`badge ${badgeClass} text-[10px] py-0.5 px-2`}>{label}</span>
      {expired > 0 && <span className="text-[10px] font-medium text-red-500">({expired} expired)</span>}
    </div>
  );
}

// Keeps medicine details readable: name, generic formula and brand/manufacturer
// are deliberately separated instead of being compressed into one text line.
function MedicineDetails({ medicine }) {
  return (
    <div className="min-w-0 flex flex-col gap-1.5 py-0.5">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="font-semibold text-[13px] leading-5 text-gray-900 break-words">
          {medicine.name}
        </span>
        {medicine.strength && (
          <span className="inline-flex rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
            {medicine.strength}
          </span>
        )}
        {medicine.requires_prescription === 1 && (
          <span className="badge badge-warning text-[10px] py-0 px-1.5" title="Requires Prescription">Rx</span>
        )}
        {medicine.is_narcotic === 1 && (
          <span className="badge badge-danger text-[10px] py-0 px-1.5" title="Narcotic / Controlled">Narcotic</span>
        )}
      </div>

      <div className="flex min-w-0 items-start gap-2 leading-4">
        <span className="mt-px shrink-0 text-[9px] font-bold uppercase tracking-wider text-gray-400">Generic</span>
        <span className="min-w-0 text-xs font-medium leading-4 text-gray-700 break-words">
          {medicine.generic_name || 'Not specified'}
        </span>
      </div>

      {(medicine.brand || medicine.manufacturer) && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-4">
          {medicine.brand && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className=" shrink-0 text-[9px] font-bold uppercase tracking-wider text-gray-400">Brand : </span>
              <span className="font-semibold text-gray-600 break-words">{medicine.brand}</span>
            </span>
          )}
          {medicine.manufacturer && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span className="shrink-0 text-gray-400">Mfg.</span>
              <span className="font-medium text-gray-600 break-words">{medicine.manufacturer}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default function Medicines() {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDosage, setSelectedDosage] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Add / edit medicine modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);
  const [editTab, setEditTab] = useState('info');

  // Barcode and CSV modals
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [barcodeMed, setBarcodeMed] = useState(null);
  const [newBarcodeVal, setNewBarcodeVal] = useState('');
  const [medBarcodes, setMedBarcodes] = useState([]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Batch management
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchMedicine, setBatchMedicine] = useState(null);
  const [batches, setBatches] = useState([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  // Batch sub-modals
  const [addBatchOpen, setAddBatchOpen] = useState(false);
  const [editBatchOpen, setEditBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [adjustStockOpen, setAdjustStockOpen] = useState(false);
  const [adjustingBatch, setAdjustingBatch] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyBatch, setHistoryBatch] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const [batchForm, setBatchForm] = useState({
    batch_number: '', mfg_date: '', expiry_date: '', purchase_price: '',
    sale_price: '', initial_quantity: '', supplier_id: '', status: 'ACTIVE'
  });
  const [adjustForm, setAdjustForm] = useState({ new_quantity: '', reason: '', notes: '' });

  const [formData, setFormData] = useState({
    name: '', generic_name: '', brand: '', category: '', dosage_form: 'Tablet',
    strength: '', pack_size: 1, unit_of_measure: 'Pcs', rack_shelf: '',
    manufacturer: '', min_stock_level: 10, reorder_level: 20,
    requires_prescription: 0, is_narcotic: 0, barcode: '', purchase_price: '', selling_price: '',
    initial_stock: '', initial_batch_number: '', initial_expiry_date: '', initial_mfg_date: '',
    initial_purchase_price: '', initial_selling_price: ''
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

  const loadSuppliers = useCallback(async () => {
    try {
      if (api?.purchases?.getSuppliers) {
        const supplierList = await api.purchases.getSuppliers({});
        setSuppliers(supplierList || []);
      }
    } catch (_) {
      // Supplier list is optional for this screen.
    }
  }, []);

  useEffect(() => { loadMedicines(); }, [loadMedicines]);
  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  const loadBatches = useCallback(async (medId) => {
    if (!medId) return;
    setBatchesLoading(true);
    try {
      let result = [];
      if (api?.batches?.getByMedicine) {
        result = await api.batches.getByMedicine(medId);
      } else if (api?.inventory?.getBatches) {
        result = await api.inventory.getBatches(medId);
      }
      setBatches(result || []);
    } catch (err) {
      console.warn('Batches load error, trying fallback:', err);
      try {
        if (api?.inventory?.getBatches) {
          const fallbackList = await api.inventory.getBatches(medId);
          setBatches(fallbackList || []);
          return;
        }
      } catch (_) {
        // Show the original error below.
      }
      toast.error('Unable to load batches: ' + err.message);
    } finally {
      setBatchesLoading(false);
    }
  }, []);

  // ── Medicine CRUD ─────────────────────────────────────────────
  const handleOpenAddModal = () => {
    setEditingMedicine(null);
    setEditTab('info');
    setBatches([]);
    setFormData({
      name: '', generic_name: '', brand: '', category: categories[0] || 'General',
      dosage_form: 'Tablet', strength: '', pack_size: 10, unit_of_measure: 'Pcs',
      rack_shelf: '', manufacturer: '', min_stock_level: 10, reorder_level: 20,
      requires_prescription: 0, is_narcotic: 0, barcode: '', purchase_price: '', selling_price: '',
      initial_stock: '', initial_batch_number: 'OPENING-001', initial_expiry_date: '',
      initial_mfg_date: '', initial_purchase_price: '', initial_selling_price: ''
    });
    setEditModalOpen(true);
  };

  const handleOpenEditModal = (med) => {
    setEditingMedicine(med);
    setEditTab('info');
    setBatches([]);
    setFormData({
      name: med.name || '', generic_name: med.generic_name || '', brand: med.brand || '',
      category: med.category || '', dosage_form: med.dosage_form || 'Tablet',
      strength: med.strength || '', pack_size: med.pack_size || 1,
      unit_of_measure: med.unit_of_measure || 'Pcs', rack_shelf: med.rack_shelf || '',
      manufacturer: med.manufacturer || '', min_stock_level: med.min_stock_level || 10,
      reorder_level: med.reorder_level || 20,
      requires_prescription: med.requires_prescription ? 1 : 0,
      is_narcotic: med.is_narcotic ? 1 : 0,
      barcode: med.primary_barcode || '',
      purchase_price: med.purchase_price !== undefined && med.purchase_price !== null && med.purchase_price !== 0
        ? med.purchase_price : (med.default_purchase_price || ''),
      selling_price: med.selling_price !== undefined && med.selling_price !== null && med.selling_price !== 0
        ? med.selling_price : (med.default_selling_price || med.sale_price || ''),
      initial_stock: '', initial_batch_number: '', initial_expiry_date: '', initial_mfg_date: '',
      initial_purchase_price: '', initial_selling_price: ''
    });
    setEditModalOpen(true);
    // Fetch once when the editor opens. Tab clicks do not refetch or remount the panel.
    loadBatches(med.id);
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Medicine name is required');
      return;
    }
    try {
      const parsedCost = parseFloat(formData.purchase_price) || 0;
      const parsedSale = parseFloat(formData.selling_price) || 0;
      const payload = {
        ...formData,
        purchase_price: parsedCost,
        selling_price: parsedSale,
        default_purchase_price: parsedCost,
        default_selling_price: parsedSale
      };

      if (!editingMedicine) {
        if (payload.initial_stock && parseInt(payload.initial_stock, 10) > 0) {
          payload.initial_stock = parseInt(payload.initial_stock, 10);
          payload.batch_number = payload.initial_batch_number || 'OPENING-001';
          payload.expiry_date = payload.initial_expiry_date || null;
          payload.mfg_date = payload.initial_mfg_date || null;
          payload.purchase_price = parsedCost || parseFloat(payload.initial_purchase_price) || 0;
          payload.selling_price = parsedSale || parseFloat(payload.initial_selling_price) || 0;
        }
        await api.medicines.create(payload);
        toast.success(`Medicine "${formData.name}" added successfully!`);
      } else {
        await api.medicines.update(editingMedicine.id, payload);
        toast.success(`Medicine "${formData.name}" updated successfully!`);
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
      toast.error('Failed to update status: ' + err.message);
    }
  };

  // ── Barcode manager ───────────────────────────────────────────
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

  // ── CSV import / export ────────────────────────────────────────
  const handleExportCSV = () => {
    if (medicines.length === 0) {
      toast.error('No medicines to export');
      return;
    }
    const headers = [
      'Name', 'Generic Name', 'Brand', 'Category', 'Dosage Form', 'Strength',
      'Pack Size', 'Rack/Shelf', 'Manufacturer', 'Min Stock', 'Total Stock', 'Active'
    ];
    const rows = medicines.map((m) => [
      `"${m.name || ''}"`, `"${m.generic_name || ''}"`, `"${m.brand || ''}"`,
      `"${m.category || ''}"`, `"${m.dosage_form || ''}"`, `"${m.strength || ''}"`,
      m.pack_size || 1, `"${m.rack_shelf || ''}"`, `"${m.manufacturer || ''}"`,
      m.min_stock_level || 0, m.total_stock || 0, m.is_active ? 'Yes' : 'No'
    ]);
    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmadesk_medicines_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
      const rows = [];
      for (let i = 1; i < lines.length; i += 1) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
        const row = {};
        headers.forEach((header, index) => { row[header] = values[index] || ''; });
        rows.push({
          name: row.name || row['medicine name'] || 'Unnamed Item',
          generic_name: row['generic name'] || row.generic || '',
          brand: row.brand || '', category: row.category || 'General',
          dosage_form: row['dosage form'] || row.form || 'Tablet',
          strength: row.strength || '',
          pack_size: parseInt(row['pack size'] || row.pack_size || '1', 10),
          rack_shelf: row.rack || row.shelf || row['rack/shelf'] || '',
          manufacturer: row.manufacturer || row.mfg || '',
          min_stock_level: parseInt(row['min stock'] || '10', 10),
          barcode: row.barcode || ''
        });
      }
      if (api?.medicines?.importCSV) {
        const result = await api.medicines.importCSV(rows);
        toast.success(`Imported ${result?.imported || rows.length} medicines successfully!`);
        setImportModalOpen(false);
        setCsvText('');
        loadMedicines();
      }
    } catch (err) {
      toast.error('Import error: ' + err.message);
    }
  };

  // ── Batch manager ─────────────────────────────────────────────
  const handleOpenBatchManager = async (med) => {
    setBatchMedicine(med);
    setBatches([]);
    setBatchModalOpen(true);
    await loadBatches(med.id);
  };

  const handleOpenAddBatch = () => {
    setBatchForm({
      batch_number: '', mfg_date: '', expiry_date: '', purchase_price: '',
      sale_price: '', initial_quantity: '', supplier_id: '', status: 'ACTIVE'
    });
    setAddBatchOpen(true);
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!batchForm.batch_number.trim()) {
      toast.error('Batch number is required');
      return;
    }
    if (!batchForm.expiry_date) {
      toast.error('Expiry date is required');
      return;
    }
    const medId = batchMedicine?.id || editingMedicine?.id;
    if (!medId) return;
    try {
      if (!api?.batches?.create) {
        toast.error('Batch creation service unavailable');
        return;
      }
      await api.batches.create({
        medicine_id: medId,
        batch_number: batchForm.batch_number.trim(),
        mfg_date: batchForm.mfg_date || null,
        expiry_date: batchForm.expiry_date,
        purchase_cost: parseFloat(batchForm.purchase_price) || 0,
        selling_price: parseFloat(batchForm.sale_price) || 0,
        initial_quantity: parseInt(batchForm.initial_quantity, 10) || 0,
        supplier_id: batchForm.supplier_id || null,
        status: batchForm.status
      });
      toast.success(`Stock added (Expiry: ${fmtDate(batchForm.expiry_date)})!`);
      setAddBatchOpen(false);
      await loadBatches(medId);
      loadMedicines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenEditBatch = (batch) => {
    setEditingBatch(batch);
    setBatchForm({
      batch_number: batch.batch_number || '',
      mfg_date: batch.mfg_date ? String(batch.mfg_date).slice(0, 10) : '',
      expiry_date: batch.expiry_date ? String(batch.expiry_date).slice(0, 10) : '',
      purchase_price: batch.purchase_price !== undefined ? batch.purchase_price : (batch.purchase_cost || ''),
      sale_price: batch.sale_price !== undefined ? batch.sale_price : (batch.selling_price || ''),
      initial_quantity: batch.initial_quantity || batch.received_quantity || '',
      supplier_id: batch.supplier_id || '', status: batch.status || 'ACTIVE'
    });
    setEditBatchOpen(true);
  };

  const handleUpdateBatch = async (e) => {
    e.preventDefault();
    const medId = batchMedicine?.id || editingMedicine?.id;
    try {
      if (!api?.batches?.update) {
        toast.error('Batch update service unavailable');
        return;
      }
      await api.batches.update(editingBatch.id, {
        batch_number: batchForm.batch_number.trim(),
        mfg_date: batchForm.mfg_date || null,
        expiry_date: batchForm.expiry_date,
        purchase_cost: parseFloat(batchForm.purchase_price) || 0,
        selling_price: parseFloat(batchForm.sale_price) || 0,
        status: batchForm.status,
        supplier_id: batchForm.supplier_id || null
      });
      toast.success('Stock & expiry updated!');
      setEditBatchOpen(false);
      setEditingBatch(null);
      if (medId) await loadBatches(medId);
      loadMedicines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenAdjustStock = (batch) => {
    setAdjustingBatch(batch);
    const current = batch.current_stock !== undefined ? batch.current_stock : (batch.available_quantity || 0);
    setAdjustForm({ new_quantity: current, reason: '', notes: '' });
    setAdjustStockOpen(true);
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustForm.reason) {
      toast.error('Adjustment reason is required');
      return;
    }
    const newQuantity = Number(adjustForm.new_quantity);
    if (!Number.isInteger(newQuantity) || newQuantity < 0) {
      toast.error('Enter a valid non-negative whole-number quantity');
      return;
    }
    const medId = batchMedicine?.id || editingMedicine?.id;
    try {
      if (!api?.batches?.adjustStock) {
        toast.error('Stock adjustment service unavailable');
        return;
      }
      const result = await api.batches.adjustStock({
        batch_id: adjustingBatch.id,
        new_quantity: newQuantity,
        reason: adjustForm.reason,
        notes: adjustForm.notes
      });
      toast.success(`Stock adjusted: ${result.old_quantity} → ${result.new_quantity}`);
      setAdjustStockOpen(false);
      setAdjustingBatch(null);
      if (medId) await loadBatches(medId);
      loadMedicines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleOpenHistory = async (batch) => {
    setHistoryBatch(batch);
    setHistoryData([]);
    setHistoryOpen(true);
    try {
      if (api?.batches?.getHistory) {
        const history = await api.batches.getHistory(batch.id);
        setHistoryData(history || []);
      }
    } catch (err) {
      toast.error('Failed to load batch history');
    }
  };

  const handleDeleteBatch = async (batch) => {
    const message = `Remove batch "${batch.batch_number}"?\n\nIf this batch has sales/purchases, it will be marked as BLOCKED to protect historical invoices.`;
    if (!window.confirm(message)) return;
    const medId = batchMedicine?.id || editingMedicine?.id;
    try {
      if (!api?.batches?.delete) {
        toast.error('Batch removal service unavailable');
        return;
      }
      const result = await api.batches.delete(batch.id);
      toast.success(result.message || 'Batch removed');
      if (medId) await loadBatches(medId);
      loadMedicines();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const batchStats = {
    totalPhysical: batches.reduce((sum, batch) => sum + Number(
      batch.current_stock !== undefined ? batch.current_stock : (batch.available_quantity || 0)
    ), 0),
    saleable: batches.filter((batch) => (batch.status === 'ACTIVE' || !batch.status) && !batch.is_expired)
      .reduce((sum, batch) => sum + Number(
        batch.current_stock !== undefined ? batch.current_stock : (batch.available_quantity || 0)
      ), 0),
    expired: batches.filter((batch) => batch.is_expired || batch.status === 'EXPIRED')
      .reduce((sum, batch) => sum + Number(
        batch.current_stock !== undefined ? batch.current_stock : (batch.available_quantity || 0)
      ), 0),
    activeBatches: batches.filter((batch) => (batch.status === 'ACTIVE' || !batch.status) && !batch.is_expired).length,
    nearExpiry: batches.filter((batch) => batch.is_near_expiry).length
  };

  const renderBatchTable = (compact = false) => (
    batchesLoading ? (
      <div className="py-8 text-center text-sm text-gray-400">
        <RefreshCw className="mr-2 inline animate-spin" size={16} /> Loading stock &amp; expiry...
      </div>
    ) : batches.length === 0 ? (
      <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center text-gray-500">
        <Package size={30} className="mx-auto mb-2 stroke-1 text-gray-400" />
        <p className="text-xs font-medium">No stock recorded for this medicine yet.</p>
        <button onClick={handleOpenAddBatch} className="btn btn-secondary btn-sm mt-2">
          <Plus size={13} /> Add Stock &amp; Expiry
        </button>
      </div>
    ) : (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="table w-full text-xs">
          <thead>
            <tr>
              <th>Expiry Date</th>
              <th className="text-center">Available Qty</th>
              <th className="text-right">Buy Price</th>
              <th className="text-right">Sale Price</th>
              <th>Status</th>
              {!compact && <th>Supplier</th>}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => {
              const available = batch.current_stock !== undefined
                ? batch.current_stock : (batch.available_quantity || 0);
              return (
                <tr key={batch.id} className={batch.is_expired ? 'bg-red-50/40' : ''}>
                  <td>
                    <span className={batch.is_expired
                      ? 'font-bold text-red-600'
                      : batch.is_near_expiry ? 'font-semibold text-amber-700' : 'font-semibold text-gray-900'}>
                      {fmtDate(batch.expiry_date)}
                    </span>
                    {batch.days_until_expiry !== null && batch.days_until_expiry !== undefined
                      && batch.days_until_expiry <= 90 && batch.days_until_expiry > 0 && (
                        <span className="block text-[10px] font-medium text-amber-600">
                          ({batch.days_until_expiry}d left)
                        </span>
                      )}
                  </td>
                  <td className="text-center font-bold">
                    <span className={available <= 0 ? 'text-red-600' : 'text-emerald-700'}>{available}</span>
                  </td>
                  <td className="text-right text-gray-700">{fmt(batch.purchase_price || batch.purchase_cost)}</td>
                  <td className="text-right font-semibold text-emerald-700">{fmt(batch.sale_price || batch.selling_price)}</td>
                  <td><BatchStatusBadge batch={batch} /></td>
                  {!compact && (
                    <td className="max-w-[120px] truncate text-gray-500" title={batch.supplier_name}>
                      {batch.supplier_name || '—'}
                    </td>
                  )}
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleOpenEditBatch(batch)} className="btn btn-secondary p-1" title="Edit Expiry / Price">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => handleOpenAdjustStock(batch)} className="btn btn-secondary p-1" title="Adjust Quantity">
                        <Activity size={13} />
                      </button>
                      <button onClick={() => handleOpenHistory(batch)} className="btn btn-secondary p-1" title="Stock History">
                        <History size={13} />
                      </button>
                      <button onClick={() => handleDeleteBatch(batch)} className="btn btn-danger p-1" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  const renderBatchStats = (showNearExpiry = false) => (
    <div className={`grid ${showNearExpiry ? 'grid-cols-4' : 'grid-cols-3'} gap-2.5`}>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
        <div className="text-xl font-bold text-emerald-800">{batchStats.saleable}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Available Stock</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
        <div className="text-xl font-bold text-gray-900">{batchStats.totalPhysical}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-600">Total Physical Qty</div>
      </div>
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
        <div className={`text-xl font-bold ${batchStats.expired > 0 ? 'text-red-700' : 'text-gray-400'}`}>{batchStats.expired}</div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-red-600">Expired Qty</div>
      </div>
      {showNearExpiry && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-center">
          <div className={`text-xl font-bold ${batchStats.nearExpiry > 0 ? 'text-amber-700' : 'text-gray-400'}`}>{batchStats.nearExpiry}</div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Near Expiry</div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Page header */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Pill className="text-teal-700" size={22} /> Medicines Master Catalog
          </h1>
          <p className="mt-0.5 text-xs text-gray-500">
            Manage medicines, pricing, shelf locations and FEFO stock batches
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm" title="Export Catalog as CSV">
            <Download size={14} /> Export CSV
          </button>
          <button onClick={() => setImportModalOpen(true)} className="btn btn-secondary btn-sm" title="Import CSV">
            <Upload size={14} /> Import CSV
          </button>
          <button onClick={handleOpenAddModal} className="btn btn-primary btn-sm font-semibold">
            <Plus size={16} /> Add Medicine
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input
            type="text"
            placeholder="Search by medicine name, generic formula, brand, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full py-1.5 pl-9 pr-4 text-xs"
          />
        </div>
        <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="input w-44 py-1.5 text-xs">
          <option value="">All Categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <select value={selectedDosage} onChange={(e) => setSelectedDosage(e.target.value)} className="input w-36 py-1.5 text-xs">
          <option value="">All Dosages</option>
          {DOSAGE_FORMS.map((dosage) => <option key={dosage} value={dosage}>{dosage}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input w-32 py-1.5 text-xs">
          <option value="active">Active Only</option>
          <option value="all">All Records</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <button onClick={loadMedicines} className="btn btn-secondary p-2" title="Refresh List">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Catalog table */}
      <div className="card flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-48 items-center justify-center text-gray-400">
              <RefreshCw className="mr-2 animate-spin" size={18} /> Loading medicines catalog...
            </div>
          ) : medicines.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-gray-400">
              <Pill size={36} className="mb-2 stroke-1" />
              <p className="text-sm font-medium">No medicines found matching the filters.</p>
            </div>
          ) : (
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="w-[33%]">Medicine Details</th>
                  <th className="w-[14%]">Category / Form</th>
                  <th className="w-[8%] text-center">Pack</th>
                  <th className="w-[9%] text-center">Rack / Shelf</th>
                  <th className="w-[12%] text-center">Nearest Expiry</th>
                  <th className="w-[12%] text-center">Available Stock</th>
                  <th className="w-[12%] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine.id} className="align-middle hover:bg-gray-50/70">
                    <td className="py-3">
                      <MedicineDetails medicine={medicine} />
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-gray-800">{medicine.category || 'General'}</div>
                      <div className="mt-0.5 text-xs font-medium text-teal-700">{medicine.dosage_form || 'Tablet'}</div>
                    </td>
                    <td className="text-center text-xs text-gray-600">
                      {medicine.pack_size || 1} {medicine.unit_of_measure || 'Pcs'}
                    </td>
                    <td className="text-center font-mono text-xs font-medium text-amber-700">
                      {medicine.rack_shelf || '—'}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => handleOpenBatchManager(medicine)}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 transition-colors hover:bg-teal-100"
                        title="Manage Stock & Expiry"
                      >
                        <Calendar size={11} />
                        {medicine.earliest_expiry ? fmtDate(medicine.earliest_expiry) : 'Set Expiry'}
                      </button>
                    </td>
                    <td className="text-center"><StockIndicator med={medicine} /></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleOpenBatchManager(medicine)} className="btn btn-secondary btn-sm p-1.5" title="Manage Stock & Expiry">
                          <Calendar size={14} />
                        </button>
                        <button onClick={() => handleOpenBarcodeModal(medicine)} className="btn btn-secondary btn-sm p-1.5" title="Manage Barcodes">
                          <Barcode size={14} />
                        </button>
                        <button onClick={() => handleOpenEditModal(medicine)} className="btn btn-secondary btn-sm p-1.5" title="Edit Medicine">
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(medicine)}
                          className={`btn btn-sm p-1.5 ${medicine.is_active ? 'btn-danger' : 'btn-success'}`}
                          title={medicine.is_active ? 'Deactivate' : 'Reactivate'}
                        >
                          {medicine.is_active ? <Trash2 size={14} /> : <CheckCircle2 size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-500">
          <span>Showing <b>{medicines.length}</b> medicines</span>
          <span className="text-gray-400">Use the batch count to view batch records and adjust stock</span>
        </div>
      </div>

      {/* Add / Edit medicine modal */}
      {editModalOpen && (
        <div className="modal-backdrop">
          <div
            className="modal-content"
            style={{
              width: 'min(960px, calc(100vw - 32px))',
              maxWidth: editingMedicine ? '960px' : '620px',
              height: editingMedicine ? 'min(88vh, 780px)' : 'auto',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            <div className="modal-header shrink-0">
              <h3 className="modal-title flex items-center gap-2">
                <Pill size={18} className="text-teal-700" />
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Add New Medicine'}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-gray-400 hover:text-gray-600" aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            {/* Stable tab bar: no animated height changes and no repeated batch fetch on click. */}
            {editingMedicine && (
              <div className="shrink-0 border-b border-gray-100 bg-white px-5 pt-3 pb-2">
                <div className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setEditTab('info')}
                    aria-selected={editTab === 'info'}
                    className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold ${editTab === 'info'
                      ? 'border border-gray-200 bg-white text-teal-800 shadow-sm'
                      : 'border border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    <Pill size={14} /> Medicine Information
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTab('batches')}
                    aria-selected={editTab === 'batches'}
                    className={`inline-flex h-8 items-center gap-2 rounded-md px-3 text-xs font-semibold ${editTab === 'batches'
                      ? 'border border-gray-200 bg-white text-teal-800 shadow-sm'
                      : 'border border-transparent text-gray-500 hover:text-gray-800'}`}
                  >
                    <Layers size={14} /> Stock &amp; Expiry
                    <span className="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-800">{batches.length}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Keep the info form mounted while switching tabs to avoid remount flicker. */}
            <form
              onSubmit={handleSaveMedicine}
              className="modal-body flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
              style={{ display: editTab === 'info' ? 'flex' : 'none' }}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Medicine / Trade Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Panadol Extra" className="input w-full" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Generic Formula</label>
                  <input type="text" value={formData.generic_name} onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })} placeholder="e.g. Paracetamol + Caffeine" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Brand</label>
                  <input type="text" value={formData.brand} onChange={(e) => setFormData({ ...formData, brand: e.target.value })} placeholder="e.g. GSK, Abbott" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Category</label>
                  <input type="text" list="cat-suggestions" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Analgesic" className="input w-full" />
                  <datalist id="cat-suggestions">{categories.map((category) => <option key={category} value={category} />)}</datalist>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Dosage Form</label>
                  <select value={formData.dosage_form} onChange={(e) => setFormData({ ...formData, dosage_form: e.target.value })} className="input w-full">
                    {DOSAGE_FORMS.map((dosage) => <option key={dosage} value={dosage}>{dosage}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Strength</label>
                  <input type="text" value={formData.strength} onChange={(e) => setFormData({ ...formData, strength: e.target.value })} placeholder="e.g. 500mg, 10ml" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Pack Size (Units/Pack)</label>
                  <input type="number" min="1" value={formData.pack_size} onChange={(e) => setFormData({ ...formData, pack_size: parseInt(e.target.value, 10) || 1 })} className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Rack / Shelf Location</label>
                  <input type="text" value={formData.rack_shelf} onChange={(e) => setFormData({ ...formData, rack_shelf: e.target.value })} placeholder="e.g. A-3 Shelf 2" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Manufacturer</label>
                  <input type="text" value={formData.manufacturer} onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })} placeholder="e.g. Getz Pharma" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Min Stock Alert Level</label>
                  <input type="number" min="0" value={formData.min_stock_level} onChange={(e) => setFormData({ ...formData, min_stock_level: parseInt(e.target.value, 10) || 0 })} className="input w-full" />
                </div>

                {/* Compact master/default pricing. Batch-specific prices remain independent. */}
                <div className="col-span-2 mt-0.5 rounded-lg border border-teal-200 bg-teal-50/40 p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
                      <DollarSign size={14} className="text-teal-700" /> Medicine Pricing
                    </div>
                    {formData.selling_price && formData.purchase_price && parseFloat(formData.selling_price) > 0 && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-gray-500">Profit / unit:</span>
                        <span className={`rounded px-1.5 py-0.5 font-bold ${parseFloat(formData.selling_price) >= parseFloat(formData.purchase_price)
                          ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                          Rs. {(parseFloat(formData.selling_price) - parseFloat(formData.purchase_price || 0)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">Default Purchase Price (PKR)</label>
                      <input type="number" min="0" step="0.01" value={formData.purchase_price} onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })} placeholder="0.00" className="input w-full text-sm font-medium" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-gray-600">Default Selling Price (PKR) *</label>
                      <input type="number" min="0" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })} placeholder="0.00" className="input w-full text-sm font-semibold text-teal-900" />
                    </div>
                  </div>
                  {editingMedicine && (
                    <p className="mt-2 text-[10px] text-teal-800/80">
                      Updates the catalog defaults only. Existing batch prices remain unchanged.
                    </p>
                  )}
                </div>

                {!editingMedicine && (
                  <div className="col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-gray-700">Primary Barcode (Optional)</label>
                    <input type="text" value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} placeholder="Scan or type barcode" className="input w-full" />
                  </div>
                )}
              </div>

              <div className="flex gap-6 border-t border-gray-200 py-2">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                  <input type="checkbox" checked={formData.requires_prescription === 1} onChange={(e) => setFormData({ ...formData, requires_prescription: e.target.checked ? 1 : 0 })} className="rounded text-teal-600 focus:ring-teal-500" />
                  <span>Requires Doctor Prescription (Rx)</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-gray-700">
                  <input type="checkbox" checked={formData.is_narcotic === 1} onChange={(e) => setFormData({ ...formData, is_narcotic: e.target.checked ? 1 : 0 })} className="rounded text-red-600 focus:ring-red-500" />
                  <span className="font-semibold text-red-700">Narcotic / Controlled Substance</span>
                </label>
              </div>

              {!editingMedicine && (
                <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
                  <h4 className="mb-1 flex items-center gap-1.5 text-xs font-bold text-teal-900">
                    <Package size={14} className="text-teal-700" /> Initial Opening Stock (Optional)
                  </h4>
                  <p className="mb-3 text-[11px] text-gray-500">
                    Enter how many units are in stock and their expiry date.
                  </p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">Quantity (Total Units)</label>
                      <input type="number" min="0" value={formData.initial_stock} onChange={(e) => setFormData({ ...formData, initial_stock: e.target.value })} placeholder="0" className="input w-full py-1 text-xs" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">Expiry Date</label>
                      <input type="date" value={formData.initial_expiry_date} onChange={(e) => setFormData({ ...formData, initial_expiry_date: e.target.value })} className="input w-full py-1 text-xs" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">Purchase Price (PKR)</label>
                      <input type="number" min="0" step="0.01" value={formData.initial_purchase_price} onChange={(e) => setFormData({ ...formData, initial_purchase_price: e.target.value })} placeholder="0.00" className="input w-full py-1 text-xs" />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] font-semibold text-gray-600">Sale Price (PKR)</label>
                      <input type="number" min="0" step="0.01" value={formData.initial_selling_price} onChange={(e) => setFormData({ ...formData, initial_selling_price: e.target.value })} placeholder="0.00" className="input w-full py-1 text-xs" />
                    </div>
                  </div>
                </div>
              )}

              <div className="modal-footer -mx-5 -mb-5 mt-2 shrink-0">
                <button type="button" onClick={() => setEditModalOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary font-semibold"><Save size={15} /> Save Medicine</button>
              </div>
            </form>

            {/* Keep batch panel mounted too. Switching tabs only toggles display; it does not
                destroy the table or trigger another request, which removes the visual jump. */}
            {editingMedicine && (
              <div
                className="modal-body flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto"
                style={{ display: editTab === 'batches' ? 'flex' : 'none' }}
              >
                {renderBatchStats(false)}
                <div className="mt-1 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-800">Stock by Expiry ({batches.length})</h4>
                  <button onClick={handleOpenAddBatch} className="btn btn-primary btn-sm"><Plus size={13} /> Add Stock</button>
                </div>
                {renderBatchTable(true)}
                <div className="modal-footer -mx-5 -mb-5 mt-2 shrink-0">
                  <button onClick={() => setEditModalOpen(false)} className="btn btn-secondary">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standalone batch manager */}
      {batchModalOpen && batchMedicine && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '1040px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title flex items-center gap-2">
                  <Calendar size={18} className="text-teal-700" />
                  Stock &amp; Expiry: <span className="text-teal-900">{batchMedicine.name}</span>
                </h3>
                <div className="mt-0.5 text-xs text-gray-500">
                  Generic: {batchMedicine.generic_name || '—'} {batchMedicine.strength && `(${batchMedicine.strength})`}
                </div>
              </div>
              <button onClick={() => { setBatchModalOpen(false); setBatchMedicine(null); }} className="text-gray-400 hover:text-gray-600" aria-label="Close stock manager">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body flex flex-col gap-4">
              {renderBatchStats(true)}
              <div className="mt-1 flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wide text-gray-800">Stock Entries by Expiry ({batches.length})</h4>
                <button onClick={handleOpenAddBatch} className="btn btn-primary btn-sm font-semibold"><Plus size={14} /> Add Stock</button>
              </div>
              {renderBatchTable(false)}
              <div className="modal-footer -mx-5 -mb-5 mt-2">
                <button onClick={() => { setBatchModalOpen(false); setBatchMedicine(null); }} className="btn btn-secondary">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add stock modal (simplified by expiry & quantity) */}
      {addBatchOpen && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Plus size={16} className="text-teal-700" /> Add Medicine Stock</h3>
              <button onClick={() => setAddBatchOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateBatch} className="modal-body flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Quantity (Units) *</label>
                  <input type="number" min="1" required autoFocus value={batchForm.initial_quantity} onChange={(e) => setBatchForm({ ...batchForm, initial_quantity: e.target.value })} placeholder="e.g. 100" className="input w-full font-semibold" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Expiry Date *</label>
                  <input type="date" required value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Purchase Cost (PKR)</label>
                  <input type="number" min="0" step="0.01" value={batchForm.purchase_price} onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })} placeholder="0.00" className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Sale Price (PKR)</label>
                  <input type="number" min="0" step="0.01" value={batchForm.sale_price} onChange={(e) => setBatchForm({ ...batchForm, sale_price: e.target.value })} placeholder="0.00" className="input w-full" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Supplier (Optional)</label>
                  <select value={batchForm.supplier_id} onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })} className="input w-full">
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer -mx-5 -mb-5 mt-2">
                <button type="button" onClick={() => setAddBatchOpen(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary font-semibold"><Plus size={14} /> Add Stock</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit stock/expiry modal */}
      {editBatchOpen && editingBatch && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Edit size={16} className="text-teal-700" /> Edit Stock &amp; Expiry</h3>
              <button onClick={() => { setEditBatchOpen(false); setEditingBatch(null); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleUpdateBatch} className="modal-body flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Expiry Date *</label>
                  <input type="date" required value={batchForm.expiry_date} onChange={(e) => setBatchForm({ ...batchForm, expiry_date: e.target.value })} className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Status</label>
                  <select value={batchForm.status} onChange={(e) => setBatchForm({ ...batchForm, status: e.target.value })} className="input w-full">
                    <option value="ACTIVE">ACTIVE</option><option value="BLOCKED">BLOCKED</option><option value="EXPIRED">EXPIRED</option><option value="QUARANTINED">QUARANTINED</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Purchase Cost</label>
                  <input type="number" min="0" step="0.01" value={batchForm.purchase_price} onChange={(e) => setBatchForm({ ...batchForm, purchase_price: e.target.value })} className="input w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Sale Price</label>
                  <input type="number" min="0" step="0.01" value={batchForm.sale_price} onChange={(e) => setBatchForm({ ...batchForm, sale_price: e.target.value })} className="input w-full" />
                </div>
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Supplier</label>
                  <select value={batchForm.supplier_id} onChange={(e) => setBatchForm({ ...batchForm, supplier_id: e.target.value })} className="input w-full">
                    <option value="">— Select Supplier —</option>
                    {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-footer -mx-5 -mb-5 mt-2">
                <button type="button" onClick={() => { setEditBatchOpen(false); setEditingBatch(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary font-semibold"><Save size={14} /> Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust stock modal */}
      {adjustStockOpen && adjustingBatch && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Activity size={16} className="text-amber-600" /> Adjust Stock Quantity (Exp: {fmtDate(adjustingBatch.expiry_date)})</h3>
              <button onClick={() => { setAdjustStockOpen(false); setAdjustingBatch(null); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleAdjustStock} className="modal-body flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 text-center">
                <div>
                  <div className="text-[11px] font-semibold uppercase text-gray-500">Current Quantity</div>
                  <div className="text-xl font-bold text-gray-900">{adjustingBatch.current_stock !== undefined ? adjustingBatch.current_stock : (adjustingBatch.available_quantity || 0)}</div>
                </div>
                <div className="text-lg text-gray-400">→</div>
                <div>
                  <div className="text-[11px] font-semibold uppercase text-gray-500">New Quantity</div>
                  <div className="text-xl font-bold text-teal-700">{adjustForm.new_quantity || 0}</div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">New Physical Count Quantity *</label>
                <input type="number" min="0" step="1" required value={adjustForm.new_quantity} onChange={(e) => setAdjustForm({ ...adjustForm, new_quantity: e.target.value })} className="input w-full font-semibold" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Adjustment Reason *</label>
                <select required value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })} className="input w-full">
                  <option value="">— Select Mandatory Reason —</option>
                  {ADJUSTMENT_REASONS.map((reason) => <option key={reason} value={reason}>{reason}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Audit Notes (Optional)</label>
                <textarea value={adjustForm.notes} onChange={(e) => setAdjustForm({ ...adjustForm, notes: e.target.value })} placeholder="Additional details about this physical stock discrepancy..." rows="2" className="textarea w-full" />
              </div>
              <div className="modal-footer -mx-5 -mb-5 mt-2">
                <button type="button" onClick={() => { setAdjustStockOpen(false); setAdjustingBatch(null); }} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary font-semibold"><Check size={14} /> Confirm Adjustment</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch history modal */}
      {historyOpen && historyBatch && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><History size={16} className="text-teal-700" /> Audit Log: Batch {historyBatch.batch_number}</h3>
              <button onClick={() => { setHistoryOpen(false); setHistoryBatch(null); setHistoryData([]); }} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="modal-body max-h-[60vh] overflow-y-auto">
              {historyData.length === 0 ? (
                <div className="py-8 text-center text-gray-400">
                  <History size={32} className="mx-auto mb-2 stroke-1 text-gray-300" />
                  <p className="text-xs font-medium">No stock movement logs recorded for this batch yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {historyData.map((history) => (
                    <div key={history.id} className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${history.quantity_change > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {history.quantity_change > 0 ? '+' : ''}{history.quantity_change}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-bold text-gray-900">{history.movement_type?.replace(/_/g, ' ')}</span>
                          <span className="badge badge-secondary text-[10px]">{history.old_quantity ?? '?'} → {history.new_quantity ?? '?'}</span>
                        </div>
                        {history.reason && <div className="mt-0.5 text-xs text-gray-600">{history.reason}</div>}
                        <div className="mt-1 text-[10px] text-gray-400">
                          {fmtDate(history.created_at)} {history.created_at ? new Date(history.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' }) : ''}
                          {history.user_name && <span> • by {history.user_name}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer -mx-5 -mb-5">
              <button onClick={() => { setHistoryOpen(false); setHistoryBatch(null); setHistoryData([]); }} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Barcodes modal */}
      {barcodeModalOpen && barcodeMed && (
        <div className="modal-backdrop">
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Barcode size={18} className="text-teal-700" /> Barcodes for {barcodeMed.name}</h3>
              <button onClick={() => setBarcodeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <form onSubmit={handleAddBarcode} className="flex gap-2">
                <input type="text" placeholder="Scan or enter barcode number..." value={newBarcodeVal} autoFocus onChange={(e) => setNewBarcodeVal(e.target.value)} className="input flex-1 text-xs" />
                <button type="submit" className="btn btn-primary text-xs font-semibold">Add Barcode</button>
              </form>
              <div className="mt-1 flex max-h-56 flex-col gap-2 overflow-y-auto">
                {medBarcodes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400">No barcodes assigned to this medicine yet.</div>
                ) : medBarcodes.map((barcode) => (
                  <div key={barcode.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-2.5">
                    <div>
                      <div className="font-mono text-xs font-semibold text-gray-900">{barcode.barcode}</div>
                      {barcode.is_primary === 1 && <span className="badge badge-info text-[9px]">Primary Barcode</span>}
                    </div>
                    <button onClick={() => handleRemoveBarcode(barcode.id)} className="p-1 text-gray-400 hover:text-red-600" title="Remove Barcode"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer -mx-5 -mb-5">
              <button onClick={() => setBarcodeModalOpen(false)} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* CSV import modal */}
      {importModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3 className="modal-title flex items-center gap-2"><Upload size={18} className="text-teal-700" /> Bulk Import Medicines (CSV)</h3>
              <button onClick={() => setImportModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="modal-body flex flex-col gap-3">
              <p className="text-xs text-gray-600">
                Paste CSV formatted text below (headers: <code>name, generic, brand, category, dosage form, pack size, rack, barcode</code>):
              </p>
              <textarea
                rows="8"
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'Name,Generic,Category,Dosage Form,Pack Size,Rack,Barcode\nPanadol 500mg,Paracetamol,Analgesics,Tablet,20,A-1,8964000123456\nBrufen 400mg,Ibuprofen,NSAID,Tablet,30,A-2,8964000789012'}
                className="textarea w-full font-mono text-xs"
              />
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Upload CSV file from disk:</span>
                <input
                  type="file"
                  accept=".csv,.txt"
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => setCsvText(event.target.result);
                    reader.readAsText(file);
                  }}
                  className="text-xs text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-2 file:py-1 file:text-xs file:text-gray-700 hover:file:bg-gray-200"
                />
              </div>
            </div>
            <div className="modal-footer -mx-5 -mb-5">
              <button onClick={() => setImportModalOpen(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleProcessCSVImport} className="btn btn-primary font-semibold">Process CSV Import</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
