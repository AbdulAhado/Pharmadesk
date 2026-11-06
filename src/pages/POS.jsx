import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Barcode, Trash2, Plus, Minus, ShoppingCart, User,
  Printer, CheckCircle2, AlertCircle, X, PauseCircle, PlayCircle,
  Percent, ArrowRight, RefreshCw, Layers, Edit2, Tag, Check, AlertTriangle,
  Volume2, VolumeX
} from 'lucide-react';
import toast from 'react-hot-toast';
import { posSound } from '../utils/sound';

const api = window.api;
const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function POS() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Cart: [{ medicine, batch, isPack: boolean, selectedUnit: string, qty: number, originalPrice: number, unitPrice: number, isPriceEdited: boolean, discount: number, total: number }]
  const [cart, setCart] = useState([]);
  const [heldCarts, setHeldCarts] = useState(() => {
    try {
      const saved = localStorage.getItem('pharmadesk_held_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Price editing state
  const [editingPriceIdx, setEditingPriceIdx] = useState(null);
  const [editPriceValue, setEditPriceValue] = useState('');

  // Customer & Payment Info
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [overallDiscountPercent, setOverallDiscountPercent] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Modals & Receipts
  const [batchModalMed, setBatchModalMed] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [licenseInfo, setLicenseInfo] = useState(null);

  useEffect(() => {
    if (window.api?.license?.getStatus) {
      window.api.license.getStatus().then(setLicenseInfo).catch(() => {});
    }
  }, []);
  const [pharmacySettings, setPharmacySettings] = useState({
    name: 'PharmaDesk Pharmacy',
    address: 'Main Commercial Area, Lahore',
    phone: '+92 300 1234567',
    taxNumber: 'NTN: 1234567-8',
    receiptFooter: 'Get well soon! Medicines once sold cannot be returned without receipt.'
  });

  const searchInputRef = useRef(null);
  const barcodeBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // Load pharmacy settings on mount
  useEffect(() => {
    if (api?.settings) {
      api.settings.getAll().then((s) => {
        if (s) {
          setPharmacySettings({
            name: s.pharmacy_name || 'PharmaDesk Pharmacy',
            address: s.pharmacy_address || 'Main Commercial Area, Lahore',
            phone: s.pharmacy_phone || '+92 300 1234567',
            taxNumber: s.tax_number || 'NTN: 1234567-8',
            receiptFooter: s.receipt_footer || 'Get well soon! Medicines once sold cannot be returned without receipt.'
          });
          if (s.default_tax_rate) {
            setTaxPercent(Number(s.default_tax_rate) || 0);
          }
        }
      }).catch(() => { });
    }
    searchInputRef.current?.focus();
  }, []);

  // Initialize Web Audio context on first user interaction (browser autoplay policy)
  useEffect(() => {
    const initAudio = () => {
      posSound.init();
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    };
  }, []);

  // Save held carts to localStorage
  useEffect(() => {
    localStorage.setItem('pharmadesk_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);

  // Debounced live search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSelectedSearchIndex(0);
      return;
    }
    const timer = setTimeout(async () => {
      if (!api?.pos) return;
      setIsSearching(true);
      try {
        const res = await api.pos.searchMedicine(query.trim());
        setSearchResults(res || []);
        setSelectedSearchIndex(0);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  // Add medicine to cart with automatic FEFO batch selection
  const handleSelectMedicine = async (med) => {
    if (!api?.pos) {
      toast.error('API unavailable');
      return;
    }
    try {
      const batches = await api.pos.getAvailableBatches(med.id);
      if (!batches || batches.length === 0) {
        toast.error(`"${med.name}" is out of stock!`);
        return;
      }

      // First batch is FEFO (earliest expiring with stock)
      const defaultBatch = batches[0];
      addToCartWithBatch(med, defaultBatch);
      posSound.playScanSuccess();
      setQuery('');
      setSearchResults([]);
      searchInputRef.current?.focus();
    } catch (err) {
      toast.error('Failed to load batch: ' + err.message);
    }
  };

  // Add medicine or update quantity if same medicine and batch already in cart
  const addToCartWithBatch = (med, batch, isPack = false) => {
    const existingIndex = cart.findIndex(
      (item) => item.medicine.id === med.id && item.batch.id === batch.id && item.isPack === isPack
    );

    const basePrice = Number(batch.selling_price || batch.sale_price || med.default_selling_price || 0);
    const price = isPack ? (basePrice * (med.pack_size || 1)) : basePrice;

    const availableQty = batch.available_quantity ?? batch.current_stock ?? 0;
    const maxStock = isPack ? Math.floor(availableQty / (med.pack_size || 1)) : availableQty;

    if (maxStock <= 0) {
      posSound.playWarning();
      toast.error(`No stock remaining for "${med.name}" in batch ${batch.batch_number}!`);
      return;
    }

    if (existingIndex > -1) {
      // Same medicine already in cart -> update quantity
      const currentQty = cart[existingIndex].qty;
      if (currentQty + 1 > maxStock) {
        posSound.playWarning();
        toast.error(`Cannot add more than available stock (${maxStock})!`, { icon: '⚠️' });
        return;
      }
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      const unitPrice = updated[existingIndex].unitPrice;
      const disc = updated[existingIndex].discount || 0;
      updated[existingIndex].total = (updated[existingIndex].qty * unitPrice) - disc;
      setCart(updated);
      toast.success(`Updated ${med.name} qty to ${updated[existingIndex].qty}`, { duration: 1500 });
    } else {
      // New item row
      const defaultUnit = isPack ? `Pack (${med.pack_size || 1})` : (med.dosage_form || 'Tablet');
      setCart([
        ...cart,
        {
          medicine: med,
          batch: batch,
          isPack: isPack,
          selectedUnit: defaultUnit,
          qty: 1,
          originalPrice: price,
          unitPrice: price,
          isPriceEdited: false,
          discount: 0,
          total: price,
        }
      ]);
      toast.success(`Added ${med.name} to cart`, { duration: 1500 });
    }
  };

  // Update item quantity
  const updateCartItemQty = (index, delta) => {
    const item = cart[index];
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const availableQty = item.batch?.available_quantity ?? item.batch?.current_stock ?? 0;
    const maxStock = item.isPack
      ? Math.floor(availableQty / (item.medicine.pack_size || 1))
      : availableQty;

    if (newQty > maxStock) {
      posSound.playWarning();
      toast.error(`Max available stock in this batch is ${maxStock}`, { icon: '⚠️' });
      return;
    }

    const updated = [...cart];
    updated[index].qty = newQty;
    const disc = updated[index].discount || 0;
    updated[index].total = (newQty * updated[index].unitPrice) - disc;
    setCart(updated);
  };

  // Set exact quantity from input
  const setExactQty = (index, value) => {
    const val = parseInt(value, 10);
    if (isNaN(val) || val <= 0) return;
    const item = cart[index];
    const availableQty = item.batch?.available_quantity ?? item.batch?.current_stock ?? 0;
    const maxStock = item.isPack
      ? Math.floor(availableQty / (item.medicine.pack_size || 1))
      : availableQty;

    if (val > maxStock) {
      posSound.playWarning();
      toast.error(`Max available stock in this batch is ${maxStock}`, { icon: '⚠️' });
      return;
    }
    const updated = [...cart];
    updated[index].qty = val;
    const disc = updated[index].discount || 0;
    updated[index].total = (val * updated[index].unitPrice) - disc;
    setCart(updated);
  };

  // Toggle or change Unit Mode (Pack vs Loose Unit)
  const setUnitMode = (index, isPack) => {
    const item = cart[index];
    if (item.isPack === isPack) return;
    const packSize = item.medicine.pack_size || 1;
    const baseBatchPrice = Number(item.batch?.selling_price || item.batch?.sale_price || item.medicine.default_selling_price || 0);
    const newUnitPrice = isPack ? (baseBatchPrice * packSize) : baseBatchPrice;

    const availableQty = item.batch?.available_quantity ?? item.batch?.current_stock ?? 0;
    const maxStock = isPack ? Math.floor(availableQty / packSize) : availableQty;

    if (maxStock <= 0) {
      toast.error('Insufficient quantity for full pack!');
      return;
    }

    const newQty = Math.min(item.qty, maxStock) || 1;
    const updated = [...cart];
    updated[index].isPack = isPack;
    updated[index].selectedUnit = isPack ? `Pack (${packSize})` : (item.medicine.dosage_form || 'Loose');
    updated[index].unitPrice = newUnitPrice;
    updated[index].qty = newQty;
    const disc = updated[index].discount || 0;
    updated[index].total = (newQty * newUnitPrice) - disc;
    setCart(updated);
  };

  // Edit price (permission-based)
  const startEditingPrice = (index) => {
    setEditingPriceIdx(index);
    setEditPriceValue(cart[index].unitPrice.toString());
  };

  const saveEditedPrice = (index) => {
    const val = parseFloat(editPriceValue);
    if (isNaN(val) || val < 0) {
      toast.error('Please enter a valid price');
      return;
    }
    const item = cart[index];
    const purchaseCost = item.isPack
      ? ((item.batch?.purchase_cost || 0) * (item.medicine.pack_size || 1))
      : (item.batch?.purchase_cost || 0);

    if (purchaseCost > 0 && val < purchaseCost) {
      toast(`Warning: Price (${fmt(val)}) is below purchase cost (${fmt(purchaseCost)})!`, { icon: '⚠️' });
    }

    const updated = [...cart];
    updated[index].unitPrice = val;
    updated[index].isPriceEdited = true;
    const disc = updated[index].discount || 0;
    updated[index].total = (updated[index].qty * val) - disc;
    setCart(updated);
    setEditingPriceIdx(null);
    toast.success('Selling price updated');
  };

  // Item-level discount
  const updateItemDiscount = (index, value) => {
    const val = parseFloat(value) || 0;
    const item = cart[index];
    const rawTotal = item.qty * item.unitPrice;
    if (val < 0) return;
    if (val > rawTotal) {
      toast.error(`Discount cannot exceed item total (${fmt(rawTotal)})`);
      return;
    }
    const updated = [...cart];
    updated[index].discount = val;
    updated[index].total = rawTotal - val;
    setCart(updated);
  };

  // Batch selector modal
  const openBatchSelector = async (med, cartIndex = null) => {
    if (!api?.pos) return;
    try {
      const batches = await api.pos.getAvailableBatches(med.id);
      setAvailableBatches(batches || []);
      setBatchModalMed({ medicine: med, cartIndex });
    } catch (err) {
      toast.error('Failed to load batches');
    }
  };

  const switchBatchForCartItem = (newBatch) => {
    if (batchModalMed?.cartIndex !== null && batchModalMed?.cartIndex !== undefined) {
      const updated = [...cart];
      const idx = batchModalMed.cartIndex;
      const item = updated[idx];
      const packSize = item.medicine.pack_size || 1;
      const basePrice = Number(newBatch.selling_price || newBatch.sale_price || item.medicine.default_selling_price || 0);
      const price = item.isPack ? (basePrice * packSize) : basePrice;

      updated[idx].batch = newBatch;
      updated[idx].unitPrice = price;
      const disc = updated[idx].discount || 0;
      updated[idx].total = (updated[idx].qty * price) - disc;
      setCart(updated);
      toast.success(`Switched to batch ${newBatch.batch_number}`);
    } else if (batchModalMed?.medicine) {
      addToCartWithBatch(batchModalMed.medicine, newBatch);
    }
    setBatchModalMed(null);
  };

  const removeFromCart = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
    toast('Item removed from cart', { icon: '🗑️' });
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Are you sure you want to clear the active cart?')) {
      setCart([]);
      setOverallDiscountPercent(0);
      setAmountPaid('');
      toast('Cart cleared', { icon: '🧹' });
      searchInputRef.current?.focus();
    }
  };

  const holdCurrentCart = () => {
    if (cart.length === 0) {
      toast.error('Cart is already empty!');
      return;
    }
    const newHold = {
      id: Date.now(),
      date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName,
      customerPhone,
      items: cart,
      subtotal: grandTotal
    };
    setHeldCarts([...heldCarts, newHold]);
    setCart([]);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    toast.success('Sale parked on hold!');
  };

  const restoreHeldCart = (heldId) => {
    const held = heldCarts.find((c) => c.id === heldId);
    if (!held) return;
    if (cart.length > 0 && !window.confirm('Current cart will be replaced. Continue?')) {
      return;
    }
    setCart(held.items);
    setCustomerName(held.customerName || 'Walk-in Customer');
    setCustomerPhone(held.customerPhone || '');
    setHeldCarts(heldCarts.filter((c) => c.id !== heldId));
    toast.success('Parked sale restored!');
  };

  // Keyboard navigation inside search dropdown
  const handleSearchKeyDown = (e) => {
    if (searchResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev + 1) % searchResults.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selectedMed = searchResults[selectedSearchIndex] || searchResults[0];
        if (selectedMed) {
          handleSelectMedicine(selectedMed);
        }
      }
    }
  };

  // Barcode keyboard listener & global shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Hotkey: F2 -> Complete Sale
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) openCheckoutModal();
        return;
      }
      // Hotkey: F4 -> Clear Cart
      if (e.key === 'F4') {
        e.preventDefault();
        clearCart();
        return;
      }
      // Hotkey: F8 -> Focus search
      if (e.key === 'F8') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      // Hotkey: Escape -> close modal
      if (e.key === 'Escape') {
        if (checkoutModalOpen) setCheckoutModalOpen(false);
        if (batchModalMed) setBatchModalMed(null);
        if (receiptData) setReceiptData(null);
        setEditingPriceIdx(null);
        return;
      }

      // Barcode Scanner detection
      const now = Date.now();
      if (now - lastKeyTimeRef.current > 100) {
        barcodeBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter' && barcodeBufferRef.current.length >= 4) {
        const scannedCode = barcodeBufferRef.current;
        barcodeBufferRef.current = '';
        if (api?.medicines) {
          api.medicines.searchByBarcode(scannedCode).then((med) => {
            if (med) {
              handleSelectMedicine(med);
            } else {
              posSound.playWarning();
              toast.error(`Barcode not found: ${scannedCode}`);
            }
          }).catch(() => { });
        }
      } else if (e.key.length === 1) {
        barcodeBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, checkoutModalOpen, batchModalMed, receiptData]);

  // Calculations
  const itemsSubtotal = cart.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const itemDiscountsTotal = cart.reduce((sum, item) => sum + (item.discount || 0), 0);
  const subtotalAfterItemDiscounts = itemsSubtotal - itemDiscountsTotal;
  const overallDiscountAmount = (subtotalAfterItemDiscounts * overallDiscountPercent) / 100;
  const totalDiscountApplied = itemDiscountsTotal + overallDiscountAmount;
  const taxableSubtotal = subtotalAfterItemDiscounts - overallDiscountAmount;
  const taxAmount = (taxableSubtotal * taxPercent) / 100;
  const grandTotal = Math.max(0, taxableSubtotal + taxAmount);

  const numAmountPaid = parseFloat(amountPaid) || 0;
  const changeDue = Math.max(0, numAmountPaid - grandTotal);
  const remainingDue = Math.max(0, grandTotal - numAmountPaid);

  const openCheckoutModal = () => {
    if (licenseInfo?.isReadOnly) {
      toast.error('Subscription Expired: Cannot complete new sales in Read-Only mode. Please renew your subscription.', { duration: 6000 });
      return;
    }
    if (cart.length === 0) {
      toast.error('Add items to cart first!');
      return;
    }
    setAmountPaid(grandTotal.toFixed(2));
    setCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!api?.pos) {
      toast.error('Database connection not available!');
      return;
    }

    const salePayload = {
      customer_name: customerName.trim() || 'Walk-in Customer',
      customer_phone: customerPhone.trim(),
      payment_method: paymentMethod.toUpperCase(),
      subtotal: itemsSubtotal,
      discount_amount: totalDiscountApplied,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      amount_paid: numAmountPaid,
      change_amount: changeDue,
      notes: notes.trim(),
      items: cart.map((it) => ({
        medicine_id: it.medicine.id,
        batch_id: it.batch.id,
        is_pack: it.isPack ? 1 : 0,
        quantity: it.qty,
        unit_selling_price: it.unitPrice,
        discount_amount: it.discount || 0,
        line_total: it.total,
      })),
    };

    try {
      const res = await api.pos.completeSale(salePayload);
      if (res) {
        posSound.playCheckoutSuccess();
        toast.success(`Sale completed! Invoice: ${res.invoiceNumber}`, { duration: 3000 });
        setReceiptData({
          ...salePayload,
          invoice_number: res.invoiceNumber,
          date: new Date().toLocaleString(),
          cartItems: [...cart],
        });
        setCart([]);
        setAmountPaid('');
        setOverallDiscountPercent(0);
        setCheckoutModalOpen(false);
        setCustomerName('Walk-in Customer');
        setCustomerPhone('');
        setNotes('');
        searchInputRef.current?.focus();
      }
    } catch (err) {
      toast.error('Failed to complete sale: ' + err.message);
    }
  };

  const handlePrintReceipt = () => {
    const printContent = document.getElementById('receipt-print-area');
    if (!printContent) return;

    if (api?.print?.receipt) {
      api.print.receipt(printContent.innerHTML);
    } else {
      window.print();
    }
  };

  return (
    <div className="pos-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 14 }}>
      {/* ── Top Bar: Search, Scanner Status, Parked Sales, Clear ── */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        
        {/* Search input with properly centered SVG icon */}
        <div style={{ position: 'relative', flex: '1 1 340px', minWidth: 280 }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
            <div style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              color: '#667085'
            }}>
              <Search size={17} strokeWidth={2} />
            </div>

            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search medicine by Name, Generic, Brand, or scan Barcode (F8)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{
                width: '100%',
                height: 40,
                paddingLeft: 38,
                paddingRight: 74,
                fontSize: 13,
                fontWeight: 500,
                color: '#101828',
                background: '#FFFFFF',
                border: '1px solid #D0D5DD',
                borderRadius: 8,
                outline: 'none',
                boxShadow: '0 1px 2px rgba(16,24,40,0.05)',
                transition: 'all 0.15s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0F766E';
                e.target.style.boxShadow = '0 0 0 3px rgba(15,118,110,0.12)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D0D5DD';
                e.target.style.boxShadow = '0 1px 2px rgba(16,24,40,0.05)';
              }}
            />

            <div style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              {query ? (
                <button
                  type="button"
                  onClick={() => { setQuery(''); searchInputRef.current?.focus(); }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#98A2B3',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={15} />
                </button>
              ) : null}
              <span className="kbd" style={{ fontSize: 10.5 }}>F8</span>
            </div>
          </div>

          {/* Live Search Results Dropdown matching Untitled UI */}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: 6,
              background: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: 10,
              boxShadow: '0 10px 25px -3px rgba(16,24,40,0.1), 0 4px 6px -4px rgba(16,24,40,0.05)',
              zIndex: 100,
              maxHeight: 340,
              overflowY: 'auto'
            }}>
              <div style={{
                padding: '8px 14px',
                borderBottom: '1px solid #EAECF0',
                fontSize: 11,
                fontWeight: 600,
                color: '#667085',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                display: 'flex',
                justifyContent: 'space-between',
                background: '#F9FAFB'
              }}>
                <span>Matching Medicines ({searchResults.length})</span>
                <span style={{ textTransform: 'none', color: '#98A2B3' }}>Click or Press Enter to add</span>
              </div>

              {searchResults.map((m, sIdx) => {
                const isSelected = sIdx === selectedSearchIndex;
                const totalStock = m.available_stock ?? m.total_stock ?? 0;
                const isOutOfStock = totalStock <= 0;
                const isLowStock = !isOutOfStock && totalStock <= (m.minimum_stock_level || 10);
                const price = m.sale_price || m.current_price || m.default_selling_price || 0;

                return (
                  <div
                    key={m.id}
                    onClick={() => handleSelectMedicine(m)}
                    onMouseEnter={() => setSelectedSearchIndex(sIdx)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid #F2F4F7',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: isSelected ? '#F0FDFA' : '#FFFFFF',
                      transition: 'background 0.1s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#101828', fontSize: 13 }}>
                          {m.brand ? `${m.brand} - ` : ''}{m.name}
                        </span>
                        {m.dosage_form && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1', padding: '1px 6px', borderRadius: 4 }}>
                            {m.dosage_form}
                          </span>
                        )}
                        {m.strength && (
                          <span style={{ fontSize: 10.5, fontWeight: 600, background: '#F2F4F7', color: '#344054', border: '1px solid #EAECF0', padding: '1px 6px', borderRadius: 4 }}>
                            {m.strength}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>
                        Generic: <span style={{ color: '#344054' }}>{m.generic_name || 'N/A'}</span> • Rack: {m.rack_shelf || 'N/A'} • Pack of {m.pack_size || 1}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>
                        {fmt(price)}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2 }}>
                        {isOutOfStock ? (
                          <span style={{ color: '#DC2626', fontWeight: 600, background: '#FEE2E2', padding: '1px 6px', borderRadius: 4 }}>
                            Out of stock
                          </span>
                        ) : isLowStock ? (
                          <span style={{ color: '#B45309', fontWeight: 600, background: '#FEF3C7', padding: '1px 6px', borderRadius: 4 }}>
                            Low stock: {totalStock}
                          </span>
                        ) : (
                          <span style={{ color: '#027A48', fontWeight: 500 }}>
                            {totalStock} in stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side controls: Barcode scanner badge, Hold/Park, Clear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 10px',
            borderRadius: 6,
            background: '#ECFDF3',
            border: '1px solid #D1FADF',
            color: '#027A48',
            fontSize: 12,
            fontWeight: 600
          }}>
            <Barcode size={15} />
            <span>Scanner Ready</span>
          </div>

          <button
            onClick={() => { const enabled = posSound.toggleSound(); setSoundEnabled(enabled); }}
            title={soundEnabled ? 'Mute POS sounds' : 'Enable POS sounds'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 10px',
              borderRadius: 6,
              background: soundEnabled ? '#F0FDFA' : '#F2F4F7',
              border: soundEnabled ? '1px solid #CCFBF1' : '1px solid #D0D5DD',
              color: soundEnabled ? '#0F766E' : '#667085',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
          </button>

          {heldCarts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11.5, color: '#B45309', fontWeight: 600 }}>
                {heldCarts.length} Parked:
              </span>
              {heldCarts.map((h, i) => (
                <button
                  key={h.id}
                  onClick={() => restoreHeldCart(h.id)}
                  className="btn btn-secondary"
                  style={{ height: 30, padding: '0 8px', fontSize: 11.5, gap: 4 }}
                  title={`Restore sale for ${h.customerName}`}
                >
                  <PlayCircle size={13} className="text-amber-500" />
                  <span>#{i + 1} ({fmt(h.subtotal)})</span>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={holdCurrentCart}
            disabled={cart.length === 0}
            className="btn btn-secondary"
            style={{ height: 32, fontSize: 12 }}
            title="Park current cart to serve another customer"
          >
            <PauseCircle size={14} />
            <span>Hold (Park)</span>
          </button>

          <button
            onClick={clearCart}
            disabled={cart.length === 0}
            className="btn btn-secondary"
            style={{ height: 32, fontSize: 12 }}
            title="Clear Cart (F4)"
          >
            <Trash2 size={14} />
            <span>Clear (F4)</span>
          </button>
        </div>
      </div>

      {/* ── Main Layout: Left Cart Table | Right Customer & Totals ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: 12, flex: 1, minHeight: 0 }}>
        
        {/* Left: Cart items table */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #EAECF0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F9FAFB'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCart size={17} style={{ color: '#0F766E' }} />
              <span style={{ fontWeight: 600, color: '#101828', fontSize: 13.5 }}>
                Cart Items ({cart.length})
              </span>
            </div>
            <span style={{ fontSize: 11.5, color: '#667085' }}>
              FEFO batch strategy active (Earliest expiry sold first)
            </span>
          </div>

          <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 280, padding: 32, textAlign: 'center' }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: '#F2F4F7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#98A2B3', marginBottom: 14 }}>
                  <ShoppingCart size={26} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#344054' }}>Cart is empty</div>
                <div style={{ fontSize: 12.5, color: '#667085', marginTop: 4, maxWidth: 380, lineHeight: '18px' }}>
                  Scan a medicine barcode or use the search box above (press <span className="kbd" style={{ fontSize: 11 }}>F8</span>) to add items.
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  <span className="kbd">F8 Search</span>
                  <span className="kbd">F2 Checkout</span>
                  <span className="kbd">F4 Clear</span>
                </div>
              </div>
            ) : (
              <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />   {/* Medicine */}
                  <col style={{ width: '9%' }} />    {/* Strength */}
                  <col style={{ width: '9%' }} />    {/* Batch */}
                  <col style={{ width: '12%' }} />   {/* Expiry */}
                  <col style={{ width: '14%' }} />   {/* Qty */}
                  <col style={{ width: '10%' }} />   {/* Unit */}
                  <col style={{ width: '12%' }} />   {/* Price */}
                  <col style={{ width: '9%' }} />    {/* Total */}
                  <col style={{ width: '3%' }} />    {/* Delete */}
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 5, background: '#F9FAFB', boxShadow: '0 1px 0 #EAECF0' }}>
                  <tr>
                    <th style={{ padding: '10px 8px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Medicine
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Strength
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Batch
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Expiry
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Qty
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Unit
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Price
                    </th>
                    <th style={{ padding: '10px 4px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Total
                    </th>
                    <th style={{ padding: '10px 2px', fontSize: 11, fontWeight: 600, color: '#475467', textAlign: 'center' }}>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => {
                    const availableQty = item.batch?.available_quantity ?? item.batch?.current_stock ?? 0;
                    const maxStock = item.isPack ? Math.floor(availableQty / (item.medicine.pack_size || 1)) : availableQty;
                    const isLimitReached = item.qty >= maxStock;
                    const isExpiringSoon = item.batch?.days_until_expiry != null
                      ? item.batch.days_until_expiry <= 60
                      : (new Date(item.batch.expiry_date) - new Date()) / (1000 * 60 * 60 * 24) <= 60;
                    const isLowBatchStock = availableQty <= (item.medicine.minimum_stock_level || 10);

                    return (
                      <tr
                        key={`${item.medicine.id}-${item.batch?.id}-${item.isPack}-${idx}`}
                        style={{
                          borderBottom: '1px solid #EAECF0',
                          background: idx % 2 === 0 ? '#FFFFFF' : '#FDFDFD',
                          transition: 'background 0.1s ease'
                        }}
                      >
                        
                        {/* 1. Medicine: Brand + Generic */}
                        <td style={{ padding: '8px 8px', verticalAlign: 'middle', overflow: 'hidden' }}>
                          <div style={{ fontWeight: 600, color: '#101828', fontSize: 12.5, lineHeight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.medicine.brand ? `${item.medicine.brand} - ` : ''}{item.medicine.name}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2, lineHeight: '15px' }}>
                            Generic: <span style={{ color: '#344054', fontWeight: 500 }}>{item.medicine.generic_name || 'N/A'}</span>
                          </div>
                          {isLowBatchStock && (
                            <div style={{ fontSize: 10.5, color: '#B45309', background: '#FEF3C7', border: '1px solid #FDE68A', padding: '1px 6px', borderRadius: 4, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                              <AlertCircle size={10} /> Low batch stock: {availableQty} left
                            </div>
                          )}
                        </td>

                        {/* 2. Strength */}
                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: '#F8FAFC',
                            color: '#334155',
                            fontSize: 11.5,
                            fontWeight: 600,
                            border: '1px solid #E2E8F0',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.medicine.strength || 'N/A'}
                          </span>
                        </td>

                        {/* 3. Batch */}
                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => openBatchSelector(item.medicine, idx)}
                            title="Click to switch batch"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: '#F0FDFA',
                              border: '1px solid #CCFBF1',
                              color: '#0F766E',
                              fontSize: 11.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <Layers size={11} />
                            <span>{item.batch?.batch_number || 'FEFO'}</span>
                          </button>
                        </td>

                        {/* 4. Expiry */}
                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                            {isExpiringSoon ? (
                              <span style={{
                                color: '#B45309',
                                background: '#FEF3C7',
                                border: '1px solid #FDE68A',
                                padding: '2px 6px',
                                borderRadius: 5,
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <AlertCircle size={11} /> {item.batch?.expiry_date}
                              </span>
                            ) : (
                              <span style={{ color: '#475467', fontWeight: 500 }}>{item.batch?.expiry_date || 'N/A'}</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Qty Stepper */}
                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, -1)}
                              style={{
                                width: 26,
                                height: 26,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                border: '1px solid #D0D5DD',
                                background: '#FFFFFF',
                                color: '#344054',
                                cursor: 'pointer',
                                transition: 'all 0.1s ease'
                              }}
                              title="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={maxStock}
                              value={item.qty}
                              onChange={(e) => setExactQty(idx, e.target.value)}
                              style={{
                                width: 44,
                                height: 26,
                                textAlign: 'center',
                                borderRadius: 6,
                                border: isLimitReached ? '1px solid #F04438' : '1px solid #D0D5DD',
                                background: isLimitReached ? '#FEF3F2' : '#FFFFFF',
                                fontWeight: 700,
                                fontSize: 13,
                                color: isLimitReached ? '#D92D20' : '#101828',
                                padding: 0
                              }}
                              title={isLimitReached ? `Max stock reached (${maxStock})` : `Max available: ${maxStock}`}
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQty(idx, 1)}
                              disabled={item.qty >= maxStock}
                              style={{
                                width: 26,
                                height: 26,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 6,
                                border: '1px solid #D0D5DD',
                                background: item.qty >= maxStock ? '#F2F4F7' : '#FFFFFF',
                                color: item.qty >= maxStock ? '#98A2B3' : '#344054',
                                cursor: item.qty >= maxStock ? 'not-allowed' : 'pointer',
                                transition: 'all 0.1s ease'
                              }}
                              title={item.qty >= maxStock ? 'Max available stock reached' : 'Increase quantity'}
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          {isLimitReached && (
                            <div style={{ fontSize: 10, color: '#D92D20', marginTop: 2, fontWeight: 600 }}>
                              Max: {maxStock}
                            </div>
                          )}
                        </td>

                        {/* 6. Unit */}
                        <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <select
                            value={item.isPack ? 'pack' : 'loose'}
                            onChange={(e) => setUnitMode(idx, e.target.value === 'pack')}
                            style={{
                              padding: '4px 6px',
                              fontSize: 11.5,
                              fontWeight: 500,
                              borderRadius: 6,
                              border: '1px solid #D0D5DD',
                              background: '#FFFFFF',
                              color: '#344054',
                              cursor: 'pointer',
                              maxWidth: 80
                            }}
                          >
                            <option value="loose">{item.medicine.dosage_form || 'Loose'}</option>
                            <option value="pack">Pack ({item.medicine.pack_size || 1})</option>
                          </select>
                        </td>

                        {/* 7. Price & Item Discount */}
                        <td style={{ padding: '8px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                          {editingPriceIdx === idx ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                              <input
                                type="number"
                                step="0.5"
                                min="0"
                                value={editPriceValue}
                                onChange={(e) => setEditPriceValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEditedPrice(idx);
                                  if (e.key === 'Escape') setEditingPriceIdx(null);
                                }}
                                style={{
                                  width: 66,
                                  height: 24,
                                  fontSize: 12,
                                  fontWeight: 600,
                                  padding: '1px 4px',
                                  border: '1px solid #0F766E',
                                  borderRadius: 4,
                                  textAlign: 'right',
                                  outline: 'none'
                                }}
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => saveEditedPrice(idx)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  background: '#0F766E',
                                  color: '#fff',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                title="Save price"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPriceIdx(null)}
                                style={{
                                  width: 22,
                                  height: 22,
                                  borderRadius: 4,
                                  background: '#F2F4F7',
                                  color: '#667085',
                                  border: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontWeight: 600, color: '#101828', fontSize: 13 }}>
                                {fmt(item.unitPrice)}
                              </span>
                              <button
                                type="button"
                                onClick={() => startEditingPrice(idx)}
                                title="Edit price (Permission-based)"
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  padding: 2,
                                  cursor: 'pointer',
                                  color: item.isPriceEdited ? '#0F766E' : '#98A2B3',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit2 size={12} />
                              </button>
                            </div>
                          )}
                          {item.isPriceEdited && (
                            <div style={{ fontSize: 10, color: '#0F766E', fontWeight: 600 }}>Custom price</div>
                          )}

                          {/* Item-level discount */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 }}>
                            <Tag size={10} style={{ color: '#98A2B3' }} />
                            <input
                              type="number"
                              min="0"
                              placeholder="Disc"
                              value={item.discount || ''}
                              onChange={(e) => updateItemDiscount(idx, e.target.value)}
                              title="Item-level discount in Rs"
                              style={{
                                width: 54,
                                height: 20,
                                fontSize: 11,
                                padding: '1px 4px',
                                borderRadius: 4,
                                border: '1px solid #D0D5DD',
                                textAlign: 'right'
                              }}
                            />
                          </div>
                        </td>

                        {/* 8. Total */}
                        <td style={{ padding: '8px 4px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, color: '#101828', fontSize: 13.5 }}>
                            {fmt(item.total)}
                          </div>
                          {item.discount > 0 && (
                            <div style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                              -{fmt(item.discount)}
                            </div>
                          )}
                        </td>

                        {/* 9. Action: Remove */}
                        <td style={{ padding: '8px 2px', textAlign: 'center', verticalAlign: 'middle' }}>
                          <button
                            type="button"
                            onClick={() => removeFromCart(idx)}
                            title="Remove medicine"
                            style={{
                              width: 28,
                              height: 28,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: 6,
                              border: '1px solid transparent',
                              background: 'transparent',
                              color: '#98A2B3',
                              cursor: 'pointer',
                              transition: 'all 0.1s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#D92D20';
                              e.currentTarget.style.background = '#FEE2E2';
                              e.currentTarget.style.borderColor = '#FECDCA';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#98A2B3';
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'transparent';
                            }}
                          >
                            <Trash2 size={14} />
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

        {/* Right: Customer & Checkout Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Customer Card */}
          <div className="card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #EAECF0', paddingBottom: 8 }}>
              <span style={{ fontWeight: 600, color: '#101828', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={14} style={{ color: '#0F766E' }} /> Customer Information
              </span>
              <span style={{ fontSize: 11, color: '#667085' }}>Optional</span>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: '#475467', fontWeight: 500 }}>Customer Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Walk-in Customer"
                className="input"
                style={{ width: '100%', height: 32, fontSize: 12.5, marginTop: 3 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: '#475467', fontWeight: 500 }}>Phone (for WhatsApp / SMS)</label>
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0300-1234567"
                className="input"
                style={{ width: '100%', height: 32, fontSize: 12.5, marginTop: 3 }}
              />
            </div>
          </div>

          {/* Totals & Quick Checkout Button */}
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: '#475467' }}>
                <span>Items Subtotal</span>
                <span style={{ fontWeight: 600, color: '#101828' }}>{fmt(itemsSubtotal)}</span>
              </div>

              {itemDiscountsTotal > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#DC2626' }}>
                  <span>Item Discounts</span>
                  <span style={{ fontWeight: 600 }}>-{fmt(itemDiscountsTotal)}</span>
                </div>
              )}

              {/* Overall Discount Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#475467' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Percent size={12} /> Overall Discount (%)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={overallDiscountPercent}
                    onChange={(e) => setOverallDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    style={{ width: 50, height: 26, textAlign: 'right', fontSize: 12, border: '1px solid #D0D5DD', borderRadius: 4, padding: '1px 4px' }}
                  />
                  <span style={{ color: '#DC2626', fontSize: 11.5, minWidth: 60, textAlign: 'right' }}>
                    -{fmt(overallDiscountAmount)}
                  </span>
                </div>
              </div>

              {/* Tax Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5, color: '#475467' }}>
                <span>Tax / GST (%)</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ width: 50, height: 26, textAlign: 'right', fontSize: 12, border: '1px solid #D0D5DD', borderRadius: 4, padding: '1px 4px' }}
                  />
                  <span style={{ color: '#0F766E', fontSize: 11.5, minWidth: 60, textAlign: 'right' }}>
                    +{fmt(taxAmount)}
                  </span>
                </div>
              </div>

              <div style={{ borderTop: '1px solid #EAECF0', margin: '4px 0', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>Grand Total</span>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>Rs</span>
                  <span className="pj" style={{ fontSize: 24, fontWeight: 800, color: '#0F766E', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    {Number(grandTotal).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div style={{ marginTop: 4 }}>
                <label style={{ fontSize: 11.5, color: '#475467', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  Payment Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                  {['cash', 'card', 'online', 'credit'].map((method) => {
                    const isSelected = paymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ height: 32, fontSize: 11.5, textTransform: 'capitalize' }}
                      >
                        {method === 'credit' ? 'Udhar / Credit' : method}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Complete Sale Action Button */}
            <button
              type="button"
              onClick={openCheckoutModal}
              disabled={cart.length === 0 || licenseInfo?.isReadOnly}
              className="btn btn-primary"
              style={{
                width: '100%',
                height: 42,
                fontSize: 14,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: licenseInfo?.isReadOnly ? '#DC2626' : '#0F766E',
                cursor: (cart.length === 0 || licenseInfo?.isReadOnly) ? 'not-allowed' : 'pointer',
                opacity: cart.length === 0 ? 0.6 : 1,
                boxShadow: licenseInfo?.isReadOnly ? 'none' : '0 1px 2px rgba(15,118,110,.2)'
              }}
            >
              <CheckCircle2 size={18} />
              {licenseInfo?.isReadOnly ? 'Subscription Expired (Locked)' : 'Complete Sale'}
              {!licenseInfo?.isReadOnly && <span style={{ marginLeft: 6, fontSize: 11, background: 'rgba(255,255,255,.2)', padding: '2px 6px', borderRadius: 4 }}>F2</span>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Batch Selection Modal ── */}
      {batchModalMed && (
        <div className="modal-backdrop">
          <div className="modal-content modal-md">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#101828' }}>
                Select Batch for {batchModalMed.medicine.name}
              </h3>
              <button
                onClick={() => setBatchModalMed(null)}
                style={{ background: 'transparent', border: 'none', color: '#667085', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#667085' }}>
                Active batches sorted by FEFO (earliest expiry first):
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                {availableBatches.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 0', color: '#98A2B3', fontSize: 13 }}>
                    No active batches available.
                  </div>
                ) : (
                  availableBatches.map((b) => {
                    const daysLeft = b.days_until_expiry ?? 0;
                    const isExpiringSoon = daysLeft <= 60;
                    const stock = b.available_quantity ?? b.current_stock ?? 0;
                    const price = b.selling_price || b.sale_price || batchModalMed.medicine.default_selling_price || 0;

                    return (
                      <div
                        key={b.id}
                        onClick={() => switchBatchForCartItem(b)}
                        style={{
                          padding: '12px 14px',
                          borderRadius: 8,
                          border: '1px solid #EAECF0',
                          background: '#FFFFFF',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0F766E'; e.currentTarget.style.background = '#F0FDFA'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#EAECF0'; e.currentTarget.style.background = '#FFFFFF'; }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#101828', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            Batch #{b.batch_number}
                            {isExpiringSoon && (
                              <span style={{ fontSize: 10.5, fontWeight: 600, background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4 }}>
                                Expiring Soon
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>
                            Expiry: <span style={{ fontWeight: 600, color: '#344054' }}>{b.expiry_date}</span> ({daysLeft} days left)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: '#0F766E', fontSize: 13 }}>{fmt(price)}</div>
                          <div style={{ fontSize: 11, color: '#475467', fontWeight: 600 }}>{stock} in stock</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Checkout Confirmation Modal ── */}
      {checkoutModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content modal-md">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#101828', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={18} style={{ color: '#0F766E' }} /> Confirm Payment &amp; Checkout
              </h3>
              <button
                onClick={() => setCheckoutModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#667085', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit} style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 8, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>Net Payable Amount</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#0F766E' }}>{fmt(grandTotal)}</span>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 4 }}>
                  Amount Received / Tendered (Rs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  autoFocus
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="input"
                  style={{ width: '100%', height: 42, fontSize: 18, fontWeight: 700, color: '#0F766E' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#667085', display: 'block' }}>Change Due</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#027A48' }}>{fmt(changeDue)}</span>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#667085', display: 'block' }}>Balance / Udhar</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: remainingDue > 0 ? '#B45309' : '#667085' }}>
                    {fmt(remainingDue)}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 500, color: '#475467', display: 'block', marginBottom: 4 }}>
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Doctor recommendation, specific dosage..."
                  className="input"
                  style={{ width: '100%', height: 34, fontSize: 12.5 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setCheckoutModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ flex: 1, height: 38, fontWeight: 600 }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, height: 38, fontWeight: 700 }}
                >
                  Confirm &amp; Print
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Receipt Modal & Print Preview ── */}
      {receiptData && (
        <div className="modal-backdrop">
          <div className="modal-content modal-md">
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#101828', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Printer size={18} style={{ color: '#0F766E' }} /> Thermal Receipt Preview
              </h3>
              <button
                onClick={() => setReceiptData(null)}
                style={{ background: 'transparent', border: 'none', color: '#667085', cursor: 'pointer', padding: 4 }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 18, maxHeight: '65vh', overflowY: 'auto' }}>
              <div
                id="receipt-print-area"
                style={{
                  background: '#FFFFFF',
                  color: '#000000',
                  padding: 16,
                  borderRadius: 6,
                  fontFamily: 'Courier New, monospace',
                  fontSize: 12,
                  lineHeight: 1.3,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: '1px solid #E5E7EB'
                }}
              >
                <div style={{ textAlign: 'center', paddingBottom: 8, borderBottom: '1px dashed #000' }}>
                  <div style={{ fontWeight: 800, fontSize: 15, textTransform: 'uppercase' }}>{pharmacySettings.name}</div>
                  <div style={{ fontSize: 10, marginTop: 2 }}>{pharmacySettings.address}</div>
                  <div style={{ fontSize: 10 }}>Ph: {pharmacySettings.phone} • {pharmacySettings.taxNumber}</div>
                </div>

                <div style={{ padding: '8px 0', borderBottom: '1px dashed #000', fontSize: 11, display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <div>Inv: <span style={{ fontWeight: 700 }}>{receiptData.invoice_number}</span></div>
                    <div>Date: {receiptData.date}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div>Cust: {receiptData.customer_name}</div>
                    <div>Pay: {receiptData.payment_method}</div>
                  </div>
                </div>

                <table style={{ width: '100%', margin: '8px 0', fontSize: 11, borderBottom: '1px dashed #000', paddingBottom: 6 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000' }}>
                      <th style={{ textAlign: 'left', padding: '3px 0' }}>Item</th>
                      <th style={{ textAlign: 'center', padding: '3px 0' }}>Qty</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>Price</th>
                      <th style={{ textAlign: 'right', padding: '3px 0' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.cartItems?.map((it, idx) => (
                      <tr key={idx}>
                        <td style={{ padding: '3px 0' }}>
                          <div>{it.medicine.name}</div>
                          <div style={{ fontSize: 9, color: '#4B5563' }}>B: {it.batch.batch_number} Exp: {it.batch.expiry_date}</div>
                        </td>
                        <td style={{ textAlign: 'center' }}>{it.qty}{it.isPack ? 'p' : ''}</td>
                        <td style={{ textAlign: 'right' }}>{Number(it.unitPrice).toFixed(0)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(it.total).toFixed(0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11, borderBottom: '1px dashed #000', paddingBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>Rs {Number(receiptData.subtotal).toFixed(2)}</span>
                  </div>
                  {receiptData.discount_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                      <span>Discount:</span>
                      <span>-Rs {Number(receiptData.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  {receiptData.tax_amount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4B5563' }}>
                      <span>Tax/GST:</span>
                      <span>+Rs {Number(receiptData.tax_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 13, paddingTop: 4, borderTop: '1px dashed #9CA3AF' }}>
                    <span>Net Total:</span>
                    <span>Rs {Number(receiptData.total_amount).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                    <span>Amount Paid:</span>
                    <span>Rs {Number(receiptData.amount_paid).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                    <span>Change Returned:</span>
                    <span>Rs {Number(receiptData.change_amount).toFixed(2)}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', paddingTop: 8, fontSize: 9, color: '#4B5563' }}>
                  <p>{pharmacySettings.receiptFooter}</p>
                  <p style={{ marginTop: 4, fontWeight: 700 }}>*** THANK YOU FOR VISITING ***</p>
                </div>
              </div>
            </div>

            <div style={{ padding: '12px 18px', borderTop: '1px solid #EAECF0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button
                onClick={() => setReceiptData(null)}
                className="btn btn-secondary"
                style={{ height: 34 }}
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                className="btn btn-primary"
                style={{ height: 34, gap: 6 }}
              >
                <Printer size={15} /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}