/**
 * Funding Tab Component
 * Funding Tracker for articles - link funding rounds to articles
 * Now with AI-powered suggestions
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Building2, Plus, X, Loader2, Search, Edit2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

interface FundingTabProps {
  articleId: number;
  articleTitle?: string;
  articleContent?: string;
  articleExcerpt?: string;
}

const ROUND_TYPES = [
  { value: "pre_seed", label: "Pre-Seed" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "series_d_plus", label: "Series D+" },
  { value: "bridge", label: "Bridge" },
  { value: "strategic", label: "Strategic" },
  { value: "venture_debt", label: "Venture Debt" },
  { value: "grant", label: "Grant" },
  { value: "undisclosed", label: "Undisclosed" },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "SAR", label: "SAR (ر.س)" },
  { value: "INR", label: "INR (₹)" },
  { value: "CNY", label: "CNY (¥)" },
  { value: "JPY", label: "JPY (¥)" },
];

interface FundingSuggestion {
  companyName: string;
  roundType: string;
  amount?: string;
  currency?: string;
  date?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  existingCompanyId?: number;
}

export function FundingTab({ articleId, articleTitle, articleContent, articleExcerpt }: FundingTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [companySearch, setCompanySearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<{ id: number; name: string } | null>(null);
  const [roundType, setRoundType] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [announcedDate, setAnnouncedDate] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<FundingSuggestion[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  // Fetch funding rounds linked to this article
  const { data: fundingRounds, isLoading } = trpc.admin.funding.getArticleFundingRounds.useQuery(
    { articleId },
    { enabled: articleId > 0 }
  );

  // Search companies
  const { data: companyResults } = trpc.admin.entityLinking.searchCompanies.useQuery(
    { query: companySearch },
    { enabled: companySearch.length >= 2 }
  );

  // Create funding round mutation
  const createMutation = trpc.admin.funding.create.useMutation({
    onSuccess: () => {
      utils.admin.funding.getArticleFundingRounds.invalidate({ articleId });
      resetForm();
      toast.success("Funding round added");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to add funding round: ${error.message}`);
    },
  });

  // Unlink funding round mutation
  const unlinkMutation = trpc.admin.funding.unlinkFromArticle.useMutation({
    onSuccess: () => {
      utils.admin.funding.getArticleFundingRounds.invalidate({ articleId });
      toast.success("Funding round unlinked");
    },
  });

  // AI suggestion mutation
  const suggestFundingMutation = trpc.admin.entityLinking.suggestFunding.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data.fundingRounds);
      setShowAiSuggestions(true);
      toast.success("AI funding suggestions generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate suggestions: ${error.message}`);
    },
  });

  const handleSuggestWithAi = () => {
    if (!articleTitle || !articleContent) {
      toast.error("Please add article title and content first");
      return;
    }
    setIsLoadingAi(true);
    suggestFundingMutation.mutate({
      title: articleTitle,
      content: articleContent,
      excerpt: articleExcerpt,
    }, {
      onSettled: () => setIsLoadingAi(false),
    });
  };

  const resetForm = () => {
    setShowForm(false);
    setCompanySearch("");
    setSelectedCompany(null);
    setRoundType("");
    setAmount("");
    setCurrency("USD");
    setAnnouncedDate("");
  };

  const handleSubmit = () => {
    if (!selectedCompany) {
      toast.error("Please select a company");
      return;
    }
    if (!roundType) {
      toast.error("Please select a round type");
      return;
    }

    createMutation.mutate({
      companyId: selectedCompany.id,
      articleId,
      roundType: roundType as any,
      amountRaised: amount ? amount : undefined,
      currency,
      fundingDate: announcedDate || new Date().toISOString().split('T')[0],
    });
  };

  const handleAddFromSuggestion = (suggestion: FundingSuggestion) => {
    if (!suggestion.existingCompanyId) {
      toast.info(`"${suggestion.companyName}" not in database. Please create it first or use manual entry.`);
      // Pre-fill the form
      setShowForm(true);
      setCompanySearch(suggestion.companyName);
      setRoundType(suggestion.roundType);
      if (suggestion.amount) setAmount(suggestion.amount);
      if (suggestion.currency) setCurrency(suggestion.currency);
      if (suggestion.date) setAnnouncedDate(suggestion.date);
      return;
    }

    createMutation.mutate({
      companyId: suggestion.existingCompanyId,
      articleId,
      roundType: suggestion.roundType as any,
      amountRaised: suggestion.amount || undefined,
      currency: suggestion.currency || "USD",
      fundingDate: suggestion.date || new Date().toISOString().split('T')[0],
    });
  };

  // Valid ISO 4217 currency codes (common ones)
  const VALID_CURRENCIES = new Set([
    "USD", "EUR", "GBP", "JPY", "CNY", "AED", "SAR", "QAR", "KWD", "BHD", "OMR",
    "EGP", "JOD", "LBP", "MAD", "TND", "IQD", "INR", "PKR", "BDT", "SGD", "HKD",
    "AUD", "CAD", "CHF", "SEK", "NOK", "DKK", "NZD", "ZAR", "BRL", "MXN", "KRW"
  ]);
  
  const isValidCurrency = (code: string | null | undefined): boolean => {
    if (!code || typeof code !== "string") return false;
    const upperCode = code.toUpperCase().trim();
    return upperCode.length === 3 && VALID_CURRENCIES.has(upperCode);
  };

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (!amount) return "Undisclosed";
    // Validate currency code - use USD as fallback for invalid codes
    const validCurrency = isValidCurrency(currency) ? currency!.toUpperCase().trim() : "USD";
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: validCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (amount >= 1000000000) {
      return formatter.format(amount / 1000000000) + "B";
    }
    if (amount >= 1000000) {
      return formatter.format(amount / 1000000) + "M";
    }
    if (amount >= 1000) {
      return formatter.format(amount / 1000) + "K";
    }
    return formatter.format(amount);
  };

  const filteredSuggestions = aiSuggestions.filter(s => 
    !dismissedSuggestions.has(`${s.companyName}-${s.roundType}`)
  );

  const confidenceColors = {
    high: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Funding Tracker
              </CardTitle>
              <CardDescription>
                Track funding rounds mentioned in this article
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={handleSuggestWithAi}
                disabled={isLoadingAi || !articleTitle || !articleContent}
                variant="outline"
                className="gap-2"
              >
                {isLoadingAi ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Suggest with AI
              </Button>
              <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"}>
                {showForm ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Funding Round
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Suggestions */}
          {showAiSuggestions && filteredSuggestions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" />
                AI Suggestions
              </Label>
              <div className="space-y-2">
                {filteredSuggestions.map((suggestion) => {
                  const key = `${suggestion.companyName}-${suggestion.roundType}`;
                  return (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-3 border rounded-md bg-gradient-to-r from-purple-50/50 to-blue-50/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">{suggestion.companyName}</span>
                          <Badge variant="secondary">
                            {ROUND_TYPES.find(t => t.value === suggestion.roundType)?.label || suggestion.roundType}
                          </Badge>
                          {suggestion.amount && (
                            <Badge variant="outline">
                              {suggestion.currency || "USD"} {suggestion.amount}
                            </Badge>
                          )}
                          <Badge variant="outline" className={confidenceColors[suggestion.confidence]}>
                            {suggestion.confidence}
                          </Badge>
                          {suggestion.existingCompanyId && (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              In Database
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(key)))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddFromSuggestion(suggestion)}
                          disabled={createMutation.isPending}
                        >
                          {createMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Funding Round Form */}
          {showForm && (
            <div className="border rounded-md p-4 space-y-4 bg-muted/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Search */}
                <div className="space-y-2">
                  <Label>Company *</Label>
                  {selectedCompany ? (
                    <div className="flex items-center gap-2 p-2 border rounded bg-background">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{selectedCompany.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedCompany(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search companies..."
                        value={companySearch}
                        onChange={(e) => setCompanySearch(e.target.value)}
                        className="pl-9"
                      />
                      {companySearch.length >= 2 && companyResults && (
                        <div className="absolute z-10 w-full mt-1 border rounded-md bg-background shadow-lg max-h-48 overflow-auto">
                          {companyResults.length > 0 ? (
                            companyResults.map((company) => (
                              <button
                                key={company.id}
                                className="w-full p-2 text-left hover:bg-muted flex items-center gap-2"
                                onClick={() => {
                                  setSelectedCompany({ id: company.id, name: company.name });
                                  setCompanySearch("");
                                }}
                              >
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {company.name}
                              </button>
                            ))
                          ) : (
                            <div className="p-2 text-sm text-muted-foreground">
                              No companies found
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Round Type */}
                <div className="space-y-2">
                  <Label>Round Type *</Label>
                  <Select value={roundType} onValueChange={setRoundType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select round type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROUND_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="e.g., 5000000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Announced Date */}
                <div className="space-y-2">
                  <Label>Announced Date</Label>
                  <Input
                    type="date"
                    value={announcedDate}
                    onChange={(e) => setAnnouncedDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Funding Round
                </Button>
              </div>
            </div>
          )}

          {/* Funding Rounds Table */}
          {fundingRounds && fundingRounds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Round</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fundingRounds.map((round) => (
                  <TableRow key={round.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {round.company?.name || "Unknown"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {ROUND_TYPES.find((t) => t.value === round.roundType)?.label || round.roundType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatAmount(round.amount ? Number(round.amount) : null, round.currency)}
                    </TableCell>
                    <TableCell>
                      {round.announcedDate
                        ? new Date(round.announcedDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info("Edit functionality coming soon")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unlinkMutation.mutate({ fundingRoundId: round.id, articleId })}
                          disabled={unlinkMutation.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No funding rounds linked to this article yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
