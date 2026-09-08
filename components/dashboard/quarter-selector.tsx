"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatQuarterDisplay, shiftQuarter } from "@/lib/quarters";

export function QuarterSelector({
  quarter,
  onChange,
}: {
  quarter: string;
  onChange: (next: string) => void;
}) {
  const prevQuarter = shiftQuarter(quarter, -1);
  const nextQuarter = shiftQuarter(quarter, 1);

  return (
    <div className="flex items-center gap-2 rounded-md bg-surface-1 p-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous quarter"
            onClick={() => onChange(prevQuarter)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{formatQuarterDisplay(prevQuarter)}</TooltipContent>
      </Tooltip>
      <span className="min-w-[6rem] text-center text-sm font-semibold text-text-primary">
        {formatQuarterDisplay(quarter)}
      </span>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next quarter"
            onClick={() => onChange(nextQuarter)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>{formatQuarterDisplay(nextQuarter)}</TooltipContent>
      </Tooltip>
    </div>
  );
}
