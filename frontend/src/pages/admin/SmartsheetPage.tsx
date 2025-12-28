import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Download,
  Upload,
  RefreshCw,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const STORAGE_KEY = 'smartsheet-sync-history';

type ImportType = 'partners' | 'projects' | 'sessions' | 'opportunities' | 'attendees';

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

interface SyncJob {
  id: string;
  type: string;
  operation: 'import' | 'export';
  status: 'completed' | 'failed';
  records: number;
  lastRun: string;
}

function loadSyncHistory(): SyncJob[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load sync history:', e);
  }
  return [];
}

function saveSyncHistory(jobs: SyncJob[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  } catch (e) {
    console.error('Failed to save sync history:', e);
  }
}

const importOptions: Array<{ type: Exclude<ImportType, 'opportunities'>; label: string; description: string }> = [
  { type: 'partners', label: 'Industry Partners', description: 'Company listings from Smartsheet' },
  { type: 'projects', label: 'Research Projects', description: 'Academic project catalog' },
  { type: 'sessions', label: 'Event Schedule', description: 'Sessions & agenda updates' },
  // We now export attendees instead of importing them.
];

export default function SmartsheetPage() {
  const [importingStates, setImportingStates] = useState<Record<ImportType, boolean>>({
    partners: false,
    projects: false,
    sessions: false,
    opportunities: false,
    attendees: false,
  });
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [exportingAttendees, setExportingAttendees] = useState(false);

  // Load sync history from localStorage on mount
  useEffect(() => {
    setSyncJobs(loadSyncHistory());
  }, []);

  // Save sync history to localStorage whenever it changes
  const addSyncJob = (job: SyncJob) => {
    setSyncJobs(prev => {
      const updated = [job, ...prev].slice(0, 10); // Keep last 10 jobs
      saveSyncHistory(updated);
      return updated;
    });
  };

  const handleImport = async (option: { type: ImportType; label: string }) => {
    setImportingStates(prev => ({ ...prev, [option.type]: true }));
    try {
      const response = await api.post<ApiResponse<ImportSummary>>(`/admin/smartsheet/import/${option.type}`);
      const result = response.data;

      const summary =
        `Import complete for ${option.label}\n\n` +
        `Imported: ${result?.imported ?? 0}\n` +
        `Updated: ${result?.updated ?? 0}\n` +
        `Failed: ${result?.failed ?? 0}` +
        (result?.errors && result.errors.length > 0
          ? `\n\nErrors:\n${result.errors.slice(0, 3).map(e => e.message).join('\n')}`
          : '');

      toast.success(summary.replace(/\n/g, ' '));

      const completedCount = (result?.imported ?? 0) + (result?.updated ?? 0);
      addSyncJob({
        id: crypto.randomUUID(),
        type: option.label,
        operation: 'import',
        status: result.failed > 0 ? 'failed' : 'completed',
        records: completedCount,
        lastRun: new Date().toLocaleString(),
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to import ${option.label}`);
      addSyncJob({
        id: crypto.randomUUID(),
        type: option.label,
        operation: 'import',
        status: 'failed',
        records: 0,
        lastRun: new Date().toLocaleString(),
      });
    } finally {
      setImportingStates(prev => ({ ...prev, [option.type]: false }));
    }
  };

  const handleExportAttendees = async () => {
    setExportingAttendees(true);
    try {
      const response = await api.post<
        ApiResponse<{ total: number; added: number; updated: number; failed: number; errors?: Array<{ message?: string }> }>
      >(
        '/admin/smartsheet/export/attendees'
      );
      const result = response.data;

      const summary =
        `Export complete\n\n` +
        `Total: ${result?.total ?? 0}\n` +
        `Added: ${result?.added ?? 0}\n` +
        `Updated: ${result?.updated ?? 0}\n` +
        `Failed: ${result?.failed ?? 0}` +
        (result?.errors && result.errors.length > 0
          ? `\n\nErrors:\n${result.errors.slice(0, 3).map(e => e.message).join('\n')}`
          : '');

      toast.success(summary.replace(/\n/g, ' '));

      const completedCount = (result?.added ?? 0) + (result?.updated ?? 0);
      addSyncJob({
        id: crypto.randomUUID(),
        type: 'Attendees',
        operation: 'export',
        status: result.failed > 0 ? 'failed' : 'completed',
        records: completedCount,
        lastRun: new Date().toLocaleString(),
      });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to export attendees');
      addSyncJob({
        id: crypto.randomUUID(),
        type: 'Attendees',
        operation: 'export',
        status: 'failed',
        records: 0,
        lastRun: new Date().toLocaleString(),
      });
    } finally {
      setExportingAttendees(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4 max-w-6xl">
        <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg sticky top-0 z-10 rounded-lg">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Link to="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 h-11 w-11 md:h-10 md:w-10"
                >
                  <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                  <Database className="h-4 w-4 md:h-5 md:w-5" />
                  Smartsheet Integration
                </h1>
                <p className="text-xs md:text-sm text-blue-200">
                  Import and export data from Smartsheet
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-6xl space-y-3 md:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
          <Card className="shadow-md border-border">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Upload className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-sm md:text-base">Import from Smartsheet</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Pull data from Smartsheet into the platform
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
              {importOptions.map(option => (
                <Button
                  key={option.type}
                  onClick={() => handleImport(option)}
                  disabled={importingStates[option.type]}
                  className="w-full h-10 md:h-11 text-sm justify-between"
                >
                  <span className="flex items-center gap-2">
                    {importingStates[option.type] ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {`Import ${option.label}`}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {option.description}
                  </span>
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-md border-border">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Download className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-sm md:text-base">Export to Smartsheet</CardTitle>
                  <CardDescription className="text-xs md:text-sm">
                    Push data from platform to Smartsheet
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0 space-y-2 md:space-y-3">
              <Button
                onClick={handleExportAttendees}
                disabled={exportingAttendees}
                className="w-full h-10 md:h-11 text-sm justify-between"
              >
                <span className="flex items-center gap-2">
                  {exportingAttendees ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export Attendees
                </span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Push attendees to Smartsheet
                </span>
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md border-border">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-lg">Sync History</CardTitle>
            <CardDescription className="text-xs md:text-sm">Recent import and export operations</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            {syncJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No sync operations have been run yet.</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {syncJobs.map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between p-3 md:p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      {job.operation === 'import' ? (
                        <Upload className="w-4 h-4 md:w-5 md:h-5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <Download className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-sm md:text-base text-foreground">
                          {job.operation === 'import' ? 'Import' : 'Export'} {job.type}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground">
                          {job.records} records • {job.lastRun}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={job.status === 'completed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
