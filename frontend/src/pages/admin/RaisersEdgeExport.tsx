import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
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
import { toast } from 'sonner';
import { format } from 'date-fns';

const FIELD_MAPPINGS = [
  { reField: 'Import ID', appField: 'UUID', description: 'Unique identifier for matching' },
  { reField: 'Constituent Type', appField: 'ParticipantType', description: 'Student, Faculty/Staff, Industry, Alumni, or Guest' },
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

export default function RaisersEdgeExport() {
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

      // Progress simulation
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
                  className="text-white hover:bg-white/20 h-11 w-11"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-base md:text-xl font-bold flex items-center gap-1.5 md:gap-2">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  <span className="truncate">Raiser's Edge Export</span>
                </h1>
                <p className="text-xs md:text-sm text-blue-200 truncate">
                  Download CSV for RE Import
                </p>
              </div>
            </div>
          </div>
        </header>
      </div>

      <main className="container mx-auto px-3 md:px-4 py-3 md:py-6 max-w-6xl space-y-3 md:space-y-6">
        {/* Export Card */}
        <Card className="p-3 md:p-6 shadow-md border-border">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Download className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
              <span className="font-semibold text-foreground text-sm md:text-base">
                Export Registered Attendees
              </span>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] md:text-xs bg-green-500/10 text-green-600 border-green-500/30"
            >
              RE Compatible
            </Badge>
          </div>

          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Generate a UTF-8 CSV file with BOM for direct import into Raiser's Edge. Includes all
            registered attendees with event engagement data.
          </p>

          {exporting && (
            <div className="space-y-1.5 md:space-y-2 mb-3 md:mb-4">
              <div className="flex justify-between text-xs md:text-sm">
                <span className="text-muted-foreground">Generating export...</span>
                <span className="font-medium text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5 md:h-2" />
            </div>
          )}

          <Button
            onClick={handleExport}
            disabled={exporting}
            className="w-full h-11 md:h-10 text-xs md:text-sm"
          >
            {exporting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 animate-spin" />
                Generating Export...
              </>
            ) : progress === 100 ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Export Complete!
              </>
            ) : (
              <>
                <Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Download CSV for Raiser's Edge
              </>
            )}
          </Button>
        </Card>

        {/* Field Mapping Reference */}
        <Card className="p-3 md:p-6 shadow-md border-border">
          <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
            <Table className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            <span className="font-semibold text-foreground text-sm md:text-base">
              Field Mapping Reference
            </span>
          </div>

          <div className="bg-muted rounded-lg p-2 md:p-3 mb-3 md:mb-4">
            <div className="flex items-start gap-1.5 md:gap-2">
              <Info className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] md:text-xs text-muted-foreground">
                The CSV export follows Raiser's Edge import specifications. Use "Import ID" as the
                unique identifier when matching or creating new constituent records.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-foreground">
                    RE Field
                  </th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-foreground">
                    CSV Column
                  </th>
                  <th className="text-left py-2 px-2 md:px-3 font-medium text-foreground hidden md:table-cell">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIELD_MAPPINGS.map((mapping, index) => (
                  <tr key={index} className="border-b border-border/30 last:border-0">
                    <td className="py-2 px-2 md:px-3 text-muted-foreground">{mapping.reField}</td>
                    <td className="py-2 px-2 md:px-3">
                      <code className="text-[10px] md:text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                        {mapping.appField}
                      </code>
                    </td>
                    <td className="py-2 px-2 md:px-3 text-muted-foreground hidden md:table-cell">
                      {mapping.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Raiser's Edge Import Instructions */}
        <Card className="p-3 md:p-6 shadow-md border-border">
          <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-4">
            <AlertCircle className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            <span className="font-semibold text-foreground text-sm md:text-base">
              Raiser's Edge Import Instructions
            </span>
          </div>

          <ol className="space-y-2 md:space-y-3 text-xs md:text-sm text-muted-foreground list-decimal list-inside">
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
            <li>
              For custom attributes (Sessions, Connections), ensure attribute categories exist in RE
              first
            </li>
            <li>Review the import preview in RE and validate before committing</li>
          </ol>

          <div className="mt-3 md:mt-4 p-2 md:p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
            <p className="text-[10px] md:text-xs text-amber-700 dark:text-amber-400">
              <strong>Note:</strong> This CSV is formatted specifically for Blackbaud Raiser's Edge.
              The file uses UTF-8 encoding with BOM for proper character handling in RE imports.
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}
