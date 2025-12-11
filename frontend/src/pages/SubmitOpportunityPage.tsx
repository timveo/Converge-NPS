import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, GraduationCap, Building2, Briefcase, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const submissionOptions = [
  {
    id: "nps",
    title: "NPS Students & Faculty",
    description: "Current NPS students and faculty who are interested in pitching their work to industry partners and government/military sponsors for collaboration, funding, and other partnership opportunities.",
    icon: GraduationCap,
    formUrl: "https://app.smartsheet.com/b/form/01993eccfea176fab7e2c17dbca32749",
  },
  {
    id: "government",
    title: "Military & Government",
    description: "Military Commands and government organizations interested in highlighting collaborative projects to NPS students/faculty and industry partners or in participating in operational challenge breakout sessions or whiteboard/training sessions should submit this form.",
    icon: Building2,
    formUrl: "https://app.smartsheet.com/b/form/d87ede2a165c48b8b22fac0f3068d22a",
  },
  {
    id: "industry",
    title: "Industry Partners",
    description: "Industry interested in showcasing cutting-edge tech or projects, participating in operational challenge breakout sessions, or leading whiteboard/training sessions should submit this form to be considered for inclusion and to ensure resources are adequately requested. (One form per organization.)",
    icon: Briefcase,
    formUrl: "https://app.smartsheet.com/b/form/01993ecc522b73aabd8191d9a8e11126",
  },
];

export default function SubmitOpportunityPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromIndustry = location.state?.from === "industry";

  const handleApply = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-24">
      <div className="container mx-auto px-3 md:px-4 pt-2 md:pt-4">
        <header className="bg-gradient-navy text-primary-foreground shadow-lg sticky top-0 z-10 rounded-lg mb-6 max-w-3xl mx-auto">
          <div className="px-3 md:px-4 py-2 md:py-4">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20"
                onClick={() => navigate(fromIndustry ? '/industry' : '/opportunities')}
              >
                <ChevronLeft className="h-5 w-5 md:h-6 md:w-6" />
              </Button>
              <div>
                <h1 className="text-lg md:text-xl font-bold">Submit for Participation</h1>
                <p className="text-sm md:text-base text-tech-cyan-light">Choose your submission type</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto space-y-4">
          {submissionOptions.map((option) => {
            const Icon = option.icon;
            return (
              <Card key={option.id} className="shadow-sm">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {option.description}
                  </CardDescription>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={() => handleApply(option.formUrl)}
                    className="w-full gap-2 h-11 md:h-10"
                  >
                    Apply
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </main>
      </div>
    </div>
  );
}
