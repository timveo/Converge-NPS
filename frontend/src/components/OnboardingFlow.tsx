import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  UserCircle,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone
} from "lucide-react";

interface OnboardingFlowProps {
  open: boolean;
  onComplete: () => void;
}

const OnboardingFlow = ({ open, onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const steps = [
    {
      icon: Sparkles,
      title: "Welcome to Converge @ NPS!",
      description: "Your gateway to meaningful connections and collaboration at the Naval Postgraduate School. Here's what you can do:",
      tips: [
        "Scan QR codes to instantly connect with attendees",
        "Send direct messages to your new connections",
        "RSVP to sessions and manage your schedule"
      ],
      color: "text-primary"
    },
    {
      icon: Sparkles,
      title: "Discover Opportunities",
      description: "Converge brings together researchers, industry partners, and innovators. Explore what's available:",
      tips: [
        "Browse research projects and find collaborators",
        "Connect with industry partners",
        "Discover sponsorship and partnership opportunities"
      ],
      color: "text-accent"
    },
    {
      icon: Smartphone,
      title: "Get the Most Out of Converge",
      description: "For the best experience, complete your profile so others can find and connect with you. You can also install this app on your device for quick access.",
      tips: [
        "Add your role, organization, and interests",
        "Install the app from your Settings page",
        "Access the help icon anytime to revisit this guide"
      ],
      color: "text-tech-cyan",
      isFinalStep: true
    }
  ];

  const currentStepData = steps[currentStep]!;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const Icon = currentStepData.icon;
  const isFinalStep = 'isFinalStep' in currentStepData && currentStepData.isFinalStep;

  const handleNext = () => {
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
              {currentStepData.tips.map((tip, index) => (
                <div key={index} className="flex items-start gap-2 md:gap-3">
                  <CheckCircle2 className="h-4 w-4 md:h-5 md:w-5 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-xs md:text-sm text-muted-foreground">{tip}</p>
                </div>
              ))}
            </div>
          )}

          {/* Spacer to push footer down when content is short */}
          <div className="flex-1" />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 md:pt-3 border-t border-border/50">
          <div className="flex gap-2 w-full">
            {currentStep > 0 && (
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

            {/* Final step: Two options - Edit Profile or Finish */}
            {isFinalStep ? (
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
            ) : (
              <Button
                onClick={handleNext}
                className="gap-1.5 md:gap-2 flex-1 h-11 md:h-10 text-xs md:text-sm"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingFlow;
