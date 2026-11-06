import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import POS from './pages/POS.jsx';
import Medicines from './pages/Medicines.jsx';
import Inventory from './pages/Inventory.jsx';
import ExpiryManagement from './pages/ExpiryManagement.jsx';
import Purchases from './pages/Purchases.jsx';
import Sales from './pages/Sales.jsx';
import Expenses from './pages/Expenses.jsx';
import Reports from './pages/Reports.jsx';
import SettingsPage from './pages/Settings.jsx';
import SubscriptionPage from './pages/Subscription.jsx';
import pharmaLogo from './assets/pharma-removebg-preview.png';

/* ── clock helper ── */
function formatClock(d) {
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const day = days[d.getDay()];
  const dd = String(d.getDate()).padStart(2,'0');
  const mon = months[d.getMonth()];
  const yyyy = d.getFullYear();
  let h = d.getHours();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  const hh = String(h).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${day}, ${dd} ${mon} ${yyyy} · ${hh}:${mm} ${ampm}`;
}

/* ── AppLayout (inside HashRouter) ── */
function AppLayout() {
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const [now, setNow] = useState(new Date());
  const [online, setOnline] = useState(navigator.onLine);
  const [expiryCount, setExpiryCount] = useState(0);
  const [lowCount, setLowCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [updateAlert, setUpdateAlert] = useState(null); // { status, version, percent, ... }
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [licenseInfo, setLicenseInfo] = useState(null);

  const refreshLicense = useCallback(async () => {
    try {
      if (window.api?.license?.getStatus) {
        const info = await window.api.license.getStatus();
        setLicenseInfo(info);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    refreshLicense();
    const interval = setInterval(refreshLicense, 60000);
    return () => clearInterval(interval);
  }, [refreshLicense]);

  /* Updater status listener */
  useEffect(() => {
    if (window.api?.updater?.onStatus) {
      const unsub = window.api.updater.onStatus((data) => {
        setUpdateAlert(data);
        if (data.status === 'available' || data.status === 'downloaded') {
          setShowUpdateModal(true);
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, []);

  /* clock */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  /* online / offline */
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  /* alerts */
  useEffect(() => {
    (async () => {
      try {
        if (window.api?.dashboard?.getAlerts) {
          const a = await window.api.dashboard.getAlerts();
          if (a) {
            const exp = (a.nearExpiry?.length || 0) + (a.expired?.length || 0);
            const low = a.lowStock?.length || 0;
            setExpiryCount(exp);
            setLowCount(low);
          }
        }
      } catch (_) { /* api not ready */ }
    })();
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'F2') { e.preventDefault(); navigate('/pos'); }
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const navCls = ({isActive}) => 'nav' + (isActive ? ' on' : '');

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#F4F7F8'}}>
      {/* ── SIDEBAR (Refined 230px, smaller typography, neat spacing) ── */}
      <aside style={{width:230,minWidth:230,height:'100vh',background:'#0A2E2C',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'1px 0 0 rgba(255,255,255,.05)'}}>

        {/* Logo */}
        <div style={{height:60,display:'flex',alignItems:'center',gap:10,padding:'0 18px',borderBottom:'1px solid #143D39',flexShrink:0}}>
          <div style={{width:32,height:32,borderRadius:8,background:'#072523',border:'1px solid #144843',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,overflow:'hidden',padding:2,boxShadow:'0 2px 6px rgba(0,0,0,.25)'}}>
            <img src={pharmaLogo} alt="PharmaDesk Logo" style={{width:'100%',height:'100%',objectFit:'contain'}} />
          </div>
          <div>
            <div className="pj" style={{fontSize:16,fontWeight:700,color:'#FFFFFF',lineHeight:'20px',letterSpacing:'-0.01em'}}>PharmaDesk</div>
            <div style={{fontSize:11,color:'#6F9A95',lineHeight:'14px'}}>Medical Store POS</div>
          </div>
        </div>

        {/* Nav links */}
        <nav style={{flex:1,overflowY:'auto',padding:'10px 12px 0'}}>

          {/* Main */}
          <div className="grp" style={{marginTop:2}}>Main</div>

          <NavLink to="/" end className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>
              </svg>
              Dashboard
            </>}
          </NavLink>

          <NavLink to="/pos" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
              </svg>
              New Sale
              <span style={{marginLeft:'auto',height:18,padding:'0 5px',borderRadius:4,background:'rgba(255,255,255,.10)',color:'#9CC5C0',fontSize:10.5,lineHeight:'18px',fontWeight:600}}>F2</span>
            </>}
          </NavLink>

          {/* Catalog */}
          <div className="grp">Catalog</div>

          <NavLink to="/medicines" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>
              </svg>
              Medicines
            </>}
          </NavLink>

          <NavLink to="/inventory" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z"/><path d="m7 16.5-4.74-2.85"/><path d="m7 16.5 5-3"/><path d="M7 16.5v5.17"/><path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z"/><path d="m17 16.5-5-3"/><path d="m17 16.5 4.74-2.85"/><path d="M17 16.5v5.17"/><path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z"/><path d="M12 8 7.26 5.15"/><path d="m12 8 4.74-2.85"/><path d="M12 13.5V8"/>
              </svg>
              Inventory &amp; Batches
              {lowCount > 0 && <span style={{marginLeft:'auto',minWidth:18,height:18,padding:'0 5px',borderRadius:9,background:'#F59E0B',color:'#0F2A2E',fontSize:10.5,lineHeight:'18px',fontWeight:700,textAlign:'center'}}>{lowCount}</span>}
            </>}
          </NavLink>

          <NavLink to="/expiry" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0 2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>
              </svg>
              Expiry Alerts
              {expiryCount > 0 && <span style={{marginLeft:'auto',minWidth:18,height:18,padding:'0 5px',borderRadius:9,background:'#DC2626',color:'#FFFFFF',fontSize:10.5,lineHeight:'18px',fontWeight:700,textAlign:'center'}}>{expiryCount}</span>}
            </>}
          </NavLink>

          {/* Trade */}
          <div className="grp">Trade</div>

          <NavLink to="/purchases" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
              </svg>
              Purchases &amp; Vendors
            </>}
          </NavLink>

          <NavLink to="/sales" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/>
              </svg>
              Sales &amp; Invoices
            </>}
          </NavLink>

          {/* Finance */}
          <div className="grp">Finance</div>

          <NavLink to="/expenses" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
              </svg>
              Expenses &amp; Cash
            </>}
          </NavLink>

          <NavLink to="/reports" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
              </svg>
              Reports &amp; Analytics
            </>}
          </NavLink>

          {/* System */}
          <div className="grp">System</div>

          <NavLink to="/subscription" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
              </svg>
              License &amp; Plan
              {licenseInfo?.status === 'EXPIRED' && (
                <span style={{marginLeft:'auto',height:18,padding:'0 5px',borderRadius:9,background:'#DC2626',color:'#FFFFFF',fontSize:9.5,lineHeight:'18px',fontWeight:700}}>EXPIRED</span>
              )}
              {licenseInfo?.status === 'WARNING' && (
                <span style={{marginLeft:'auto',height:18,padding:'0 5px',borderRadius:9,background:'#F59E0B',color:'#0F2A2E',fontSize:10,lineHeight:'18px',fontWeight:700}}>{licenseInfo.daysRemaining}d</span>
              )}
            </>}
          </NavLink>

          <NavLink to="/settings" className={navCls}>
            {({isActive}) => <>
              {isActive && <span style={{position:'absolute',left:'-12px',top:'10px',width:'3px',height:'16px',borderRadius:'0 3px 3px 0',background:'#2DD4BF'}}></span>}
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              Settings &amp; Backup
            </>}
          </NavLink>
        </nav>

        {/* Footer */}
        <div style={{padding:'12px 14px',flexShrink:0,borderTop:'1px solid #143D39'}}>
          {/* Online status card */}
          <div style={{height:44,padding:'0 12px',borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.07)',display:'flex',alignItems:'center',gap:10}}>
            <span style={{width:8,height:8,borderRadius:'50%',background: online ? '#16A34A' : '#DC2626',boxShadow: online ? '0 0 0 2px rgba(22,163,74,.2)' : '0 0 0 2px rgba(220,38,38,.2)',flexShrink:0}}></span>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:'#FFFFFF',lineHeight:'16px'}}>{online ? 'Online' : 'Offline'}</div>
              <div style={{fontSize:10.5,color:'#85ABA7',lineHeight:'14px'}}>
                {online ? 'Cloud Sync Ready' : 'Local Offline Mode'}
              </div>
            </div>
            <button
              onClick={() => {
                if (window.api?.backup?.checkScheduledCloudBackup) {
                  window.api.backup.checkScheduledCloudBackup().catch(() => {});
                }
              }}
              style={{width:26,height:26,borderRadius:6,border:'none',background:'rgba(255,255,255,.08)',color:'#9CC5C0',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}
              title="Sync / Check Cloud Connection"
            >
              <svg className="ic" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="main-content" style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',minWidth:0}}>

        {/* Top Header (Lean 58px) */}
        <header style={{height:58,minHeight:58,background:'#FFFFFF',borderBottom:'1px solid #EAECF0',display:'flex',alignItems:'center',padding:'0 24px',gap:14}}>

          {/* Search Bar */}
          <div style={{flex:'0 1 380px',height:36,background:'#F9FAFB',border:'1px solid #EAECF0',borderRadius:8,display:'flex',alignItems:'center',padding:'0 10px',gap:8}}>
            <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#667085" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{flexShrink:0}}>
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              placeholder="Search medicines, barcode, invoice..."
              style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:12.5,color:'#101828'}}
            />
            <span style={{height:20,padding:'0 5px',border:'1px solid #EAECF0',borderRadius:4,background:'#FFFFFF',fontSize:10.5,color:'#667085',display:'flex',alignItems:'center',flexShrink:0,fontWeight:500}}>Ctrl K</span>
          </div>

          <div style={{flex:1}}></div>

          {/* Subscription / Plan Status Badge */}
          {licenseInfo && (
            <button
              onClick={() => navigate('/subscription')}
              style={{
                height: 30,
                padding: '0 10px',
                borderRadius: 20,
                border: `1px solid ${licenseInfo.status === 'EXPIRED' ? '#FECACA' : (licenseInfo.status === 'WARNING' ? '#FDE68A' : '#CCFBF1')}`,
                background: licenseInfo.status === 'EXPIRED' ? '#FEF2F2' : (licenseInfo.status === 'WARNING' ? '#FFFBEB' : '#F0FDFA'),
                color: licenseInfo.status === 'EXPIRED' ? '#DC2626' : (licenseInfo.status === 'WARNING' ? '#B45309' : '#0F766E'),
                fontSize: 11.5,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
              title="Workstation License Status - Click to manage"
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: licenseInfo.status === 'EXPIRED' ? '#DC2626' : (licenseInfo.status === 'WARNING' ? '#D97706' : '#0F766E') }}></span>
              {licenseInfo.isLifetime ? 'Lifetime' : (licenseInfo.status === 'EXPIRED' ? 'License Expired' : (licenseInfo.isTrial ? `Trial (${licenseInfo.daysRemaining}d)` : `Active (${licenseInfo.daysRemaining}d)`))}
            </button>
          )}

          {/* Clock */}
          <span style={{fontSize:12,color:'#475467',whiteSpace:'nowrap',fontWeight:500}}>{formatClock(now)}</span>

          {/* Notification Bell & Dropdown */}
          <div style={{position:'relative'}}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              style={{
                position:'relative',
                width:36,
                height:36,
                border:'1px solid #EAECF0',
                borderRadius:8,
                background: showNotifications ? '#F0FDFA' : '#FFFFFF',
                color: showNotifications ? '#0F766E' : '#475467',
                cursor:'pointer',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                flexShrink:0
              }}
              title="Notifications"
            >
              <svg className="ic" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
              </svg>
              {(expiryCount > 0 || lowCount > 0) && (
                <span style={{position:'absolute',top:7,right:8,width:7,height:7,borderRadius:'50%',background:'#DC2626',boxShadow:'0 0 0 1.5px #FFFFFF'}}></span>
              )}
            </button>

            {showNotifications && (
              <div
                style={{
                  position:'absolute',
                  top:'100%',
                  right:0,
                  marginTop:8,
                  width:320,
                  background:'#FFFFFF',
                  border:'1px solid #EAECF0',
                  borderRadius:12,
                  boxShadow:'0 10px 25px -4px rgba(16,24,40,0.1), 0 4px 6px -2px rgba(16,24,40,0.05)',
                  zIndex:100,
                  overflow:'hidden'
                }}
              >
                <div style={{padding:'12px 16px',borderBottom:'1px solid #EAECF0',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#F9FAFB'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <span style={{fontWeight:600,fontSize:13,color:'#101828'}}>Notifications</span>
                    {(expiryCount > 0 || lowCount > 0) && (
                      <span style={{fontSize:10.5,fontWeight:600,background:'#FEF3F2',color:'#B42318',border:'1px solid #FECDCA',padding:'1px 6px',borderRadius:999}}>
                        {expiryCount + lowCount} active
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setShowNotifications(false)}
                    style={{border:'none',background:'transparent',fontSize:12,color:'#667085',cursor:'pointer',padding:0}}
                  >
                    Close
                  </button>
                </div>

                <div style={{maxHeight:300,overflowY:'auto',display:'flex',flexDirection:'column'}}>
                  {expiryCount > 0 && (
                    <div
                      onClick={() => { setShowNotifications(false); navigate('/expiry'); }}
                      style={{padding:'12px 14px',borderBottom:'1px solid #F2F4F7',cursor:'pointer',display:'flex',gap:10,background:'#FFFFFF',transition:'background 0.1s ease'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <div style={{width:28,height:28,borderRadius:8,background:'#FEE2E2',color:'#991B1B',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        !
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:'#101828'}}>Expiry Warning</div>
                        <div style={{fontSize:11.5,color:'#667085',marginTop:2}}>{expiryCount} medicine batches expired or nearing expiration.</div>
                        <span style={{fontSize:11,color:'#0F766E',fontWeight:600,marginTop:4,display:'inline-block'}}>Review batches →</span>
                      </div>
                    </div>
                  )}

                  {lowCount > 0 && (
                    <div
                      onClick={() => { setShowNotifications(false); navigate('/inventory'); }}
                      style={{padding:'12px 14px',borderBottom:'1px solid #F2F4F7',cursor:'pointer',display:'flex',gap:10,background:'#FFFFFF',transition:'background 0.1s ease'}}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <div style={{width:28,height:28,borderRadius:8,background:'#FEF3C7',color:'#92400E',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                        ↓
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:12.5,fontWeight:600,color:'#101828'}}>Low Stock Warning</div>
                        <div style={{fontSize:11.5,color:'#667085',marginTop:2}}>{lowCount} medicines are below minimum stock threshold.</div>
                        <span style={{fontSize:11,color:'#0F766E',fontWeight:600,marginTop:4,display:'inline-block'}}>Check inventory →</span>
                      </div>
                    </div>
                  )}

                  <div style={{padding:'10px 14px',background:'#F8FAFA',borderTop:'1px solid #EAECF0',fontSize:11,color:'#667085',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{display:'flex',alignItems:'center',gap:5}}>
                      <span style={{width:6,height:6,borderRadius:'50%',background:online ? '#16A34A' : '#F59E0B'}}></span>
                      {online ? 'Cloud Backup & Sync Ready' : 'Offline Mode (Local SQLite Active)'}
                    </span>
                    <button
                      onClick={() => { setShowNotifications(false); navigate('/settings'); }}
                      style={{border:'none',background:'transparent',color:'#0F766E',fontWeight:600,fontSize:11,cursor:'pointer',padding:0}}
                    >
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div style={{width:1,height:22,background:'#EAECF0',flexShrink:0}}></div>

          {/* New Sale Button */}
          <button onClick={() => navigate('/pos')} style={{height:36,padding:'0 14px',borderRadius:8,border:'none',background:'#0F766E',color:'#FFFFFF',fontWeight:600,fontSize:12.5,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,flexShrink:0,boxShadow:'0 1px 2px rgba(15,118,110,.2)'}}>
            <svg className="ic" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
            </svg>
            New Sale
            <span style={{height:18,padding:'0 5px',borderRadius:4,background:'rgba(255,255,255,.2)',fontSize:10,lineHeight:'18px',fontWeight:700}}>F2</span>
          </button>
        </header>

        {/* Read-Only Banner when subscription is expired */}
        {licenseInfo?.isReadOnly && (
          <div style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', padding: '8px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div style={{ fontSize: 12.5, color: '#991B1B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔒 Safe Read-Only Mode:</span>
              <span style={{ fontWeight: 400, color: '#7F1D1D' }}>Your pharmacy records &amp; inventory remain accessible. New sales are locked until renewed.</span>
            </div>
            <button
              onClick={() => navigate('/subscription')}
              style={{ height: 26, padding: '0 12px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Renew Online →
            </button>
          </div>
        )}

        {/* Page content */}
        <div className="page-content" style={{flex:1,overflow:'auto',background:'#F4F7F8'}}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/medicines" element={<Medicines />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/expiry" element={<ExpiryManagement />} />
            <Route path="/purchases/*" element={<Purchases />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/subscription" element={<SubscriptionPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* ── Auto-Update Notification Modal ── */}
        {showUpdateModal && updateAlert && (
          <div style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            width: 360,
            maxWidth: 'calc(100vw - 48px)',
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #EAECF0',
            boxShadow: '0 10px 25px -5px rgba(16, 24, 40, 0.15), 0 8px 10px -6px rgba(16, 24, 40, 0.1)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '12px 14px',
              background: updateAlert.status === 'downloaded' ? '#ECFDF3' : '#F0FDFA',
              borderBottom: '1px solid #EAECF0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={pharmaLogo} alt="Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: updateAlert.status === 'downloaded' ? '#027A48' : '#0F766E' }}>
                  {updateAlert.status === 'downloaded' ? 'Update Ready to Install' : `PharmaDesk v${updateAlert.version || 'New'} Available`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#667085', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
                title="Dismiss"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 14 }}>
              {updateAlert.status === 'available' && (
                <>
                  <div style={{ fontSize: 12, color: '#344054', lineHeight: '17px' }}>
                    A new version of PharmaDesk is published. All your database records and settings remain 100% intact.
                  </div>
                  {updateAlert.releaseNotes && (
                    <div style={{
                      marginTop: 8,
                      padding: 8,
                      background: '#F9FAFB',
                      borderRadius: 6,
                      border: '1px solid #EAECF0',
                      fontSize: 11,
                      color: '#475467',
                      maxHeight: 60,
                      overflowY: 'auto'
                    }}>
                      {typeof updateAlert.releaseNotes === 'string' ? updateAlert.releaseNotes : 'Bug fixes and performance enhancements.'}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      style={{ height: 30, padding: '0 10px', fontSize: 11.5, borderRadius: 6, border: '1px solid #D0D5DD', background: '#FFFFFF', color: '#344054', cursor: 'pointer' }}
                    >
                      Later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.api?.updater?.download?.();
                      }}
                      style={{ height: 30, padding: '0 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: 'none', background: '#0F766E', color: '#FFFFFF', cursor: 'pointer' }}
                    >
                      Download Update
                    </button>
                  </div>
                </>
              )}

              {updateAlert.status === 'downloading' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: '#101828', marginBottom: 6 }}>
                    <span>Downloading package...</span>
                    <span style={{ color: '#0F766E' }}>{updateAlert.percent || 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#EAECF0', overflow: 'hidden' }}>
                    <div style={{ width: `${updateAlert.percent || 0}%`, height: '100%', background: '#0F766E', transition: 'width 0.2s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#667085', marginTop: 6 }}>
                    Please wait while the update is safely downloaded in the background.
                  </div>
                </>
              )}

              {updateAlert.status === 'downloaded' && (
                <>
                  <div style={{ fontSize: 12, color: '#344054', lineHeight: '17px' }}>
                    PharmaDesk v{updateAlert.version} has been downloaded. Click below to restart and finish installing.
                  </div>
                  <div style={{ fontSize: 11, color: '#027A48', marginTop: 4, fontWeight: 500 }}>
                    ✓ Pre-update database safety snapshot will be created automatically.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowUpdateModal(false)}
                      style={{ height: 30, padding: '0 10px', fontSize: 11.5, borderRadius: 6, border: '1px solid #D0D5DD', background: '#FFFFFF', color: '#344054', cursor: 'pointer' }}
                    >
                      Install Later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.api?.updater?.install?.(false);
                      }}
                      style={{ height: 30, padding: '0 12px', fontSize: 11.5, fontWeight: 600, borderRadius: 6, border: 'none', background: '#027A48', color: '#FFFFFF', cursor: 'pointer' }}
                    >
                      Install &amp; Restart
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Root App ── */
export default function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}
