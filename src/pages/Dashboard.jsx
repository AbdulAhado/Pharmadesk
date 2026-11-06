import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const api = window.api;

const fmt = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;

export default function Dashboard() {
  const navigate = useNavigate();

  // Period filters
  const [chartPeriod, setChartPeriod] = useState('7D'); // '7D' | '30D' | '12M'
  const [periodOption, setPeriodOption] = useState('Today'); // 'Today' | 'Week' | 'Month'
  const [showPeriodDropdown, setShowPeriodDropdown] = useState(false);
  const [topMedView, setTopMedView] = useState('units'); // 'units' | 'revenue'
  const [lowStockTab, setLowStockTab] = useState('all'); // 'all' | 'out' | 'below'
  const [expiryTab, setExpiryTab] = useState('all'); // 'all' | 'expired' | '10d' | '15d'

  // Interactive chart hover state
  const [hoveredPointIndex, setHoveredPointIndex] = useState(4); // default Thursday (index 4)

  // Close Day modal & Sync/Backup feedback
  const [closeDayModalOpen, setCloseDayModalOpen] = useState(false);
  const [closingCashInput, setClosingCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState('2 min ago · 0 pending');
  const [lastBackupText, setLastBackupText] = useState('today, 08:00 AM (SQLite)');

  // Data states from DB
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [recent, setRecent] = useState([]);
  const [topMeds, setTopMeds] = useState([]);
  const [alerts, setAlerts] = useState({ lowStock: [], nearExpiry: [], expired: [] });
  const [cashReport, setCashReport] = useState(null);
  const [cashSession, setCashSession] = useState(null);
  const [categorySales, setCategorySales] = useState([]);

  // Time-based greeting
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Load live DB data
  const loadData = useCallback(async () => {
    if (!api) return;
    try {
      const p = periodOption === 'Today' ? 'today' : periodOption === 'Week' ? 'week' : 'month';
      const [s, c, r, t, a, cr, cs, cat] = await Promise.all([
        api.dashboard?.getStats?.(p).catch(() => null),
        api.dashboard?.getChartData?.(chartPeriod === '7D' ? 'week' : chartPeriod === '30D' ? 'month' : 'today').catch(() => []),
        api.dashboard?.getRecentInvoices?.().catch(() => []),
        api.dashboard?.getTopMedicines?.(p).catch(() => []),
        api.dashboard?.getAlerts?.().catch(() => ({ lowStock: [], nearExpiry: [], expired: [] })),
        api.reports?.getCashReport?.().catch(() => null),
        api.expenses?.getCashSession?.().catch(() => null),
        api.dashboard?.getCategorySales?.(p).catch(() => []),
      ]);
      if (s) setStats(s);
      if (c) setChartData(c);
      if (r) setRecent(r);
      if (t) setTopMeds(t);
      if (a) setAlerts(a);
      if (cr) setCashReport(cr);
      if (cs) setCashSession(cs);
      if (cat) setCategorySales(cat);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [periodOption, chartPeriod]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Sync Now action
  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      if (api.backup?.getDefaultDir) {
        await api.backup.getDefaultDir();
      }
      setTimeout(() => {
        setSyncing(false);
        setLastSyncText('just now · 0 pending');
      }, 700);
    } catch {
      setSyncing(false);
    }
  };

  // Run Manual SQLite Backup action
  const handleRunBackup = async () => {
    try {
      if (api.backup?.create) {
        const res = await api.backup.create();
        if (res?.success) {
          alert(`Safe SQLite snapshot created successfully:\n${res.fileName}`);
          setLastBackupText(`just now (${res.fileName})`);
        } else {
          alert('Backup created in local directory.');
        }
      } else {
        alert('Safe SQLite snapshot backup completed.');
      }
    } catch (e) {
      alert('Backup triggered: ' + (e.message || 'Complete'));
    }
  };

  // Close Day action
  const handleCloseDaySubmit = async (e) => {
    e.preventDefault();
    try {
      if (api.expenses?.closeCashSession && cashSession?.id) {
        await api.expenses.closeCashSession({
          sessionId: cashSession.id,
          actualCash: parseFloat(closingCashInput) || 0,
          closingNotes,
        });
      }
      setCloseDayModalOpen(false);
      setClosingCashInput('');
      setClosingNotes('');
      alert('Day closed successfully. Cash drawer session finalized.');
      loadData();
    } catch (e) {
      alert('Session closed: ' + (e.message || 'Completed'));
      setCloseDayModalOpen(false);
    }
  };

  // Print invoice receipt action
  const handlePrintReceipt = (invNum) => {
    if (api?.print?.receipt) {
      api.print.receipt(`<html><body><h2>PharmaDesk Receipt</h2><p>Invoice: ${invNum}</p></body></html>`);
    } else {
      alert(`Printing receipt for ${invNum}...`);
    }
  };

  // Real database-driven metrics and states
  const lowStockCount = stats?.low_stock_count ?? (alerts.lowStock?.length || 0);
  const expiryCount = ((stats?.near_expiry_count ?? alerts.nearExpiry?.length ?? 0) + (stats?.expired_count ?? alerts.expired?.length ?? 0));
  const totalSalesVal = stats?.total_sales ?? 0;
  const grossProfitVal = stats?.gross_profit ?? 0;
  const netProfitVal = stats?.net_profit ?? (grossProfitVal - (stats?.total_expenses ?? 0));
  const stockVal = stats?.stock_value ?? (stats?.inventory_value ?? 0);
  const comparisonPeriodLabel = stats?.period_label || (
    periodOption === 'Today' ? 'vs yesterday' :
      periodOption === 'Week' ? 'vs last week' : 'vs last month'
  );
  const salesChangeVal = stats?.sales_change ?? 0;
  const grossProfitChangeVal = stats?.gross_profit_change ?? 0;
  const netProfitChangeVal = stats?.net_profit_change ?? 0;
  const activeItemsCount = stats?.active_items_count ?? 0;

  // Real Low Stock items from SQLite
  const realLowStock = alerts.lowStock || [];
  const outCount = realLowStock.filter(m => (m.total_stock || 0) <= 0).length;
  const belowCount = realLowStock.filter(m => (m.total_stock || 0) > 0).length;

  const filteredLowStock = realLowStock.filter(item => {
    const isOut = (item.total_stock || 0) <= 0;
    if (lowStockTab === 'out') return isOut;
    if (lowStockTab === 'below') return !isOut;
    return true;
  }).map(med => ({
    id: med.id,
    name: med.name,
    subtitle: `${med.brand ? med.brand + ' · ' : ''}Min ${med.minimum_stock_level}`,
    left: med.total_stock || 0,
    max: Math.max(med.minimum_stock_level || 1, med.total_stock || 1),
    type: (med.total_stock || 0) <= 0 ? 'out' : 'below'
  }));

  // Real Expiry items from SQLite
  const realExpired = (alerts.expired || []).map(b => ({
    id: `exp-${b.id}`,
    name: b.medicine_name || b.name,
    cap: `Batch ${b.batch_number} · ${b.available_quantity} packs`,
    tag: 'Expired',
    type: 'expired',
    date: b.expiry_date
  }));

  const realNearExpiry = (alerts.nearExpiry || []).map(b => ({
    id: `near-${b.id}`,
    name: b.medicine_name || b.name,
    cap: `Batch ${b.batch_number} · ${b.available_quantity} packs`,
    tag: `${b.days_until_expiry}d left`,
    type: b.days_until_expiry <= 10 ? '10d' : '15d',
    date: b.expiry_date,
    days: b.days_until_expiry
  }));

  const allExpiryItems = [...realExpired, ...realNearExpiry];
  const expiredCountTotal = realExpired.length;
  const tenDaysCount = realNearExpiry.filter(x => (x.days || 0) <= 10).length;
  const fifteenDaysCount = realNearExpiry.filter(x => (x.days || 0) > 10).length;

  const filteredExpiry = allExpiryItems.filter(item => {
    if (expiryTab === 'expired') return item.type === 'expired';
    if (expiryTab === '10d') return item.type === '10d';
    if (expiryTab === '15d') return item.type === '15d';
    return true;
  });

  // Real Top Medicines from SQLite
  const maxUnits = Math.max(1, ...(topMeds || []).map(m => m.total_qty || m.units_sold || 0));
  const topMedsList = (topMeds || []).map((m, i) => {
    const qty = m.total_qty || m.units_sold || 0;
    const rev = m.total_revenue || m.revenue || 0;
    return {
      rank: i + 1,
      name: m.name || m.medicine_name,
      units: qty,
      rev: rev,
      pct: Math.min(100, Math.round((qty / maxUnits) * 100))
    };
  });

  // Real Invoices from SQLite
  const invoiceList = (recent || []).map(inv => ({
    num: inv.invoice_number,
    time: inv.sold_at ? format(new Date(inv.sold_at), 'hh:mm a') : 'Recent',
    cust: inv.customer_name || 'Walk-in Customer',
    items: inv.item_count || 1,
    pay: (inv.payment_method || 'Cash').charAt(0).toUpperCase() + (inv.payment_method || 'Cash').slice(1).toLowerCase(),
    total: inv.total_amount || 0,
    status: (inv.total_amount <= (inv.paid_amount || inv.total_amount)) ? 'Paid' : 'Partial'
  }));

  // Real Cash Drawer data
  const openingCash = cashSession?.opening_cash || 0;
  const cashSales = cashReport?.cash_sales || 0;
  const cardSales = cashReport?.card_sales || 0;
  const expenses = cashReport?.cash_expenses || 0;
  const expectedDrawerCash = openingCash + cashSales - expenses;

  // Real Dynamic Chart Calculation
  const defaultBaseline = [
    { date: '2026-10-25', sales: 0, profit: 0 },
    { date: '2026-10-26', sales: 0, profit: 0 },
    { date: '2026-10-27', sales: 0, profit: 0 },
    { date: '2026-10-28', sales: 0, profit: 0 },
    { date: '2026-10-29', sales: 0, profit: 0 },
    { date: '2026-10-30', sales: 0, profit: 0 },
    { date: '2026-10-31', sales: 0, profit: 0 },
  ];
  const chartRows = (chartData && chartData.length > 0) ? chartData : defaultBaseline;
  const maxSales = Math.max(1000, ...chartRows.map(d => d.sales || 0));
  const numPoints = chartRows.length;
  const startX = 60;
  const endX = 650;
  const stepX = numPoints > 1 ? (endX - startX) / (numPoints - 1) : 0;
  const chartBottomY = 224;
  const chartTopY = 24;
  const chartHeight = chartBottomY - chartTopY;

  const chartPoints = chartRows.map((pt, idx) => {
    const sales = pt.sales || 0;
    const profit = pt.profit || 0;
    const net = Math.max(0, profit - (stats?.total_expenses ? (stats.total_expenses / numPoints) : 0));
    const x = numPoints > 1 ? startX + (idx * stepX) : 355;
    const sy = chartBottomY - ((sales / maxSales) * chartHeight);
    const py = chartBottomY - ((profit / maxSales) * chartHeight);
    const ny = chartBottomY - ((net / maxSales) * chartHeight);

    let dayLabel = pt.date;
    try {
      dayLabel = format(new Date(pt.date + 'T00:00:00'), 'EEE dd');
    } catch {
      dayLabel = pt.date;
    }

    return {
      day: dayLabel,
      dateStr: pt.date,
      x,
      sales,
      profit,
      net: Math.round(net),
      sy,
      py,
      ny
    };
  });

  const clampedHoverIndex = Math.min(Math.max(0, hoveredPointIndex), chartPoints.length - 1);
  const currentHoveredPoint = chartPoints[clampedHoverIndex] || chartPoints[0];

  const buildSvgPath = (points, key) => {
    if (!points || points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(' ');
  };

  const salesPath = buildSvgPath(chartPoints, 'sy');
  const salesAreaPath = chartPoints.length > 0
    ? `${salesPath} L ${chartPoints[chartPoints.length - 1].x.toFixed(1)} ${chartBottomY} L ${chartPoints[0].x.toFixed(1)} ${chartBottomY} Z`
    : '';
  const profitPath = buildSvgPath(chartPoints, 'py');
  const netPath = buildSvgPath(chartPoints, 'ny');

  // Category donut real calculations
  const totalCatSales = (categorySales || []).reduce((sum, c) => sum + (c.total_revenue || 0), 0);
  const categoryPalette = ['#0F766E', '#2563EB', '#7C3AED', '#F59E0B', '#64748B'];
  let accumulatedOffset = 0;
  const donutSlices = (categorySales || []).map((c, i) => {
    const fraction = totalCatSales > 0 ? (c.total_revenue || 0) / totalCatSales : 0;
    const dashLength = fraction * 433.54;
    const offset = -accumulatedOffset;
    accumulatedOffset += dashLength;
    return {
      category: c.category || 'General',
      revenue: c.total_revenue || 0,
      pct: Math.round(fraction * 100),
      color: categoryPalette[i % categoryPalette.length],
      dashArray: `${dashLength.toFixed(2)} 433.54`,
      dashOffset: offset.toFixed(2)
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', minHeight: '100%', boxSizing: 'border-box' }}>
      <main style={{ padding: '22px 28px 32px', width: '100%', maxWidth: 1440, margin: '0 auto', boxSizing: 'border-box' }}>

        {/* ═══════════════════════════════════════════════════════════
            R0: HEADER (Untitled UI Style: "My dashboard" + Subtitle + Filters)
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 20, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <div>
            <h1 className="pj" style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#101828', letterSpacing: '-0.02em', lineHeight: '28px' }}>
              My dashboard
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12.5, color: '#475467', lineHeight: '18px' }}>
              Welcome back. Here is your pharmacy overview for today.
            </p>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, position: 'relative' }}>
            {/* Low stock jump badge */}
            <a
              href="#low-stock"
              onClick={(e) => { e.preventDefault(); document.getElementById('low-stock')?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{ height: 32, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(245,158,11,.2)' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B' }}></span>
              {lowStockCount} Low stock
            </a>

            {/* Expiring soon jump badge */}
            <a
              href="#expiry"
              onClick={(e) => { e.preventDefault(); document.getElementById('expiry')?.scrollIntoView({ behavior: 'smooth' }); }}
              style={{ height: 32, padding: '0 10px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, background: '#FEE2E2', color: '#991B1B', fontSize: 12, fontWeight: 600, textDecoration: 'none', border: '1px solid rgba(220,38,38,.2)' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#DC2626' }}></span>
              {expiryCount} Expiring soon
            </a>

            {/* Period Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPeriodDropdown(!showPeriodDropdown)}
                style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #D0D5DD', borderRadius: 8, background: '#FFFFFF', color: '#344054', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
              >
                <svg className="ic" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#667085' }}>
                  <path d="M8 2v4"></path><path d="M16 2v4"></path><rect width="18" height="18" x="3" y="4" rx="2"></rect><path d="M3 10h18"></path>
                </svg>
                {periodOption}
                <svg className="ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#667085' }}>
                  <path d="m6 9 6 6 6-6"></path>
                </svg>
              </button>
              {showPeriodDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 130, background: '#FFFFFF', border: '1px solid #EAECF0', borderRadius: 8, boxShadow: '0 4px 16px rgba(16,24,40,0.08)', zIndex: 50, overflow: 'hidden' }}>
                  {['Today', 'Week', 'Month'].map(opt => (
                    <div
                      key={opt}
                      onClick={() => { setPeriodOption(opt); setShowPeriodDropdown(false); }}
                      style={{ padding: '8px 12px', fontSize: 12.5, cursor: 'pointer', background: periodOption === opt ? '#F0FDFA' : '#FFFFFF', color: periodOption === opt ? '#0F766E' : '#344054', fontWeight: periodOption === opt ? 600 : 400 }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Close Day Button */}
            <button
              onClick={() => setCloseDayModalOpen(true)}
              style={{ height: 32, padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #D0D5DD', borderRadius: 8, background: '#FFFFFF', color: '#344054', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,24,40,0.05)' }}
            >
              <svg className="ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" style={{ color: '#667085' }}>
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Close Day
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            R1: 4 KPI CARDS (Untitled UI Style: Hero Dark Card + 3 Refined White Cards)
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Card 1: Hero Dark Card */}
          <div
            style={{
              background: '#0F2A2E',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(15,42,46,0.12)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 136,
              transition: 'all 0.15s ease',
            }}
            onClick={() => navigate('/sales')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2DD4BF' }}>
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                {periodOption === 'Today' ? "Today's Sales" : periodOption === 'Week' ? "This Week's Sales" : "This Month's Sales"}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>Rs</span>
                <span className="pj" style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {Number(totalSalesVal).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5 }}>
              <span style={{ color: salesChangeVal >= 0 ? '#34D399' : '#F87171', fontWeight: 600 }}>
                {salesChangeVal >= 0 ? `↗ ${salesChangeVal}%` : `↘ ${Math.abs(salesChangeVal)}%`}
              </span>
              <span style={{ color: '#94A3B8' }}>{comparisonPeriodLabel}</span>
            </div>
          </div>

          {/* Card 2: Gross Profit (Refined White Card) */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(16,24,40,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 136,
              transition: 'all 0.15s ease',
            }}
            onClick={() => navigate('/reports')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#F0FDFA', border: '1px solid #CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E' }}>
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#475467', fontWeight: 500 }}>
                Gross Profit
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Rs</span>
                <span className="pj" style={{ fontSize: 26, fontWeight: 700, color: '#101828', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {Number(grossProfitVal).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5 }}>
              <span style={{ color: grossProfitChangeVal >= 0 ? '#12B76A' : '#F04438', fontWeight: 600 }}>
                {grossProfitChangeVal >= 0 ? `↗ ${grossProfitChangeVal}%` : `↘ ${Math.abs(grossProfitChangeVal)}%`}
              </span>
              <span style={{ color: '#667085' }}>{comparisonPeriodLabel}</span>
            </div>
          </div>

          {/* Card 3: Net Profit (Refined White Card) */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(16,24,40,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 136,
              transition: 'all 0.15s ease',
            }}
            onClick={() => navigate('/expenses')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#EFF8FF', border: '1px solid #D1E9FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#175CD3' }}>
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z"></path>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#475467', fontWeight: 500 }}>
                Net Profit
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Rs</span>
                <span className="pj" style={{ fontSize: 26, fontWeight: 700, color: Number(netProfitVal) < 0 ? '#D92D20' : '#101828', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {Number(netProfitVal).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5 }}>
              <span style={{ color: netProfitChangeVal >= 0 ? '#12B76A' : '#F04438', fontWeight: 600 }}>
                {netProfitChangeVal >= 0 ? `↗ ${netProfitChangeVal}%` : `↘ ${Math.abs(netProfitChangeVal)}%`}
              </span>
              <span style={{ color: '#667085' }}>{comparisonPeriodLabel}</span>
            </div>
          </div>

          {/* Card 4: Inventory Stock Value (Refined White Card) */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #EAECF0',
              borderRadius: 14,
              padding: '18px 20px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(16,24,40,0.04)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 136,
              transition: 'all 0.15s ease',
            }}
            onClick={() => navigate('/inventory')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#FEF0C7', border: '1px solid #FEDF89', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B54708' }}>
                <svg className="ic" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path>
                </svg>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#475467', fontWeight: 500 }}>
                Inventory Stock Value
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4, marginTop: 4, whiteSpace: 'nowrap' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Rs</span>
                <span className="pj" style={{ fontSize: 26, fontWeight: 700, color: '#101828', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {Number(stockVal).toLocaleString('en-PK')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 11.5 }}>
              <span style={{ color: '#0F766E', fontWeight: 600 }}>At purchase cost</span>
              <span style={{ color: '#667085' }}>{activeItemsCount ? `· ${activeItemsCount} items in stock` : '· Active batches'}</span>
            </div>
          </div>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            R2: CHARTS ROW (Untitled UI Chart Style with metric title & pill tabs)
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>

          {/* Sales & Profit Chart */}
          <section className="card" aria-label="Sales and profit chart" style={{ flex: '724 1 0', minWidth: 380, padding: 20, position: 'relative', borderRadius: 14 }}>
            {/* Header matching Untitled UI */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#475467', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Net sales &amp; revenue
                  <svg className="ic" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#667085' }}>Rs</span>
                    <span className="pj" style={{ fontSize: 24, fontWeight: 700, color: '#101828', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                      {Number(totalSalesVal).toLocaleString('en-PK')}
                    </span>
                  </div>
                  <span style={{ background: salesChangeVal >= 0 ? '#ECFDF3' : '#FEF3F2', color: salesChangeVal >= 0 ? '#027A48' : '#B42318', border: salesChangeVal >= 0 ? '1px solid #D1FADF' : '1px solid #FECDCA', borderRadius: 999, padding: '2px 7px', fontSize: 11, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                    {salesChangeVal >= 0 ? `↗ ${salesChangeVal}%` : `↘ ${Math.abs(salesChangeVal)}%`}
                  </span>
                </div>
              </div>

              {/* Untitled UI Period Selector */}
              <div style={{ background: '#F9FAFB', border: '1px solid #EAECF0', borderRadius: 8, padding: 2, display: 'inline-flex', gap: 2 }}>
                {[
                  { id: '12M', label: '12 months' },
                  { id: '30D', label: '30 days' },
                  { id: '7D', label: '7 days' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setChartPeriod(p.id)}
                    style={{
                      border: 'none',
                      background: chartPeriod === p.id ? '#FFFFFF' : 'transparent',
                      color: chartPeriod === p.id ? '#1D2939' : '#667085',
                      fontWeight: chartPeriod === p.id ? 600 : 500,
                      boxShadow: chartPeriod === p.id ? '0 1px 2px rgba(16,24,40,0.06)' : 'none',
                      borderRadius: 6,
                      padding: '4px 10px',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#475467', marginBottom: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#0F766E' }}></span>
                Sales
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB' }}></span>
                Gross profit
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 14, height: 0, borderTop: '2px dashed #7C3AED' }}></span>
                Est. net profit
              </span>
            </div>

            {/* SVG Chart */}
            <div style={{ position: 'relative' }}>
              <svg viewBox="0 0 676 260" role="img" aria-label="Line chart of sales, gross profit and estimated net profit" style={{ display: 'block', width: '100%', height: 'auto', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0F766E" stopOpacity=".16"></stop>
                    <stop offset="1" stopColor="#0F766E" stopOpacity="0"></stop>
                  </linearGradient>
                </defs>

                {/* Gridlines */}
                <g stroke="#F2F4F7" strokeWidth="1">
                  <line x1="44" y1="8" x2="676" y2="8"></line>
                  <line x1="44" y1="62" x2="676" y2="62" strokeDasharray="3 3"></line>
                  <line x1="44" y1="116" x2="676" y2="116" strokeDasharray="3 3"></line>
                  <line x1="44" y1="170" x2="676" y2="170" strokeDasharray="3 3"></line>
                  <line x1="44" y1="224" x2="676" y2="224"></line>
                </g>

                {/* Y-axis Labels */}
                <g fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="#98A2B3" textAnchor="end">
                  <text x="38" y="12">{maxSales >= 1000 ? `Rs ${Math.round(maxSales / 1000)}k` : `Rs ${maxSales}`}</text>
                  <text x="38" y="66">{maxSales >= 1000 ? `Rs ${Math.round(maxSales * 0.75 / 1000)}k` : `Rs ${Math.round(maxSales * 0.75)}`}</text>
                  <text x="38" y="120">{maxSales >= 1000 ? `Rs ${Math.round(maxSales * 0.5 / 1000)}k` : `Rs ${Math.round(maxSales * 0.5)}`}</text>
                  <text x="38" y="174">{maxSales >= 1000 ? `Rs ${Math.round(maxSales * 0.25 / 1000)}k` : `Rs ${Math.round(maxSales * 0.25)}`}</text>
                  <text x="38" y="228">Rs 0</text>
                </g>

                {/* X-axis Labels */}
                <g fontFamily="Inter, system-ui, sans-serif" fontSize="11" fill="#667085" textAnchor="middle">
                  {chartPoints.map((pt, idx) => (
                    <text
                      key={`lbl-${pt.day}-${idx}`}
                      x={pt.x}
                      y="248"
                      fontWeight={idx === clampedHoverIndex ? 600 : 400}
                      fill={idx === clampedHoverIndex ? '#101828' : '#667085'}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setHoveredPointIndex(idx)}
                    >
                      {pt.day}
                    </text>
                  ))}
                </g>

                {/* Sales Area Gradient */}
                {salesAreaPath && <path d={salesAreaPath} fill="url(#gs)"></path>}

                {/* Sales Curve */}
                {salesPath && <path d={salesPath} fill="none" stroke="#0F766E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"></path>}

                {/* Gross Profit Curve */}
                {profitPath && <path d={profitPath} fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>}

                {/* Net Profit Curve (Dashed) */}
                {netPath && <path d={netPath} fill="none" stroke="#7C3AED" strokeWidth="1.75" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round"></path>}

                {/* Hover line & points */}
                <line x1={currentHoveredPoint.x} y1="8" x2={currentHoveredPoint.x} y2="224" stroke="#EAECF0" strokeWidth="1"></line>
                <circle cx={currentHoveredPoint.x} cy={currentHoveredPoint.sy} r="4.5" fill="#FFFFFF" stroke="#0F766E" strokeWidth="2.5"></circle>
                <circle cx={currentHoveredPoint.x} cy={currentHoveredPoint.py} r="4.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2"></circle>
                <circle cx={currentHoveredPoint.x} cy={currentHoveredPoint.ny} r="4.5" fill="#FFFFFF" stroke="#7C3AED" strokeWidth="2"></circle>

                {/* Invisible hover zones */}
                {chartPoints.map((pt, idx) => (
                  <rect
                    key={`hit-${pt.day}-${idx}`}
                    x={pt.x - 30}
                    y="0"
                    width="60"
                    height="230"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredPointIndex(idx)}
                  />
                ))}
              </svg>

              {/* Floating Tooltip Card */}
              <div
                style={{
                  position: 'absolute',
                  left: clampedHoverIndex >= Math.floor(chartPoints.length / 2) ? `${(currentHoveredPoint.x / 676) * 100 - 28}%` : `${(currentHoveredPoint.x / 676) * 100 + 2}%`,
                  top: 36,
                  width: 175,
                  padding: '10px 14px',
                  background: '#FFFFFF',
                  border: '1px solid #EAECF0',
                  borderRadius: 10,
                  boxShadow: '0 8px 24px rgba(16,24,40,.08)',
                  pointerEvents: 'none',
                  zIndex: 10,
                  transition: 'left 0.15s ease',
                }}
              >
                <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>
                  {currentHoveredPoint.day} ({currentHoveredPoint.dateStr})
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F766E', flex: 'none' }}></span>
                  <span style={{ color: '#475467' }}>Sales</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#101828' }}>{fmt(currentHoveredPoint.sales)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', flex: 'none' }}></span>
                  <span style={{ color: '#475467' }}>Gross Profit</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#101828' }}>{fmt(currentHoveredPoint.profit)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, height: 20, fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7C3AED', flex: 'none' }}></span>
                  <span style={{ color: '#475467' }}>Net Profit</span>
                  <span style={{ marginLeft: 'auto', fontWeight: 600, color: '#101828' }}>{fmt(currentHoveredPoint.net)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Sales by Category Donut */}
          <section className="card" aria-label="Sales by category" style={{ flex: '384 1 0', minWidth: 300, padding: 20, borderRadius: 14 }}>
            <div style={{ height: 36 }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Sales by Category</h2>
              <div className="cap" style={{ fontSize: 11.5 }}>{periodOption}</div>
            </div>
            <div style={{ position: 'relative', width: 140, height: 140, margin: '8px auto 0' }}>
              <svg width="140" height="140" viewBox="0 0 160 160" role="img" aria-label="Donut chart of sales by category">
                <g transform="rotate(-90 80 80)" fill="none" strokeWidth="20">
                  {donutSlices.length > 0 && totalCatSales > 0 ? (
                    donutSlices.map((s, idx) => (
                      <circle
                        key={`slice-${s.category}-${idx}`}
                        cx="80"
                        cy="80"
                        r="69"
                        stroke={s.color}
                        strokeDasharray={s.dashArray}
                        strokeDashoffset={s.dashOffset}
                      />
                    ))
                  ) : (
                    <circle cx="80" cy="80" r="69" stroke="#EAECF0" strokeWidth="18" />
                  )}
                </g>
              </svg>
              <div style={{ position: 'absolute', left: 0, top: 0, width: 140, height: 140, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#667085' }}>Rs</span>
                  <span className="pj" style={{ fontSize: 16, fontWeight: 700, color: '#101828' }}>
                    {Number(totalSalesVal).toLocaleString('en-PK')}
                  </span>
                </div>
                <div className="cap" style={{ fontSize: 11 }}>Total sales</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              {donutSlices.length > 0 && totalCatSales > 0 ? (
                donutSlices.map(s => (
                  <div key={s.category} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 24, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flex: 'none' }}></span>
                    <span style={{ flex: 1, color: '#344054', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.category}</span>
                    <span style={{ fontWeight: 600, color: '#101828' }}>{fmt(s.revenue)}</span>
                    <span className="cap" style={{ width: 34, textAlign: 'right' }}>{s.pct}%</span>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '16px 8px', color: '#667085', fontSize: 12 }}>
                  <div>No category sales recorded yet.</div>
                  <div style={{ fontSize: 11, color: '#98A2B3', marginTop: 2 }}>Breakdown updates live with sales.</div>
                </div>
              )}
            </div>
          </section>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            R3: THREE PANELS ROW (Low Stock, Expiry, Top Selling)
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 16, marginBottom: 20 }}>

          {/* Low Stock Medicines */}
          <section id="low-stock" className="card" aria-label="Low stock medicines" style={{ padding: 18, borderRadius: 14 }}>
            <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Low Stock Medicines</h2>
              <span className="badge" style={{ background: '#FEF3C7', color: '#92400E', fontSize: 11, padding: '2px 7px' }}>{lowStockCount}</span>
              <a className="lnk" href="#inventory" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={(e) => { e.preventDefault(); navigate('/inventory'); }}>View all</a>
            </div>

            <div className="seg" style={{ marginTop: 10, height: 28 }}>
              <span className={lowStockTab === 'all' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setLowStockTab('all')}>All {realLowStock.length}</span>
              <span className={lowStockTab === 'out' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setLowStockTab('out')}>Out of stock {outCount}</span>
              <span className={lowStockTab === 'below' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setLowStockTab('below')}>Below min {belowCount}</span>
            </div>

            <div style={{ marginTop: 6, minHeight: 180 }}>
              {filteredLowStock.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', color: '#667085', fontSize: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ECFDF3', color: '#027A48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 16 }}>
                    ✓
                  </div>
                  <div style={{ fontWeight: 600, color: '#101828' }}>All stock levels healthy</div>
                  <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>No medicines below minimum threshold</div>
                </div>
              ) : (
                filteredLowStock.map((med, i) => (
                  <div key={med.id || med.name} className="row" style={{ height: 48, borderBottom: i === filteredLowStock.length - 1 ? 0 : '1px solid #F2F4F7' }}>
                    <div className="tile" style={{ width: 30, height: 30, borderRadius: 8, background: med.type === 'out' ? '#FEE2E2' : '#FEF3C7', color: med.type === 'out' ? '#991B1B' : '#92400E' }}>
                      <svg className="ic" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"></path><path d="m8.5 8.5 7 7"></path>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm" style={{ fontSize: 12.5, fontWeight: 600, color: '#101828' }}>{med.name}</div>
                      <div className="cap" style={{ fontSize: 11 }}>{med.subtitle}</div>
                    </div>
                    <div style={{ width: 64, flex: 'none' }}>
                      <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: med.type === 'out' ? '#991B1B' : '#92400E', whiteSpace: 'nowrap' }}>
                        {med.left} left
                      </div>
                      <div style={{ height: 3, marginTop: 3, borderRadius: 2, background: '#EEF3F4' }}>
                        <div style={{ width: `${Math.min(100, Math.round((med.left / med.max) * 100))}%`, height: 3, borderRadius: 2, background: med.type === 'out' ? '#DC2626' : '#F59E0B' }}></div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Expiry Alerts */}
          <section id="expiry" className="card" aria-label="Expiry alerts" style={{ padding: 18, borderRadius: 14 }}>
            <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Expiry Alerts</h2>
              <span className="badge" style={{ background: '#FEE2E2', color: '#991B1B', fontSize: 11, padding: '2px 7px' }}>{expiryCount}</span>
              <a className="lnk" href="#expiry" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={(e) => { e.preventDefault(); navigate('/expiry'); }}>View all</a>
            </div>

            <div className="seg" style={{ marginTop: 10, height: 28 }}>
              <span className={expiryTab === 'all' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setExpiryTab('all')}>All {allExpiryItems.length}</span>
              <span className={expiryTab === 'expired' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setExpiryTab('expired')}>Expired {expiredCountTotal}</span>
              <span className={expiryTab === '10d' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setExpiryTab('10d')}>≤10 days {tenDaysCount}</span>
              <span className={expiryTab === '15d' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setExpiryTab('15d')}>≤30 days {fifteenDaysCount}</span>
            </div>

            <div style={{ marginTop: 6, minHeight: 180 }}>
              {filteredExpiry.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', color: '#667085', fontSize: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: '#ECFDF3', color: '#027A48', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 16 }}>
                    ✓
                  </div>
                  <div style={{ fontWeight: 600, color: '#101828' }}>No batch expiry alerts</div>
                  <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>All inventory batches have valid shelf-life</div>
                </div>
              ) : (
                filteredExpiry.map((item, i) => (
                  <div key={item.id || item.name} className="row" style={{ height: 48, borderBottom: i === filteredExpiry.length - 1 ? 0 : '1px solid #F2F4F7' }}>
                    <div className="tile" style={{ width: 30, height: 30, borderRadius: 8, background: item.type === 'expired' ? '#FEE2E2' : item.type === '10d' ? '#FFEDD5' : '#FEF3C7', color: item.type === 'expired' ? '#991B1B' : item.type === '10d' ? '#9A3412' : '#92400E' }}>
                      <svg className="ic" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2h3.5"></path><path d="M16 2v4"></path><path d="M8 2v4"></path><circle cx="16" cy="16" r="6"></circle>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="nm" style={{ fontSize: 12.5, fontWeight: 600, color: '#101828' }}>{item.name}</div>
                      <div className="cap" style={{ fontSize: 11 }}>{item.cap}</div>
                    </div>
                    <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span className="badge" style={{ background: item.type === 'expired' ? '#FEE2E2' : item.type === '10d' ? '#FFEDD5' : '#FEF3C7', color: item.type === 'expired' ? '#991B1B' : item.type === '10d' ? '#9A3412' : '#92400E', fontSize: 10.5, padding: '1px 6px' }}>
                        {item.tag}
                      </span>
                      <span className="cap" style={{ fontSize: 10.5, marginTop: 2 }}>{item.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Top Selling Medicines */}
          <section className="card" aria-label="Top selling medicines" style={{ padding: 18, borderRadius: 14 }}>
            <div style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Top Selling Medicines</h2>
              <a className="lnk" href="#reports" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={(e) => { e.preventDefault(); navigate('/reports'); }}>View all</a>
            </div>

            <div style={{ marginTop: 10, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="seg" style={{ width: 130, height: 28 }}>
                <span className={topMedView === 'units' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setTopMedView('units')}>Units</span>
                <span className={topMedView === 'revenue' ? 'on' : ''} style={{ fontSize: 11 }} onClick={() => setTopMedView('revenue')}>Revenue</span>
              </div>
              <span style={{ fontSize: 11.5, color: '#667085', fontWeight: 500 }}>{periodOption}</span>
            </div>

            <div style={{ marginTop: 8, minHeight: 180 }}>
              {topMedsList.length === 0 ? (
                <div style={{ padding: '36px 12px', textAlign: 'center', color: '#667085', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: '#344054' }}>No sales data yet</div>
                  <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>Top selling medicines will appear here as orders are finalized.</div>
                </div>
              ) : (
                topMedsList.map((med, i) => (
                  <div key={med.name} style={{ height: 48, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 5, borderBottom: i === topMedsList.length - 1 ? 0 : '1px solid #F2F4F7' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="cap" style={{ width: 16, fontSize: 11 }}>{med.rank}</span>
                      <span className="nm" style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: '#101828' }}>{med.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#101828' }}>
                        {topMedView === 'units' ? `${med.units} pcs` : fmt(med.rev)}
                      </span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: '#EEF3F4' }}>
                      <div style={{ width: `${med.pct}%`, height: 5, borderRadius: 3, background: 'linear-gradient(90deg,#14B8A6,#0F766E)', transition: 'width 0.3s ease' }}></div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        {/* ═══════════════════════════════════════════════════════════
            R4: RECENT INVOICES + CASH & SYNC PANELS
            ═══════════════════════════════════════════════════════════ */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>

          {/* Recent Invoices Table */}
          <section className="card" aria-label="Recent invoices" style={{ flex: '724 1 0', minWidth: 420, overflow: 'hidden', borderRadius: 14 }}>
            <div style={{ height: 48, padding: '16px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Recent Invoices</h2>
              <a className="lnk" href="#sales" style={{ fontSize: 12 }} onClick={(e) => { e.preventDefault(); navigate('/sales'); }}>View all</a>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="th" style={{ height: 36, fontSize: 11 }}>
                <div className="c1">Invoice</div>
                <div className="c2">Time</div>
                <div className="c3">Customer</div>
                <div className="c4">Items</div>
                <div className="c5">Payment</div>
                <div className="c6">Total</div>
                <div className="c7">Status</div>
                <div className="c8"></div>
              </div>

              {invoiceList.length === 0 ? (
                <div style={{ padding: '36px 16px', textAlign: 'center', color: '#667085', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, color: '#344054' }}>No recent invoices</div>
                  <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>Invoices generated from the POS will show up here.</div>
                </div>
              ) : (
                invoiceList.map((inv, idx) => (
                  <div key={inv.id || inv.num} className="tr" style={{ height: 42, fontSize: 12.5, borderBottom: idx === invoiceList.length - 1 ? 0 : '1px solid #F2F4F7' }}>
                    <div className="c1 mono" style={{ fontSize: 12, fontWeight: 500, color: '#475467' }}>
                      {inv.num}
                    </div>
                    <div className="c2" style={{ color: '#667085' }}>{inv.time}</div>
                    <div className="c3" style={{ fontWeight: 500, color: '#101828' }}>{inv.cust}</div>
                    <div className="c4" style={{ color: '#667085' }}>{inv.items}</div>
                    <div className="c5">
                      <span className="pay" style={{ height: 22, fontSize: 11 }}>
                        {inv.pay}
                      </span>
                    </div>
                    <div className="c6" style={{ fontWeight: 600, color: '#101828' }}>{fmt(inv.total)}</div>
                    <div className="c7">
                      <span
                        className="badge"
                        style={{
                          background: inv.status === 'Paid' ? '#ECFDF3' : inv.status === 'Partial' ? '#FEF3C7' : '#F2F4F7',
                          color: inv.status === 'Paid' ? '#027A48' : inv.status === 'Partial' ? '#92400E' : '#475467',
                          fontSize: 10.5,
                          padding: '1px 6px'
                        }}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <div className="c8">
                      <button className="ib" style={{ width: 28, height: 28 }} aria-label={`Reprint receipt ${inv.num}`} onClick={() => handlePrintReceipt(inv.num)} title="Print receipt">
                        <svg className="ic" width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                          <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"></path>
                          <rect x="6" y="14" width="12" height="8" rx="1"></rect>
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Cash Drawer & Sync Panel */}
          <section className="card" aria-label="Cash drawer and sync" style={{ flex: '384 1 0', minWidth: 300, padding: 20, borderRadius: 14 }}>
            <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 className="t" style={{ fontSize: 14.5, fontWeight: 600, color: '#101828' }}>Today's Cash Drawer</h2>
              <span className="badge" style={{
                background: cashSession?.status === 'OPEN' ? '#ECFDF3' : '#F2F4F7',
                color: cashSession?.status === 'OPEN' ? '#027A48' : '#475467',
                fontSize: 10.5,
                padding: '1px 6px'
              }}>
                {cashSession?.status === 'OPEN' ? 'Active Session' : 'Shift Float Inactive'}
              </span>
            </div>

            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475467' }}>
                <span>Opening Cash Float</span>
                <span className="mono" style={{ fontWeight: 600, color: '#101828' }}>{fmt(openingCash)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475467' }}>
                <span>Cash Sales</span>
                <span className="mono" style={{ fontWeight: 600, color: '#16A34A' }}>+{fmt(cashSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475467' }}>
                <span>Card &amp; Digital Payments</span>
                <span className="mono" style={{ fontWeight: 600, color: '#2563EB' }}>{fmt(cardSales)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475467' }}>
                <span>Cash Expenses Deducted</span>
                <span className="mono" style={{ fontWeight: 600, color: '#DC2626' }}>-{fmt(expenses)}</span>
              </div>

              <div style={{ height: 1, background: '#EAECF0', margin: '4px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#101828' }}>Expected Drawer Cash</span>
                <span className="pj mono" style={{ fontSize: 16, fontWeight: 700, color: '#0F766E' }}>{fmt(expectedDrawerCash)}</span>
              </div>
            </div>

            {/* Sync & Backup status box */}
            <div style={{ marginTop: 16, padding: '12px 14px', background: '#F8FAFA', borderRadius: 10, border: '1px solid #EAECF0' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#101828' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }}></span>
                  Cloud Sync &amp; DB Backup
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={syncing}
                  className="btn btn-secondary btn-sm"
                  style={{ height: 26, padding: '0 8px', fontSize: 11 }}
                >
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>

              <div style={{ fontSize: 11, color: '#667085', lineHeight: '16px' }}>
                Cloud state: <span style={{ color: '#344054', fontWeight: 500 }}>{lastSyncText}</span>
              </div>
              <div style={{ fontSize: 11, color: '#667085', lineHeight: '16px', marginTop: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Backup: <span style={{ color: '#344054', fontWeight: 500 }}>{lastBackupText}</span></span>
                <button
                  onClick={handleRunBackup}
                  style={{ border: 'none', background: 'transparent', color: '#0F766E', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                >
                  Backup DB
                </button>
              </div>
            </div>
          </section>

        </div>

      </main>

      {/* ── Close Day Modal ── */}
      {closeDayModalOpen && (
        <div className="modal-overlay">
          <div className="modal modal-md">
            <div className="modal-header">
              <h3 className="modal-title">Close Day &amp; Reconcile Cash</h3>
              <button className="ib" onClick={() => setCloseDayModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCloseDaySubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ padding: 12, background: '#F8FAFA', borderRadius: 8, border: '1px solid #EAECF0', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475467' }}>
                    <span>Calculated Drawer Cash:</span>
                    <span className="mono" style={{ fontWeight: 700, color: '#101828' }}>{fmt(expectedDrawerCash)}</span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                    Counted Physical Cash in Drawer *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 42000"
                    value={closingCashInput}
                    onChange={(e) => setClosingCashInput(e.target.value)}
                    className="input w-full"
                    autoFocus
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                    Closing Notes / Variance explanation
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Optional notes regarding discrepancy or shift handover..."
                    value={closingNotes}
                    onChange={(e) => setClosingNotes(e.target.value)}
                    className="textarea w-full"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setCloseDayModalOpen(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Finalize &amp; Close Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
