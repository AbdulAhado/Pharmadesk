import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Key, RefreshCw, Copy, Check, ExternalLink,
  Calendar, Clock, Laptop, AlertTriangle, ArrowRight, Download, Upload,
  DollarSign, CheckCircle2, Phone, Mail, HelpCircle, Lock, Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const api = window.api;

export default function SubscriptionPage() {
  const [license, setLicense] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Modals & form states
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'activate', 'renew', 'offline'
  const [licenseKeyInput, setLicenseKeyInput] = useState('');
  const [pharmacyNameInput, setPharmacyNameInput] = useState('');
  const [customerEmailInput, setCustomerEmailInput] = useState('');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [activating, setActivating] = useState(false);

  // Renewal form
  const [selectedPlanId, setSelectedPlanId] = useState('YEARLY');
  const [paymentRefInput, setPaymentRefInput] = useState('');
  const [renewalNotesInput, setRenewalNotesInput] = useState('');
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [renewalSubmittedInfo, setRenewalSubmittedInfo] = useState(null);

  // Offline import
  const [offlineLicenseText, setOfflineLicenseText] = useState('');

  // Server URL config
  const [serverUrl, setServerUrl] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);

  const loadData = useCallback(async () => {
    if (!api?.license) return;
    setLoading(true);
    try {
      const [lic, dev, availablePlans, srvUrl] = await Promise.all([
        api.license.getStatus(),
        api.license.getDeviceInfo(),
        api.license.getPlans(),
        api.license.getServerUrl(),
      ]);
      setLicense(lic);
      setDeviceInfo(dev);
      setPlans(availablePlans || []);
      setServerUrl(srvUrl || '');
    } catch (err) {
      toast.error('Failed to load license details: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopyDeviceId = () => {
    if (!deviceInfo?.deviceId) return;
    navigator.clipboard.writeText(deviceInfo.deviceId);
    setCopied(true);
    toast.success('Device ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (!licenseKeyInput.trim()) {
      toast.error('Please enter your license activation key');
      return;
    }

    setActivating(true);
    try {
      const res = await api.license.activate({
        licenseKey: licenseKeyInput.trim(),
        pharmacyName: pharmacyNameInput.trim() || undefined,
        customerEmail: customerEmailInput.trim() || undefined,
        customerPhone: customerPhoneInput.trim() || undefined,
      });

      toast.success(res.message || 'PharmaDesk activated successfully!');
      setLicense(res.status);
      setActiveTab('overview');
      setLicenseKeyInput('');
    } catch (err) {
      toast.error('Activation failed: ' + err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleRequestRenewal = async (e) => {
    e.preventDefault();
    setSubmittingRenewal(true);
    try {
      const res = await api.license.requestRenewal({
        requestedPlan: selectedPlanId,
        customerName: pharmacyNameInput || license?.pharmacyName || 'My Pharmacy',
        customerPhone: customerPhoneInput,
        paymentReference: paymentRefInput,
        notes: renewalNotesInput,
      });

      setRenewalSubmittedInfo(res);
      toast.success(res.message);
      loadData();
    } catch (err) {
      toast.error('Renewal request failed: ' + err.message);
    } finally {
      setSubmittingRenewal(false);
    }
  };

  const handleCheckRenewalOnline = async () => {
    setLoading(true);
    try {
      const res = await api.license.checkRenewalStatus();
      if (res.isRenewed) {
        toast.success(res.message);
        setLicense(res.status);
        setActiveTab('overview');
      } else {
        toast(res.message, { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error('Server check failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportOfflineLicense = async (e) => {
    e.preventDefault();
    if (!offlineLicenseText.trim()) {
      toast.error('Please paste the signed license JSON text');
      return;
    }

    try {
      const res = await api.license.importOfflineLicense(offlineLicenseText);
      toast.success(res.message);
      setLicense(res.status);
      setActiveTab('overview');
      setOfflineLicenseText('');
    } catch (err) {
      toast.error('Offline import failed: ' + err.message);
    }
  };

  const handleSaveServerUrl = async (e) => {
    e.preventDefault();
    try {
      await api.license.setServerUrl(serverUrl.trim());
      toast.success('Licensing server address updated');
      setShowServerConfig(false);
      loadData();
    } catch (err) {
      toast.error('Could not save server address: ' + err.message);
    }
  };

  const getStatusBadge = () => {
    if (!license) return null;
    if (license.isLifetime) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          <Sparkles size={14} /> Lifetime Active
        </span>
      );
    }
    if (license.status === 'ACTIVE') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          <ShieldCheck size={14} /> Subscription Active
        </span>
      );
    }
    if (license.status === 'WARNING') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          <AlertTriangle size={14} /> Expiring Soon ({license.daysRemaining} days left)
        </span>
      );
    }
    if (license.status === 'TRIAL') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#F0FDFA', color: '#0F766E', border: '1px solid #99F6E4', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
          <Clock size={14} /> 14-Day Free Trial ({license.daysRemaining} days left)
        </span>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
        <ShieldAlert size={14} /> Subscription Expired (Read-Only)
      </span>
    );
  };

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto', overflowY: 'auto', height: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#101828', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Key style={{ color: '#0F766E' }} size={24} /> License &amp; Subscription Management
          </h1>
          <p style={{ fontSize: 13, color: '#475467', marginTop: 4, marginBottom: 0 }}>
            Manage your PharmaDesk workstation activation, offline validity, and online subscription renewals.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {getStatusBadge()}
          <button
            onClick={loadData}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #D0D5DD', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#344054' }}
            title="Refresh License State"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Status Banner if Expired or Warning ── */}
      {license?.status === 'EXPIRED' && (
        <div style={{ background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Lock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#991B1B', fontSize: 14 }}>
                PharmaDesk Subscription Expired — Safe Read-Only Mode Active
              </div>
              <div style={{ fontSize: 12.5, color: '#7F1D1D', marginTop: 2 }}>
                Your pharmacy records, medicines, and past sales remain 100% safe. To record new sales, please renew your subscription.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('renew')}
            style={{ padding: '8px 16px', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Renew Now →
          </button>
        </div>
      )}

      {license?.status === 'WARNING' && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FBBF24', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle style={{ color: '#D97706' }} size={20} />
            <span style={{ fontSize: 13, color: '#92400E', fontWeight: 600 }}>
              Reminder: Your subscription expires in {license.daysRemaining} days (on {license.expiryDate?.slice(0, 10)}). Renew in advance to prevent counter interruptions.
            </span>
          </div>
          <button
            onClick={() => setActiveTab('renew')}
            style={{ padding: '6px 14px', background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            Renew Early
          </button>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid #EAECF0', marginBottom: 20, gap: 8 }}>
        {[
          { id: 'overview', label: 'License Overview' },
          { id: 'activate', label: 'Activate License Key' },
          { id: 'renew', label: 'Renew Subscription' },
          { id: 'offline', label: 'Offline / Manual License' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #0F766E' : '2px solid transparent',
              background: 'transparent',
              color: activeTab === tab.id ? '#0F766E' : '#475467',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Workstation Info Card */}
          <div className="card" style={{ padding: 20, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Laptop size={18} style={{ color: '#0F766E' }} /> Workstation Hardware Identity
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Hardware Device ID</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                  <code style={{ fontSize: 14, fontWeight: 700, color: '#0F766E', letterSpacing: 0.5 }}>{deviceInfo?.deviceId || 'Loading...'}</code>
                  <button
                    onClick={handleCopyDeviceId}
                    style={{ background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#334155' }}
                  >
                    {copied ? <Check size={12} style={{ color: '#16A34A' }} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>Computer / Hostname</span>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E293B', marginTop: 4 }}>
                  {deviceInfo?.hostname} ({deviceInfo?.platform})
                </div>
              </div>
            </div>
          </div>

          {/* Current Subscription Card */}
          <div className="card" style={{ padding: 20, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldCheck size={18} style={{ color: '#0F766E' }} /> Current Active Plan &amp; Validity
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div style={{ border: '1px solid #EAECF0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Plan Type</span>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginTop: 4 }}>
                  {license?.plan === 'FREE_TRIAL' ? '14-Day Free Trial' : (license?.plan || 'Free Trial')}
                </div>
                <div style={{ fontSize: 11, color: '#0F766E', marginTop: 2 }}>
                  {license?.isTrial ? 'Local offline evaluation' : 'Commercial Ed25519 license'}
                </div>
              </div>

              <div style={{ border: '1px solid #EAECF0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Remaining Days</span>
                <div style={{ fontSize: 20, fontWeight: 800, color: license?.daysRemaining <= 3 ? '#DC2626' : '#0F766E', marginTop: 2 }}>
                  {license?.isLifetime ? '∞ Lifetime' : `${license?.daysRemaining ?? 0} Days`}
                </div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
                  {license?.isLifetime ? 'No expiration' : `Valid until ${license?.expiryDate?.slice(0, 10)}`}
                </div>
              </div>

              <div style={{ border: '1px solid #EAECF0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Registered Pharmacy</span>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#101828', marginTop: 4 }}>
                  {license?.pharmacyName || 'Store Workstation'}
                </div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
                  ID: {license?.licenseId || 'N/A'}
                </div>
              </div>

              <div style={{ border: '1px solid #EAECF0', borderRadius: 8, padding: 14 }}>
                <span style={{ fontSize: 11, color: '#667085', fontWeight: 600, textTransform: 'uppercase' }}>Offline Security</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', marginTop: 4 }}>
                  ✓ Ed25519 Signature Verified
                </div>
                <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
                  No daily internet required
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button
                onClick={handleCheckRenewalOnline}
                style={{ padding: '8px 16px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCw size={13} /> Check Online Renewal Status
              </button>
              <button
                onClick={() => setActiveTab('renew')}
                style={{ padding: '8px 18px', background: '#0F766E', border: 'none', borderRadius: 8, fontSize: 12.5, fontWeight: 700, color: '#FFFFFF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                Renew / Upgrade Plan →
              </button>
            </div>
          </div>

          {/* Quick FAQ / Help */}
          <div style={{ background: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 12, padding: 16 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#0F766E', margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <HelpCircle size={15} /> How does PharmaDesk offline licensing work?
            </h4>
            <p style={{ fontSize: 12, color: '#115E59', margin: 0, lineHeight: 1.5 }}>
              PharmaDesk is designed for uninterrupted pharmacy counter work. Once activated or renewed online, a cryptographically signed license file is stored on your machine. You can disconnect from the internet and run your daily POS, inventory, and reports completely offline. Internet connectivity is only needed when activating a new key or renewing an expired license.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 2: ACTIVATE LICENSE KEY ── */}
      {activeTab === 'activate' && (
        <div className="card" style={{ padding: 24, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 6 }}>
            Activate PharmaDesk Workstation License
          </h3>
          <p style={{ fontSize: 13, color: '#475467', marginBottom: 20 }}>
            Enter the license key provided upon purchase. Your license will be securely bound to this workstation.
          </p>

          <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 540 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>
                License Activation Key *
              </label>
              <input
                type="text"
                placeholder="e.g. PHD-YEARLY-XXXX-XXXX-XXXX"
                value={licenseKeyInput}
                onChange={(e) => setLicenseKeyInput(e.target.value)}
                style={{ width: '100%', height: 40, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13.5, fontFamily: 'monospace', fontWeight: 600, textTransform: 'uppercase' }}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>
                Pharmacy Name
              </label>
              <input
                type="text"
                placeholder="e.g. Al-Shifa Medicos &amp; Pharmacy"
                value={pharmacyNameInput}
                onChange={(e) => setPharmacyNameInput(e.target.value)}
                style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="owner@pharmacy.com"
                  value={customerEmailInput}
                  onChange={(e) => setCustomerEmailInput(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 6 }}>
                  Phone / WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="0300-1234567"
                  value={customerPhoneInput}
                  onChange={(e) => setCustomerPhoneInput(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12, color: '#475467' }}>
              <strong>Device Binding:</strong> This license will be verified against Device ID <code>{deviceInfo?.deviceId}</code>.
            </div>

            <button
              type="submit"
              disabled={activating}
              style={{ height: 42, background: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}
            >
              <Key size={16} />
              {activating ? 'Connecting to Server & Verifying...' : 'Activate License Online'}
            </button>
          </form>
        </div>
      )}

      {/* ── TAB 3: RENEW SUBSCRIPTION ── */}
      {activeTab === 'renew' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 22, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#101828', marginBottom: 4 }}>
              Choose a Renewal Plan
            </h3>
            <p style={{ fontSize: 13, color: '#475467', marginBottom: 18 }}>
              Select a subscription duration for your pharmacy. After submitting, your request will be approved by the admin.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14, marginBottom: 20 }}>
              {plans.filter(p => p.id !== 'TRIAL').map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    style={{
                      border: isSelected ? '2px solid #0F766E' : '1px solid #EAECF0',
                      background: isSelected ? '#F0FDFA' : '#FFFFFF',
                      borderRadius: 10,
                      padding: 16,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected && (
                      <span style={{ position: 'absolute', top: 10, right: 10, background: '#0F766E', color: '#fff', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                        ✓
                      </span>
                    )}
                    <div style={{ fontWeight: 700, color: '#101828', fontSize: 14 }}>{plan.name}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0F766E', margin: '8px 0 4px' }}>
                      PKR {Number(plan.pricePKR || 0).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#667085' }}>
                      {plan.durationDays ? `${plan.durationDays} Days Duration` : 'Permanent Lifetime License'}
                    </div>
                    <div style={{ fontSize: 11, color: '#475467', marginTop: 6 }}>
                      {plan.description}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Payment & Contact Details */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, marginBottom: 20 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', margin: '0 0 8px 0' }}>
                Payment Instructions &amp; Support Contact
              </h4>
              <p style={{ fontSize: 12, color: '#475467', margin: 0, lineHeight: 1.5 }}>
                Please transfer the subscription fee to our official business account (Bank Transfer / EasyPaisa / JazzCash) and provide the transaction reference number below. For instant activation, you can WhatsApp the payment screenshot with your Device ID <code>{deviceInfo?.deviceId}</code>.
              </p>
            </div>

            <form onSubmit={handleRequestRenewal} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
                    Your Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    placeholder="0300-1234567"
                    value={customerPhoneInput}
                    onChange={(e) => setCustomerPhoneInput(e.target.value)}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
                    Bank / Transaction Ref #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TRX-98214"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#344054', marginBottom: 5 }}>
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid via JazzCash account ending in 4421"
                  value={renewalNotesInput}
                  onChange={(e) => setRenewalNotesInput(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 8, fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="submit"
                  disabled={submittingRenewal}
                  style={{ flex: 1, height: 42, background: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  <CheckCircle2 size={16} />
                  {submittingRenewal ? 'Submitting Request...' : 'Submit Renewal Request'}
                </button>
                <button
                  type="button"
                  onClick={handleCheckRenewalOnline}
                  style={{ padding: '0 16px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                  title="Check if admin has already approved"
                >
                  <RefreshCw size={13} /> Check Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── TAB 4: OFFLINE IMPORT & SERVER CONFIG ── */}
      {activeTab === 'offline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card" style={{ padding: 22, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#101828', marginBottom: 4 }}>
              Manual Offline License Import
            </h3>
            <p style={{ fontSize: 12.5, color: '#475467', marginBottom: 16 }}>
              For completely air-gapped pharmacies without direct internet access: Paste your signed license JSON envelope provided by the administrator below.
            </p>

            <form onSubmit={handleImportOfflineLicense} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <textarea
                rows={6}
                placeholder="Paste signed license JSON envelope here..."
                value={offlineLicenseText}
                onChange={(e) => setOfflineLicenseText(e.target.value)}
                style={{ width: '100%', padding: 12, border: '1px solid #D0D5DD', borderRadius: 8, fontFamily: 'monospace', fontSize: 12 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', background: '#0F766E', color: '#FFFFFF', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Verify &amp; Apply Offline License
                </button>
              </div>
            </form>
          </div>

          {/* Licensing Server URL Configuration */}
          <div className="card" style={{ padding: 18, background: '#FFFFFF', borderRadius: 12, border: '1px solid #EAECF0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h4 style={{ fontSize: 13.5, fontWeight: 700, color: '#101828', margin: 0 }}>
                  Licensing Server Endpoint
                </h4>
                <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                  Current endpoint: <code>{serverUrl || 'Default (Localhost:5000)'}</code>
                </div>
              </div>
              <button
                onClick={() => setShowServerConfig(!showServerConfig)}
                style={{ padding: '6px 12px', background: '#F8FAFC', border: '1px solid #CBD5E1', borderRadius: 6, fontSize: 11.5, fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              >
                {showServerConfig ? 'Close' : 'Change Endpoint'}
              </button>
            </div>

            {showServerConfig && (
              <form onSubmit={handleSaveServerUrl} style={{ marginTop: 14, display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="https://licensing.yourdomain.com"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  style={{ flex: 1, height: 36, padding: '0 12px', border: '1px solid #D0D5DD', borderRadius: 6, fontSize: 12.5 }}
                />
                <button
                  type="submit"
                  style={{ padding: '0 16px', background: '#0F766E', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
                >
                  Save URL
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

