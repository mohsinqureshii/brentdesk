/**
 * Investor Participation Dialog
 * Allows adding multiple investors to a funding round with individual investment amounts
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Search, Loader2, DollarSign, Users, Crown } from "lucide-react";

interface InvestorParticipationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fundingRoundId: number;
  roundName?: string;
  onSuccess?: () => void;
}

interface InvestorEntry {
  id?: number;
  investorId: number;
  investorName: string;
  investorLogo?: string | null;
  role: "lead" | "participant";
  investmentAmount: string;
  investmentCurrency: string;
}

export function InvestorParticipationDialog({
  open,
  onOpenChange,
  fundingRoundId,
  roundName,
  onSuccess,
}: InvestorParticipationDialogProps) {
  const [investors, setInvestors] = useState<InvestorEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Fetch existing investors for this round
  const { data: roundData, refetch: refetchRound } = trpc.admin.funding.getById.useQuery(
    { id: fundingRoundId },
    { enabled: fundingRoundId > 0 && open }
  );

  // Search investors
  const { data: searchResults } = trpc.admin.funding.searchInvestors.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );

  // Mutations
  const addInvestorMutation = trpc.admin.funding.addInvestor.useMutation({
    onSuccess: () => {
      refetchRound();
      setSearchQuery("");
      setIsAdding(false);
    },
    onError: (error) => {
      toast.error(`Failed to add investor: ${error.message}`);
    },
  });

  const updateAmountMutation = trpc.admin.funding.updateInvestorAmount.useMutation({
    onSuccess: () => {
      toast.success("Investment amount updated");
      refetchRound();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });

  const removeInvestorMutation = trpc.admin.funding.removeInvestor.useMutation({
    onSuccess: () => {
      toast.success("Investor removed");
      refetchRound();
    },
    onError: (error) => {
      toast.error(`Failed to remove: ${error.message}`);
    },
  });

  const setLeadMutation = trpc.admin.funding.setLeadInvestor.useMutation({
    onSuccess: () => {
      toast.success("Lead investor updated");
      refetchRound();
    },
    onError: (error) => {
      toast.error(`Failed to set lead: ${error.message}`);
    },
  });

  // Sync investors from round data
  useEffect(() => {
    if (roundData?.investors) {
      setInvestors(
        roundData.investors.map((inv) => ({
          id: inv.id,
          investorId: inv.investorId,
          investorName: inv.investor?.name || "Unknown",
          investorLogo: inv.investor?.logo,
          role: inv.role as "lead" | "participant",
          investmentAmount: inv.investmentAmount || "",
          investmentCurrency: inv.investmentCurrency || "USD",
        }))
      );
    }
  }, [roundData]);

  const handleAddInvestor = (investor: { id: number; name: string; logo?: string | null }) => {
    // Check if already added
    if (investors.some((inv) => inv.investorId === investor.id)) {
      toast.error("Investor already added to this round");
      return;
    }

    addInvestorMutation.mutate({
      fundingRoundId,
      investorId: investor.id,
      role: "participant",
      investmentAmount: "",
      investmentCurrency: "USD",
    });
  };

  const handleUpdateAmount = (entry: InvestorEntry, amount: string, currency: string) => {
    if (!entry.id) return;
    updateAmountMutation.mutate({
      id: entry.id,
      investmentAmount: amount || undefined,
      investmentCurrency: currency,
    });
  };

  const handleSetLead = (investorId: number) => {
    setLeadMutation.mutate({
      fundingRoundId,
      investorId,
    });
  };

  const handleRemove = (id: number) => {
    if (confirm("Remove this investor from the round?")) {
      removeInvestorMutation.mutate({ id });
    }
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

  const formatCurrency = (amount: string | null, currency: string) => {
    if (!amount) return "-";
    const num = parseFloat(amount);
    if (isNaN(num)) return "-";
    // Validate currency code - use USD as fallback for invalid codes
    const validCurrency = isValidCurrency(currency) ? currency.toUpperCase().trim() : "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: validCurrency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Investors
          </DialogTitle>
          <DialogDescription>
            Add investors to this funding round and track their individual investment amounts
            {roundName && <span className="font-medium"> - {roundName}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Add Investor Section */}
          <div className="border rounded-md p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="h-4 w-4" />
              <span className="font-medium">Add Investor</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search investors by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchResults && searchResults.length > 0 && searchQuery.length >= 2 && (
                <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-auto">
                  {searchResults.map((investor) => (
                    <button
                      key={investor.id}
                      className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                      onClick={() => handleAddInvestor(investor)}
                      disabled={addInvestorMutation.isPending}
                    >
                      {investor.logo && (
                        <img src={investor.logo} alt="" className="w-6 h-6 rounded" />
                      )}
                      <span>{investor.name}</span>
                      {investor.type && (
                        <Badge variant="outline" className="ml-auto text-xs">
                          {investor.type}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Investors Table */}
          {investors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Investor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Investment Amount</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investors.map((entry) => (
                  <TableRow key={entry.id || entry.investorId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.investorLogo && (
                          <img
                            src={entry.investorLogo}
                            alt=""
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <div className="font-medium flex items-center gap-1">
                            {entry.investorName}
                            {roundData?.leadInvestorId === entry.investorId && (
                              <Crown className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={entry.role}
                        onValueChange={(value) => {
                          if (value === "lead") {
                            handleSetLead(entry.investorId);
                          }
                          if (entry.id) {
                            updateAmountMutation.mutate({
                              id: entry.id,
                              role: value as "lead" | "participant",
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lead">Lead</SelectItem>
                          <SelectItem value="participant">Participant</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Select
                          value={entry.investmentCurrency}
                          onValueChange={(value) => {
                            if (entry.id) {
                              handleUpdateAmount(entry, entry.investmentAmount, value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="AED">AED</SelectItem>
                            <SelectItem value="SAR">SAR</SelectItem>
                            <SelectItem value="EGP">EGP</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={entry.investmentAmount}
                          onChange={(e) => {
                            // Update local state
                            setInvestors((prev) =>
                              prev.map((inv) =>
                                inv.investorId === entry.investorId
                                  ? { ...inv, investmentAmount: e.target.value }
                                  : inv
                              )
                            );
                          }}
                          onBlur={(e) => {
                            if (entry.id) {
                              handleUpdateAmount(entry, e.target.value, entry.investmentCurrency);
                            }
                          }}
                          className="w-[120px]"
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => entry.id && handleRemove(entry.id)}
                        disabled={removeInvestorMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No investors added yet</p>
              <p className="text-sm">Search and add investors above</p>
            </div>
          )}

          {/* Summary */}
          {investors.length > 0 && (
            <div className="border rounded-md p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Total from Investors</span>
                </div>
                <span className="text-lg font-bold">
                  {formatCurrency(
                    investors
                      .reduce((sum, inv) => sum + (parseFloat(inv.investmentAmount) || 0), 0)
                      .toString(),
                    "USD"
                  )}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {investors.length} investor{investors.length !== 1 ? "s" : ""} •{" "}
                {investors.filter((i) => i.role === "lead").length} lead
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              onSuccess?.();
              onOpenChange(false);
            }}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
