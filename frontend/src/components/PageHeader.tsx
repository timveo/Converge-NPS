import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backPath?: string;
  onBack?: () => void;
}

/**
 * Reusable sticky page header component for mobile sub-pages.
 * Provides consistent styling and behavior across all mobile pages.
 * Only displays back arrow button - no other icons per design requirements.
 */
export function PageHeader({ title, subtitle, backPath = '/', onBack }: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(backPath);
    }
  };

  return (
    <div className="sticky top-0 z-20 bg-gradient-subtle px-3 md:px-4 pt-3 md:pt-4 pb-0">
      <Card className="p-3 md:p-4 shadow-md bg-gradient-navy text-primary-foreground">
        <div className="flex items-center gap-3 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 md:h-10 md:w-10 text-primary-foreground hover:bg-primary/20"
            onClick={handleBackClick}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg md:text-xl font-bold">{title}</h1>
            {subtitle && (
              <p className="text-sm text-tech-cyan-light">{subtitle}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
