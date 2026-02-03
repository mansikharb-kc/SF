import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Layout, FileText, ChevronRight, Trash2, HelpCircle } from 'lucide-react';
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
  const [leadsPage, setLeadsPage] = useState(0);
  const [leadsLimit] = useState(50);
  const [activeView, setActiveView] = useState('history'); // 'history' or 'all-leads'


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
      fetchLeads();
      const interval = setInterval(() => {
        fetchHistory();
        if (activeView === 'all-leads') fetchLeads();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail, activeView]);

  // Refetch leads when search or page changes
  useEffect(() => {
    if (userEmail && activeView === 'all-leads') {
      fetchLeads();
    }
  }, [leadsSearch, leadsPage]);


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
      const data = await getLeads(leadsSearch, leadsLimit, leadsPage * leadsLimit);
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              SyncFlow
            </h1>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Auto Sync Status */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 transition-all hover:shadow-md">
          <div className="flex flex-col sm:flex-row gap-8 items-center justify-between">
            <div className="flex-1">
              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-emerald-500" />
                Auto-Sync Active
              </h2>
              <p className="text-slate-600 mb-4">
                The system automatically syncs data from the Google Sheet every hour.
                <br />
                <span className="text-xs text-slate-400">Spreadsheet ID: 1ZOm...ksEZiY (Fixed)</span>
              </p>

              <div className="mt-4 sm:mt-0">
                <button
                  onClick={handleSync}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg font-medium text-sm text-white shadow-md transition-all active:scale-95 flex items-center gap-2
                        ${loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'}
                      `}
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {loading ? 'Syncing...' : 'Refresh Now'}
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-100 px-6 py-3 rounded-xl text-center min-w-[200px]">
              <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Last Sync</div>
              <div className="text-xl font-bold text-slate-800">
                {history.length > 0 ? format(new Date(history[0].sync_timestamp), 'h:mm a') : '--:--'}
              </div>
              <div className="flex flex-col items-center gap-1 mt-1">
                {history.length > 0 && (
                  <>
                    <span className={`text-xs font-medium ${history[0].status === 'SUCCESS' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {history[0].status === 'SUCCESS' ? 'Success' : 'Failed'}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-mono">
                      {history[0].trigger_type || 'AUTO'}
                    </span>
                  </>
                )}
                {history.length === 0 && <span className="text-xs text-slate-400">Waiting...</span>}
              </div>
            </div>
          </div>
        </section>

        {/* Sync Result Details */}
        {syncResult && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-fade-in mb-8">
            <h2 className="text-lg font-semibold mb-4 text-emerald-600 flex items-center gap-2">
              <div className="bg-emerald-100 p-1 rounded">
                <Layout className="w-4 h-4" />
              </div>
              Sync Success - Found {syncResult.results.length} Sheets
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {syncResult.results.map((res, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-slate-50">
                  <h3 className="font-medium text-slate-800 mb-2 flex justify-between">
                    {res.sheet}
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      {res.found || 0} found / {res.inserted} new
                    </span>

                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Columns:</p>
                    <div className="flex flex-wrap gap-1">
                      {res.columns && res.columns.slice(0, 10).map((col, cIdx) => (
                        <span key={col} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm">
                          {col}
                        </span>
                      ))}
                      {res.columns && res.columns.length > 10 && (
                        <span className="text-[10px] text-slate-400 px-2 py-1">+{res.columns.length - 10} more</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recent Activity & Data View */}
        <div className="flex items-center gap-4 mb-4 border-b border-slate-200">
          <button
            onClick={() => setActiveView('history')}
            className={`pb-2 px-4 text-sm font-bold transition-all ${activeView === 'history'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            Sync History
          </button>
          <button
            onClick={() => setActiveView('all-leads')}
            className={`pb-2 px-4 text-sm font-bold transition-all ${activeView === 'all-leads'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-slate-400 hover:text-slate-600'
              }`}
          >
            All Leads ({totalLeads})
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">


          {/* History List */}
          <section className={`lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] ${activeView === 'all-leads' ? 'hidden' : (selectedBatch ? 'hidden lg:flex' : '')
            }`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Sync History
              </h3>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{history.length} batches</span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {history.length === 0 ? (
                <div className="text-center py-10 text-slate-400">No history found.</div>
              ) : (
                history.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => handleViewData(log)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all group
                      ${selectedBatch?.id === log.id
                        ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                        : 'bg-white border-transparent hover:border-slate-200 hover:bg-slate-50'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-800 truncate" title={log.sheet_name}>
                        Leads: {log.sheet_name.length > 20 ? log.sheet_name.slice(0, 18) + '...' : log.sheet_name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {format(new Date(log.sync_timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium 
                          ${log.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {log.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500 font-mono border border-slate-200">
                          {log.trigger_type || 'AUTO'}
                        </span>
                        <span className="">+{log.inserted_count} synced</span>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${selectedBatch?.id === log.id ? 'translate-x-1 text-indigo-500' : ''}`} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* All Leads List (New Section) */}
          <section className={`lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] ${activeView === 'history' ? 'hidden' : ''
            }`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Database className="w-4 h-4" /> All Leads
                </h3>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">{totalLeads} records</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={leadsSearch}
                  onChange={(e) => { setLeadsSearch(e.target.value); setLeadsPage(0); }}
                  className="w-full pl-3 pr-8 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {leadsLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin absolute right-3 top-3 text-slate-300" />}
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-2">
              {allLeads.length === 0 ? (
                <div className="text-center py-10 text-slate-400">{leadsLoading ? 'Loading...' : 'No leads found.'}</div>
              ) : (
                allLeads.map((lead) => (
                  <div
                    key={lead.sheet_id}
                    className="p-3 bg-white border border-transparent hover:border-slate-200 hover:bg-slate-50 rounded-xl transition-all cursor-default"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-slate-800 truncate">
                        {lead.full_name || lead.sheet_id}
                      </span>
                      <span className="text-[10px] text-slate-400 px-1.5 py-0.5 bg-slate-100 rounded">
                        {lead.sheet_id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                      {lead.email && <div className="truncate">📧 {lead.email}</div>}
                      {lead.phone && <div>📞 {lead.phone}</div>}
                      {lead.phone_number && <div>📞 {lead.phone_number}</div>}
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <button
                disabled={leadsPage === 0}
                onClick={() => setLeadsPage(p => p - 1)}
                className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-50"
              >
                Prev
              </button>
              <span className="text-[10px] text-slate-500">Page {leadsPage + 1} of {Math.max(1, Math.ceil(totalLeads / leadsLimit))}</span>
              <button
                disabled={(leadsPage + 1) * leadsLimit >= totalLeads}
                onClick={() => setLeadsPage(p => p + 1)}
                className="px-3 py-1 text-xs font-medium bg-white border border-slate-200 rounded-md disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </section>


          {/* Data View Panel */}
          <section className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[700px] transition-all relative
              ${!selectedBatch ? 'hidden lg:flex items-center justify-center bg-slate-50' : ''}
            `}>


            {!selectedBatch ? (
              <div className="text-center text-slate-400">
                <Layout className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Select a sync log to view details</p>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-500" />
                      {selectedBatch.sheet_name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Batch: {selectedBatch.batch_id.slice(0, 8)}... • {format(new Date(selectedBatch.sync_timestamp), 'MMM d, yyyy HH:mm:ss')} • {selectedBatch.trigger_type || 'AUTO'}
                    </p>
                  </div>
                  <button onClick={closeDataView} className="lg:hidden text-sm text-indigo-600 font-medium">Close</button>
                </div>

                <div className="flex-1 overflow-auto bg-white relative">
                  {viewLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                      <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                  ) : viewData.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 flex flex-col items-center">
                      <Database className="w-10 h-10 mb-2 opacity-20" />
                      <p>No records found for this batch ID.</p>
                      <p className="text-xs text-slate-300 mt-2 max-w-xs">
                        Records might have been updated/moved to a newer batch in a subsequent sync.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
                        <tr>
                          {Object.keys(viewData[0]).filter(k => !k.startsWith('_')).map((key) => (
                            <th key={key} className="px-6 py-3 font-medium tracking-wider border-b border-slate-100 whitespace-nowrap">
                              {key}
                            </th>
                          ))}
                          <th className="px-6 py-3 font-medium tracking-wider border-b border-slate-100 whitespace-nowrap">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {viewData.map((row, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            {Object.keys(row).filter(k => !k.startsWith('_')).map((key) => (
                              <td key={key} className="px-6 py-3 whitespace-nowrap text-slate-600">
                                {row[key]}
                              </td>
                            ))}
                            <td className="px-6 py-3 whitespace-nowrap text-slate-600">
                              <button
                                onClick={() => handleDelete(row)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </section>

        </div>

        {/* Manual Delete Section (UI Modification) */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-8">
          <h2 className="text-lg font-semibold mb-4 text-red-600 flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Delete Leads Records
          </h2>
          <div className="flex flex-col sm:flex-row items-end gap-4 max-w-lg">
            <div className="flex-1 w-full">
              <label htmlFor="leads_id" className="block text-sm font-medium text-slate-700 mb-1">
                leads_id (Sheet ID)
              </label>
              <input
                type="text"
                id="leads_id"
                value={deleteInputId}
                onChange={(e) => setDeleteInputId(e.target.value)}
                placeholder="Enter Sheet ID..."
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
              />
            </div>
            <button
              onClick={handleManualDelete}
              disabled={loading}
              className={`px-6 py-2 rounded-lg font-medium text-white shadow-md transition-all active:scale-95 whitespace-nowrap
                ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 hover:shadow-red-200'}
              `}
            >
              {loading ? 'Processing...' : 'Delete'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            * This will permanently delete the record and prevent it from re-syncing.
          </p>
        </section>

        {/* FAQ Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mt-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <HelpCircle className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Frequently Asked Questions</h2>
              <p className="text-sm text-slate-500">Quick answers to common questions about SyncFlow</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm group">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  How often does the data synchronize?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  SyncFlow is configured to run an automated background sync every <span className="text-indigo-600 font-medium">1 hour</span>. You can also trigger an immediate sync manually using the "Sync Now" button at the top of the dashboard.
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm group">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  How do new users get access?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  New users must create an account which sends an OTP request to the administrator. Once the administrator shares the code and the user verifies it, the account is created and granted full access to the dashboard.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm group">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  What does "Sync Result" represent?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The sync result shows the outcome of the latest operation. "Success" confirms data was moved correctly, while "New Records" indicates how many unique entries were added from your Google Sheet since the last run.
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-all hover:border-indigo-200 hover:bg-white hover:shadow-sm group">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                  Can I recover a manually deleted record?
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Manual deletion is a <span className="text-red-500 font-medium">permanent action</span>. To prevent sync conflicts, the system remembers deleted IDs and will not re-import them unless you contact the administrator to reset the sync history.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
            <p>© 2026 SyncFlow Automation System</p>
            <p>Admin Support: <a href="mailto:mansikharb.kc@gmail.com" className="text-indigo-500 hover:underline">mansikharb.kc@gmail.com</a></p>
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
