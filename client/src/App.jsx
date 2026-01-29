import React, { useState, useEffect } from 'react';
import { RefreshCw, Database, Clock, Layout, FileText, ChevronRight, Trash2 } from 'lucide-react';
import { syncSheet, getHistory, getData, deleteRecord } from './services/api';
import { format } from 'date-fns';

function App() {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [viewData, setViewData] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Load history on mount
  useEffect(() => {
    fetchHistory();
    // Poll every 30s
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (error) {
      console.error("Failed to load history", error);
    }
  };

  const handleSync = async () => {
    // No explicit arg needed, backend handles hardcoded logic
    setLoading(true);
    setSyncResult(null); // Reset previous result
    try {
      const result = await syncSheet(null); // Backend API updated to ignore arg or default to manual
      setSyncResult(result);
      await fetchHistory();
    } catch (error) {
      console.error("Sync error details:", error);
      // Check for 409
      if (error.response && error.response.status === 409) {
        alert("Sync is already running! Please wait.");
      } else {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || "Unknown error";
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

    if (!window.confirm(`Are you sure you want to permanently delete record ${id}? This prevention re-sync is permanent.`)) {
      return;
    }

    try {
      const tableName = selectedBatch?.table_name || 'leads';
      await deleteRecord(tableName, id);
      setViewData(prev => prev.filter(item => item.sheet_id !== id));
    } catch (error) {
      console.error("Failed to delete record", error);
      alert("Delete Failed: " + (error.response?.data?.error || error.message));
    }
  };



  // Manual Delete State
  const [deleteInputId, setDeleteInputId] = useState('');

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
      // Call Backend Delete API
      await deleteRecord('leads', deleteInputId);
      alert("Record deleted successfully.");
      setDeleteInputId(''); // Clear input

      // Refresh data if looking at leads
      if (selectedBatch && selectedBatch.table_name === 'leads') {
        handleViewData(selectedBatch);
      } else {
        // If not looking at data, at least refresh history to show latest state if applicable
        fetchHistory();
      }

    } catch (error) {
      console.error("Manual delete failed", error);
      alert("Delete Failed: " + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              SyncFlow
            </h1>
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Company DB Automation
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
                      +{res.inserted} new
                    </span>
                  </h3>
                  <div className="space-y-1">
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Columns:</p>
                    <div className="flex flex-wrap gap-1">
                      {res.columns && res.columns.slice(0, 10).map((col, cIdx) => (
                        <span key={cIdx} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded shadow-sm">
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
        <div className="grid lg:grid-cols-3 gap-8">

          {/* History List */}
          <section className={`lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] ${selectedBatch ? 'hidden lg:flex' : ''}`}>
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

          {/* Data View Panel */}
          <section className={`lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px] transition-all relative
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

      </main>
    </div>
  );
}

export default App;
