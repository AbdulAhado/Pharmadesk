import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings, Building2, Save, Database, Printer,
  Shield, Download, Upload, RefreshCw, CheckCircle2,
  AlertTriangle, Folder, HardDrive, Info, Cloud,
  CloudUpload, CloudDownload, Eye, EyeOff, Wifi, WifiOff,
  Sparkles, Check, ArrowRight, Key
} from 'lucide-react';
import toast from 'react-hot-toast';
import pharmaLogo from '../assets/pharma-removebg-preview.png';
import SubscriptionPage from './Subscription.jsx';

const api = window.api;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'defaults', 'printer', 'backup'
  const [loading, setLoading] = useState(true);

  // Profile Form
  const [profile, setProfile] = useState({
    pharmacy_name: 'PharmaDesk Pharmacy',
    pharmacy_address: 'Main Commercial Area, Lahore',
    pharmacy_phone: '+92 300 1234567',
    pharmacy_email: 'info@pharmadesk.pk',
    drug_license: 'DSL-PB-2024-9871',
    tax_number: 'NTN: 1234567-8',
    receipt_header: 'Welcome to PharmaDesk',
    receipt_footer: 'Get well soon! Medicines once sold cannot be returned without receipt.'
  });

  // Defaults Form
  const [defaults, setDefaults] = useState({
    default_tax_rate: 0,
    default_discount: 0,
    low_stock_threshold: 10,
    expiry_warning_days: 60,
    currency_symbol: 'PKR'
  });

  // Printer Form
  const [printerSettings, setPrinterSettings] = useState({
    paper_size: '80mm', // '80mm' or '58mm'
    auto_print: '1',
    scanner_sound: '1'
  });

  // Local Backup State
  const [backupDir, setBackupDir] = useState('');
  const [backupList, setBackupList] = useState([]);
  const [backupCreating, setBackupCreating] = useState(false);

  // MongoDB Atlas Cloud Backup State
  const [cloudConfig, setCloudConfig] = useState({
    mongo_uri: '',
    mongo_db_name: 'pharmadesk_cloud',
    cloud_backup_frequency: 'daily', // 'daily' | 'weekly' | 'monthly' | 'manual'
    cloud_auto_backup: '1',
    cloud_last_backup_at: '',
    cloud_last_backup_status: ''
  });
  const [showMongoUri, setShowMongoUri] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [cloudBackingUp, setCloudBackingUp] = useState(false);
  const [cloudRestoring, setCloudRestoring] = useState(false);

  // Updates & Version Management State
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [updateConfig, setUpdateConfig] = useState({
    currentVersion: '1.0.0',
    autoUpdateCheck: true,
    lastUpdateCheck: '',
    lastUpdateStatus: 'Not checked yet',
  });
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [installingUpdate, setInstallingUpdate] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!api?.settings) return;
    setLoading(true);
    try {
      const all = await api.settings.getAll();
      if (all) {
        setProfile({
          pharmacy_name: all.pharmacy_name || 'PharmaDesk Pharmacy',
          pharmacy_address: all.pharmacy_address || 'Main Commercial Area, Lahore',
          pharmacy_phone: all.pharmacy_phone || '+92 300 1234567',
          pharmacy_email: all.pharmacy_email || 'info@pharmadesk.pk',
          drug_license: all.drug_license || 'DSL-PB-2024-9871',
          tax_number: all.tax_number || 'NTN: 1234567-8',
          receipt_header: all.receipt_header || 'Welcome to PharmaDesk',
          receipt_footer: all.receipt_footer || 'Get well soon! Medicines once sold cannot be returned without receipt.'
        });

        setDefaults({
          default_tax_rate: Number(all.default_tax_rate) || 0,
          default_discount: Number(all.default_discount) || 0,
          low_stock_threshold: Number(all.low_stock_threshold) || 10,
          expiry_warning_days: Number(all.expiry_warning_days) || 60,
          currency_symbol: all.currency_symbol || 'PKR'
        });

        setPrinterSettings({
          paper_size: all.paper_size || '80mm',
          auto_print: all.auto_print ?? '1',
          scanner_sound: all.scanner_sound ?? '1'
        });

        setCloudConfig({
          mongo_uri: all.mongo_uri || '',
          mongo_db_name: all.mongo_db_name || 'pharmadesk_cloud',
          cloud_backup_frequency: all.cloud_backup_frequency || 'daily',
          cloud_auto_backup: all.cloud_auto_backup ?? '1',
          cloud_last_backup_at: all.cloud_last_backup_at || '',
          cloud_last_backup_status: all.cloud_last_backup_status || ''
        });
      }

      if (api.backup?.getDefaultDir) {
        const defaultDir = await api.backup.getDefaultDir();
        setBackupDir(defaultDir || '');
        if (api.backup.list) {
          const list = await api.backup.list(defaultDir);
          setBackupList(list || []);
        }
      }
    } catch (err) {
      toast.error('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Fetch dynamic application version from Electron
    if (api?.app?.getVersion) {
      api.app.getVersion().then((v) => {
        if (v) setAppVersion(v);
      }).catch(() => {});
    }

    // Fetch updater config
    if (api?.updater?.getConfig) {
      api.updater.getConfig().then((cfg) => {
        if (cfg) setUpdateConfig(cfg);
      }).catch(() => {});
    }

    // Subscribe to updater events
    if (api?.updater?.onStatus) {
      const unsub = api.updater.onStatus((data) => {
        setUpdateStatus(data);
        if (data.status === 'not-available') {
          toast.success(data.message || 'You have the latest version of PharmaDesk!');
        } else if (data.status === 'error') {
          toast.error(data.message || 'Update check error');
        } else if (data.status === 'downloaded') {
          toast.success(`PharmaDesk v${data.version} downloaded and ready to install!`, { duration: 5000 });
        }
      });
      return () => {
        if (typeof unsub === 'function') unsub();
      };
    }
  }, [loadSettings]);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus({ status: 'checking', message: 'Checking GitHub Releases...' });
    try {
      if (api?.updater?.check) {
        const res = await api.updater.check();
        if (res && !res.success) {
          toast.error(res.error || 'Failed to check for updates');
          setUpdateStatus({ status: 'error', message: res.error });
        }
      }
    } catch (e) {
      toast.error('Update check error: ' + e.message);
      setUpdateStatus({ status: 'error', message: e.message });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setDownloadingUpdate(true);
    try {
      if (api?.updater?.download) {
        const res = await api.updater.download();
        if (res && !res.success) {
          toast.error(res.error || 'Failed to start download');
        }
      }
    } catch (e) {
      toast.error('Download error: ' + e.message);
    } finally {
      setDownloadingUpdate(false);
    }
  };

  const handleInstallUpdate = async () => {
    const confirmed = window.confirm(
      'PharmaDesk will restart now to apply the update. Your local database (inventory, batches, customers, sales records) will be fully preserved with an automatic pre-update safety backup. Proceed?'
    );
    if (!confirmed) return;

    setInstallingUpdate(true);
    try {
      if (api?.updater?.install) {
        await api.updater.install(false);
      }
    } catch (e) {
      toast.error('Installation failed: ' + e.message);
      setInstallingUpdate(false);
    }
  };

  const handleToggleAutoCheck = async (e) => {
    const checked = e.target.checked;
    setUpdateConfig((prev) => ({ ...prev, autoUpdateCheck: checked }));
    try {
      if (api?.updater?.setConfig) {
        await api.updater.setConfig({ autoUpdateCheck: checked });
        toast.success(`Automatic startup update check ${checked ? 'enabled' : 'disabled'}`);
      }
    } catch (err) {
      toast.error('Failed to save update preference');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!api?.settings) return;
    try {
      await api.settings.setBulk(profile);
      toast.success('Pharmacy profile saved!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handleSaveDefaults = async (e) => {
    e.preventDefault();
    if (!api?.settings) return;
    try {
      await api.settings.setBulk(defaults);
      toast.success('System defaults updated!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handleSavePrinter = async (e) => {
    e.preventDefault();
    if (!api?.settings) return;
    try {
      await api.settings.setBulk(printerSettings);
      toast.success('Printer settings saved!');
    } catch (err) {
      toast.error('Save failed: ' + err.message);
    }
  };

  const handleSaveCloudConfig = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!api?.settings) return;
    try {
      await api.settings.setBulk({
        mongo_uri: cloudConfig.mongo_uri,
        mongo_db_name: cloudConfig.mongo_db_name,
        cloud_backup_frequency: cloudConfig.cloud_backup_frequency,
        cloud_auto_backup: cloudConfig.cloud_auto_backup
      });
      toast.success('MongoDB Atlas cloud settings saved!');
    } catch (err) {
      toast.error('Failed to save cloud settings: ' + err.message);
    }
  };

  const handleTestMongoConnection = async () => {
    if (!cloudConfig.mongo_uri?.trim()) {
      toast.error('Please enter a MongoDB Atlas Connection URI');
      return;
    }
    setTestingConnection(true);
    setTestResult(null);
    try {
      if (api?.backup?.testMongo) {
        const res = await api.backup.testMongo(cloudConfig.mongo_uri, cloudConfig.mongo_db_name);
        setTestResult(res);
        if (res.success) {
          toast.success(res.message);
        } else {
          toast.error(res.message);
        }
      }
    } catch (err) {
      const msg = err.message || 'Connection failed';
      setTestResult({ success: false, message: msg });
      toast.error('Atlas Error: ' + msg);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleBackupToAtlas = async () => {
    if (!cloudConfig.mongo_uri?.trim()) {
      toast.error('Please configure MongoDB Atlas URI first.');
      return;
    }
    setCloudBackingUp(true);
    try {
      // Auto-save settings first
      if (api?.settings) {
        await api.settings.setBulk({
          mongo_uri: cloudConfig.mongo_uri,
          mongo_db_name: cloudConfig.mongo_db_name,
          cloud_backup_frequency: cloudConfig.cloud_backup_frequency,
          cloud_auto_backup: cloudConfig.cloud_auto_backup
        });
      }
      if (api?.backup?.backupToAtlas) {
        const res = await api.backup.backupToAtlas({
          uri: cloudConfig.mongo_uri,
          dbName: cloudConfig.mongo_db_name,
          type: 'manual'
        });
        if (res.success) {
          toast.success(res.message || 'Cloud backup to MongoDB Atlas completed!');
          setCloudConfig(prev => ({
            ...prev,
            cloud_last_backup_at: res.timestamp,
            cloud_last_backup_status: 'Success'
          }));
        }
      }
    } catch (err) {
      toast.error('Cloud backup failed: ' + err.message);
    } finally {
      setCloudBackingUp(false);
    }
  };

  const handleRestoreFromAtlas = async () => {
    if (!cloudConfig.mongo_uri?.trim()) {
      toast.error('Please configure MongoDB Atlas URI first.');
      return;
    }
    const confirmed = window.confirm(
      'IMPORTANT: Pulling from MongoDB Atlas requires internet connection and will restore data into your local database. A local safety copy will be saved automatically first. Continue?'
    );
    if (!confirmed) return;

    setCloudRestoring(true);
    try {
      if (api?.backup?.restoreFromAtlas) {
        const res = await api.backup.restoreFromAtlas({
          uri: cloudConfig.mongo_uri,
          dbName: cloudConfig.mongo_db_name
        });
        if (res.success) {
          toast.success(`Cloud restore complete! Restored ${res.restored.medicines} medicines, ${res.restored.batches} batches, ${res.restored.sales} sales.`);
          setTimeout(() => window.location.reload(), 1500);
        }
      }
    } catch (err) {
      toast.error('Cloud restore failed: ' + err.message);
    } finally {
      setCloudRestoring(false);
    }
  };

  const handleCreateInstantBackup = async () => {
    if (!api?.backup?.create) return;
    setBackupCreating(true);
    try {
      const res = await api.backup.create();
      if (res?.success) {
        toast.success(`Backup created: ${res.fileName}`);
        if (api.backup.list && backupDir) {
          const list = await api.backup.list(backupDir);
          setBackupList(list || []);
        }
      } else {
        toast.error('Backup creation failed: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Backup error: ' + err.message);
    } finally {
      setBackupCreating(false);
    }
  };

  const handleRestoreBackup = async (filePath) => {
    if (!window.confirm('WARNING: Restoring will overwrite the current database with the selected backup snapshot. Proceed?')) {
      return;
    }
    try {
      const res = await api.backup.restore(filePath);
      if (res?.success) {
        toast.success('Database restored successfully! Refreshing...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error('Restore failed: ' + (res?.error || 'Unknown error'));
      }
    } catch (err) {
      toast.error('Restore error: ' + err.message);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Top Header ── */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="pj" style={{ fontSize: 18, fontWeight: 700, color: '#101828', display: 'flex', alignItems: 'center', gap: 8, letterSpacing: '-0.01em' }}>
            <Settings style={{ color: '#0F766E' }} size={18} /> System Settings &amp; Configuration
          </h1>
          <p style={{ fontSize: 12, color: '#475467', marginTop: 2 }}>
            Pharmacy identity, receipt layout, default taxes, hardware, and disaster recovery backups
          </p>
        </div>
      </div>

      {/* ── Navigation Tabs ── */}
      <div>
        <div style={{ display: 'inline-flex', background: '#F2F4F7', padding: '3px', borderRadius: '10px', gap: '3px' }}>
          {[
            { id: 'profile', label: 'Pharmacy Profile', icon: Building2 },
            { id: 'defaults', label: 'Taxes & Thresholds', icon: Settings },
            { id: 'printer', label: 'Receipt & Hardware', icon: Printer },
            { id: 'backup', label: 'Backup & Restore', icon: Database },
            { id: 'license', label: 'License & Subscription', icon: Key },
            { id: 'updates', label: 'Updates & About', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 13px',
                  borderRadius: '7px',
                  fontSize: '12px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0F766E' : '#475467',
                  boxShadow: active ? '0 1px 3px rgba(16, 24, 40, 0.08)' : 'none',
                }}
              >
                <Icon size={14} style={{ color: active ? '#0F766E' : '#667085' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="card p-5" style={{ maxWidth: 740, borderRadius: 12 }}>
        {/* 1. PHARMACY PROFILE TAB */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
            <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#101828', paddingBottom: 8, borderBottom: '1px solid #EAECF0' }}>
              Pharmacy Business Identity
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  Pharmacy / Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={profile.pharmacy_name}
                  onChange={(e) => setProfile({ ...profile, pharmacy_name: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  Official Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={profile.pharmacy_phone}
                  onChange={(e) => setProfile({ ...profile, pharmacy_phone: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div className="col-span-2">
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  Store Address / Location *
                </label>
                <input
                  type="text"
                  required
                  value={profile.pharmacy_address}
                  onChange={(e) => setProfile({ ...profile, pharmacy_address: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  Drug Sale License # (DSL)
                </label>
                <input
                  type="text"
                  value={profile.drug_license}
                  onChange={(e) => setProfile({ ...profile, drug_license: e.target.value })}
                  className="input w-full mono"
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  NTN / Tax Registration #
                </label>
                <input
                  type="text"
                  value={profile.tax_number}
                  onChange={(e) => setProfile({ ...profile, tax_number: e.target.value })}
                  className="input w-full mono"
                />
              </div>

              <div className="col-span-2">
                <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 5 }}>
                  Receipt Footer Note
                </label>
                <textarea
                  rows="2"
                  value={profile.receipt_footer}
                  onChange={(e) => setProfile({ ...profile, receipt_footer: e.target.value })}
                  className="textarea w-full"
                />
              </div>
            </div>

            <div className="pt-1">
              <button type="submit" className="btn btn-primary btn-sm">
                <Save size={14} /> Save Profile Settings
              </button>
            </div>
          </form>
        )}

        {/* 2. TAXES & THRESHOLDS TAB */}
        {activeTab === 'defaults' && (
          <form onSubmit={handleSaveDefaults} className="flex flex-col gap-5">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F2A2E', paddingBottom: 10, borderBottom: '1px solid #E5ECEE' }}>
              Taxation &amp; Inventory Warning Defaults
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4B6468', display: 'block', marginBottom: 6 }}>
                  Default Sales Tax / GST (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={defaults.default_tax_rate}
                  onChange={(e) => setDefaults({ ...defaults, default_tax_rate: parseFloat(e.target.value) || 0 })}
                  className="input w-full"
                />
                <span style={{ fontSize: 11, color: '#6B8287', marginTop: 4, display: 'block' }}>
                  Applied automatically to POS sales
                </span>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4B6468', display: 'block', marginBottom: 6 }}>
                  Default Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  value={defaults.low_stock_threshold}
                  onChange={(e) => setDefaults({ ...defaults, low_stock_threshold: parseInt(e.target.value, 10) || 10 })}
                  className="input w-full"
                />
                <span style={{ fontSize: 11, color: '#6B8287', marginTop: 4, display: 'block' }}>
                  Triggers low stock badge on Dashboard
                </span>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4B6468', display: 'block', marginBottom: 6 }}>
                  Expiry Warning Horizon (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  value={defaults.expiry_warning_days}
                  onChange={(e) => setDefaults({ ...defaults, expiry_warning_days: parseInt(e.target.value, 10) || 60 })}
                  className="input w-full"
                />
                <span style={{ fontSize: 11, color: '#6B8287', marginTop: 4, display: 'block' }}>
                  Days in advance to flag near-expiry drugs
                </span>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4B6468', display: 'block', marginBottom: 6 }}>
                  Currency Code / Symbol
                </label>
                <input
                  type="text"
                  value={defaults.currency_symbol}
                  onChange={(e) => setDefaults({ ...defaults, currency_symbol: e.target.value })}
                  className="input w-full mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px' }}>
                <Save size={16} /> Save Defaults
              </button>
            </div>
          </form>
        )}

        {/* 3. RECEIPT & HARDWARE TAB */}
        {activeTab === 'printer' && (
          <form onSubmit={handleSavePrinter} className="flex flex-col gap-5">
            <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0F2A2E', paddingBottom: 10, borderBottom: '1px solid #E5ECEE' }}>
              Thermal POS Printer &amp; Barcode Scanner
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#4B6468', display: 'block', marginBottom: 8 }}>
                  Receipt Roll Width
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#0F2A2E', fontSize: 13.5 }}>
                    <input
                      type="radio"
                      name="paper_size"
                      value="80mm"
                      checked={printerSettings.paper_size === '80mm'}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, paper_size: e.target.value })}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>80mm Thermal (Standard ESC/POS)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#0F2A2E', fontSize: 13.5 }}>
                    <input
                      type="radio"
                      name="paper_size"
                      value="58mm"
                      checked={printerSettings.paper_size === '58mm'}
                      onChange={(e) => setPrinterSettings({ ...printerSettings, paper_size: e.target.value })}
                      style={{ accentColor: '#0F766E' }}
                    />
                    <span>58mm Thermal (Compact)</span>
                  </label>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="btn btn-primary" style={{ padding: '9px 20px' }}>
                  <Save size={16} /> Save Hardware Settings
                </button>
              </div>
            </div>
          </form>
        )}

        {/* 4. BACKUP & RESTORE TAB */}
        {activeTab === 'backup' && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#101828', paddingBottom: 8, borderBottom: '1px solid #EAECF0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cloud size={20} style={{ color: '#0F766E' }} /> Cloud Backup &amp; Disaster Recovery (MongoDB Atlas)
              </h3>
              <p style={{ fontSize: 12.5, color: '#475467', marginTop: 8, lineHeight: 1.6 }}>
                PharmaDesk utilizes an <strong>Offline-First Architecture</strong>. All billing, inventory, and pos operations run 100% locally on fast SQLite with zero internet dependency. When online, your data is securely backed up to your <strong>MongoDB Atlas</strong> cluster on your chosen schedule (Daily, Weekly, or Monthly), so your pharmacy records are never lost.
              </p>
            </div>

            {/* ── Section A: MongoDB Atlas Configuration Card ── */}
            <div className="card" style={{ padding: 20, border: '1px solid #EAECF0', borderRadius: 12, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid #F2F4F7' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDFA', border: '1px solid #CCFBF1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0F766E' }}>
                    <Cloud size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>MongoDB Atlas Cloud Sync</div>
                    <div style={{ fontSize: 11.5, color: '#667085' }}>Connect your cloud cluster for automated off-site disaster recovery</div>
                  </div>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: cloudConfig.mongo_uri ? '#ECFDF3' : '#F2F4F7', border: cloudConfig.mongo_uri ? '1px solid #D1FADF' : '1px solid #EAECF0' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: cloudConfig.mongo_uri ? '#12B76A' : '#98A2B3' }}></span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: cloudConfig.mongo_uri ? '#027A48' : '#475467' }}>
                    {cloudConfig.mongo_uri ? 'Cloud Configured' : 'Local Only'}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveCloudConfig} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* MongoDB URI Input */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>
                    MongoDB Atlas Connection URI *
                  </label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showMongoUri ? 'text' : 'password'}
                      value={cloudConfig.mongo_uri}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, mongo_uri: e.target.value })}
                      placeholder="mongodb+srv://username:password@cluster0.mongodb.net/?retryWrites=true&w=majority"
                      className="input mono"
                      style={{ width: '100%', height: 38, fontSize: 12.5, paddingRight: 40 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMongoUri(!showMongoUri)}
                      style={{ position: 'absolute', right: 10, background: 'transparent', border: 'none', color: '#667085', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title={showMongoUri ? 'Hide URI' : 'Show URI'}
                    >
                      {showMongoUri ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: '#667085', marginTop: 4, display: 'block' }}>
                    Copy this from MongoDB Atlas &gt; Database &gt; Connect &gt; Drivers (Node.js).
                  </span>
                </div>

                {/* Database Name */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>
                    Cloud Database Name
                  </label>
                  <input
                    type="text"
                    value={cloudConfig.mongo_db_name}
                    onChange={(e) => setCloudConfig({ ...cloudConfig, mongo_db_name: e.target.value })}
                    placeholder="pharmadesk_cloud"
                    className="input mono"
                    style={{ width: '100%', maxWidth: 360, height: 36, fontSize: 12.5 }}
                  />
                </div>

                {/* Backup Frequency Selection */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 8 }}>
                    Automated Cloud Backup Frequency
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
                    {[
                      { id: 'daily', label: 'Daily Backup', sub: 'Every 24 hours (Recommended)' },
                      { id: 'weekly', label: 'Weekly Backup', sub: 'Every 7 days' },
                      { id: 'monthly', label: 'Monthly Backup', sub: 'Every 30 days' },
                      { id: 'manual', label: 'Manual Only', sub: 'Only when triggered' },
                    ].map(f => {
                      const isSelected = cloudConfig.cloud_backup_frequency === f.id;
                      return (
                        <div
                          key={f.id}
                          onClick={() => setCloudConfig({ ...cloudConfig, cloud_backup_frequency: f.id })}
                          style={{
                            padding: '12px 14px',
                            borderRadius: 8,
                            border: isSelected ? '2px solid #0F766E' : '1px solid #EAECF0',
                            background: isSelected ? '#F0FDFA' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#0F766E' : '#101828' }}>
                              {f.label}
                            </span>
                            <span style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              border: isSelected ? '4px solid #0F766E' : '1px solid #D0D5DD',
                              background: '#FFFFFF'
                            }}></span>
                          </div>
                          <div style={{ fontSize: 11, color: isSelected ? '#115E59' : '#667085', marginTop: 4 }}>
                            {f.sub}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Auto Cloud Backup Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #EAECF0' }}>
                  <input
                    type="checkbox"
                    id="autoBackupCheck"
                    checked={cloudConfig.cloud_auto_backup === '1'}
                    onChange={(e) => setCloudConfig({ ...cloudConfig, cloud_auto_backup: e.target.value ? '1' : '0' })}
                    style={{ width: 16, height: 16, accentColor: '#0F766E', cursor: 'pointer' }}
                  />
                  <label htmlFor="autoBackupCheck" style={{ fontSize: 12.5, fontWeight: 600, color: '#344054', cursor: 'pointer' }}>
                    Enable automated background cloud sync when computer is connected to the internet
                  </label>
                </div>

                {/* Test Connection Banner */}
                {testResult && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 8,
                    fontSize: 12.5,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: testResult.success ? '#ECFDF3' : '#FEF3F2',
                    border: testResult.success ? '1px solid #D1FADF' : '1px solid #FECDCA',
                    color: testResult.success ? '#027A48' : '#B42318'
                  }}>
                    {testResult.success ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Status Bar */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #EAECF0' }}>
                  <div>
                    <span style={{ fontSize: 11, color: '#667085', display: 'block' }}>Last Cloud Backup</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>
                      {cloudConfig.cloud_last_backup_at ? new Date(cloudConfig.cloud_last_backup_at).toLocaleString() : 'Never backed up yet'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#667085', display: 'block' }}>Next Scheduled Cycle</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0F766E' }}>
                      {cloudConfig.cloud_backup_frequency === 'manual' ? 'Manual execution only' : `Auto (${cloudConfig.cloud_backup_frequency})`}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: '#667085', display: 'block' }}>Local Operation Mode</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>
                      Offline SQLite (Active)
                    </span>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 6 }}>
                  <button type="submit" className="btn btn-primary" style={{ height: 38 }}>
                    <Save size={15} /> Save Cloud Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleTestMongoConnection}
                    disabled={testingConnection}
                    className="btn btn-secondary"
                    style={{ height: 38 }}
                  >
                    <Cloud size={15} />
                    <span>{testingConnection ? 'Testing Connection...' : 'Test Atlas Connection'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBackupToAtlas}
                    disabled={cloudBackingUp}
                    className="btn btn-primary"
                    style={{ height: 38, background: '#0F766E' }}
                  >
                    <CloudUpload size={15} />
                    <span>{cloudBackingUp ? 'Syncing to Atlas...' : 'Backup Now to MongoDB Atlas'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFromAtlas}
                    disabled={cloudRestoring}
                    className="btn btn-secondary"
                    style={{ height: 38, color: '#B45309', borderColor: '#FEDF89' }}
                    title="Pull latest cloud snapshot down to this PC (Requires Internet)"
                  >
                    <CloudDownload size={15} />
                    <span>{cloudRestoring ? 'Pulling Data...' : 'Pull / Restore from Cloud'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* ── Section B: Local SQLite Snapshots Card ── */}
            <div className="card" style={{ padding: 20, border: '1px solid #EAECF0', borderRadius: 12, background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#101828' }}>Local SQLite Offline Snapshots</div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                    Backup folder: <span className="mono" style={{ color: '#0F766E', fontWeight: 600 }}>{backupDir || 'Documents/PharmaDesk/Backups'}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCreateInstantBackup}
                  disabled={backupCreating}
                  className="btn btn-secondary"
                  style={{ height: 36 }}
                >
                  <Download size={15} />
                  <span>{backupCreating ? 'Creating...' : 'Create Local Snapshot'}</span>
                </button>
              </div>

              {/* Local Backups List */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Saved Local Snapshots ({backupList.length})
                  </span>
                  <button type="button" onClick={loadSettings} className="btn btn-secondary btn-sm" style={{ height: 26, fontSize: 11 }} title="Refresh list">
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>

                {backupList.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 16px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #EAECF0', color: '#667085', fontSize: 12.5 }}>
                    No local backup snapshots found in directory.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                    {backupList.map((b, idx) => (
                      <div
                        key={idx}
                        style={{ padding: '10px 14px', background: '#F9FAFB', borderRadius: 8, border: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div>
                          <div className="mono" style={{ fontSize: 12.5, fontWeight: 600, color: '#101828' }}>{b.name}</div>
                          <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>
                            Created: {b.created_at || 'Recently'} • Size: {(b.size / (1024 * 1024)).toFixed(2)} MB
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(b.path)}
                          className="btn btn-secondary btn-sm"
                          style={{ height: 28, fontSize: 11.5, color: '#B45309', borderColor: '#FEDF89' }}
                          title="Restore this local snapshot"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* 5. UPDATES & ABOUT TAB */}
        {activeTab === 'updates' && (
          <div className="flex flex-col gap-5">
            {/* Branding & App Identity Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '18px 20px',
              borderRadius: 10,
              background: 'linear-gradient(135deg, #072523 0%, #0F3B37 100%)',
              border: '1px solid #144843',
              boxShadow: '0 2px 8px rgba(7, 37, 35, 0.25)',
              color: '#FFFFFF'
            }}>
              <div style={{
                width: 58,
                height: 58,
                borderRadius: 12,
                background: '#0B302C',
                border: '1px solid #1B4D47',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 6,
                flexShrink: 0
              }}>
                <img src={pharmaLogo} alt="PharmaDesk Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h2 className="pj" style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.01em' }}>
                    PharmaDesk
                  </h2>
                  <span style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: '#14B8A6',
                    color: '#042F2E',
                    letterSpacing: '0.02em'
                  }}>
                    v{appVersion}
                  </span>
                </div>
                <div style={{ fontSize: 12.5, color: '#9CC5C0', marginTop: 3 }}>
                  Offline-First Medical Store &amp; Pharmacy Management POS
                </div>
                <div style={{ fontSize: 11, color: '#6F9A95', marginTop: 4 }}>
                  Windows Desktop Application · SQLite Offline Storage · Cloud Sync Compatible
                </div>
              </div>
            </div>

            {/* Software Updates Card */}
            <div style={{
              padding: 16,
              background: '#F9FAFB',
              borderRadius: 10,
              border: '1px solid #EAECF0',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h3 style={{ fontSize: 13.5, fontWeight: 700, color: '#101828', margin: 0 }}>
                    Software Updates &amp; Release Channel
                  </h3>
                  <div style={{ fontSize: 11.5, color: '#667085', marginTop: 2 }}>
                    Official distribution via GitHub Releases · Automated version checking
                  </div>
                </div>

                {/* Status Pill */}
                <div>
                  {updateStatus?.status === 'downloaded' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#ECFDF3', color: '#027A48', border: '1px solid #D1FADF', fontSize: 11.5, fontWeight: 600 }}>
                      ✓ Update Ready to Install
                    </span>
                  ) : updateStatus?.status === 'downloading' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#EFF8FF', color: '#175CD3', border: '1px solid #D1E9FF', fontSize: 11.5, fontWeight: 600 }}>
                      ⬇ Downloading ({updateStatus?.percent || 0}%)
                    </span>
                  ) : updateStatus?.status === 'available' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#FEF0C7', color: '#B54708', border: '1px solid #FEDF89', fontSize: 11.5, fontWeight: 600 }}>
                      ★ New Version v{updateStatus?.version} Available
                    </span>
                  ) : updateStatus?.status === 'checking' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#F0FDFA', color: '#0F766E', border: '1px solid #CCFBF1', fontSize: 11.5, fontWeight: 600 }}>
                      Checking releases...
                    </span>
                  ) : updateStatus?.status === 'error' ? (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#FEF3F2', color: '#B42318', border: '1px solid #FECDCA', fontSize: 11.5, fontWeight: 600 }}>
                      Check Failed
                    </span>
                  ) : (
                    <span style={{ padding: '4px 10px', borderRadius: 12, background: '#F2F4F7', color: '#344054', border: '1px solid #EAECF0', fontSize: 11.5, fontWeight: 600 }}>
                      Up to Date (v{appVersion})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Rows */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCheckUpdate}
                  disabled={checkingUpdate || downloadingUpdate}
                  className="btn btn-secondary btn-sm"
                  style={{ height: 32, fontSize: 12, gap: 6 }}
                >
                  <RefreshCw size={13} className={checkingUpdate ? 'animate-spin' : ''} />
                  <span>{checkingUpdate ? 'Checking GitHub...' : 'Check for Updates Now'}</span>
                </button>

                {updateStatus?.status === 'available' && !downloadingUpdate && (
                  <button
                    type="button"
                    onClick={handleDownloadUpdate}
                    className="btn btn-primary btn-sm"
                    style={{ height: 32, fontSize: 12, gap: 6, background: '#0F766E' }}
                  >
                    <Download size={13} />
                    <span>Download v{updateStatus.version}</span>
                  </button>
                )}

                {updateStatus?.status === 'downloaded' && (
                  <button
                    type="button"
                    onClick={handleInstallUpdate}
                    disabled={installingUpdate}
                    className="btn btn-sm"
                    style={{
                      height: 32,
                      fontSize: 12,
                      gap: 6,
                      background: '#027A48',
                      color: '#FFFFFF',
                      border: 'none',
                      boxShadow: '0 2px 4px rgba(2, 122, 72, 0.3)'
                    }}
                  >
                    <CheckCircle2 size={13} />
                    <span>{installingUpdate ? 'Restarting...' : 'Install & Restart PharmaDesk'}</span>
                  </button>
                )}
              </div>

              {/* Downloading Progress Bar */}
              {updateStatus?.status === 'downloading' && (
                <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #D1E9FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#344054', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600 }}>Downloading update package...</span>
                    <span style={{ fontWeight: 700, color: '#175CD3' }}>{updateStatus.percent || 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: 6, borderRadius: 3, background: '#EAECF0', overflow: 'hidden' }}>
                    <div style={{
                      width: `${updateStatus.percent || 0}%`,
                      height: '100%',
                      background: '#175CD3',
                      transition: 'width 0.2s ease'
                    }} />
                  </div>
                  {updateStatus.total > 0 && (
                    <div style={{ fontSize: 10.5, color: '#667085', marginTop: 4 }}>
                      {((updateStatus.transferred || 0) / (1024 * 1024)).toFixed(1)} MB of {((updateStatus.total || 0) / (1024 * 1024)).toFixed(1)} MB
                      {updateStatus.bytesPerSecond > 0 && ` · ${((updateStatus.bytesPerSecond || 0) / 1024).toFixed(0)} KB/s`}
                    </div>
                  )}
                </div>
              )}

              {/* Release Notes Preview */}
              {(updateStatus?.status === 'available' || updateStatus?.status === 'downloaded') && updateStatus?.releaseNotes && (
                <div style={{ background: '#FFFFFF', padding: 12, borderRadius: 8, border: '1px solid #EAECF0' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: '#344054', marginBottom: 4 }}>Release Notes:</div>
                  <div style={{ fontSize: 11.5, color: '#475467', lineHeight: '16px', maxHeight: 90, overflowY: 'auto' }}>
                    {typeof updateStatus.releaseNotes === 'string'
                      ? updateStatus.releaseNotes
                      : 'Performance improvements, stability patches, and updated pharmacy workflows.'}
                  </div>
                </div>
              )}

              {/* Preferences: Auto-check toggle */}
              <div style={{ paddingTop: 10, borderTop: '1px solid #EAECF0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <label htmlFor="auto_update_toggle" style={{ fontSize: 12, fontWeight: 600, color: '#344054', cursor: 'pointer' }}>
                    Automatic Update Checking
                  </label>
                  <div style={{ fontSize: 11, color: '#667085' }}>
                    Silently check for new versions on application startup without interrupting sales
                  </div>
                </div>
                <input
                  id="auto_update_toggle"
                  type="checkbox"
                  checked={updateConfig.autoUpdateCheck}
                  onChange={handleToggleAutoCheck}
                  style={{ width: 16, height: 16, accentColor: '#0F766E', cursor: 'pointer' }}
                />
              </div>

              {/* Metadata footnote */}
              <div style={{ fontSize: 11, color: '#667085', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {updateConfig.lastUpdateCheck && (
                  <div>Last checked: {new Date(updateConfig.lastUpdateCheck).toLocaleString()}</div>
                )}
                <div>Distribution Repository: <span className="mono" style={{ color: '#0F766E' }}>github.com/pharmadesk/pharmadesk-pos</span></div>
              </div>
            </div>

            {/* Database & Data Protection Guarantee Card */}
            <div style={{
              padding: 14,
              borderRadius: 8,
              background: '#F0FDF4',
              border: '1px solid #DCFCE7',
              display: 'flex',
              gap: 12
            }}>
              <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#14532D' }}>
                  Zero Data Loss Guarantee
                </div>
                <div style={{ fontSize: 11.5, color: '#166534', marginTop: 2, lineHeight: '17px' }}>
                  PharmaDesk updates replace only executable binaries. All your medicine inventory, batch tracking, customer ledgers, sales transactions, expense records, and system settings reside securely in your offline SQLite database (<span className="mono">pharmadesk.db</span>). An automated database safety snapshot is saved to your <span className="mono">backups/pre-update</span> directory before any update is executed.
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 6. LICENSE & SUBSCRIPTION TAB */}
        {activeTab === 'license' && (
          <div style={{ marginTop: 4 }}>
            <SubscriptionPage />
          </div>
        )}
      </div>
    </div>
  );
}
