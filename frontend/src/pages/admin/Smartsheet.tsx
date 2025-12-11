import { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, Clock, XCircle, Database } from 'lucide-react';
import { api } from '@/lib/api';

interface SyncStatus {
  users: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: string | null;
  };
  rsvps: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: string | null;
  };
  connections: {
    total: number;
    synced: number;
    pending: number;
    failed: number;
    lastSync: string | null;
  };
}

interface FailedSync {
  id: string;
  entityType: string;
  entityId: string;
  errorMessage: string;
  retryCount: number;
  lastAttempt: string;
}

interface SyncResult {
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}

type ImportType = 'sessions' | 'projects' | 'opportunities' | 'partners' | 'attendees';

interface ImportSummary {
  imported: number;
  updated: number;
  failed: number;
  errors?: Array<{ message?: string }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export default function Smartsheet() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [failedSyncs, setFailedSyncs] = useState<FailedSync[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [importing, setImporting] = useState<ImportType | null>(null);

  useEffect(() => {
    fetchStatus();
    fetchFailedSyncs();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await api.get<ApiResponse<SyncStatus>>('/admin/smartsheet/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch sync status', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (type: ImportType, label: string) => {
    setImporting(type);
    try {
      const response = await api.post<ApiResponse<ImportSummary>>(`/admin/smartsheet/import/${type}`);
      const result = response.data;

      const summary =
        `Import complete for ${label}\n\n` +
        `Imported: ${result?.imported ?? 0}\n` +
        `Updated: ${result?.updated ?? 0}\n` +
        `Failed: ${result?.failed ?? 0}` +
        (result?.errors && result.errors.length > 0
          ? `\n\nErrors:\n${result.errors.slice(0, 3).map(e => e.message).join('\n')}`
          : '');

      alert(summary);
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to import ${label}`);
    } finally {
      setImporting(null);
    }
  };

  const importOptions: Array<{ type: ImportType; label: string; description: string }> = [
    { type: 'partners', label: 'Industry Partners', description: 'Company listings from Smartsheet' },
    { type: 'projects', label: 'Research Projects', description: 'Academic project catalog' },
    { type: 'sessions', label: 'Event Sessions', description: 'Schedule & agenda updates' },
    { type: 'opportunities', label: 'Opportunities', description: 'Funding & internship posts' },
    { type: 'attendees', label: 'Attendees', description: 'People directory & QR codes' },
  ];

  const fetchFailedSyncs = async () => {
    try {
      const response = await api.get<ApiResponse<FailedSync[]>>('/admin/smartsheet/failed');
      setFailedSyncs(response.data);
    } catch (error) {
      console.error('Failed to fetch failed syncs', error);
    }
  };

  const handleSync = async (type: 'users' | 'rsvps' | 'connections') => {
    setIsSyncing(type);
    try {
      const response = await api.post<ApiResponse<SyncResult>>(`/admin/smartsheet/sync/${type}`);
      const result = response.data;

      alert(
        `Sync complete!\n\n` +
        `Total: ${result.total}\n` +
        `Successful: ${result.successful}\n` +
        `Failed: ${result.failed}` +
        (result.errors.length > 0 ? `\n\nErrors:\n${result.errors.slice(0, 3).join('\n')}` : '')
      );

      // Refresh status and failed syncs
      await fetchStatus();
      await fetchFailedSyncs();
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to sync ${type}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRetry = async (syncId: string) => {
    setRetryingId(syncId);
    try {
      const response = await api.post<ApiResponse<SyncResult>>(`/admin/smartsheet/retry/${syncId}`);
      alert(response.message || 'Retry successful!');
      await fetchStatus();
      await fetchFailedSyncs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Retry failed');
    } finally {
      setRetryingId(null);
    }
  };

  const handleClearFailed = async () => {
    if (!confirm('Clear all failed syncs? This cannot be undone.')) return;

    try {
      const response = await api.delete<ApiResponse<{ count: number }>>('/admin/smartsheet/clear-failed');
      alert(response.message || `Cleared ${response.data.count} failed syncs`);
      await fetchFailedSyncs();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to clear failed syncs');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getSyncRate = (synced: number, total: number) => {
    if (total === 0) return 0;
    return ((synced / total) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Smartsheet Integration</h1>
        <p className="text-gray-600">
          Manage data synchronization between Converge-NPS and Smartsheet
        </p>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Users */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Users</h3>
              <Database className="w-5 h-5 text-blue-600" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{status.users.total}</div>
                <div className="text-sm text-gray-600">Total users</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{status.users.synced}</span>
                  </div>
                  <div className="text-xs text-gray-500">Synced</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{status.users.pending}</span>
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">{status.users.failed}</span>
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Sync Rate: {getSyncRate(status.users.synced, status.users.total)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getSyncRate(status.users.synced, status.users.total)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Last synced: {formatDate(status.users.lastSync)}
                </div>
                <button
                  onClick={() => handleSync('users')}
                  disabled={isSyncing !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing === 'users' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* RSVPs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">RSVPs</h3>
              <Database className="w-5 h-5 text-purple-600" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{status.rsvps.total}</div>
                <div className="text-sm text-gray-600">Total RSVPs</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{status.rsvps.synced}</span>
                  </div>
                  <div className="text-xs text-gray-500">Synced</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{status.rsvps.pending}</span>
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">{status.rsvps.failed}</span>
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Sync Rate: {getSyncRate(status.rsvps.synced, status.rsvps.total)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getSyncRate(status.rsvps.synced, status.rsvps.total)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Last synced: {formatDate(status.rsvps.lastSync)}
                </div>
                <button
                  onClick={() => handleSync('rsvps')}
                  disabled={isSyncing !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing === 'rsvps' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Connections */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
              <Database className="w-5 h-5 text-green-600" />
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-2xl font-bold text-gray-900">{status.connections.total}</div>
                <div className="text-sm text-gray-600">Total connections</div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-medium">{status.connections.synced}</span>
                  </div>
                  <div className="text-xs text-gray-500">Synced</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-yellow-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">{status.connections.pending}</span>
                  </div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div>
                  <div className="flex items-center space-x-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span className="font-medium">{status.connections.failed}</span>
                  </div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Sync Rate: {getSyncRate(status.connections.synced, status.connections.total)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{ width: `${getSyncRate(status.connections.synced, status.connections.total)}%` }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-2">
                  Last synced: {formatDate(status.connections.lastSync)}
                </div>
                <button
                  onClick={() => handleSync('connections')}
                  disabled={isSyncing !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSyncing === 'connections' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Syncing...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Sync Now</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Import from Smartsheet</h2>
            <p className="text-sm text-gray-600">
              Pull the latest data from curated Smartsheet tabs into the platform database.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {importOptions.map(option => (
            <div
              key={option.type}
              className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-base font-semibold text-gray-900">{option.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{option.description}</p>
              </div>
              <button
                onClick={() => handleImport(option.type, option.label)}
                disabled={importing !== null}
                className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing === option.type ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Importing…</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Import Now</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Failed Syncs */}
      {failedSyncs.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Failed Syncs ({failedSyncs.length})</h2>
            <button
              onClick={handleClearFailed}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Entity ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Error
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Retries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Attempt
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {failedSyncs.map((sync) => (
                    <tr key={sync.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800 capitalize">
                          {sync.entityType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono text-gray-900">{sync.entityId.slice(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-red-600 max-w-md truncate" title={sync.errorMessage}>
                          {sync.errorMessage}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{sync.retryCount}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{formatDate(sync.lastAttempt)}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRetry(sync.id)}
                          disabled={retryingId === sync.id}
                          className="inline-flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {retryingId === sync.id ? (
                            <>
                              <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                              <span>Retrying...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3" />
                              <span>Retry</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-2">About Smartsheet Sync</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Data syncs from Converge-NPS to Smartsheet (one-way)</li>
              <li>• Syncs happen automatically when data changes</li>
              <li>• Manual sync available for bulk updates</li>
              <li>• Failed syncs are automatically retried (up to 5 times)</li>
              <li>• Rate limited to 300 requests/minute (Smartsheet API limit)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
