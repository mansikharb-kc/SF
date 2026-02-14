import React, { useState, useEffect } from 'react';
import { Share2, Clock, RefreshCw, ChevronRight, CheckCircle, Database, Trash2, HelpCircle, X, Download, Filter, Layout, Search, Moon, Sun, ArrowRight, FileText, Globe, Cloud, RotateCcw } from 'lucide-react';
import { syncSheet, getHistory, getData, deleteRecord, apiBase } from './services/api';
import { format } from 'date-fns';
import axios from 'axios';

function App() {
  const [userEmail, setUserEmail] = useState(localStorage.getItem('sf_user_email') || '');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Main App States
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [viewData, setViewData] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [deleteInputId, setDeleteInputId] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('mansikharb.kc@gmail.com');

  // Global Leads States
  const [allLeads, setAllLeads] = useState([]);
  const [totalLeads, setTotalLeads] = useState(0);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsSearch, setLeadsSearch] = useState('');
  const [leadsCategory, setLeadsCategory] = useState('all');
  const [leadsPage, setLeadsPage] = useState(0);
  const [leadsLimit] = useState(50);
  const [activeView, setActiveView] = useState('google-import'); // 'google-import', 'zoho-export', 'leads'
  const [isDarkMode, setIsDarkMode] = useState(localStorage.getItem('sf_theme') === 'dark');

  // --- ZOHO LOGIC START ---
  const [zohoLeads, setZohoLeads] = useState([]);
  const [zohoLoading, setZohoLoading] = useState(false);
  const [selectedBatchIndex, setSelectedBatchIndex] = useState(null);
  const [zohoSyncLoading, setZohoSyncLoading] = useState(false);
  const [zohoConnected, setZohoConnected] = useState(false);
  const [zohoHistory, setZohoHistory] = useState([]);
  const [zohoHistoryLoading, setZohoHistoryLoading] = useState(false);
  const [zohoStats, setZohoStats] = useState([]);

  useEffect(() => {
    if (activeView === 'zoho-export') {
      fetchZohoData();
      checkZohoStatus();
      fetchZohoHistory();
    }
  }, [activeView]);

  const checkZohoStatus = async () => {
    try {
      const { data } = await axios.get(`${apiBase}/api/zoho/status`);
      setZohoConnected(data.connected);
    } catch (e) {
      setZohoConnected(false);
    }
  };

  const handleConnectZoho = async () => {
    try {
      const { data } = await axios.get(`${apiBase}/api/zoho/auth-url`);
      if (data.url) {
        // Open Zoho auth in a new window/popup
        window.open(data.url, 'ZohoAuth', 'width=600,height=700');
      }
    } catch (e) {
      alert('Failed to get connection URL: ' + e.message);
    }
  };

  const fetchZohoData = async () => {
    setZohoLoading(true);
    try {
      const { data } = await axios.get(`${apiBase}/api/zoho/leads?status=Pending&limit=1000`);

      let leads = data.leads || [];
      // Sort by ID DESC (Newest on top)
      leads.sort((a, b) => b.id - a.id);

      setZohoLeads(leads);
      if (data.stats) setZohoStats(data.stats);
      if (leads.length > 0 && selectedBatchIndex === null) {
        setSelectedBatchIndex(0); // Auto-select first batch
      }
    } catch (e) {
      console.error(e);
    } finally {
      setZohoLoading(false);
    }
  };

  const fetchZohoHistory = async () => {
    setZohoHistoryLoading(true);
    try {
      const { data } = await axios.get(`${apiBase}/api/zoho/leads?status=Success&limit=2000`);
      setZohoHistory(data.leads || []);
      if (data.stats) setZohoStats(data.stats);
    } catch (e) {
      console.error("Failed to fetch Zoho history", e);
    } finally {
      setZohoHistoryLoading(false);
    }
  };

  const handleZohoBatchSync = async (batchIndex) => {
    setZohoSyncLoading(true);
    try {
      // Calculate slices
      const start = batchIndex * 20;
      const end = start + 20;
      const batchToSync = zohoLeads.slice(start, end);
      const leadIds = batchToSync.map(l => l.id);

      const { data } = await axios.post(`${apiBase}/api/zoho/sync`, { leadIds });

      const successCount = data.results.filter(r => r.status === 'SUCCESS').length;
      const failCount = data.results.length - successCount;

      alert(`Successfully Done! Batch Sync Completed: ${successCount} Success, ${failCount} Failed.`);
      fetchZohoData(); // Refresh list to remove synced items (as they are no longer PENDING)
      fetchZohoHistory(); // Refresh history panel
      setSelectedBatchIndex(0); // Reset to first batch
    } catch (e) {
      alert('Sync Failed: ' + (e.response?.data?.error || e.message));
    } finally {
      setZohoSyncLoading(false);
    }
  };

  const handleZohoSyncSingle = async (lead) => {
    try {
      const { data } = await axios.post(`${apiBase}/api/zoho/sync`, { leadIds: [lead.id] });
      if (data.results[0].status === 'SUCCESS') {
        alert('Successfully Done!');
        fetchZohoData();
        fetchZohoHistory();
      } else {
        alert('Failed: ' + data.results[0].error);
        fetchZohoData(); // Update to show error
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  };

  const handleZohoUndo = async (lead) => {
    try {
      const { data } = await axios.post(`${apiBase}/api/zoho/undo`, { leadId: lead.id });
      alert(data.message || 'Successfully Reverted!');
      fetchZohoData();
      fetchZohoHistory();
    } catch (e) {
      alert('Undo Failed: ' + (e.response?.data?.error || e.message));
    }
  };
  // --- ZOHO LOGIC END ---

  const [stagingProcessing, setStagingProcessing] = useState(false);

  const handleStageLeads = async () => {
    setStagingProcessing(true);
    try {
      await axios.post(`${apiBase}/api/crm-sync/stage`);
      await fetchZohoData();
      alert('New leads identified and staged for review!');
    } catch (e) {
      alert('Staging failed: ' + e.message);
    } finally {
      setStagingProcessing(false);
    }
  };

  const handlePushAllToZoho = async () => {
    setStagingProcessing(true);
    try {
      const { data } = await axios.post(`${apiBase}/api/crm-sync/process`);
      const success = data.results.filter(r => r.status === 'SUCCESS').length;
      alert(`Successfully Done! Bulk Sync Completed: ${success} Success, ${data.results.length - success} Failed.`);
      await fetchZohoData();
      await fetchZohoHistory();
    } catch (e) {
      alert('Bulk Sync Failed: ' + e.message);
    } finally {
      setStagingProcessing(false);
    }
  };

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sf_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sf_theme', 'light');
    }
  }, [isDarkMode]);


  // Load history on mount (only if logged in)
  useEffect(() => {
    // Also fetch config
    const fetchConfig = async () => {
      try {
        const { getConfig } = await import('./services/api');
        const config = await getConfig();
        if (config.primaryAdminEmail) {
          setPrimaryEmail(config.primaryAdminEmail);
        }
      } catch (e) {
        console.warn("Failed to fetch backend config", e);
      }
    };
    fetchConfig();

    if (userEmail) {
      fetchHistory();
      // Fetch leads immediately
      fetchLeads();

      const interval = setInterval(() => {
        fetchHistory();
        if (activeView === 'leads') fetchLeads();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, activeView]);

  // Refetch leads when search, category, or page changes (with Debounce)
  useEffect(() => {
    if (userEmail && activeView === 'leads') {
      const timer = setTimeout(() => {
        fetchLeads();
      }, 500); // 500ms delay
      return () => clearTimeout(timer);
    }
  }, [leadsSearch, leadsCategory, leadsPage]);


  const fetchHistory = async () => {
    try {
      const { getHistory } = await import('./services/api');
      const data = await getHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      const { getLeads } = await import('./services/api');
      const data = await getLeads(leadsSearch, leadsCategory, leadsLimit, leadsPage * leadsLimit);
      setAllLeads(Array.isArray(data.leads) ? data.leads : []);
      setTotalLeads(data.total || 0);
    } catch (error) {
      console.error("Failed to load leads", error);
      setAllLeads([]);
    } finally {
      setLeadsLoading(false);
    }
  };


  const handleSync = async () => {
    setLoading(true);
    setSyncResult(null);
    try {
      const { syncSheet } = await import('./services/api');
      const result = await syncSheet(null);
      if (result.started) {
        alert("Sync started in the background! Please wait 1-2 minutes for the data to appear.");
      } else {
        setSyncResult(result);
      }
      setTimeout(() => fetchHistory(), 3000);
    } catch (error) {
      console.error("Sync error details:", error);
      if (error.response && error.response.status === 409) {
        alert("Sync is already running! Please wait.");
      } else {
        const errorData = error.response?.data;
        const errorMsg = errorData?.error || errorData?.message || error.message || "Unknown error";
        alert("Sync Failed: " + errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewData = async (log) => {
    setSelectedBatch(log);
    setViewLoading(true);
    try {
      const { getData } = await import('./services/api');
      const data = await getData(log.table_name, log.batch_id);
      setViewData(data);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setViewLoading(false);
    }
  };

  const closeDataView = () => {
    setSelectedBatch(null);
    setViewData([]);
  };

  const handleDelete = async (row) => {
    const id = row.sheet_id;
    if (!id) {
      alert("Error: Cannot identify record ID (sheet_id is missing)");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete record ${id}?`)) {
      return;
    }
    try {
      const { deleteRecord } = await import('./services/api');
      const tableName = selectedBatch?.table_name || 'leads';
      await deleteRecord(tableName, id);
      setViewData(prev => prev.filter(item => item.sheet_id !== id));
    } catch (error) {
      console.error("Failed to delete record", error);
      alert("Delete Failed: " + (error.response?.data?.error || error.message));
    }
  };

  const handleManualDelete = async () => {
    if (!deleteInputId.trim()) {
      alert("Please enter a valid Leads ID (Sheet ID).");
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete record ${deleteInputId}?`)) {
      return;
    }
    setLoading(true);
    try {
      const { deleteRecord } = await import('./services/api');
      await deleteRecord('leads', deleteInputId);
      alert("Record deleted successfully.");
      setDeleteInputId('');
      if (selectedBatch && selectedBatch.table_name === 'leads') {
        handleViewData(selectedBatch);
      } else {
        fetchHistory();
      }
    } catch (error) {
      console.error("Manual delete failed", error);
      alert("Delete Failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    setLoginPendingMessage(null);
    try {
      const { loginUser } = await import('./services/api');
      const result = await loginUser(loginEmail, loginPassword);

      if (result.pending) {
        setLoginPendingMessage(result.message);
      } else if (result.success) {
        localStorage.setItem('sf_user_email', loginEmail.toLowerCase());
        setUserEmail(loginEmail.toLowerCase());
        setLoginError('');
      } else {
        setLoginError("Invalid credentials. Please try again.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      const errorData = error.response?.data;
      const status = error.response?.status;

      if (status === 401) {
        setLoginError("Invalid email or password. Remember: Password is case-sensitive (e.g., Admin@123).");
      } else if (status === 403) {
        setLoginError(errorData?.error || "Account not active.");
      } else if (error.message === "Network Error") {
        setLoginError("Network Error: Cannot connect to the backend server. Is it running on port 5000?");
      } else {
        const errorMsg = errorData?.error || error.message || "Login failed. Please try again.";
        setLoginError(`Error (${status || 'Unknown'}): ${errorMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const [loginPendingMessage, setLoginPendingMessage] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [regStep, setRegStep] = useState(1); // 1: Form, 2: OTP
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regOtp, setRegOtp] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      setRegLoading(false);
      return;
    }

    try {
      const { requestOTP } = await import('./services/api');
      const res = await requestOTP(regEmail, regPassword, regConfirmPassword);
      setRegStep(2);
      // Backend message says OTP sent to admin
    } catch (error) {
      setRegError(error.response?.data?.error || "Request failed. Please try again.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    try {
      const { verifyOTP, registerUser } = await import('./services/api');

      // Step 2: Verify
      await verifyOTP(regEmail, regOtp);

      // Step 3: Register
      const res = await registerUser(regEmail, regPassword);
      setRegSuccess(res.message);
      setRegStep(1); // Reset for next time
    } catch (error) {
      setRegError(error.response?.data?.error || "Registration failed. Please check OTP.");
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('sf_user_email');
    setUserEmail('');
    setLoginEmail('');
    setLoginPassword('');
    setLoginPendingMessage(null);
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
              <div className="inline-flex p-4 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/50 mb-4">
                <Database className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">SyncFlow</h1>
              <p className="text-slate-400">Company Database Automation</p>
            </div>

            {showRegister ? (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-white">Create Account</h2>
                  <p className="text-slate-400 text-sm">Request access to SyncFlow</p>
                </div>

                {regSuccess ? (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-4">
                    <div className="space-y-2">
                      <p className="text-emerald-500 font-bold">Success!</p>
                      <p className="text-slate-300 text-sm">{regSuccess}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowRegister(false);
                        setRegSuccess('');
                        setRegEmail('');
                        setRegPassword('');
                        setRegConfirmPassword('');
                        setRegOtp('');
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-all"
                    >
                      Sign In Now
                    </button>
                  </div>
                ) : regStep === 1 ? (
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">Email</label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                      <input
                        type="password"
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Set a password"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300 ml-1">Confirm Password</label>
                      <input
                        type="password"
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>

                    {regError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                        {regError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group"
                    >
                      {regLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <FileText className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                          Proceed to OTP
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowRegister(false); }}
                      className="w-full text-sm text-slate-500 hover:text-white transition-colors pt-2"
                    >
                      Wait, I have an account. Sign In
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                    <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-2 animate-in fade-in duration-500">
                      <p className="text-indigo-400 font-bold text-sm flex items-center gap-2">
                        <Database className="w-4 h-4" /> OTP Sent to Admin
                      </p>
                      <p className="text-slate-300 text-xs leading-relaxed">
                        An OTP has been sent to the primary administrator.<br />
                        Please contact <span className="text-indigo-400 font-medium">mansikharb.kc@gmail.com</span> to get the 6-digit code.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-indigo-400 ml-1 font-bold">Verification OTP</label>
                      <input
                        type="text"
                        required
                        value={regOtp}
                        onChange={(e) => setRegOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        className="w-full px-5 py-4 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl text-white text-center text-3xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>

                    {regError && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm text-center">
                        {regError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {regLoading ? 'Verifying...' : 'Complete Registration'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegStep(1)}
                      className="w-full text-sm text-slate-500 hover:text-indigo-400 transition-colors pt-2"
                    >
                      ← Back to Details
                    </button>
                  </form>
                )}
              </div>
            ) : loginPendingMessage ? (
              <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-4">
                  <h2 className="text-xl font-bold text-amber-500">Access Restricted</h2>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Only approved users can sign in.<br />
                    If you do not have access, please request approval from the administrator.
                  </p>
                  <div className="pt-2">
                    <p className="text-xs text-slate-500 mb-3 uppercase tracking-wider font-semibold">👉 Administrator:</p>
                    <a
                      href={`mailto:${primaryEmail}?subject=Access Request&body=Please approve my access for email: ${loginEmail}`}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-xl font-bold transition-all hover:scale-[1.05] active:scale-[0.95]"
                    >
                      Contact Administrator
                    </a>
                  </div>
                  <p className="text-[10px] text-slate-500 italic mt-4">
                    Once approved by {primaryEmail}, you will be able to log in.
                  </p>
                </div>
                <button
                  onClick={() => setLoginPendingMessage(null)}
                  className="text-sm text-slate-400 hover:text-white transition-colors underline underline-offset-4"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Work Email</label>
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-shake text-center">
                    {loginError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium border-b border-indigo-400/30 hover:border-indigo-400 pb-0.5"
                  >
                    Don't have access? Create Account
                  </button>
                </div>
              </form>
            )}

            <div className="text-center">
              <p className="text-xs text-slate-500">
                Authorized Personnel Only • Reach out to {primaryEmail}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 font-sans selection:bg-indigo-100 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                SyncFlow
              </h1>
            </div>

            <nav className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => setActiveView('google-import')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'google-import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Cloud className="w-4 h-4" />
                Google Import
              </button>
              <button
                onClick={() => setActiveView('zoho-export')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'zoho-export' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Share2 className="w-4 h-4" />
                Zoho Export
              </button>
              <button
                onClick={() => setActiveView('leads')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'leads' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <Database className="w-4 h-4" />
                Leads
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900 dark:text-white">{userEmail}</span>
              <span className="text-[10px] text-slate-400">Primary Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden px-4 pb-4 flex justify-center border-t border-slate-50 pt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveView('google-import')}
            className={`px-4 py-3 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'google-import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Google Import
          </button>
          <button
            onClick={() => setActiveView('zoho-export')}
            className={`px-4 py-3 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'zoho-export' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Zoho Export
          </button>
          <button
            onClick={() => setActiveView('leads')}
            className={`px-4 py-3 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'leads' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Leads
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'google-import' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Auto Sync Status */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-800 p-8 transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3 flex items-center gap-3 dark:text-white">
                    <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                      <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    Google Sheets Synchronization
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
                    The system automatically monitors and imports data from your linked Google Sheet every 30 minutes.
                    <br />
                    <span className="text-sm text-slate-400 dark:text-slate-500 font-mono mt-2 block">Source: Architects & Designers INDIA 2</span>
                  </p>

                  <div className="flex gap-4">
                    <button
                      onClick={handleSync}
                      disabled={loading}
                      className={`px-8 py-4 rounded-2xl font-bold text-white shadow-xl transition-all active:scale-95 flex items-center gap-3
                            ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'}
                          `}
                    >
                      {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                      {loading ? 'Processing Sync...' : 'Sync Data Now'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 px-8 py-6 rounded-3xl text-center w-full md:w-auto md:min-w-[260px] shadow-inner">
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] font-black mb-2">System Pulse</div>
                  <div className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                    {history.length > 0 ? format(new Date(history[0].sync_timestamp), 'h:mm a') : '--:--'}
                  </div>
                  <div className="flex flex-col items-center gap-2 mt-4">
                    {history.length > 0 && (
                      <>
                        <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-sm 
                          ${history[0].status === 'SUCCESS' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                          {history[0].status === 'SUCCESS' ? 'Operational' : 'Sync Alert'}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          Trigger: {history[0].trigger_type || 'AUTO'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Sync Result Details */}
            {syncResult && (
              <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-emerald-100 dark:border-emerald-900/30 p-8 animate-in zoom-in duration-500">
                <h2 className="text-xl font-bold mb-6 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                    <Cloud className="w-5 h-5" />
                  </div>
                  Sync Successfully Completed
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {syncResult.results.map((res, idx) => (
                    <div key={idx} className="border-2 border-slate-50 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 hover:border-emerald-100 dark:hover:border-emerald-900/50 transition-all group">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex justify-between items-center gap-3">
                        <span className="truncate">{res.sheet}</span>
                        <span className="shrink-0 text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg">
                          +{res.inserted} new
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Verified {res.found || 0} records across the sheet.</p>
                      <div className="flex flex-wrap gap-1">
                        {res.columns && res.columns.slice(0, 5).map((col) => (
                          <span key={col} className="text-[9px] bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 text-slate-400 dark:text-slate-300 px-2 py-0.5 rounded uppercase font-bold">
                            {col}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Sync History & Detailed View */}
            <div className="grid lg:grid-cols-3 gap-8">
              <section className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[400px] lg:h-[700px]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                    Sync Logs
                  </h3>
                  <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">{history.length} Batches</span>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                  {history.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => handleViewData(log)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group flex flex-col gap-3
                        ${selectedBatch?.id === log.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 shadow-lg shadow-indigo-100 dark:shadow-none'
                          : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hover:shadow-md'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate pr-2">
                          {log.sheet_name}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase whitespace-nowrap">
                          {format(new Date(log.sync_timestamp), 'HH:mm')}
                          <span className="hidden sm:inline"> • {format(new Date(log.sync_timestamp), 'MMM d')}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md
                              ${log.status === 'SUCCESS' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                              {log.status === 'SUCCESS' ? 'Success' : 'Failed'}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {log.trigger_type || 'AUTO'}
                            </span>
                          </div>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-bold
                            ${log.leads_inserted_count > 0
                            ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400 dark:text-slate-500'}`}>
                          {log.leads_inserted_count > 0 ? (
                            <>
                              <Database className="w-3 h-3" />
                              <span>+{log.leads_inserted_count} Records</span>
                            </>
                          ) : (
                            <span>No New Data</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[500px] lg:h-[700px] relative">
                {!selectedBatch ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border-2 border-slate-100 dark:border-slate-700">
                      <FileText className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-slate-800 dark:text-slate-200 font-bold text-lg">Detailed Inspection</p>
                      <p className="text-slate-400 dark:text-slate-500 text-sm">Select any synchronization log from the list to inspect the data lifecycle and specific sheet records.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex flex-col gap-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-xl flex items-center gap-2">
                            {selectedBatch.sheet_name}
                          </h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                            <span>Batch ID: <span className="font-mono text-slate-700 dark:text-slate-300">{selectedBatch.batch_id.slice(0, 8)}</span></span>
                            <span>•</span>
                            <span>Synced at: {format(new Date(selectedBatch.sync_timestamp), 'PPp')}</span>
                          </div>
                        </div>
                        <button onClick={closeDataView} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-all">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className={`p-3 rounded-xl ${selectedBatch.leads_inserted_count > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                          <Database className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Records Added</p>
                          <p className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-1">{selectedBatch.leads_inserted_count}</p>
                        </div>

                        <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 mx-2"></div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Sync Status</p>
                          <p className={`text-base font-bold leading-tight mt-1 ${selectedBatch.status === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                            {selectedBatch.status === 'SUCCESS' ? 'Completed Successfully' : 'Encountered Errors'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-white dark:bg-slate-950 p-4">
                      {viewLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                        </div>
                      ) : viewData.length > 0 ? (
                        <div className="rounded-2xl border-2 border-slate-50 dark:border-slate-800 overflow-hidden shadow-inner">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800">
                                <tr>
                                  {Object.keys(viewData[0] || {}).filter(k => !k.startsWith('_')).map(key => (
                                    <th key={key} className="px-5 py-4 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{key}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                {viewData.map((row, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800 transition-colors">
                                    {Object.keys(row).filter(k => !k.startsWith('_')).map(key => (
                                      <td key={key} className="px-5 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={row[key]}>{row[key]}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                          <Database className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                          <p className="text-slate-500 dark:text-slate-400 font-medium">No new records were added in this specific batch.<br />(Or data was not retrievable)</p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>
          </div>
        )}

        {activeView === 'zoho-export' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 dark:text-white">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
                      <Share2 className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    Zoho CRM Batch Export
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${zohoConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${zohoConnected ? 'text-emerald-600' : 'text-red-600'}`}>
                        {zohoConnected ? 'CRM Connected & Online' : 'CRM Disconnected'}
                      </span>
                    </div>
                    {!zohoConnected && (
                      <button
                        onClick={handleConnectZoho}
                        className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-100 dark:border-indigo-800 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                      >
                        Setup Connection
                      </button>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 mt-2">
                    Review and push pending leads in controlled batches of 20 records for maximum reliability.
                  </p>
                  <div className="flex items-center gap-4 mt-4">
                    {['Pending', 'Success', 'Failed'].map(status => {
                      const count = zohoStats.find(s => s.status === status)?.count || 0;
                      const label = status === 'Success' ? 'Total Pushed' : status;
                      return (
                        <div key={status} className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</span>
                          <span className={`text-sm font-bold ${status === 'Pending' ? 'text-amber-500' : status === 'Success' ? 'text-emerald-500' : 'text-red-600'}`}>
                            {count.toLocaleString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleStageLeads}
                    disabled={zohoLoading || stagingProcessing}
                    className="px-5 py-3 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm"
                  >
                    {stagingProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4 text-indigo-500" />}
                    Stage New Leads
                  </button>
                  <button
                    onClick={handlePushAllToZoho}
                    disabled={zohoLoading || stagingProcessing || zohoLeads.length === 0}
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 dark:shadow-none transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {stagingProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-5 h-5" />}
                    Bulk Sync (Next 100)
                  </button>
                </div>
              </div>
            </section>

            {/* Batch Distribution & Selection */}
            <div className="grid lg:grid-cols-4 gap-8">
              {/* Batch Selector */}
              <section className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[700px]">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-black text-slate-400 dark:text-slate-500 text-[10px] uppercase tracking-widest">Select Batch</h3>
                    <button onClick={fetchZohoData} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors">
                      <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${zohoLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white">{zohoLeads.length}</div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Pending Staged Leads</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/20 dark:bg-slate-900/20">
                  {zohoLeads.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4 opacity-40">
                      <Database className="w-12 h-12 text-slate-300" />
                      <p className="text-sm font-bold text-slate-500">All caught up!<br />No leads pending staging.</p>
                    </div>
                  ) : (
                    Array.from({ length: Math.ceil(zohoLeads.length / 20) }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedBatchIndex(idx)}
                        className={`w-full p-4 rounded-2xl text-left border-2 transition-all flex justify-between items-center group relative overflow-hidden
                                        ${selectedBatchIndex === idx
                            ? 'bg-amber-600 border-amber-500 shadow-xl shadow-amber-200 dark:shadow-none'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-amber-200 dark:hover:border-amber-900/50'}`}
                      >
                        <div className="relative z-10">
                          <div className={`font-black text-[10px] uppercase tracking-widest ${selectedBatchIndex === idx ? 'text-amber-200' : 'text-slate-400'}`}>
                            Batch #{idx + 1}
                          </div>
                          <div className={`font-bold text-base ${selectedBatchIndex === idx ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                            {Math.min(20, zohoLeads.length - (idx * 20))} Records
                          </div>
                          <div className={`text-[10px] mt-0.5 ${selectedBatchIndex === idx ? 'text-amber-100/70' : 'text-slate-500'}`}>
                            Range: {(idx * 20) + 1} - {Math.min((idx + 1) * 20, zohoLeads.length)}
                          </div>
                        </div>
                        <ChevronRight className={`w-5 h-5 transition-transform relative z-10 ${selectedBatchIndex === idx ? 'text-white translate-x-1' : 'text-slate-300 group-hover:translate-x-1'}`} />

                        {selectedBatchIndex === idx && (
                          <div className="absolute top-0 right-0 p-1 opacity-20">
                            <Cloud className="w-12 h-12 -mr-4 -mt-4 text-white" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </section>

              {/* Detail View */}
              <section className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-[700px] relative">
                {selectedBatchIndex === null || zohoLeads.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                    <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center border-4 border-slate-100 dark:border-slate-700">
                      <Share2 className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="max-w-xs">
                      <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">Waiting for Selection</h4>
                      <p className="text-slate-400 dark:text-slate-500 text-sm mt-2">Pick a batch from the sidebar to inspect records and trigger the CRM push.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Batch Control Banner */}
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-amber-500 text-white flex flex-col sm:flex-row justify-between items-center gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                          <Database className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="font-black text-[10px] uppercase tracking-[0.2em] opacity-80">Sync Interface</div>
                          <h3 className="text-2xl font-black">Ready to Push Batch #{selectedBatchIndex + 1}</h3>
                          <p className="text-sm opacity-90 font-medium">Verify the 20 records below then click the sync action.</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleZohoBatchSync(selectedBatchIndex)}
                        disabled={zohoSyncLoading}
                        className="w-full sm:w-auto px-8 py-4 bg-white text-amber-600 rounded-2xl font-black text-lg shadow-2xl shadow-amber-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 group disabled:opacity-50"
                      >
                        {zohoSyncLoading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Cloud className="w-6 h-6 group-hover:bounce" />}
                        PUSH TO CRM
                      </button>
                    </div>

                    {/* Records Table */}
                    <div className="flex-1 overflow-auto bg-slate-50/50 dark:bg-slate-950 p-6">
                      <div className="rounded-3xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Identity</th>
                              <th className="px-6 py-4">Company</th>
                              <th className="px-6 py-4 text-right">Instant Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {zohoLeads.slice(selectedBatchIndex * 20, (selectedBatchIndex + 1) * 20).map((lead, i) => (
                              <tr key={lead.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-slate-300 dark:text-slate-600">{(selectedBatchIndex * 20) + i + 1}</span>
                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase 
                                      ${lead.crm_status === 'Failed' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}>
                                      {lead.crm_status || 'Pending'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800 dark:text-slate-200">
                                    {`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown'}
                                  </div>
                                  <div className="text-xs text-slate-500 flex flex-col md:flex-row md:items-center gap-1 md:gap-3 mt-0.5">
                                    <span className="flex items-center gap-1"><FileText className="w-3 h-3 opacity-30" />{lead.email}</span>
                                    {lead.phone && <span className="flex items-center gap-1"><Share2 className="w-3 h-3 opacity-30 rotate-90" />{lead.phone}</span>}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="font-medium text-slate-700 dark:text-slate-300">{lead.company || '-'}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {lead.source_id.slice(0, 10)}...</div>
                                  {lead.error_message && (
                                    <div className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/10 px-2 py-1 rounded inline-block mt-1">Error: {lead.error_message}</div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {lead.crm_status === 'Failed' && (
                                      <button
                                        onClick={() => handleZohoUndo(lead)}
                                        className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all"
                                        title="Reset Status"
                                      >
                                        <RotateCcw className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleZohoSyncSingle(lead)}
                                      className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-2xl transition-all"
                                      title="Push Single"
                                    >
                                      <ArrowRight className="w-5 h-5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* Recent Zoho Success History */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200">Recent CRM Success History</h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black">Showing records synced today</p>
                  </div>
                </div>
                <button
                  onClick={fetchZohoHistory}
                  disabled={zohoHistoryLoading}
                  className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-all"
                >
                  <RefreshCw className={`w-4 h-4 text-slate-400 ${zohoHistoryLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                {zohoHistoryLoading && zohoHistory.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-500 rounded-full animate-spin"></div>
                    <p className="text-sm font-bold text-slate-400">Fetching history...</p>
                  </div>
                ) : zohoHistory.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3 opacity-30 text-center">
                    <Cloud className="w-12 h-12 text-slate-300" />
                    <p className="text-sm font-bold text-slate-400">No history found.<br />Start syncing leads to see them here.</p>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-8 py-4">Lead Name</th>
                        <th className="px-6 py-4">Organization</th>
                        <th className="px-6 py-4">CRM ID / Timestamp</th>
                        <th className="px-6 py-4 text-right pr-8">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {zohoHistory.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-8 py-4">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{lead.first_name} {lead.last_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono italic">{lead.email || 'no-email'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-slate-600 dark:text-slate-400 font-medium">{lead.company || '-'}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                              <Share2 className="w-3 h-3" /> {lead.source_id ? String(lead.source_id).slice(0, 15) : 'N/A'}...
                            </div>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Synced {lead.crm_insert_time ? (isNaN(new Date(lead.crm_insert_time)) ? 'Recently' : format(new Date(lead.crm_insert_time), 'MMM d, h:mm a')) : 'Recently'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right pr-8">
                            <div className="flex flex-col items-end gap-2">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm">
                                <CheckCircle className="w-3 h-3" /> Pushed
                              </span>
                              <button
                                onClick={() => handleZohoUndo(lead)}
                                className="p-1 px-2 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-100 hover:border-amber-200 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-1"
                                title="Undo Push (Return to Pending)"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Undo
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        )}

        {activeView === 'leads' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Leads Search & Control Bar */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-4 w-full md:w-2/3">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Search className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder={`Search leads by ${leadsCategory === 'all' ? 'any field' : leadsCategory}...`}
                    value={leadsSearch}
                    onChange={(e) => {
                      setLeadsSearch(e.target.value);
                      setLeadsPage(0);
                    }}
                    className="w-full pl-14 pr-16 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-800 rounded-2xl outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:bg-white dark:focus:bg-slate-800 transition-all text-lg shadow-inner dark:text-white"
                  />
                  {leadsLoading && (
                    <div className="absolute inset-y-0 right-5 flex items-center">
                      <div className="w-5 h-5 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="h-10 w-[2px] bg-slate-100 dark:bg-slate-800 hidden md:block mx-2"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                    <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <select
                    value={leadsCategory}
                    onChange={(e) => {
                      setLeadsCategory(e.target.value);
                      setLeadsPage(0);
                    }}
                    className="bg-transparent font-bold text-slate-700 dark:text-slate-300 outline-none text-sm cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <option value="all">Everywhere</option>
                    <option value="name">Full Name</option>
                    <option value="email">Email</option>
                    <option value="city">City</option>
                    <option value="phone">Phone</option>
                    <option value="campaign">Campaign</option>
                    <option value="brand">Brand</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 leading-none">{totalLeads.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest mt-1">Total Records</div>
                </div>
                <button
                  onClick={fetchLeads}
                  className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${leadsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </section>

            {/* Main Record Table */}
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden min-h-[600px] flex flex-col">
              <div className="flex-1 overflow-x-auto relative custom-scrollbar">
                {leadsLoading && allLeads.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-900/50 z-10 space-y-4">
                    <div className="w-16 h-16 border-8 border-indigo-100 dark:border-indigo-900/30 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="font-bold text-slate-400 dark:text-slate-500">Loading Secure Database...</p>
                  </div>
                ) : allLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
                    <Database className="w-20 h-20 text-slate-100 dark:text-slate-800" />
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-slate-800 dark:text-slate-200">No Records Found</p>
                      <p className="text-slate-400 dark:text-slate-500">We couldn't find any results matching your current search parameters.</p>
                    </div>
                    <button onClick={() => setLeadsSearch('')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">Clear Search</button>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50/80 dark:bg-slate-900/80 sticky top-0 z-20 backdrop-blur-md border-b-2 border-slate-100 dark:border-slate-800">
                      <tr>
                        <th className="px-8 py-5">Full Identity</th>
                        <th className="px-6 py-5">Contact Details</th>
                        <th className="px-6 py-5">Organization & Brand</th>
                        <th className="px-6 py-5">Location</th>
                        <th className="px-6 py-5">Campaign Info</th>
                        <th className="px-6 py-5 text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50 dark:divide-slate-800">
                      {allLeads.map((lead) => {
                        // Dynamic lookups
                        const f = (p) => {
                          const k = Object.keys(lead).find(x => p.some(s => x.toLowerCase().includes(s.toLowerCase())));
                          return k ? lead[k] : null;
                        };
                        const n = f(['full_name', 'name', 'contact']);
                        const e = f(['email', 'mail']);
                        const p = f(['phone', 'mobile']);
                        const c = f(['company', 'brand', 'firm']);
                        const city = f(['city', 'distt', 'dist']);
                        const camp = lead.campaign_name || lead.form_name || 'Generic';

                        return (
                          <tr key={lead.sheet_id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/10 transition-all group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                                  {n ? n.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-200 text-base">{n || 'Unidentified'}</div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                    <Share2 className="w-2.5 h-2.5" /> {(lead.sheet_id || 'no-id').toString().slice(0, 12)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  <FileText className="w-3.5 h-3.5 opacity-40" /> {e || 'No Email'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                                  <Share2 className="w-3.5 h-3.5 opacity-40 rotate-90" /> {p || 'No Phone'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="inline-flex flex-col">
                                <span className={`font-bold ${c ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>{c || '-'}</span>
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Platform ID: {lead.platform || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                <span className="font-bold text-slate-700 dark:text-slate-300 capitalize">{city || 'Global'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="max-w-[180px] truncate" title={camp}>
                                <div className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase mb-0.5 truncate">{camp}</div>
                                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
                                  {lead._created_at ? format(new Date(lead._created_at), 'MMM d, yyyy') : 'No Date'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right pr-8">
                              <button
                                onClick={() => handleDelete(lead)}
                                className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Table Footer / Pagination */}
              <div className="px-8 py-5 bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs font-bold text-slate-400 dark:text-slate-500">
                  SYSTEM PAGE <span className="text-indigo-600 dark:text-indigo-400">{leadsPage + 1}</span>
                  <span className="mx-3 opacity-20">|</span>
                  TOTAL CAPACITY <span className="text-slate-900 dark:text-white">{totalLeads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLeadsPage(p => p - 1)}
                    disabled={leadsPage === 0}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90 dark:text-white"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md shadow-indigo-100 dark:shadow-none">
                    {leadsPage + 1}
                  </div>
                  <button
                    onClick={() => setLeadsPage(p => p + 1)}
                    disabled={(leadsPage + 1) * leadsLimit >= totalLeads}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90 dark:text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Maintenance & Configuration Panels (Visible everywhere) */}
        {(activeView === 'google-import' || activeView === 'zoho-export') && (
          <div className="grid md:grid-cols-2 gap-8 mt-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <h2 className="text-xl font-bold mb-6 text-red-600 dark:text-red-400 flex items-center gap-3">
                <Trash2 className="w-6 h-6" />
                Registry Maintenance
              </h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 mb-2 ml-1">Archive ID (Sheet ID)</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={deleteInputId}
                      onChange={(e) => setDeleteInputId(e.target.value)}
                      placeholder="EX: 1234567-890"
                      className="flex-1 px-5 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl outline-none focus:border-red-500 dark:focus:border-red-400 focus:bg-white dark:focus:bg-slate-800 transition-all font-mono dark:text-white"
                    />
                    <button
                      onClick={handleManualDelete}
                      disabled={loading}
                      className="px-6 py-4 bg-slate-900 dark:bg-slate-700 text-white rounded-2xl font-bold hover:bg-red-600 dark:hover:bg-red-500 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      Remove Record
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                  Deleting a record here will remove it from the database and prevent it from being re-synced in the future. Use this to permanently filter out bad data.
                </p>
              </div>
            </section>

            <section className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
              <h2 className="text-xl font-bold mb-6 text-indigo-600 dark:text-indigo-400 flex items-center gap-3">
                <HelpCircle className="w-6 h-6" />
                Sync Configuration
              </h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Auto-Sync Interval</span>
                  <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold shadow-sm shadow-indigo-200">30 Minutes</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tighter">Source Identity</span>
                  <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">Arch...NDIA 2</span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic text-center px-4">
                  The system pulse is managed by GitHub Actions workflows for maximum reliability and uptime.
                </p>
              </div>
            </section>
          </div>
        )}
      </main>
      <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
        <p>© 2026 SyncFlow Automation System</p>
        <p>Admin Support: <a href="mailto:mansikharb.kc@gmail.com" className="text-indigo-500 dark:text-indigo-400 hover:underline">mansikharb.kc@gmail.com</a></p>
      </div>
    </div>
  );
}

export default App;
