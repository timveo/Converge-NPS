import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  Download,
  Upload,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Database,
} from 'lucide-react';
import { toast } from 'sonner';

const importJobs = [
  {
    id: '1',
    type: 'Industry Partners',
    status: 'completed',
    records: 45,
    lastRun: '2026-01-20 10:30 AM',
  },
  {
    id: '2',
    type: 'Research Projects',
    status: 'completed',
    records: 52,
    lastRun: '2026-01-20 10:32 AM',
  },
  {
    id: '3',
    type: 'Event Schedule',
    status: 'completed',
    records: 87,
    lastRun: '2026-01-20 10:35 AM',
  },
];

export default function SmartsheetPage() {
  const [importing, setImporting] = useState(false);

  const handleImport = async (type: string) => {
    setImporting(true);
    // TODO: API call
    setTimeout(() => {
      toast.success(`${type} imported successfully!`);
      setImporting(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-24">
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
          <Card className="shadow-md border-gray-200">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-blue-100 flex items-center justify-center">
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
              <Button
                onClick={() => handleImport('Industry Partners')}
                disabled={importing}
                className="w-full h-10 md:h-11 text-sm"
              >
                {importing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                Import Industry Partners
              </Button>
              <Button
                onClick={() => handleImport('Research Projects')}
                disabled={importing}
                className="w-full h-10 md:h-11 text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Research Projects
              </Button>
              <Button
                onClick={() => handleImport('Event Schedule')}
                disabled={importing}
                className="w-full h-10 md:h-11 text-sm"
              >
                <Upload className="w-4 h-4 mr-2" />
                Import Event Schedule
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-md border-gray-200">
            <CardHeader className="p-3 md:p-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-green-100 flex items-center justify-center">
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
              <Button variant="outline" className="w-full h-10 md:h-11 text-sm">
                <Download className="w-4 h-4 mr-2" />
                Export Registrations
              </Button>
              <Button variant="outline" className="w-full h-10 md:h-11 text-sm">
                <Download className="w-4 h-4 mr-2" />
                Export Connections
              </Button>
              <Button variant="outline" className="w-full h-10 md:h-11 text-sm">
                <Download className="w-4 h-4 mr-2" />
                Export RSVPs
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-md border-gray-200">
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-sm md:text-lg">Import History</CardTitle>
            <CardDescription className="text-xs md:text-sm">Recent import operations</CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="space-y-2 md:space-y-3">
              {importJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-3 md:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    {job.status === 'completed' ? (
                      <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-medium text-sm md:text-base">{job.type}</p>
                      <p className="text-xs md:text-sm text-gray-600">
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
