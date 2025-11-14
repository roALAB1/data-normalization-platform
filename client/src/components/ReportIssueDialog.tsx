import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalInput: string;
  actualOutput: {
    full: string | null;
    first: string | null;
    middle: string | null;
    last: string | null;
    suffix: string | null;
  };
}

const issueTypes = [
  { value: "credential_not_stripped", label: "Credential Not Stripped" },
  { value: "credential_incorrectly_stripped", label: "Credential Incorrectly Stripped" },
  { value: "name_split_wrong", label: "Name Split Wrong" },
  { value: "special_char_issue", label: "Special Character Issue" },
  { value: "trailing_punctuation", label: "Trailing Punctuation" },
  { value: "leading_punctuation", label: "Leading Punctuation" },
  { value: "other", label: "Other" },
] as const;

const severityLevels = [
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
] as const;

export function ReportIssueDialog({
  open,
  onOpenChange,
  originalInput,
  actualOutput,
}: ReportIssueDialogProps) {
  const [issueType, setIssueType] = useState<string>("other");
  const [severity, setSeverity] = useState<string>("medium");
  const [description, setDescription] = useState("");
  const [expectedFirst, setExpectedFirst] = useState("");
  const [expectedLast, setExpectedLast] = useState("");

  const submitReport = trpc.reports.submit.useMutation({
    onSuccess: () => {
      toast.success("Report submitted successfully! Thank you for your feedback.");
      onOpenChange(false);
      // Reset form
      setIssueType("other");
      setSeverity("medium");
      setDescription("");
      setExpectedFirst("");
      setExpectedLast("");
    },
    onError: (error) => {
      toast.error(`Failed to submit report: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    const expectedOutput: Record<string, string> = {};
    if (expectedFirst) expectedOutput.first = expectedFirst;
    if (expectedLast) expectedOutput.last = expectedLast;

    submitReport.mutate({
      originalInput,
      actualOutput,
      expectedOutput: Object.keys(expectedOutput).length > 0 ? expectedOutput : undefined,
      issueType: issueType as any,
      severity: severity as any,
      description: description || undefined,
      version: "v3.21.0", // Current version
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Report Normalization Issue</DialogTitle>
          <DialogDescription>
            Help us improve by reporting issues you find in the normalized data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Original Input (Read-only) */}
          <div className="grid gap-2">
            <Label htmlFor="original">Original Input</Label>
            <Input
              id="original"
              value={originalInput}
              readOnly
              className="bg-muted"
            />
          </div>

          {/* Actual Output (Read-only) */}
          <div className="grid gap-2">
            <Label>Actual Output</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="First Name"
                value={actualOutput.first || ""}
                readOnly
                className="bg-muted"
              />
              <Input
                placeholder="Last Name"
                value={actualOutput.last || ""}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          {/* Issue Type */}
          <div className="grid gap-2">
            <Label htmlFor="issue-type">Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issue-type">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="grid gap-2">
            <Label htmlFor="severity">Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger id="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                {severityLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Output (Optional) */}
          <div className="grid gap-2">
            <Label>Expected Output (Optional)</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Expected First Name"
                value={expectedFirst}
                onChange={(e) => setExpectedFirst(e.target.value)}
              />
              <Input
                placeholder="Expected Last Name"
                value={expectedLast}
                onChange={(e) => setExpectedLast(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Describe the issue..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitReport.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitReport.isPending}
          >
            {submitReport.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Submit Report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
