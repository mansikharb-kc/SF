import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Layout, FileText, ChevronRight, Trash2, HelpCircle, Download, Cloud, Share2, Search, Filter } from 'lucide-react';
import { syncSheet, getHistory, getData, deleteRecord } from './services/api';
import { format } from 'date-fns';

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
      setAllLeads(data.leads);
      setTotalLeads(data.total);
    } catch (error) {
      console.error("Failed to load leads", error);
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
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
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'google-import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Cloud className="w-4 h-4" />
                Google Import
              </button>
              <button
                onClick={() => setActiveView('zoho-export')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'zoho-export' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Share2 className="w-4 h-4" />
                Zoho Export
              </button>
              <button
                onClick={() => setActiveView('leads')}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeView === 'leads' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
              >
                <Database className="w-4 h-4" />
                Leads
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900">{userEmail}</span>
              <span className="text-[10px] text-slate-400">Primary Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="lg:hidden px-4 pb-4 flex justify-center border-t border-slate-50 pt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveView('google-import')}
            className={`px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'google-import' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Google Import
          </button>
          <button
            onClick={() => setActiveView('zoho-export')}
            className={`px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'zoho-export' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Zoho Export
          </button>
          <button
            onClick={() => setActiveView('leads')}
            className={`px-3 py-2 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all whitespace-nowrap ${activeView === 'leads' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-400 bg-slate-50'}`}
          >
            Leads
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeView === 'google-import' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Auto Sync Status */}
            <section className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8 transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row gap-8 items-center justify-between">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-3 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-xl">
                      <RefreshCw className="w-6 h-6 text-emerald-600" />
                    </div>
                    Google Sheets Synchronization
                  </h2>
                  <p className="text-slate-600 mb-6 text-lg">
                    The system automatically monitors and imports data from your linked Google Sheet every 30 minutes.
                    <br />
                    <span className="text-sm text-slate-400 font-mono mt-2 block">Source: Architects & Designers INDIA 2</span>
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

                <div className="bg-slate-50 border-2 border-slate-100 px-8 py-6 rounded-3xl text-center min-w-[260px] shadow-inner">
                  <div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-black mb-2">System Pulse</div>
                  <div className="text-4xl font-black text-slate-900 tracking-tighter">
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
              <section className="bg-white rounded-3xl shadow-xl border border-emerald-100 p-8 animate-in zoom-in duration-500">
                <h2 className="text-xl font-bold mb-6 text-emerald-600 flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-xl">
                    <Cloud className="w-5 h-5" />
                  </div>
                  Sync Successfully Completed
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {syncResult.results.map((res, idx) => (
                    <div key={idx} className="border-2 border-slate-50 rounded-2xl p-5 bg-slate-50/50 hover:bg-white hover:border-emerald-100 transition-all group">
                      <h3 className="font-bold text-slate-800 mb-3 flex justify-between items-center">
                        {res.sheet}
                        <span className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg">
                          +{res.inserted} new
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">Verified {res.found || 0} records across the sheet.</p>
                      <div className="flex flex-wrap gap-1">
                        {res.columns && res.columns.slice(0, 5).map((col) => (
                          <span key={col} className="text-[9px] bg-white border border-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase font-bold">
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
              <section className="lg:col-span-1 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[700px]">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-slate-400" />
                    Sync Logs
                  </h3>
                  <span className="text-[10px] bg-indigo-600 text-white px-3 py-1 rounded-full font-black uppercase tracking-widest">{history.length} Batches</span>
                </div>
                <div className="overflow-y-auto flex-1 p-4 space-y-3 custom-scrollbar">
                  {history.map((log) => (
                    <div
                      key={log.id}
                      onClick={() => handleViewData(log)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer group
                        ${selectedBatch?.id === log.id
                          ? 'bg-indigo-50 border-indigo-200 shadow-lg shadow-indigo-100'
                          : 'bg-white border-slate-50 hover:border-slate-200 hover:shadow-md'}
                      `}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800 text-sm truncate">
                          {log.sheet_name}
                        </span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">
                          {format(new Date(log.sync_timestamp), 'HH:mm • MMM d')}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg
                            ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {log.status === 'SUCCESS' ? 'Done' : 'Fail'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {log.leads_inserted_count > 0 ? (
                              <span className="text-emerald-600">+{log.leads_inserted_count} new</span>
                            ) : (
                              '0 new'
                            )}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${selectedBatch?.id === log.id ? 'translate-x-1 text-indigo-500' : 'text-slate-300'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden flex flex-col h-[700px] relative">
                {!selectedBatch ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-4">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-2 border-slate-100">
                      <FileText className="w-10 h-10 text-slate-200" />
                    </div>
                    <div className="max-w-xs">
                      <p className="text-slate-800 font-bold text-lg">Detailed Inspection</p>
                      <p className="text-slate-400 text-sm">Select any synchronization log from the list to inspect the data lifecycle and specific sheet records.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                          {selectedBatch.sheet_name}
                          <span className="text-[10px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 uppercase">
                            ID: {selectedBatch.batch_id.slice(0, 8)}
                          </span>
                        </h3>
                      </div>
                      <button onClick={closeDataView} className="text-slate-400 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-white p-4">
                      {viewLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="rounded-2xl border-2 border-slate-50 overflow-hidden shadow-inner">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 border-b-2 border-slate-100">
                              <tr>
                                {Object.keys(viewData[0] || {}).filter(k => !k.startsWith('_')).map(key => (
                                  <th key={key} className="px-5 py-4 font-black uppercase tracking-widest text-slate-500">{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {viewData.map((row, i) => (
                                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                  {Object.keys(row).filter(k => !k.startsWith('_')).map(key => (
                                    <td key={key} className="px-5 py-3 whitespace-nowrap text-slate-600">{row[key]}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* Maintenance Panels */}
            <div className="grid md:grid-cols-2 gap-8 mt-8">
              <section className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                <h2 className="text-xl font-bold mb-6 text-red-600 flex items-center gap-3">
                  <Trash2 className="w-6 h-6" />
                  Registry Maintenance
                </h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 ml-1">Archive ID (Sheet ID)</label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={deleteInputId}
                        onChange={(e) => setDeleteInputId(e.target.value)}
                        placeholder="EX: 1234567-890"
                        className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-red-500 focus:bg-white transition-all font-mono"
                      />
                      <button
                        onClick={handleManualDelete}
                        disabled={loading}
                        className="px-6 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-red-600 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        Remove Record
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    Deleting a record here will remove it from the database and prevent it from being re-synced in the future. Use this to permanently filter out bad data.
                  </p>
                </div>
              </section>

              <section className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
                <h2 className="text-xl font-bold mb-6 text-indigo-600 flex items-center gap-3">
                  <HelpCircle className="w-6 h-6" />
                  Sync Configuration
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Auto-Sync Interval</span>
                    <span className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-full font-bold shadow-sm shadow-indigo-200">30 Minutes</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-sm font-bold text-slate-700 uppercase tracking-tighter">Source Identity</span>
                    <span className="text-xs font-mono text-indigo-600">1ZOm...ksEZiY</span>
                  </div>
                  <p className="text-[10px] text-slate-400 italic text-center px-4">
                    The system pulse is managed by GitHub Actions workflows for maximum reliability and uptime.
                  </p>
                </div>
              </section>
            </div>
          </div>
        )}

        {activeView === 'zoho-export' && (
          <div className="animate-in fade-in zoom-in duration-500">
            <section className="bg-white rounded-3xl shadow-2xl border-2 border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full -mr-32 -mt-32"></div>
              <div className="p-12 md:p-20 text-center space-y-8 relative">
                <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-300 flex items-center justify-center mx-auto transform rotate-12">
                  <Share2 className="w-12 h-12 text-white transform -rotate-12" />
                </div>
                <div className="space-y-3">
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">Zoho Export Engine</h2>
                  <p className="text-slate-500 text-xl max-w-xl mx-auto font-medium">
                    Seamlessly bridge your synchronization pipeline with your CRM workflows.
                  </p>
                </div>
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 text-amber-700 rounded-full font-bold border border-amber-200 animate-pulse">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
                  Coming Soon - Feature under Development
                </div>
                <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto pt-8">
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
                    <Download className="w-6 h-6 text-indigo-500 mx-auto" />
                    <p className="font-bold text-slate-800">One-Click Export</p>
                    <p className="text-xs text-slate-400">Push synchronized leads directly to your Zoho CRM leads module.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
                    <Filter className="w-6 h-6 text-indigo-500 mx-auto" />
                    <p className="font-bold text-slate-800">Filtered Sync</p>
                    <p className="text-xs text-slate-400">Export only specific campaigns or cities based on your requirements.</p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-2">
                    <Layout className="w-6 h-6 text-indigo-500 mx-auto" />
                    <p className="font-bold text-slate-800">Field Mapping</p>
                    <p className="text-xs text-slate-400">Custom map column names from your sheets to your Zoho database fields.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeView === 'leads' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Leads Search & Control Bar */}
            <section className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 flex flex-col md:flex-row gap-4 items-center justify-between">
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
                    className="w-full pl-14 pr-16 py-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none focus:border-indigo-500 focus:bg-white transition-all text-lg shadow-inner"
                  />
                  {leadsLoading && (
                    <div className="absolute inset-y-0 right-5 flex items-center">
                      <div className="w-5 h-5 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                <div className="h-10 w-[2px] bg-slate-100 hidden md:block mx-2"></div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Filter className="w-5 h-5 text-indigo-600" />
                  </div>
                  <select
                    value={leadsCategory}
                    onChange={(e) => {
                      setLeadsCategory(e.target.value);
                      setLeadsPage(0);
                    }}
                    className="bg-transparent font-bold text-slate-700 outline-none text-sm cursor-pointer hover:text-indigo-600 transition-colors"
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
                  <div className="text-xl font-black text-indigo-600 leading-none">{totalLeads.toLocaleString()}</div>
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Total Records</div>
                </div>
                <button
                  onClick={fetchLeads}
                  className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  <RefreshCw className={`w-5 h-5 ${leadsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </section>

            {/* Main Record Table */}
            <section className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
              <div className="flex-1 overflow-x-auto relative custom-scrollbar">
                {leadsLoading && allLeads.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 z-10 space-y-4">
                    <div className="w-16 h-16 border-8 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                    <p className="font-bold text-slate-400">Loading Secure Database...</p>
                  </div>
                ) : allLeads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
                    <Database className="w-20 h-20 text-slate-100" />
                    <div className="space-y-1">
                      <p className="text-xl font-bold text-slate-800">No Records Found</p>
                      <p className="text-slate-400">We couldn't find any results matching your current search parameters.</p>
                    </div>
                    <button onClick={() => setLeadsSearch('')} className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700">Clear Search</button>
                  </div>
                ) : (
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50/80 sticky top-0 z-20 backdrop-blur-md border-b-2 border-slate-100">
                      <tr>
                        <th className="px-8 py-5">Full Identity</th>
                        <th className="px-6 py-5">Contact Details</th>
                        <th className="px-6 py-5">Organization & Brand</th>
                        <th className="px-6 py-5">Location</th>
                        <th className="px-6 py-5">Campaign Info</th>
                        <th className="px-6 py-5 text-right pr-8">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y-2 divide-slate-50">
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
                          <tr key={lead.sheet_id} className="hover:bg-indigo-50/20 transition-all group">
                            <td className="px-8 py-5">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm">
                                  {n ? n.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-base">{n || 'Unidentified'}</div>
                                  <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                    <Share2 className="w-2.5 h-2.5" /> {lead.sheet_id.slice(0, 12)}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-600 group-hover:text-indigo-600 transition-colors">
                                  <FileText className="w-3.5 h-3.5 opacity-40" /> {e || 'No Email'}
                                </div>
                                <div className="flex items-center gap-2 text-slate-600">
                                  <Share2 className="w-3.5 h-3.5 opacity-40 rotate-90" /> {p || 'No Phone'}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="inline-flex flex-col">
                                <span className="font-bold text-slate-800">{c || 'Standalone'}</span>
                                <span className="text-[10px] text-slate-400 font-medium">Platform ID: {lead.platform || 'N/A'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                                <span className="font-bold text-slate-700 capitalize">{city || 'Global'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="max-w-[180px] truncate" title={camp}>
                                <div className="text-[10px] font-black text-indigo-600 uppercase mb-0.5 truncate">{camp}</div>
                                <div className="text-[9px] text-slate-400 font-medium">{format(new Date(lead._created_at), 'MMM d, yyyy')}</div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-right pr-8">
                              <button
                                onClick={() => handleDelete(lead)}
                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
              <div className="px-8 py-5 bg-slate-50 border-t-2 border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="text-xs font-bold text-slate-400">
                  SYSTEM PAGE <span className="text-indigo-600">{leadsPage + 1}</span>
                  <span className="mx-3 opacity-20">|</span>
                  TOTAL CAPACITY <span className="text-slate-900">{totalLeads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLeadsPage(p => p - 1)}
                    disabled={leadsPage === 0}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-md shadow-indigo-100">
                    {leadsPage + 1}
                  </div>
                  <button
                    onClick={() => setLeadsPage(p => p + 1)}
                    disabled={(leadsPage + 1) * leadsLimit >= totalLeads}
                    className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-90"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <p>© 2026 SyncFlow Automation System</p>
        <p>Admin Support: <a href="mailto:mansikharb.kc@gmail.com" className="text-indigo-500 hover:underline">mansikharb.kc@gmail.com</a></p>
      </div>
    </div>
  );
}

export default App;
