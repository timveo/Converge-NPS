import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { ChevronLeft, Loader2, ChevronDown, Phone, Shield, Mail, Smartphone, LogOut } from "lucide-react";
import InstallAppDialog from "@/components/InstallAppDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { api } from "@/lib/api";
import Footer from "@/components/Footer";

const MILITARY_RANKS = [
  // Navy Officer
  "ENS", "LTJG", "LT", "LCDR", "CDR", "CAPT", "RADM", "VADM", "ADM",
  // Navy Enlisted
  "SR", "SA", "SN", "PO3", "PO2", "PO1", "CPO", "SCPO", "MCPO",
  // Army/Air Force Officer
  "2LT", "1LT", "CPT", "MAJ", "LTC", "COL", "BG", "MG", "LTG", "GEN",
  // Other
  "Mr.", "Ms.", "Mrs.", "Dr.", "Prof."
];

const UNIQUE_RANKS = Array.from(new Set(MILITARY_RANKS));

const ACCELERATION_INTERESTS = [
  "AI/ML",
  "Autonomous Systems",
  "Cybersecurity",
  "Data Analytics",
  "Quantum Computing",
  "Robotics",
  "Blockchain",
  "IoT",
  "Cloud Computing",
  "Edge Computing",
  "5G/6G Networks",
  "Space Technology",
  "Biotechnology",
  "Clean Energy",
  "Advanced Materials",
  "Human-Machine Interface",
  "Digital Twins",
  "AR/VR/XR",
  "Additive Manufacturing",
  "Nanotechnology"
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    rank: "",
    role: "",
    department: "",
    organization: "",
    bio: "",
    linkedin_url: "",
    website_url: "",
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [allowQrScan, setAllowQrScan] = useState(true);
  const [shareEmail, setShareEmail] = useState(true);
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  // Check if we should open profile section from navigation state
  const openProfileFromNav = (location.state as { openProfile?: boolean })?.openProfile ?? false;
  const [profileOpen, setProfileOpen] = useState(openProfileFromNav);
  const [interestsOpen, setInterestsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [showInstallDialog, setShowInstallDialog] = useState(false);

  // Store original values to detect changes
  const [originalFormData, setOriginalFormData] = useState(formData);
  const [originalInterests, setOriginalInterests] = useState<string[]>([]);

  // Track original privacy settings for change detection
  const [originalPrivacy, setOriginalPrivacy] = useState({ allowQrScan: true, shareEmail: true });
  const [originalPhone, setOriginalPhone] = useState("");

  useEffect(() => {
    if (!user) return;

    // Parse fullName into first and last name
    const nameParts = (user.fullName || "").split(' ');
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(' ') || "";

    const nextForm = {
      first_name: firstName,
      last_name: lastName,
      rank: user.rank || "",
      role: user.role || "",
      department: user.department || "",
      organization: user.organization || "",
      bio: user.bio || "",
      linkedin_url: user.linkedinUrl || "",
      website_url: user.websiteUrl || "",
    };

    const nextInterests = user.accelerationInterests || [];
    const nextShareEmail = !user.privacy?.hideContactInfo;
    const nextAllowQrScan = user.privacy?.allowQrScanning !== false;
    const nextPhone = user.phone || "";

    setFormData(nextForm);
    setOriginalFormData(nextForm);
    setInterests(nextInterests);
    setOriginalInterests(nextInterests);
    setEmail(user.email || "");
    setPhone(nextPhone);
    setOriginalPhone(nextPhone);
    setShareEmail(nextShareEmail);
    setAllowQrScan(nextAllowQrScan);
    setOriginalPrivacy({ allowQrScan: nextAllowQrScan, shareEmail: nextShareEmail });
  }, [user]);

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  // Check if any form values have changed
  const hasChanges = () => {
    const formChanged = Object.keys(formData).some(
      key => formData[key as keyof typeof formData] !== originalFormData[key as keyof typeof originalFormData]
    );

    const interestsChanged =
      interests.length !== originalInterests.length ||
      interests.some(i => !originalInterests.includes(i));

    const phoneChanged = phone !== originalPhone;

    const privacyChanged =
      allowQrScan !== originalPrivacy.allowQrScan ||
      shareEmail !== originalPrivacy.shareEmail;

    return formChanged || interestsChanged || phoneChanged || privacyChanged;
  };

  const calculateProfileCompletion = () => {
    const fields = [
      { name: "First Name", value: formData.first_name, required: true },
      { name: "Last Name", value: formData.last_name, required: true },
      { name: "Rank", value: formData.rank, required: false },
      { name: "Role", value: formData.role, required: false },
      { name: "Department", value: formData.department, required: false },
      { name: "Organization", value: formData.organization, required: false },
      { name: "LinkedIn URL", value: formData.linkedin_url, required: false },
      { name: "Website", value: formData.website_url, required: false },
      { name: "Bio", value: formData.bio, required: false },
      { name: "Interests", value: interests.length > 0 ? "filled" : "", required: false },
      { name: "Phone", value: phone, required: false },
    ];

    const filledFields = fields.filter(field => field.value && field.value.trim() !== "");
    const percentage = Math.round((filledFields.length / fields.length) * 100);

    return {
      percentage,
      filledCount: filledFields.length,
      totalCount: fields.length
    };
  };

  const completion = calculateProfileCompletion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.first_name.trim()) {
      setErrors({ first_name: "First name is required" });
      return;
    }
    if (!formData.last_name.trim()) {
      setErrors({ last_name: "Last name is required" });
      return;
    }

    // Normalize URLs - add https:// if missing protocol
    let linkedinUrl = formData.linkedin_url.trim();
    let websiteUrl = formData.website_url.trim();

    if (linkedinUrl && !linkedinUrl.match(/^https?:\/\//i)) {
      linkedinUrl = `https://${linkedinUrl}`;
    }
    if (websiteUrl && !websiteUrl.match(/^https?:\/\//i)) {
      websiteUrl = `https://${websiteUrl}`;
    }

    // Update formData with normalized URLs for saving
    const normalizedFormData = {
      ...formData,
      linkedin_url: linkedinUrl,
      website_url: websiteUrl,
    };

    setSaving(true);

    try {
      // Combine first and last name for backend
      const fullName = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();

      // Prepare profile update payload (camelCase for backend)
      const profilePayload: Record<string, any> = {
        fullName,
        phone: phone || null,
        rank: normalizedFormData.rank || null,
        organization: normalizedFormData.organization || null,
        department: normalizedFormData.department || null,
        role: normalizedFormData.role || null,
        bio: normalizedFormData.bio || null,
        accelerationInterests: interests,
        linkedinUrl: normalizedFormData.linkedin_url || null,
        websiteUrl: normalizedFormData.website_url || null,
      };

      // Update profile
      const profileResponse = await api.patch<{ message: string; profile: any }>('/users/me', profilePayload);

      // Check if privacy settings changed
      const privacyChanged =
        allowQrScan !== originalPrivacy.allowQrScan ||
        shareEmail !== originalPrivacy.shareEmail;

      if (privacyChanged) {
        // Update privacy settings separately
        const privacyPayload = {
          allowQrScanning: allowQrScan,
          hideContactInfo: !shareEmail,
        };
        await api.patch<{ message: string; profile: any }>('/users/me/privacy', privacyPayload);
      }

      // Update local user state with new values
      if (updateUser && profileResponse.profile) {
        updateUser({
          fullName,
          phone: phone || null,
          rank: normalizedFormData.rank || null,
          organization: normalizedFormData.organization || user?.organization || "",
          department: normalizedFormData.department || null,
          role: normalizedFormData.role || user?.role || "",
          bio: normalizedFormData.bio || null,
          accelerationInterests: interests,
          linkedinUrl: normalizedFormData.linkedin_url || null,
          websiteUrl: normalizedFormData.website_url || null,
          privacy: {
            ...user?.privacy,
            allowQrScanning: allowQrScan,
            hideContactInfo: !shareEmail,
            profileVisibility: user?.privacy?.profileVisibility || 'public',
            allowMessaging: user?.privacy?.allowMessaging ?? true,
          },
        });
      }

      // Update original values to reflect saved state (with normalized URLs)
      setOriginalFormData(normalizedFormData);
      // Also update the form display with normalized URLs
      setFormData(normalizedFormData);
      setOriginalInterests([...interests]);
      setOriginalPhone(phone);
      setOriginalPrivacy({ allowQrScan, shareEmail });

      toast.success("Profile updated successfully");
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      const errorMessage = error.response?.data?.error?.message || "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20 md:pb-24">
      {/* Header */}
      <div className="container mx-auto px-4 md:px-4 pt-4 md:pt-8 max-w-2xl">
        <Card className="p-4 md:p-4 shadow-md bg-gradient-navy text-primary-foreground mb-4 md:mb-6">
          <div className="flex items-center gap-3 md:gap-4">
            <Link to="/">
              <Button
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary/20"
              >
                <ChevronLeft className="h-5 w-5 md:h-5 md:w-5" />
              </Button>
            </Link>
            <h1 className="text-lg md:text-xl font-bold">Settings</h1>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 max-w-2xl">
        {/* Profile Completion Card */}
        <Card className="p-4 md:p-6 shadow-lg border-accent/30 bg-gradient-to-br from-card to-accent/5 mb-4 md:mb-6">
          <div className="space-y-3 md:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm md:text-lg text-foreground">Profile Completion</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">
                  {completion.filledCount} of {completion.totalCount} fields completed
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl md:text-3xl font-bold text-accent">{completion.percentage}%</div>
                <p className="text-[10px] md:text-xs text-muted-foreground">Complete</p>
              </div>
            </div>

            <Progress value={completion.percentage} className="h-2 md:h-3" />

            {completion.percentage < 100 && (
              <div className="bg-secondary/50 p-2.5 md:p-3 rounded-lg mt-3 md:mt-4">
                <p className="text-[10px] md:text-xs text-muted-foreground">
                  💡 <span className="font-medium">Tip:</span> Complete your profile to make meaningful connections
                </p>
              </div>
            )}
          </div>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Profile Information */}
          <Collapsible open={profileOpen} onOpenChange={setProfileOpen}>
            <Card className="p-4 md:p-6 shadow-md border-border/50">
              <CollapsibleTrigger type="button" className="flex items-center justify-between w-full">
                <h3 className="font-semibold text-sm md:text-lg text-foreground">Profile Information</h3>
                <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-muted-foreground transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 md:pt-4">
                <div className="space-y-3 md:space-y-4">
                  {/* First Name and Last Name in a row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="first_name" className="text-xs md:text-sm">First Name *</Label>
                      <Input
                        id="first_name"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        placeholder="Enter your first name"
                        maxLength={50}
                        className={`h-9 md:h-10 text-sm ${errors.first_name ? "border-destructive" : ""}`}
                      />
                      {errors.first_name && (
                        <p className="text-xs text-destructive">{errors.first_name}</p>
                      )}
                    </div>

                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="last_name" className="text-xs md:text-sm">Last Name *</Label>
                      <Input
                        id="last_name"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        placeholder="Enter your last name"
                        maxLength={50}
                        className={`h-9 md:h-10 text-sm ${errors.last_name ? "border-destructive" : ""}`}
                      />
                      {errors.last_name && (
                        <p className="text-xs text-destructive">{errors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="rank" className="text-xs md:text-sm">Military Rank / Title</Label>
                    <Select
                      value={formData.rank || undefined}
                      onValueChange={(value) => setFormData({ ...formData, rank: value })}
                    >
                      <SelectTrigger className="bg-background h-9 md:h-10 text-sm">
                        <SelectValue placeholder="Select rank or title (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {UNIQUE_RANKS.map((rank) => (
                          <SelectItem key={rank} value={rank} className="text-sm">
                            {rank}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Select your military rank or civilian title (Mr./Ms./Dr./Prof.)
                    </p>
                  </div>

                  {/* Participant Type field */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="participantType" className="text-xs md:text-sm">
                      Participant Type
                    </Label>
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
                      className="bg-muted cursor-not-allowed h-9 md:h-10 text-sm"
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Your registration type cannot be changed
                    </p>
                  </div>

                  {/* Email field */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <Mail className="h-3 w-3 md:h-4 md:w-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="bg-muted cursor-not-allowed h-9 md:h-10 text-sm"
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      Contact support to change your email address
                    </p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="phone" className="flex items-center gap-1.5 md:gap-2 text-xs md:text-sm">
                      <Phone className="h-3 w-3 md:h-4 md:w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Enter phone number"
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="role" className="text-xs md:text-sm">Role / Title</Label>
                    <Input
                      id="role"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="Professor, CEO, Program Manager..."
                      maxLength={100}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="department" className="text-xs md:text-sm">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      placeholder="e.g., Computer Science"
                      maxLength={100}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="organization" className="text-xs md:text-sm">Organization or Company</Label>
                    <Input
                      id="organization"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      placeholder="e.g., Naval Postgraduate School"
                      maxLength={100}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="linkedin_url" className="text-xs md:text-sm">LinkedIn URL</Label>
                    <Input
                      id="linkedin_url"
                      type="text"
                      value={formData.linkedin_url}
                      onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                      placeholder="www.linkedin.com/in/yourprofile"
                      maxLength={200}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="website_url" className="text-xs md:text-sm">Personal/Company Website</Label>
                    <Input
                      id="website_url"
                      type="text"
                      value={formData.website_url}
                      onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                      placeholder="www.yourwebsite.com"
                      maxLength={200}
                      className="h-9 md:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 md:space-y-2">
                    <Label htmlFor="bio" className="text-xs md:text-sm">Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      maxLength={500}
                      rows={3}
                      className="text-sm"
                    />
                    <p className="text-[10px] md:text-xs text-muted-foreground text-right">
                      {formData.bio.length}/500
                    </p>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Technology Interests */}
          <Collapsible open={interestsOpen} onOpenChange={setInterestsOpen}>
            <Card className="p-4 md:p-6 shadow-md border-border/50">
              <CollapsibleTrigger type="button" className="flex items-center justify-between w-full">
                <h3 className="font-semibold text-sm md:text-lg text-foreground">Technology Interests</h3>
                <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-muted-foreground transition-transform duration-200 ${interestsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 md:pt-4">
                <div className="space-y-2 md:space-y-3">
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Select the technology areas that interest you (select multiple)
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 max-h-64 md:max-h-96 overflow-y-auto pr-2">
                    {ACCELERATION_INTERESTS.map((interest) => (
                      <label
                        key={interest}
                        className={`flex items-center gap-2 md:gap-3 p-2.5 md:p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                          interests.includes(interest)
                            ? "border-accent bg-accent/5"
                            : "border-border hover:border-accent/50"
                        }`}
                      >
                        <Checkbox
                          checked={interests.includes(interest)}
                          onCheckedChange={() => toggleInterest(interest)}
                          className="h-4 w-4"
                        />
                        <span className="text-xs md:text-sm text-foreground flex-1">{interest}</span>
                      </label>
                    ))}
                  </div>

                  {interests.length > 0 && (
                    <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t">
                      <p className="text-[10px] md:text-xs text-muted-foreground mb-1.5 md:mb-2">Selected ({interests.length}):</p>
                      <div className="flex flex-wrap gap-1.5 md:gap-2">
                        {interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-[10px] md:text-xs px-2 py-0.5">
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Privacy Settings */}
          <Collapsible open={privacyOpen} onOpenChange={setPrivacyOpen}>
            <Card className="p-4 md:p-6 shadow-md border-border/50">
              <CollapsibleTrigger type="button" className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Shield className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                  <h3 className="font-semibold text-sm md:text-lg text-foreground">Privacy Settings</h3>
                </div>
                <ChevronDown className={`h-4 w-4 md:h-5 md:w-5 text-muted-foreground transition-transform duration-200 ${privacyOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 md:pt-4">
                <div className="space-y-3 md:space-y-4">
                  <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
                    Control how your information is shared with other users
                  </p>

                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                      <div className="flex-1">
                        <span className="text-xs md:text-sm font-medium text-foreground">Share participant information</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Allow others to see your profile details and email address</p>
                      </div>
                      <Checkbox
                        checked={shareEmail}
                        onCheckedChange={(checked) => setShareEmail(checked === true)}
                        className="h-4 w-4"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 md:p-3 rounded-lg border border-border bg-secondary/20 cursor-pointer">
                      <div className="flex-1">
                        <span className="text-xs md:text-sm font-medium text-foreground">Allow connections</span>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">Let others scan your QR code and send you messages</p>
                      </div>
                      <Checkbox
                        checked={allowQrScan}
                        onCheckedChange={(checked) => setAllowQrScan(checked === true)}
                        className="h-4 w-4"
                      />
                    </label>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Download App Card */}
          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm md:text-base font-medium text-foreground">Download App</h3>
                  <p className="text-xs md:text-sm text-muted-foreground">Install for quick access</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowInstallDialog(true)}
              >
                Install
              </Button>
            </div>
          </Card>

          <InstallAppDialog
            open={showInstallDialog}
            onClose={() => setShowInstallDialog(false)}
          />

          {hasChanges() && (
            <div className="flex gap-3 md:gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1 h-11 md:h-10 text-sm md:text-base"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="flex-1 h-11 md:h-10 text-sm md:text-base">
                {saving ? (
                  <>
                    <Loader2 className="mr-1.5 md:mr-2 h-4 w-4 md:h-5 md:w-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </form>

        {/* Sign Out */}
        <div className="mt-6">
          <Card className="p-4 md:p-6 shadow-md">
            <Button
              variant="destructive"
              className="w-full"
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-6">
          <Footer />
        </div>
      </main>
    </div>
  );
}
