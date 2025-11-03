import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { ReportIssueDialog } from "./ReportIssueDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ReportIssueButtonProps {
  originalInput: string;
  actualOutput: {
    full: string | null;
    first: string | null;
    middle: string | null;
    last: string | null;
    suffix: string | null;
  };
}

export function ReportIssueButton({
  originalInput,
  actualOutput,
}: ReportIssueButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-8 w-8 p-0"
          >
            <AlertCircle className="h-4 w-4" />
            <span className="sr-only">Report Issue</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Report an issue with this result</p>
        </TooltipContent>
      </Tooltip>

      <ReportIssueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        originalInput={originalInput}
        actualOutput={actualOutput}
      />
    </>
  );
}
