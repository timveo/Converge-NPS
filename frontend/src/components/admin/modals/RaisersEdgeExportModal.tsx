import { useState } from 'react';
import {
  Loader2,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  Table,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const FIELD_MAPPINGS = [
  { reField: 'Import ID', appField: 'UUID', description: 'Unique identifier for matching' },
  { reField: 'Constituent Type', appField: 'ParticipantType', description: 'User role(s) in the system' },
  { reField: 'First Name', appField: 'FirstName', description: 'First name' },
  { reField: 'Last Name', appField: 'LastName', description: 'Last name' },
  { reField: 'Email', appField: 'Email', description: 'Primary email address' },
  { reField: 'Title', appField: 'RankTitle', description: 'Rank or professional title' },
  { reField: 'Department', appField: 'BranchOfService', description: 'Branch of service or department' },
  { reField: 'Org Name', appField: 'Organization', description: 'Affiliated organization' },
  { reField: 'Job Title', appField: 'Role', description: 'Professional role' },
  { reField: 'LinkedIn URL', appField: 'LinkedinURL', description: 'LinkedIn profile URL' },
  { reField: 'Website', appField: 'WebsiteURL', description: 'Personal or company website' },
  { reField: 'Date Added', appField: 'RSVPDate', description: 'Registration/RSVP date' },
];

interface RaisersEdgeExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RaisersEdgeExportModal({ open, onOpenChange }: RaisersEdgeExportModalProps) {
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setExporting(true);
    setProgress(0);

    toast.info("Starting Raiser's Edge export...", {
      description: 'Collecting event data',
      duration: 3000,
    });

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        toast.error('You must be logged in to perform this action');
        return;
      }

      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
      const response = await fetch(`${baseUrl}/admin/export/raisers-edge`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export failed');
      }

      setProgress(100);

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `raisers-edge-export-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Export Complete!', {
        description: "CSV file downloaded successfully. Ready for Raiser's Edge import.",
        duration: 5000,
      });

      setTimeout(() => {
        setExporting(false);
        setProgress(0);
      }, 2000);
    } catch (error: unknown) {
      console.error('Export error:', error);
      setExporting(false);
      setProgress(0);

      const message = error instanceof Error ? error.message : 'Please try again.';
      toast.error('Export Failed', {
        description: message,
        action: {
          label: 'Retry',
          onClick: () => handleExport(),
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-24px)] max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle className="text-lg">Raiser's Edge Export</DialogTitle>
              <DialogDescription className="text-sm">
                Download CSV for RE Import
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {/* Export Card */}
            <Card className="p-4 border-border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Download className="h-4 w-4 text-red-600" />
                  <span className="font-semibold text-foreground text-sm">
                    Export Registered Attendees
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs bg-green-500/10 text-green-600 border-green-500/30"
                >
                  RE Compatible
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground mb-3">
                Generate a UTF-8 CSV file with BOM for direct import into Raiser's Edge. Includes all
                registered attendees with event engagement data.
              </p>

              {exporting && (
                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Generating export...</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button
                onClick={handleExport}
                disabled={exporting}
                className="w-full h-10 text-sm"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Export...
                  </>
                ) : progress === 100 ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Export Complete!
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV for Raiser's Edge
                  </>
                )}
              </Button>
            </Card>

            {/* Field Mapping Reference */}
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-3">
                <Table className="h-4 w-4 text-primary" />
                <span className="font-semibold text-foreground text-sm">
                  Field Mapping Reference
                </span>
              </div>

              <div className="bg-muted rounded-lg p-2 mb-3">
                <div className="flex items-start gap-2">
                  <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    The CSV export follows Raiser's Edge import specifications. Use "Import ID" as the
                    unique identifier when matching or creating new constituent records.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-2 font-medium text-foreground">
                        RE Field
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-foreground">
                        CSV Column
                      </th>
                      <th className="text-left py-2 px-2 font-medium text-foreground">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FIELD_MAPPINGS.map((mapping, index) => (
                      <tr key={index} className="border-b border-border/30 last:border-0">
                        <td className="py-2 px-2 text-muted-foreground">{mapping.reField}</td>
                        <td className="py-2 px-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {mapping.appField}
                          </code>
                        </td>
                        <td className="py-2 px-2 text-muted-foreground">
                          {mapping.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Raiser's Edge Import Instructions */}
            <Card className="p-4 border-border">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-foreground text-sm">
                  Raiser's Edge Import Instructions
                </span>
              </div>

              <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
                <li>Download the CSV file using the button above</li>
                <li>
                  Open <strong className="text-foreground">Raiser's Edge NXT</strong> or{' '}
                  <strong className="text-foreground">Raiser's Edge 7</strong>
                </li>
                <li>
                  Navigate to <strong className="text-foreground">Admin → Import</strong>
                </li>
                <li>
                  Select <strong className="text-foreground">Constituent Import</strong> as the import
                  type
                </li>
                <li>Choose the downloaded CSV file</li>
                <li>
                  Map fields using the reference table above — match{' '}
                  <strong className="text-foreground">UUID</strong> to Import ID
                </li>
                <li>Review the import preview in RE and validate before committing</li>
              </ol>

              <div className="mt-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  <strong>Note:</strong> This CSV is formatted specifically for Blackbaud Raiser's Edge.
                  The file uses UTF-8 encoding with BOM for proper character handling in RE imports.
                </p>
              </div>
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
