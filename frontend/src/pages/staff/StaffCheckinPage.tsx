import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, QrCode, CheckCircle, UserPlus, Users, Clock } from 'lucide-react';
import { toast } from 'sonner';

export default function StaffCheckinPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [mode, setMode] = useState<'search' | 'scan' | 'walkin'>('search');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const handleSearch = () => {
    if (!searchTerm.trim()) {
      toast.error('Please enter a name or email');
      return;
    }
    // Mock user
    setSelectedUser({
      id: '1',
      name: 'Dr. Sarah Johnson',
      email: 'sjohnson@nps.edu',
      organization: 'Naval Postgraduate School',
      checkedIn: false,
    });
  };

  const handleCheckIn = () => {
    // TODO: API call
    toast.success(`${selectedUser.name} checked in successfully!`);
    setSelectedUser(null);
    setSearchTerm('');
  };

  const stats = {
    totalRegistered: 487,
    checkedIn: 342,
    walkIns: 15,
    lastHour: 45,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Staff Check-In</h1>
          <p className="text-gray-600 mt-1">Event attendee check-in system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.checkedIn}</p>
                  <p className="text-sm text-gray-600">Checked In</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalRegistered}</p>
                  <p className="text-sm text-gray-600">Registered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.walkIns}</p>
                  <p className="text-sm text-gray-600">Walk-Ins</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.lastHour}</p>
                  <p className="text-sm text-gray-600">Last Hour</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={mode === 'search' ? 'default' : 'outline'}
            onClick={() => setMode('search')}
            className="flex-1"
          >
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
          <Button
            variant={mode === 'scan' ? 'default' : 'outline'}
            onClick={() => setMode('scan')}
            className="flex-1"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Scan QR
          </Button>
          <Button
            variant={mode === 'walkin' ? 'default' : 'outline'}
            onClick={() => setMode('walkin')}
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Walk-In
          </Button>
        </div>

        {/* Search Mode */}
        {mode === 'search' && !selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle>Search Attendee</CardTitle>
              <CardDescription>
                Enter name or email to find attendee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Name or Email</Label>
                <Input
                  id="search"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="mt-2"
                />
              </div>
              <Button onClick={handleSearch} className="w-full">
                Search
              </Button>
            </CardContent>
          </Card>
        )}

        {/* QR Scan Mode */}
        {mode === 'scan' && (
          <Card>
            <CardContent className="p-6">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <QrCode className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Point camera at QR code</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Walk-In Mode */}
        {mode === 'walkin' && (
          <Card>
            <CardHeader>
              <CardTitle>Walk-In Registration</CardTitle>
              <CardDescription>
                Register and check in a walk-in attendee
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input id="fullName" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="organization">Organization *</Label>
                  <Input id="organization" required className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="role">Role *</Label>
                  <Input id="role" required className="mt-2" />
                </div>
              </div>
              <Button className="w-full">Register & Check In</Button>
            </CardContent>
          </Card>
        )}

        {/* Selected User for Check-In */}
        {selectedUser && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Attendee Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-2xl font-semibold">
                  {selectedUser.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email}</p>
                  <p className="text-gray-500">{selectedUser.organization}</p>
                  {selectedUser.checkedIn && (
                    <Badge className="mt-2">Already Checked In</Badge>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedUser(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCheckIn}
                  disabled={selectedUser.checkedIn}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check In
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
