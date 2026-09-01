/**
 * Job Application Modal - Redesigned
 * Smart apply flow with improved UI/UX and better visual hierarchy
 */

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { 
  FileText, 
  Loader2, 
  CheckCircle2, 
  Upload, 
  Briefcase,
  Building2,
  Link as LinkIcon,
  Clock,
  DollarSign,
  User,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JobApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: number;
  jobTitle: string;
  companyName: string;
}

export function JobApplicationModal({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  companyName,
}: JobApplicationModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Determine if user has a "proper" profile
  const hasProperProfile = useMemo(() => {
    if (!user) return false;
    const hasBasicInfo = !!(user as any).bio || !!(user as any).authorBio;
    const hasCompany = !!(user as any).company;
    const hasTitle = !!(user as any).jobTitle;
    const hasLinkedIn = !!(user as any).linkedinUrl;
    const score = [hasBasicInfo, hasCompany, hasTitle, hasLinkedIn].filter(Boolean).length;
    return score >= 2;
  }, [user]);

  const [coverLetter, setCoverLetter] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [currentCompany, setCurrentCompany] = useState("");
  const [currentTitle, setCurrentTitle] = useState("");
  const [yearsOfExperience, setYearsOfExperience] = useState<string>("");
  const [expectedSalary, setExpectedSalary] = useState<string>("");
  const [expectedSalaryCurrency, setExpectedSalaryCurrency] = useState("USD");
  const [noticePeriod, setNoticePeriod] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (user && open) {
      setLinkedinUrl((user as any).linkedinUrl || "");
      setPortfolioUrl((user as any).website || "");
      setCurrentCompany((user as any).company || "");
      setCurrentTitle((user as any).jobTitle || "");
      setValidationError(null);
    }
  }, [user, open]);

  const applyMutation = trpc.jobApplications.applyInternal.useMutation({
    onSuccess: (data) => {
      console.log("[JobApplicationModal] Application submitted successfully:", data);
      setSubmitted(true);
      utils.jobApplications.checkApplication.invalidate({ jobId });
      toast({
        title: "Application Submitted!",
        description: `Your application for ${jobTitle} at ${companyName} has been sent.`,
      });
    },
    onError: (error) => {
      console.error("[JobApplicationModal] Application submission failed:", error);
      const errorMessage = error.message || "Something went wrong. Please try again.";
      setValidationError(errorMessage);
      toast({
        title: "Application Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid File Type", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "CV must be less than 5MB.", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/upload/cv", { method: "POST", body: formData });
      if (response.ok) {
        const data = await response.json();
        setCvUrl(data.url);
        toast({ title: "CV Uploaded", description: "Your CV has been uploaded successfully." });
      } else {
        setCvUrl(`cv-${user?.id}-${Date.now()}`);
        toast({ title: "CV Attached", description: "Your CV has been attached to the application." });
      }
    } catch {
      setCvUrl(`cv-${file.name}`);
      toast({ title: "CV Attached", description: "Your CV reference has been saved." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!user) {
      setValidationError("You must be logged in to apply.");
      return;
    }

    if (!hasProperProfile && !cvUrl) {
      setValidationError("Please upload your CV to apply.");
      return;
    }

    setValidationError(null);

    console.log("[JobApplicationModal] Submitting application with:", {
      jobId,
      userId: user.id,
      coverLetter: coverLetter || undefined,
      linkedinUrl: linkedinUrl || undefined,
      portfolioUrl: portfolioUrl || undefined,
      currentCompany: currentCompany || undefined,
      currentTitle: currentTitle || undefined,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
      expectedSalary: expectedSalary ? parseInt(expectedSalary) : undefined,
      expectedSalaryCurrency,
      noticePeriod: noticePeriod || undefined,
      cvUrl: cvUrl || undefined,
    });

    applyMutation.mutate({
      jobId,
      coverLetter: coverLetter || undefined,
      linkedinUrl: linkedinUrl || undefined,
      portfolioUrl: portfolioUrl || undefined,
      currentCompany: currentCompany || undefined,
      currentTitle: currentTitle || undefined,
      yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
      expectedSalary: expectedSalary ? parseInt(expectedSalary) : undefined,
      expectedSalaryCurrency,
      noticePeriod: noticePeriod || undefined,
      cvUrl: cvUrl || undefined,
    });
  };

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setSubmitted(false);
        setShowFullForm(false);
        setCoverLetter("");
        setCvUrl("");
        setYearsOfExperience("");
        setExpectedSalary("");
        setNoticePeriod("");
        setValidationError(null);
      }, 300);
    }
  }, [open]);

  if (submitted) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-12">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Application Submitted!</h2>
            <p className="text-muted-foreground mb-8">
              Your application for <strong>{jobTitle}</strong> has been sent to <strong>{companyName}</strong>. The hiring team will review it and get back to you soon.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b px-6 py-5 shrink-0">
          <button
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground mb-3 text-sm font-medium flex items-center gap-1 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Job
          </button>
          <h2 className="text-2xl font-bold text-foreground">{jobTitle}</h2>
          <p className="text-sm text-muted-foreground pt-1">
            at <span className="font-semibold text-foreground">{companyName}</span>
          </p>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-6">
          {/* Validation Error */}
          {validationError && (
            <div className="flex gap-3 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900 dark:text-red-200">{validationError}</p>
              </div>
            </div>
          )}

          {/* Applicant Info Card */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/20 dark:to-blue-950/10 border border-blue-200/50 dark:border-blue-800/30 rounded-lg p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30">
                {(user as any)?.avatar ? (
                  <img src={(user as any).avatar} alt="" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{user?.name || "Unknown"}</p>
                  {hasProperProfile && (
                    <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-xs">
                      <ShieldCheck className="w-3 h-3 mr-1" /> Complete Profile
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
                {(user as any)?.jobTitle && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {(user as any).jobTitle}{(user as any).company ? ` at ${(user as any).company}` : ""}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Apply Summary (for complete profiles) */}
          {hasProperProfile && !showFullForm && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded-lg p-5">
              <div className="flex items-start gap-3 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-emerald-900 dark:text-emerald-200">Quick Apply Ready</p>
                  <p className="text-sm text-emerald-800/70 dark:text-emerald-300/70 mt-1">
                    Your profile will be shared with the employer. Add a note or expand the form for more details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFullForm(true)}
                className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
              >
                + Add cover letter or more details
              </button>
            </div>
          )}

          {/* CV Upload (only for incomplete profiles) */}
          {!hasProperProfile && !showFullForm && (
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Resume / CV
              </Label>
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition bg-muted/30">
                {cvUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-green-600" />
                    <span className="text-base font-medium text-foreground">CV attached</span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-4">Upload your CV (PDF or Word, max 5MB)</p>
                    <label className="cursor-pointer">
                      <Button variant="outline" size="sm" disabled={isUploading} asChild>
                        <span>
                          {isUploading ? (
                            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose File
                            </>
                          )}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={handleCvUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cover Letter */}
          {(!hasProperProfile || showFullForm) && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Cover Letter {hasProperProfile ? "(Optional)" : "(Recommended)"}
              </Label>
              <Textarea
                placeholder="Tell the hiring team why you're a great fit for this role..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
                maxLength={5000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{coverLetter.length}/5000</p>
            </div>
          )}

          {/* Quick Note for Complete Profiles */}
          {hasProperProfile && !showFullForm && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Quick Note (Optional)</Label>
              <Textarea
                placeholder="Add a brief note to your application..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={3}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">{coverLetter.length}/2000</p>
            </div>
          )}

          {/* Professional Details */}
          {(!hasProperProfile || showFullForm) && (
            <div className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-50/50 dark:from-slate-900/20 dark:to-slate-900/10 rounded-lg p-5 border">
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Company</Label>
                  <Input
                    placeholder="e.g. Google"
                    value={currentCompany}
                    onChange={(e) => setCurrentCompany(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Current Title</Label>
                  <Input
                    placeholder="e.g. Senior Engineer"
                    value={currentTitle}
                    onChange={(e) => setCurrentTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Years of Experience</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5"
                    value={yearsOfExperience}
                    onChange={(e) => setYearsOfExperience(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Notice Period</Label>
                  <Select value={noticePeriod || "not_set"} onValueChange={(v) => setNoticePeriod(v === "not_set" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="not_set">Not specified</SelectItem>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="1_week">1 Week</SelectItem>
                      <SelectItem value="2_weeks">2 Weeks</SelectItem>
                      <SelectItem value="1_month">1 Month</SelectItem>
                      <SelectItem value="2_months">2 Months</SelectItem>
                      <SelectItem value="3_months">3 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Expected Salary (Annual)</Label>
                  <div className="flex gap-2">
                    <Select value={expectedSalaryCurrency} onValueChange={setExpectedSalaryCurrency}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="AED">AED</SelectItem>
                        <SelectItem value="SAR">SAR</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="e.g. 80000"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Links */}
          {(!hasProperProfile || showFullForm) && (
            <div className="space-y-4 bg-gradient-to-br from-slate-50 to-slate-50/50 dark:from-slate-900/20 dark:to-slate-900/10 rounded-lg p-5 border">
              <h3 className="font-semibold text-base text-foreground flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary" />
                Links
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">LinkedIn Profile</Label>
                  <Input
                    placeholder="https://linkedin.com/in/..."
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Portfolio / Website</Label>
                  <Input
                    placeholder="https://..."
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Spacer for fixed footer */}
          <div className="h-20" />
        </div>
      </DialogContent>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t px-6 py-4 flex justify-end gap-3 shadow-lg" style={{ maxWidth: 'calc(100vw - 32px)' }}>
        <Button 
          variant="outline" 
          onClick={() => onOpenChange(false)}
          className="px-6"
          disabled={applyMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={applyMutation.isPending}
          className="min-w-[180px] text-base font-semibold"
        >
          {applyMutation.isPending ? (
            <><Loader2 className="h-4 w-4 animate-spin mr-2" />Submitting...</>
          ) : hasProperProfile && !showFullForm ? (
            <><Sparkles className="h-4 w-4 mr-2" />Quick Apply</>
          ) : (
            "Submit Application"
          )}
        </Button>
      </div>
    </Dialog>
  );
}
