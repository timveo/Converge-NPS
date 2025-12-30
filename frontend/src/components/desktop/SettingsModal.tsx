import { useState, useEffect } from 'react';
import { X, Loader2, ChevronDown, Phone, Shield, Mail, Moon, Sun, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { api } from '@/lib/api';

const MILITARY_RANKS = [
  'ENS', 'LTJG', 'LT', 'LCDR', 'CDR', 'CAPT', 'RADM', 'VADM', 'ADM',
  'SR', 'SA', 'SN', 'PO3', 'PO2', 'PO1', 'CPO', 'SCPO', 'MCPO',
  '2LT', '1LT', 'CPT', 'MAJ', 'LTC', 'COL', 'BG', 'MG', 'LTG', 'GEN',
  'Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.',
];

const UNIQUE_RANKS = Array.from(new Set(MILITARY_RANKS));

const ACCELERATION_INTERESTS = [
  'AI/ML', 'Autonomous Systems', 'Cybersecurity', 'Data Analytics', 'Quantum Computing',
  'Robotics', 'Blockchain', 'IoT', 'Cloud Computing', 'Edge Computing',
  '5G/6G Networks', 'Space Technology', 'Biotechnology', 'Clean Energy',
  'Advanced Materials', 'Human-Machine Interface', 'Digital Twins', 'AR/VR/XR',
  'Additive Manufacturing', 'Nanotechnology',
];

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    rank: '',
    branch_of_service: '',
    role: '',
    department: '',
    organization: '',
    bio: '',
    linkedin_url: '',
    website_url: '',
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [showProfileAllowConnections, setShowProfileAllowConnections] = useState(true);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalInterests, setOriginalInterests] = useState<string[]>([]);
  const [originalPrivacy, setOriginalPrivacy] = useState({ showProfileAllowConnections: true });
  const [originalPhone, setOriginalPhone] = useState('');

  const [profileOpen, setProfileOpen] = useState(true);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);

  useEffect(() => {
    if (!user || !open) return;

    const nameParts = (user.fullName || '').split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const nextForm = {
      first_name: firstName,
      last_name: lastName,
      rank: user.rank || '',
      branch_of_service: user.branchOfService || '',
      role: user.role || '',
      department: user.department || '',
      organization: user.organization || '',
      bio: user.bio || '',
      linkedin_url: user.linkedinUrl || '',
      website_url: user.websiteUrl || '',
    };

    const nextInterests = user.accelerationInterests || [];
    const nextShowProfileAllowConnections = user.privacy?.showProfileAllowConnections !== false;
    const nextPhone = user.phone || '';

    setFormData(nextForm);
    setOriginalFormData(nextForm);
    setInterests(nextInterests);
    setOriginalInterests(nextInterests);
    setPhone(nextPhone);
    setOriginalPhone(nextPhone);
    setShowProfileAllowConnections(nextShowProfileAllowConnections);
    setOriginalPrivacy({ showProfileAllowConnections: nextShowProfileAllowConnections });
  }, [user, open]);

  const toggleInterest = (interest: string) => {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const hasChanges = () => {
    const formChanged = Object.keys(formData).some(
      (key) => formData[key as keyof typeof formData] !== originalFormData[key as keyof typeof originalFormData]
    );
    const interestsChanged =
      interests.length !== originalInterests.length || interests.some((i) => !originalInterests.includes(i));
    const phoneChanged = phone !== originalPhone;
    const privacyChanged = showProfileAllowConnections !== originalPrivacy.showProfileAllowConnections;

    return formChanged || interestsChanged || phoneChanged || privacyChanged;
  };

  const calculateProfileCompletion = () => {
    const fields = [
      formData.first_name,
      formData.last_name,
      formData.rank,
      formData.role,
      formData.department,
      formData.organization,
      formData.linkedin_url,
      formData.website_url,
      formData.bio,
      interests.length > 0 ? 'filled' : '',
      phone,
    ];

    const filledFields = fields.filter((field) => field && field.trim() !== '');
    const percentage = Math.round((filledFields.length / fields.length) * 100);

    return { percentage, filledCount: filledFields.length, totalCount: fields.length };
  };

  const completion = calculateProfileCompletion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!formData.first_name.trim()) {
      setErrors({ first_name: 'First name is required' });
      return;
    }
    if (!formData.last_name.trim()) {
      setErrors({ last_name: 'Last name is required' });
      return;
    }

    let linkedinUrl = formData.linkedin_url.trim();
    let websiteUrl = formData.website_url.trim();

    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\//i)) {
      linkedinUrl = `https://${linkedinUrl}`;
    }
    if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    const normalizedFormData = { ...formData, linkedin_url: linkedinUrl, website_url: websiteUrl };

    setSaving(true);

    try {
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      const profilePayload: Record<string, unknown> = {
        fullName,
        phone: phone || null,
        rank: normalizedFormData.rank || null,
        organization: normalizedFormData.organization || null,
        department: normalizedFormData.department || null,
        role: normalizedFormData.role || null,
        branchOfService: normalizedFormData.branch_of_service || null,
        bio: normalizedFormData.bio || null,
        accelerationInterests: interests,
        linkedinUrl: normalizedFormData.linkedin_url || null,
        websiteUrl: normalizedFormData.website_url || null,
      };

      const profileResponse = await api.patch<{ message: string; profile: Record<string, unknown> }>('/users/me', profilePayload);

      const privacyChanged = showProfileAllowConnections !== originalPrivacy.showProfileAllowConnections;

      if (privacyChanged) {
        const privacyPayload = { showProfileAllowConnections };
        await api.patch<{ message: string; profile: Record<string, unknown> }>('/users/me/privacy', privacyPayload);
      }

      if (updateUser && profileResponse.profile) {
        updateUser({
          fullName,
          phone: phone || null,
          rank: normalizedFormData.rank || null,
          organization: normalizedFormData.organization || user?.organization || '',
          department: normalizedFormData.department || null,
          role: normalizedFormData.role || user?.role || '',
          branchOfService: normalizedFormData.branch_of_service || null,
          bio: normalizedFormData.bio || null,
          accelerationInterests: interests,
          linkedinUrl: normalizedFormData.linkedin_url || null,
          websiteUrl: normalizedFormData.website_url || null,
          privacy: {
            ...user?.privacy,
            showProfileAllowConnections,
            profileVisibility: user?.privacy?.profileVisibility || 'public',
            allowQrScanning: user?.privacy?.allowQrScanning ?? true,
            allowMessaging: user?.privacy?.allowMessaging ?? true,
            hideContactInfo: user?.privacy?.hideContactInfo ?? false,
          },
        });
      }

      setOriginalFormData(normalizedFormData);
      setFormData(normalizedFormData);
      setOriginalInterests([...interests]);
      setOriginalPhone(phone);
      setOriginalPrivacy({ showProfileAllowConnections });

      toast.success('Settings saved successfully');
    } catch (error: unknown) {
      console.error('Failed to update settings:', error);
      const errorMessage = (error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to update settings';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-lg mx-4 bg-background rounded-xl shadow-2xl border border-border overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary-foreground">Settings</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-primary-foreground hover:bg-white/20 h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
                {/* Profile Completion */}
                <div className="bg-gradient-to-br from-secondary/50 to-primary/5 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-sm text-foreground">Profile Completion</h4>
                      <p className="text-xs text-muted-foreground">{completion.filledCount} of {completion.totalCount} fields</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">{completion.percentage}%</div>
                  </div>
                  <Progress value={completion.percentage} className="h-2" />
                </div>

                {/* Profile Information */}
                <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
                  <div className="border border-border rounded-lg">
                    <CollapsibleTrigger type="button" className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors rounded-lg">
                      <h3 className="font-medium text-sm text-foreground">Profile Information</h3>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-3">
                        {/* Name Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label htmlFor="first_name" className="text-xs">First Name *</Label>
                            <Input
                              id="first_name"
                              value={formData.first_name}
                              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                              placeholder="First name"
                              maxLength={50}
                              className={`h-9 text-sm ${errors.first_name ? 'border-destructive' : ''}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor="last_name" className="text-xs">Last Name *</Label>
                            <Input
                              id="last_name"
                              value={formData.last_name}
                              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                              placeholder="Last name"
                              maxLength={50}
                              className={`h-9 text-sm ${errors.last_name ? 'border-destructive' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Rank */}
                        <div className="space-y-1.5">
                          <Label htmlFor="rank" className="text-xs">Military Rank / Title</Label>
                          <Select value={formData.rank || undefined} onValueChange={(value) => setFormData({ ...formData, rank: value })}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select rank or title" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-[60]">
                              {UNIQUE_RANKS.map((rank) => (
                                <SelectItem key={rank} value={rank} className="text-sm">{rank}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Branch of Service */}
                        <div className="space-y-1.5">
                          <Label htmlFor="branch_of_service" className="text-xs">Branch of Service</Label>
                          <Select value={formData.branch_of_service || undefined} onValueChange={(value) => setFormData({ ...formData, branch_of_service: value })}>
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Select branch (optional)" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-[60]">
                              <SelectItem value="Army" className="text-sm">Army</SelectItem>
                              <SelectItem value="Navy" className="text-sm">Navy</SelectItem>
                              <SelectItem value="Air Force" className="text-sm">Air Force</SelectItem>
                              <SelectItem value="Marine Corps" className="text-sm">Marine Corps</SelectItem>
                              <SelectItem value="Coast Guard" className="text-sm">Coast Guard</SelectItem>
                              <SelectItem value="Space Force" className="text-sm">Space Force</SelectItem>
                              <SelectItem value="Civilian" className="text-sm">Civilian</SelectItem>
                              <SelectItem value="Other" className="text-sm">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Participant Type */}
                        <div className="space-y-1.5">
                          <Label htmlFor="participantType" className="text-xs">Participant Type</Label>
                          <Input
                            id="participantType"
                            value={
                              user.participantType === 'student' ? 'Student' :
                              user.participantType === 'faculty' ? 'Faculty/Staff' :
                              user.participantType === 'industry' ? 'Industry' :
                              user.participantType === 'alumni' ? 'Alumni' :
                              user.participantType === 'guest' ? 'Guest' :
                              user.participantType || 'Not specified'
                            }
                            disabled
                            className="bg-muted cursor-not-allowed h-9 text-sm"
                          />
                          <p className="text-[10px] text-muted-foreground">Your registration type cannot be changed</p>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                          <Label htmlFor="email" className="flex items-center gap-1.5 text-xs">
                            <Mail className="h-3 w-3" /> Email
                          </Label>
                          <Input id="email" type="email" value={user.email} disabled className="bg-muted cursor-not-allowed h-9 text-sm" />
                        </div>

                        {/* Phone */}
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="flex items-center gap-1.5 text-xs">
                            <Phone className="h-3 w-3" /> Phone
                          </Label>
                          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Enter phone number" className="h-9 text-sm" />
                        </div>

                        {/* Title */}
                        <div className="space-y-1.5">
                          <Label htmlFor="role" className="text-xs">Title</Label>
                          <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} placeholder="Professor, CEO, etc." maxLength={100} className="h-9 text-sm" />
                        </div>

                        {/* Department */}
                        <div className="space-y-1.5">
                          <Label htmlFor="department" className="text-xs">Department</Label>
                          <Input id="department" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="e.g., Computer Science" maxLength={100} className="h-9 text-sm" />
                        </div>

                        {/* Organization */}
                        <div className="space-y-1.5">
                          <Label htmlFor="organization" className="text-xs">Organization</Label>
                          <Input id="organization" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} placeholder="e.g., Naval Postgraduate School" maxLength={100} className="h-9 text-sm" />
                        </div>

                        {/* LinkedIn */}
                        <div className="space-y-1.5">
                          <Label htmlFor="linkedin_url" className="text-xs">LinkedIn URL</Label>
                          <Input id="linkedin_url" value={formData.linkedin_url} onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })} placeholder="linkedin.com/in/yourprofile" maxLength={200} className="h-9 text-sm" />
                        </div>

                        {/* Website */}
                        <div className="space-y-1.5">
                          <Label htmlFor="website_url" className="text-xs">Website</Label>
                          <Input id="website_url" value={formData.website_url} onChange={(e) => setFormData({ ...formData, website_url: e.target.value })} placeholder="yourwebsite.com" maxLength={200} className="h-9 text-sm" />
                        </div>

                        {/* Bio */}
                        <div className="space-y-1.5">
                          <Label htmlFor="bio" className="text-xs">Bio</Label>
                          <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself..." maxLength={500} rows={2} className="text-sm" />
                          <p className="text-[10px] text-muted-foreground text-right">{formData.bio.length}/500</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Technology Interests */}
                <Collapsible open={interestsOpen} onOpenChange={setInterestsOpen}>
                  <div className="border border-border rounded-lg">
                    <CollapsibleTrigger type="button" className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors rounded-lg">
                      <h3 className="font-medium text-sm text-foreground">Technology Interests</h3>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${interestsOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {ACCELERATION_INTERESTS.map((interest) => (
                          <label
                            key={interest}
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              interests.includes(interest) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <Checkbox checked={interests.includes(interest)} onCheckedChange={() => toggleInterest(interest)} className="h-3.5 w-3.5" />
                            <span className="text-xs text-foreground">{interest}</span>
                          </label>
                        ))}
                      </div>
                      {interests.length > 0 && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-[10px] text-muted-foreground mb-1.5">Selected ({interests.length}):</p>
                          <div className="flex flex-wrap gap-1">
                            {interests.map((interest) => (
                              <Badge key={interest} variant="secondary" className="text-[10px] px-1.5 py-0">{interest}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Privacy Settings */}
                <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
                  <div className="border border-border rounded-lg">
                    <CollapsibleTrigger type="button" className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors rounded-lg">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm text-foreground">Privacy Settings</h3>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${privacyOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="space-y-2">
                        <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                          <div className="flex-1 pr-3">
                            <span className="text-xs font-medium text-foreground">Show Profile & Allow Connections</span>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Allow all other users to see your profile and email and interact with you via messaging and scanning.
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              If toggled off, only your current connections will be able to see your profile information and message you. QR code scanning will still work.
                            </p>
                          </div>
                          <Checkbox checked={showProfileAllowConnections} onCheckedChange={(checked) => setShowProfileAllowConnections(checked === true)} className="h-4 w-4" />
                        </label>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                {/* Appearance */}
                <Collapsible open={appearanceOpen} onOpenChange={setAppearanceOpen}>
                  <div className="border border-border rounded-lg">
                    <CollapsibleTrigger type="button" className="flex items-center justify-between w-full p-4 hover:bg-secondary/30 transition-colors rounded-lg">
                      <div className="flex items-center gap-2">
                        <Sun className="h-4 w-4 text-primary" />
                        <h3 className="font-medium text-sm text-foreground">Appearance</h3>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${appearanceOpen ? 'rotate-180' : ''}`} />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-4 pb-4">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={theme === 'light' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('light')}
                          className="flex-1 gap-2"
                        >
                          <Sun className="h-4 w-4" /> Light
                        </Button>
                        <Button
                          type="button"
                          variant={theme === 'dark' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('dark')}
                          className="flex-1 gap-2"
                        >
                          <Moon className="h-4 w-4" /> Dark
                        </Button>
                        <Button
                          type="button"
                          variant={theme === 'system' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setTheme('system')}
                          className="flex-1 gap-2"
                        >
                          <Monitor className="h-4 w-4" /> System
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </div>

              {/* Footer */}
              {hasChanges() && (
                <div className="px-6 py-4 border-t border-border bg-secondary/20">
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="flex-1">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
