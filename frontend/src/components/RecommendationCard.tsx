import { Sparkles, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  title: string;
  reason: string;
  matchScore?: number;
  tags?: string[];
  maxTags?: number;
  type?: string;
  onClick?: () => void;
  onDismiss?: () => void;
  className?: string;
  compact?: boolean;
}

export const RecommendationCard = ({
  title,
  reason,
  matchScore,
  tags = [],
  maxTags = 2,
  type,
  onClick,
  onDismiss,
  className,
  compact = false,
}: RecommendationCardProps) => {
  const displayTags = tags.slice(0, maxTags);
  const remainingTags = tags.length - maxTags;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss?.();
  };

  return (
    <Card
      className={cn(
        "p-2.5 md:p-4 bg-background border-accent/20 cursor-pointer hover:border-accent/40 hover:shadow-md transition-all duration-200 relative",
        className
      )}
      onClick={onClick}
    >
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 md:h-8 md:w-8 text-muted-foreground hover:text-foreground hover:bg-accent/10 rounded-full transition-colors"
          onClick={handleDismiss}
          aria-label="Dismiss recommendation"
        >
          <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
        </Button>
      )}
      <div className="flex items-start gap-2 md:gap-3">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-accent" />
        </div>
        <div className={cn("flex-1 min-w-0 overflow-hidden", onDismiss && "pr-3 md:pr-4")}>
          <h4 className="font-semibold text-xs md:text-sm mb-0.5 md:mb-1 truncate" title={title}>
            {title}
          </h4>
          <p 
            className={cn(
              "text-[10px] md:text-xs text-muted-foreground mb-1.5 md:mb-2",
              compact ? "line-clamp-1 md:line-clamp-2" : "line-clamp-2 md:line-clamp-3"
            )}
            title={reason}
          >
            {reason}
          </p>
          <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
            {matchScore !== undefined && (
              <Badge variant="secondary" className="text-[9px] md:text-xs shrink-0 py-0 px-1 md:py-0.5 md:px-1.5">
                {Math.round(matchScore * 10)}%
              </Badge>
            )}
            {type && (
              <Badge variant="outline" className="text-[9px] md:text-xs capitalize shrink-0 py-0 px-1 md:py-0.5 md:px-1.5">
                {type}
              </Badge>
            )}
            {displayTags.slice(0, compact ? 1 : maxTags).map((tag) => (
              <Badge key={tag} variant="outline" className="text-[9px] md:text-xs truncate max-w-[60px] md:max-w-[100px] py-0 px-1 md:py-0.5 md:px-1.5" title={tag}>
                {tag}
              </Badge>
            ))}
            {(compact ? tags.length - 1 : remainingTags) > 0 && (
              <Badge variant="outline" className="text-[9px] md:text-xs shrink-0 py-0 px-1 md:py-0.5 md:px-1.5">
                +{compact ? tags.length - 1 : remainingTags}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RecommendationCard;