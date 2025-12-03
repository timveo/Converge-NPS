import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function PrivacySettingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    profileVisibility: user?.privacy?.profileVisibility === 'public',
    allowQrScanning: user?.privacy?.allowQrScanning ?? true,
    allowMessaging: user?.privacy?.allowMessaging ?? true,
    hideContactInfo: user?.privacy?.hideContactInfo ?? false,
  });

  const handleToggle = (key: keyof typeof settings) => {
    setSettings({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handleSave = async () => {
    // TODO: Implement API call
    toast.success('Privacy settings updated successfully!');
    navigate('/profile');
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Privacy Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <CardTitle>Control Your Privacy</CardTitle>
            </div>
            <CardDescription>
              Manage how your information is shared with other attendees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="profileVisibility">Public Profile</Label>
                <p className="text-sm text-gray-500">
                  Allow others to discover your profile in search and directory
                </p>
              </div>
              <Switch
                id="profileVisibility"
                checked={settings.profileVisibility}
                onCheckedChange={() => handleToggle('profileVisibility')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowQrScanning">Allow QR Scanning</Label>
                <p className="text-sm text-gray-500">
                  Let others scan your QR code to connect with you
                </p>
              </div>
              <Switch
                id="allowQrScanning"
                checked={settings.allowQrScanning}
                onCheckedChange={() => handleToggle('allowQrScanning')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowMessaging">Allow Messaging</Label>
                <p className="text-sm text-gray-500">
                  Let other attendees send you direct messages
                </p>
              </div>
              <Switch
                id="allowMessaging"
                checked={settings.allowMessaging}
                onCheckedChange={() => handleToggle('allowMessaging')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hideContactInfo">Hide Contact Info</Label>
                <p className="text-sm text-gray-500">
                  Keep your email and phone number private from other users
                </p>
              </div>
              <Switch
                id="hideContactInfo"
                checked={settings.hideContactInfo}
                onCheckedChange={() => handleToggle('hideContactInfo')}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => navigate('/profile')}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
