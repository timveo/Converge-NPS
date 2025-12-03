import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Upload, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Smartsheet Integration</h1>
        <p className="text-gray-600 mt-1">
          Import and export data from Smartsheet
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <CardTitle>Import from Smartsheet</CardTitle>
            </div>
            <CardDescription>
              Pull data from Smartsheet into the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => handleImport('Industry Partners')}
              disabled={importing}
              className="w-full"
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
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Research Projects
            </Button>
            <Button
              onClick={() => handleImport('Event Schedule')}
              disabled={importing}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Event Schedule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-600" />
              <CardTitle>Export to Smartsheet</CardTitle>
            </div>
            <CardDescription>
              Push data from platform to Smartsheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Registrations
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export Connections
            </Button>
            <Button variant="outline" className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Export RSVPs
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import History</CardTitle>
          <CardDescription>Recent import operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {importJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {job.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{job.type}</p>
                    <p className="text-sm text-gray-600">
                      {job.records} records • {job.lastRun}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={job.status === 'completed' ? 'default' : 'destructive'}
                >
                  {job.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
