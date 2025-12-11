import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  UserCircle, 
  QrCode, 
  Users, 
  MessageSquare, 
  Calendar, 
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Loader2
} from "lucide-react";

import { toast } from "sonner";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
  userProfile: {
    id?: string;
    full_name: string;
    first_name?: string | null;
    last_name?: string | null;
    role: string | null;
    organization: string | null;
    bio: string | null;
  } | null;
  testMode?: boolean;
}

const INTEREST_OPTIONS = [
  "AI/ML", "Cybersecurity", "Autonomous Systems", "Space Technology",
  "Maritime", "Defense Innovation", "Energy", "Healthcare",
  "Supply Chain", "Communications", "Robotics", "Data Analytics",
];

const OnboardingFlow = ({ open, onComplete, userProfile, testMode = false }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [rank, setRank] = useState("");
  const [role, setRole] = useState("");
  const [accelerationInterests, setAccelerationInterests] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();

  // Initialize form fields from profile if available (and not in test mode)
  useEffect(() => {
    if (userProfile && !testMode) {
      // Would need to fetch rank from profile if stored
      setRole(userProfile.role || "");
    }
  }, [userProfile, testMode]);

  // Check if step 1 form is complete - rank and role are required
  const step1Complete = rank && role.trim();

  const steps = [
    {
      icon: UserCircle,
      title: "Welcome to Converge @ NPS!",
      description: "Let's get you started with a quick tour. You'll learn how to connect with attendees and make the most of this event. First we need some additional information.",
      color: "text-primary",
      isProfileStep: true
    },
    {
      icon: QrCode,
      title: "Connect with QR Codes",
      description: "Network effortlessly by scanning QR codes! Tap the scan icon to instantly connect with other attendees.",
      tips: [
        "Share your QR code from your profile",
        "Scan others' codes to create connections",
        "Add notes after connecting"
      ],
      color: "text-accent"
    },
    {
      icon: Users,
      title: "Manage Your Connections",
      description: "View all your connections in one place. See who you've met and reach out to collaborate.",
      tips: [
        "Browse your connection history",
        "Add private notes about each connection",
        "See mutual collaboration interests"
      ],
      color: "text-tech-cyan"
    },
    {
      icon: MessageSquare,
      title: "Real-Time Messaging",
      description: "Send instant messages to your connections. Have private conversations during the event.",
      tips: [
        "Message any of your connections",
        "See messaging history",
        "Delete messages as needed"
      ],
      color: "text-primary"
    },
    {
      icon: Calendar,
      title: "Event Schedule & RSVPs",
      description: "Browse sessions and workshops. RSVP to sessions you're interested in and check capacity!",
      tips: [
        "View the full event schedule",
        "RSVP to sessions (subject to capacity)",
        "Manage your RSVPs anytime"
      ],
      color: "text-accent"
    },
    {
      icon: Users,
      title: "Explore Opportunities",
      description: "Discover research projects and collaboration opportunities. Find projects aligned with your interests!",
      tips: [
        "Browse research projects by category",
        "Bookmark projects you're interested in",
        "Connect with principal investigators"
      ],
      color: "text-tech-cyan"
    },
    {
      icon: Users,
      title: "Discover Industry Partners",
      description: "Connect with industry partners attending the event. Explore potential collaborations and partnerships!",
      tips: [
        "Browse industry partner profiles",
        "View technology focus areas",
        "Save favorites for easy access"
      ],
      color: "text-primary"
    },
    {
      icon: CheckCircle2,
      title: "You're All Set!",
      description: "For the best experience, complete your profile. It helps others find and connect with you. Enjoy the event!",
      color: "text-green-500",
      isFinalStep: true
    }
  ];

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const Icon = currentStepData.icon;
  const isFinalStep = 'isFinalStep' in currentStepData && currentStepData.isFinalStep;

  const toggleInterest = (interest: string) => {
    setAccelerationInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = async () => {
    // If on step 0, save profile data first (disabled - using testMode)
    // TODO: Implement profile saving with backend API when needed
    if (currentStep === 0 && !testMode) {
      setIsSaving(true);
      try {
        // Profile saving functionality is disabled
        // This would save rank, role, and acceleration_interests to backend
        console.log('Profile save would happen here:', { rank, role, accelerationInterests });
      } catch (error) {
        toast.error("Error saving profile", {
          description: "Please try again"
        });
        setIsSaving(false);
        return;
      }
      setIsSaving(false);
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToProfile = () => {
    onComplete();
    navigate('/profile/edit');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onComplete(); }}>
      <DialogContent className="w-[calc(100%-24px)] max-w-[500px] md:max-w-[550px] max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
        <DialogHeader className="pb-2 md:pb-3">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div className={`p-2 md:p-3 rounded-full bg-primary/10 ${currentStepData.color}`}>
              <Icon className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base md:text-xl truncate">{currentStepData.title}</DialogTitle>
              <div className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                Step {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 md:h-2" />
        </DialogHeader>

        {/* Fixed height content area for consistent card size */}
        <div className="min-h-[280px] md:min-h-[320px] py-3 md:py-4 flex flex-col">
          <DialogDescription className="text-sm md:text-base text-foreground leading-relaxed mb-3 md:mb-4">
            {currentStepData.description}
          </DialogDescription>

          {currentStepData.tips && (
            <div className="space-y-2 md:space-y-3 mt-2 md:mt-4">
              <p className="text-xs md:text-sm font-semibold text-foreground">Key Features:</p>
              {currentStepData.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Step 1: Profile Information Form - hidden in test mode */}
          {currentStep === 0 && !testMode && (
            <div className="mt-3 md:mt-4 space-y-3 md:space-y-4">
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="rank" className="text-xs md:text-sm">Military Rank / Title</Label>
                <Select value={rank} onValueChange={setRank}>
                  <SelectTrigger id="rank" className="h-11 md:h-10 text-sm">
                    <SelectValue placeholder="Select rank or title" />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="ADM">ADM - Admiral</SelectItem>
                    <SelectItem value="VADM">VADM - Vice Admiral</SelectItem>
                    <SelectItem value="RADM">RADM - Rear Admiral</SelectItem>
                    <SelectItem value="CAPT">CAPT - Captain</SelectItem>
                    <SelectItem value="CDR">CDR - Commander</SelectItem>
                    <SelectItem value="LCDR">LCDR - Lieutenant Commander</SelectItem>
                    <SelectItem value="LT">LT - Lieutenant</SelectItem>
                    <SelectItem value="LTJG">LTJG - Lieutenant Junior Grade</SelectItem>
                    <SelectItem value="ENS">ENS - Ensign</SelectItem>
                    <SelectItem value="Dr.">Dr.</SelectItem>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                    <SelectItem value="Mrs.">Mrs.</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label htmlFor="role" className="text-xs md:text-sm">Role *</Label>
                <Input
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="Professor, CEO, Program Manager..."
                  className="h-11 md:h-10 text-sm"
                />
              </div>
              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs md:text-sm">Acceleration Interests</Label>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {INTEREST_OPTIONS.map((interest) => (
                    <button
                      key={interest}
                      type="button"
                      onClick={() => toggleInterest(interest)}
                      className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                        accelerationInterests.includes(interest)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {interest}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Spacer to push footer down when content is short */}
          <div className="flex-1" />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 md:pt-3 border-t border-border/50">
          <div className="flex gap-2 w-full">
            {currentStep > 0 && !isFinalStep && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="gap-1 md:gap-2 h-11 md:h-10 text-xs md:text-sm"
                size="sm"
              >
                <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="hidden xs:inline">Previous</span>
              </Button>
            )}
            
            {/* Step 0: Profile form - Next button only */}
            {currentStep === 0 && (
              <Button
                onClick={handleNext}
                disabled={(!step1Complete && !testMode) || isSaving}
                className="gap-1.5 md:gap-2 flex-1 h-11 md:h-10 text-xs md:text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </>
                )}
              </Button>
            )}

            {/* Final step: Two options - Edit Profile or Finish */}
            {isFinalStep && (
              <>
                <Button
                  variant="outline"
                  onClick={handleGoToProfile}
                  className="gap-1.5 md:gap-2 flex-1 bg-yellow-400 hover:bg-yellow-500 text-yellow-950 border-yellow-500 h-11 md:h-10 text-xs md:text-sm"
                >
                  <UserCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  Edit Profile
                </Button>
                <Button
                  onClick={onComplete}
                  className="gap-1.5 md:gap-2 flex-1 h-11 md:h-10 text-xs md:text-sm"
                >
                  Finish
                  <CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </>
            )}

            {/* Middle steps: Skip and Next */}
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <>
                <Button
                  variant="ghost"
                  onClick={onComplete}
                  className="gap-1 md:gap-2 h-11 md:h-10 text-xs md:text-sm"
                  size="sm"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleNext}
                  className="gap-1.5 md:gap-2 flex-1 h-11 md:h-10 text-xs md:text-sm"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
