import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface AdvancedPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  showingFrom?: number;
  showingTo?: number;
}

export function AdvancedPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  showingFrom,
  showingTo,
}: AdvancedPaginationProps) {
  const [goToPage, setGoToPage] = useState("");

  // Calculate showing range if not provided
  const from = showingFrom ?? (currentPage - 1) * pageSize + 1;
  const to = showingTo ?? Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push("...");
      }
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }
      if (currentPage < totalPages - 2) {
        pages.push("...");
      }
      if (!pages.includes(totalPages)) {
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const handleGoToPage = () => {
    const page = parseInt(goToPage, 10);
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
      setGoToPage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGoToPage();
    }
  };

  if (totalItems === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3 py-4">
      {/* Top row: showing info */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Show</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
          >
            <SelectTrigger className="w-[70px] h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs sm:text-sm text-muted-foreground">
          {from}-{to} of {totalItems.toLocaleString()}
        </span>
      </div>

      {/* Bottom row: pagination controls */}
      <div className="flex items-center justify-center gap-1 flex-wrap">
        {/* First and Previous */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          title="First page"
        >
          <ChevronFirst className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page numbers - show fewer on mobile */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          {getPageNumbers().map((page, index) =>
            page === "..." ? (
              <span key={`ellipsis-${index}`} className="px-1 sm:px-2 text-muted-foreground text-sm">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                className={`h-8 w-8 p-0 text-xs sm:text-sm ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground"
                    : ""
                }`}
                onClick={() => onPageChange(page as number)}
              >
                {page}
              </Button>
            )
          )}
        </div>

        {/* Next and Last */}
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          title="Last page"
        >
          <ChevronLast className="h-4 w-4" />
        </Button>

        {/* Go to page - hidden on mobile */}
        <div className="hidden md:flex items-center gap-1 ml-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            Go to
          </span>
          <Input
            type="number"
            min={1}
            max={totalPages}
            value={goToPage}
            onChange={(e) => setGoToPage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="#"
            className="w-16 h-8 text-center"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={handleGoToPage}
            disabled={
              !goToPage ||
              parseInt(goToPage, 10) < 1 ||
              parseInt(goToPage, 10) > totalPages
            }
          >
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}
