import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { QrCode, Keyboard, Camera, CheckCircle } from 'lucide-react';
import { useHasCamera } from '@/hooks/useHasCamera';
import { toast } from 'sonner';

const COLLABORATIVE_INTENTS = [
  { id: 'research', label: 'Research Collaboration' },
  { id: 'brainstorming', label: 'Brainstorming Session' },
  { id: 'design_sprint', label: 'Design Sprint' },
  { id: 'hackathon', label: 'Hackathon Participation' },
  { id: 'funding', label: 'Funded Research Opportunity' },
  { id: 'internship_job', label: 'Internship/Job Opportunity' },
];

export default function ScannerPage() {
  const hasCamera = useHasCamera();
  const [mode, setMode] = useState<'qr' | 'manual'>(hasCamera ? 'qr' : 'manual');
  const [manualCode, setManualCode] = useState('');
  const [selectedIntents, setSelectedIntents] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [scannedUser, setScannedUser] = useState<any>(null);

  const handleIntentToggle = (intentId: string) => {
    setSelectedIntents((prev) =>
      prev.includes(intentId)
        ? prev.filter((id) => id !== intentId)
        : [...prev, intentId]
    );
  };

  const handleManualLookup = () => {
    if (!manualCode.trim()) {
      toast.error('Please enter a code');
      return;
    }
    // Mock user data
    setScannedUser({
      id: manualCode,
      name: 'Dr. Sarah Johnson',
      organization: 'Naval Postgraduate School',
      role: 'Associate Professor',
      interests: ['AI/ML', 'Cybersecurity'],
    });
  };

  const handleSaveConnection = () => {
    if (selectedIntents.length === 0) {
      toast.error('Please select at least one collaborative intent');
      return;
    }
    // TODO: API call
    toast.success('Connection saved!');
    setScannedUser(null);
    setSelectedIntents([]);
    setNotes('');
    setManualCode('');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">QR Scanner</h1>
          <p className="text-gray-600 mt-1">Connect with attendees</p>
        </div>

        {!scannedUser ? (
          <>
            {hasCamera && (
              <div className="flex gap-2">
                <Button
                  variant={mode === 'qr' ? 'default' : 'outline'}
                  onClick={() => setMode('qr')}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Scan QR
                </Button>
                <Button
                  variant={mode === 'manual' ? 'default' : 'outline'}
                  onClick={() => setMode('manual')}
                  className="flex-1"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Manual Entry
                </Button>
              </div>
            )}

            {mode === 'qr' && hasCamera ? (
              <Card>
                <CardContent className="p-6">
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <QrCode className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Point camera at QR code</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Camera access required
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Manual Code Entry</CardTitle>
                  <CardDescription>
                    Enter the attendee's unique code to connect
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="code">Attendee Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter code (e.g., ABC123)"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <Button onClick={handleManualLookup} className="w-full">
                    Look Up Attendee
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Attendee Found
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
                    {scannedUser.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold">{scannedUser.name}</h3>
                    <p className="text-gray-600">{scannedUser.role}</p>
                    <p className="text-gray-500">{scannedUser.organization}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scannedUser.interests.map((interest: string) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collaborative Intent</CardTitle>
                <CardDescription>
                  Select why you're connecting (required)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {COLLABORATIVE_INTENTS.map((intent) => (
                    <button
                      key={intent.id}
                      onClick={() => handleIntentToggle(intent.id)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        selectedIntents.includes(intent.id)
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            selectedIntents.includes(intent.id)
                              ? 'border-blue-600 bg-blue-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {selectedIntents.includes(intent.id) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{intent.label}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add a quick note about this connection"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={200}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {notes.length}/200 characters
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setScannedUser(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSaveConnection} className="flex-1">
                    Save Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
