import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface SubmitStartupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitStartupDialog({ open, onOpenChange }: SubmitStartupDialogProps) {
  const [formData, setFormData] = useState({
    startupName: "",
    website: "",
    description: "",
    category: "",
    founderName: "",
    founderEmail: "",
    founderRole: "",
    location: "",
    fundingStage: "",
    additionalInfo: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitMutation = trpc.submissions.submitStartup.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        onOpenChange(false);
        setSubmitted(false);
        setFormData({
          startupName: "",
          website: "",
          description: "",
          category: "",
          founderName: "",
          founderEmail: "",
          founderRole: "",
          location: "",
          fundingStage: "",
          additionalInfo: "",
        });
        setError(null);
      }, 2000);
    },
    onError: (err) => {
      setError(err.message || "Failed to submit. Please try again.");
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.startupName.trim()) {
      setError("Startup name is required");
      return;
    }
    if (!formData.founderName.trim()) {
      setError("Founder name is required");
      return;
    }
    if (!formData.founderEmail.trim()) {
      setError("Founder email is required");
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      setError("Description must be at least 10 characters");
      return;
    }

    submitMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Submit Your Startup</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Get your startup featured on TechScoop. Fill out the form below and our team will review your submission.
          </p>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <h3 className="text-xl font-semibold">Submission Received!</h3>
            <p className="text-center text-muted-foreground max-w-sm">
              Thank you for submitting your startup. Our team will review your application and get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Startup Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Startup Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startupName">Startup Name *</Label>
                  <Input
                    id="startupName"
                    placeholder="e.g., TechFlow AI"
                    value={formData.startupName}
                    onChange={(e) => handleChange("startupName", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Website (Optional)</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={formData.website}
                    onChange={(e) => handleChange("website", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your startup, what problem it solves, and your target market..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={4}
                  disabled={submitMutation.isPending}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.length}/2000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category (Optional)</Label>
                  <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
                    <SelectTrigger id="category" disabled={submitMutation.isPending}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fintech">FinTech</SelectItem>
                      <SelectItem value="healthtech">HealthTech</SelectItem>
                      <SelectItem value="edtech">EdTech</SelectItem>
                      <SelectItem value="ecommerce">E-Commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="ai-ml">AI/ML</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fundingStage">Funding Stage (Optional)</Label>
                  <Select value={formData.fundingStage} onValueChange={(value) => handleChange("fundingStage", value)}>
                    <SelectTrigger id="fundingStage" disabled={submitMutation.isPending}>
                      <SelectValue placeholder="Select funding stage" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre-seed">Pre-Seed</SelectItem>
                      <SelectItem value="seed">Seed</SelectItem>
                      <SelectItem value="series-a">Series A</SelectItem>
                      <SelectItem value="series-b">Series B</SelectItem>
                      <SelectItem value="series-c">Series C+</SelectItem>
                      <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Founder Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Founder Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="founderName">Full Name *</Label>
                  <Input
                    id="founderName"
                    placeholder="John Doe"
                    value={formData.founderName}
                    onChange={(e) => handleChange("founderName", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="founderEmail">Email *</Label>
                  <Input
                    id="founderEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={formData.founderEmail}
                    onChange={(e) => handleChange("founderEmail", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="founderRole">Role (Optional)</Label>
                  <Input
                    id="founderRole"
                    placeholder="e.g., CEO, Co-Founder"
                    value={formData.founderRole}
                    onChange={(e) => handleChange("founderRole", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Dubai, UAE"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    disabled={submitMutation.isPending}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Additional Information</h3>

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Anything Else? (Optional)</Label>
                <Textarea
                  id="additionalInfo"
                  placeholder="Any additional information you'd like to share..."
                  value={formData.additionalInfo}
                  onChange={(e) => handleChange("additionalInfo", e.target.value)}
                  rows={3}
                  disabled={submitMutation.isPending}
                  className="resize-none"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Your Startup"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
