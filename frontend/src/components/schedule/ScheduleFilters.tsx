import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, parseISO } from "date-fns";

export const SESSION_TYPES = [
  { value: 'AI/ML', label: 'AI/ML' },
  { value: 'Cybersecurity', label: 'Cybersecurity' },
  { value: 'Autonomous Systems', label: 'Autonomous Systems' },
  { value: 'Data Science', label: 'Data Science' },
  { value: 'Other', label: 'Other' }
];

export const TIME_SLOTS = [
  { value: 'morning', label: 'Morning (8 AM - 12 PM)', start: 8, end: 12 },
  { value: 'afternoon', label: 'Afternoon (12 PM - 5 PM)', start: 12, end: 17 },
  { value: 'evening', label: 'Evening (5 PM - 8 PM)', start: 17, end: 20 }
];

export interface ScheduleFilters {
  types: string[];
  days: string[];
  timeSlots: string[];
  sortBy: string;
}

interface ScheduleFiltersProps {
  filters: ScheduleFilters;
  onFiltersChange: (filters: ScheduleFilters) => void;
  uniqueDays: string[];
  hasSessionTypes?: boolean;
}

export const ScheduleFiltersPanel = ({
  filters,
  onFiltersChange,
  uniqueDays,
  hasSessionTypes = false
}: ScheduleFiltersProps) => {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = filters.types.length + filters.days.length;

  const updateFilter = (key: keyof ScheduleFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleArrayFilter = (key: 'types' | 'days' | 'timeSlots', value: string, checked: boolean) => {
    const current = filters[key];
    updateFilter(key, checked ? [...current, value] : current.filter(v => v !== value));
  };

  const clearFilters = () => {
    onFiltersChange({ types: [], days: [], timeSlots: [], sortBy: 'time' });
  };

  return (
    <div className="space-y-2 md:space-y-4">
      <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
          className="h-11 md:h-10 text-sm"
        >
          <SlidersHorizontal className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        <Select value={filters.sortBy} onValueChange={(value) => updateFilter('sortBy', value)}>
          <SelectTrigger className="w-[120px] md:w-[150px] h-11 md:h-10 text-sm">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent className="bg-background z-50">
            <SelectItem value="time">By Time</SelectItem>
            <SelectItem value="type">By Type</SelectItem>
            <SelectItem value="capacity">By Availability</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Active filters badges - Compact on mobile */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 md:gap-2 items-center">
          {filters.types.map(type => {
            const label = SESSION_TYPES.find(t => t.value === type)?.label;
            return (
              <Badge key={type} variant="secondary" className="gap-0.5 md:gap-1 text-[10px] md:text-xs py-0.5 px-1.5 md:py-1 md:px-2">
                {label}
                <button onClick={() => toggleArrayFilter('types', type, false)}>
                  <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
                </button>
              </Badge>
            );
          })}
          {filters.days.map(day => (
            <Badge key={day} variant="secondary" className="gap-0.5 md:gap-1 text-[10px] md:text-xs py-0.5 px-1.5 md:py-1 md:px-2">
              {format(parseISO(day), 'MMM d')}
              <button onClick={() => toggleArrayFilter('days', day, false)}>
                <X className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 md:h-8 text-[10px] md:text-xs px-2">
            Clear
          </Button>
        </div>
      )}

      {showFilters && (
        <Card>
          <CardContent className="pt-3 md:pt-6 grid gap-3 md:gap-6 grid-cols-2 sm:grid-cols-3">
            {/* Session Type Filter - only show if sessions have types */}
            {hasSessionTypes && (
              <div className="space-y-1.5 md:space-y-3">
                <Label className="text-xs md:text-sm font-semibold">Type</Label>
                <div className="space-y-1 md:space-y-2">
                  {SESSION_TYPES.map(type => (
                    <div key={type.value} className="flex items-center space-x-1.5 md:space-x-2">
                      <Checkbox
                        id={`type-${type.value}`}
                        checked={filters.types.includes(type.value)}
                        onCheckedChange={(checked) =>
                          toggleArrayFilter('types', type.value, !!checked)
                        }
                        className="h-3.5 w-3.5 md:h-4 md:w-4"
                      />
                      <Label htmlFor={`type-${type.value}`} className="cursor-pointer text-[11px] md:text-sm">
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day Filter */}
            {uniqueDays.length > 1 && (
              <div className="space-y-1.5 md:space-y-3 col-span-2 sm:col-span-1">
                <Label className="text-xs md:text-sm font-semibold">Day</Label>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1 md:space-y-2">
                  {uniqueDays.map(day => (
                    <div key={day} className="flex items-center space-x-1.5 md:space-x-2">
                      <Checkbox
                        id={`day-${day}`}
                        checked={filters.days.includes(day)}
                        onCheckedChange={(checked) =>
                          toggleArrayFilter('days', day, !!checked)
                        }
                        className="h-3.5 w-3.5 md:h-4 md:w-4"
                      />
                      <Label htmlFor={`day-${day}`} className="cursor-pointer text-[11px] md:text-sm">
                        <span className="md:hidden">{format(parseISO(day), 'EEE, MMM d')}</span>
                        <span className="hidden md:inline">{format(parseISO(day), 'EEEE, MMM d')}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
