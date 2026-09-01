/**
 * Company Combobox Component
 * Searchable dropdown for selecting companies with option to create new
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Check, 
  ChevronsUpDown, 
  Plus, 
  Search,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Company {
  id: number;
  name: string;
  slug: string;
  logo?: string | null;
}

interface CompanyComboboxProps {
  value: string;
  onChange: (value: string, companyId?: number) => void;
  placeholder?: string;
  className?: string;
}

export function CompanyCombobox({
  value,
  onChange,
  placeholder = "Select company...",
  className,
}: CompanyComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch companies with search
  const { data: companiesData, isLoading, refetch } = trpc.companies.adminList.useQuery(
    { 
      page: 1, 
      limit: 50,
      search: search || undefined,
    },
    { 
      enabled: open,
      staleTime: 30000,
    }
  );

  // Create company mutation
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: (data) => {
      toast.success("Company created successfully!");
      onChange(newCompanyName, data.id);
      setCreateDialogOpen(false);
      setNewCompanyName("");
      setOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create company: ${error.message}`);
    },
  });

  const companies = companiesData?.items || [];

  // Focus search input when popover opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSelect = (company: Company) => {
    onChange(company.name, company.id);
    setOpen(false);
    setSearch("");
  };

  const handleCreateNew = () => {
    setNewCompanyName(search);
    setCreateDialogOpen(true);
  };

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    setIsCreating(true);
    try {
      await createMutation.mutateAsync({
        name: newCompanyName.trim(),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 text-[#9BA3B0] shrink-0" />
              <span className="truncate">{value || placeholder}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {value && (
                <X 
                  className="h-4 w-4 text-[#9BA3B0] hover:text-[#697386]" 
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <Input
              ref={inputRef}
              placeholder="Search companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-[#9BA3B0]" />
              </div>
            ) : companies.length === 0 ? (
              <div className="py-6 text-center text-sm text-[#697386]">
                {search ? `No companies found for "${search}"` : "No companies found"}
              </div>
            ) : (
              <div className="p-1">
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => handleSelect(company)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-[#F0F2F5]",
                      value === company.name && "bg-[#F0F7FF]"
                    )}
                  >
                    {company.logo ? (
                      <img 
                        src={company.logo} 
                        alt={company.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-[#F0F2F5]">
                        <Building2 className="h-4 w-4 text-[#9BA3B0]" />
                      </div>
                    )}
                    <div className="flex-1 text-left">
                      <div className="font-medium">{company.name}</div>
                      {company.slug && (
                        <div className="text-xs text-[#697386]">/{company.slug}</div>
                      )}
                    </div>
                    {value === company.name && (
                      <Check className="h-4 w-4 text-[#0066FF]" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="border-t p-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-[#0066FF] hover:text-[#0066FF] hover:bg-[#F0F7FF]"
              onClick={handleCreateNew}
            >
              <Plus className="h-4 w-4" />
              Create new company{search && ` "${search}"`}
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Create Company Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Add a new company to the database. You can edit more details later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="e.g. TechCorp Inc."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCompany}
              disabled={isCreating || !newCompanyName.trim()}
              className="bg-[#0066FF] hover:bg-[#0052CC]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Company
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
