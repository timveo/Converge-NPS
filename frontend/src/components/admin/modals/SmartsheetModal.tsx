import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  Upload,
  RefreshCw,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

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
];

interface SmartsheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SmartsheetModal({ open, onOpenChange }: SmartsheetModalProps) {
  const [importingStates, setImportingStates] = useState<Record<ImportType, boolean>>({
    partners: false,
    projects: false,
    sessions: false,
    opportunities: false,
    attendees: false,
  });
  const [syncJobs, setSyncJobs] = useState<SyncJob[]>([]);
  const [exportingAttendees, setExportingAttendees] = useState(false);

  // Load sync history from localStorage when modal opens
  useEffect(() => {
    if (open) {
      setSyncJobs(loadSyncHistory());
    }
  }, [open]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-24px)] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Database className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Smartsheet Integration</DialogTitle>
              <DialogDescription className="text-sm">
                Import and export data from Smartsheet
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Upload className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Import from Smartsheet</CardTitle>
                      <CardDescription className="text-xs">
                        Pull data from Smartsheet into the platform
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  {importOptions.map(option => (
                    <Button
                      key={option.type}
                      onClick={() => handleImport(option)}
                      disabled={importingStates[option.type]}
                      className="w-full h-10 text-sm justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {importingStates[option.type] ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {`Import ${option.label}`}
                      </span>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                      <Download className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Export to Smartsheet</CardTitle>
                      <CardDescription className="text-xs">
                        Push data from platform to Smartsheet
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <Button
                    variant="outline"
                    className="w-full h-10 text-sm"
                    onClick={handleExportAttendees}
                    disabled={exportingAttendees}
                  >
                    {exportingAttendees ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Export Attendees
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader className="p-4">
                <CardTitle className="text-sm">Sync History</CardTitle>
                <CardDescription className="text-xs">Recent import and export operations</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                {syncJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No sync operations have been run yet.</p>
                ) : (
                  <div className="space-y-2">
                    {syncJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {job.operation === 'import' ? (
                            <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <Download className="w-4 h-4 text-green-600 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm text-foreground">
                              {job.operation === 'import' ? 'Import' : 'Export'} {job.type}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
