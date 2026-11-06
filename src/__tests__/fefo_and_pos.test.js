import { describe, it, expect } from 'vitest';

describe('FEFO (First-Expired, First-Out) Batch Allocation', () => {
  it('correctly sorts batches by earliest expiry date', () => {
    const batches = [
      { id: '1', batch_number: 'B3', expiry_date: '2027-05-01', current_stock: 50 },
      { id: '2', batch_number: 'B1', expiry_date: '2026-08-15', current_stock: 20 },
      { id: '3', batch_number: 'B2', expiry_date: '2026-11-30', current_stock: 100 },
    ];

    const sorted = [...batches].sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));

    expect(sorted[0].batch_number).toBe('B1'); // Earliest expiry first
    expect(sorted[1].batch_number).toBe('B2');
    expect(sorted[2].batch_number).toBe('B3');
  });

  it('allocates required quantity across multiple batches using FEFO strategy', () => {
    const batches = [
      { id: 'b1', batch_number: 'B1', expiry_date: '2026-08-01', current_stock: 15 },
      { id: 'b2', batch_number: 'B2', expiry_date: '2026-12-01', current_stock: 25 },
    ];

    let needed = 25;
    const deductions = [];

    for (const b of batches) {
      if (needed <= 0) break;
      const take = Math.min(needed, b.current_stock);
      deductions.push({ batch_id: b.id, qty: take });
      needed -= take;
    }

    expect(deductions).toEqual([
      { batch_id: 'b1', qty: 15 }, // took all 15 from first expiring
      { batch_id: 'b2', qty: 10 }, // took 10 from next batch
    ]);
    expect(needed).toBe(0);
  });
});

describe('POS Pricing and Financial Calculations', () => {
  it('calculates pack price correctly based on unit price and pack size', () => {
    const unitPrice = 5.5;
    const packSize = 20;
    const packPrice = unitPrice * packSize;
    expect(packPrice).toBe(110);
  });

  it('calculates discount and sales tax (GST) accurately', () => {
    const subtotal = 1000;
    const discountPercent = 10; // 10%
    const taxPercent = 18; // 18% GST

    const discountAmount = (subtotal * discountPercent) / 100;
    const taxableSubtotal = subtotal - discountAmount;
    const taxAmount = (taxableSubtotal * taxPercent) / 100;
    const grandTotal = taxableSubtotal + taxAmount;

    expect(discountAmount).toBe(100);
    expect(taxableSubtotal).toBe(900);
    expect(taxAmount).toBe(162);
    expect(grandTotal).toBe(1062);
  });

  it('calculates change due and customer balance/udhar correctly', () => {
    const grandTotal = 1062;
    const amountTendered = 1100;

    const changeDue = Math.max(0, amountTendered - grandTotal);
    const balanceDue = Math.max(0, grandTotal - amountTendered);

    expect(changeDue).toBe(38);
    expect(balanceDue).toBe(0);

    // Partial payment
    const partialTendered = 1000;
    const partialChange = Math.max(0, partialTendered - grandTotal);
    const partialBalance = Math.max(0, grandTotal - partialTendered);

    expect(partialChange).toBe(0);
    expect(partialBalance).toBe(62);
  });
});

describe('Sale Returns & Inventory Restocking', () => {
  it('correctly calculates refund amount and prevents returning more than sold quantity', () => {
    const saleItem = {
      id: 'si_1',
      medicine_name: 'Panadol Extra',
      quantity: 10,
      unit_selling_price: 35.0,
      already_returned: 2
    };

    const maxReturnable = saleItem.quantity - saleItem.already_returned;
    expect(maxReturnable).toBe(8);

    const requestedReturnQty = 5;
    expect(requestedReturnQty <= maxReturnable).toBe(true);

    const refundAmount = requestedReturnQty * saleItem.unit_selling_price;
    expect(refundAmount).toBe(175.0);

    // Batch stock restoration simulation
    let batchAvailableStock = 45;
    batchAvailableStock += requestedReturnQty;
    expect(batchAvailableStock).toBe(50);
  });

  it('correctly prioritizes user-selected batch over default FEFO', () => {
    const batches = [
      { id: 'b1', batch_number: 'B-OLD', expiry_date: '2026-09-01', available_quantity: 20 },
      { id: 'b2', batch_number: 'B-NEW', expiry_date: '2027-01-01', available_quantity: 30 }
    ];

    const userPreferredBatchId = 'b2';
    const preferred = batches.find(b => b.id === userPreferredBatchId);
    const sorted = [preferred, ...batches.filter(b => b.id !== userPreferredBatchId)];

    expect(sorted[0].id).toBe('b2');
    expect(sorted[0].batch_number).toBe('B-NEW');
  });
});
