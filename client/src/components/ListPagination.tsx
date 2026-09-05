/**
 * ListPagination Component
 * A wrapper around the base pagination components for easy use in list pages
 */

import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface ListPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
}

export function ListPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showPageNumbers = true,
  maxVisiblePages = 5,
}: ListPaginationProps) {
  if (totalPages <= 1) return null;

  const getVisiblePages = (): (number | "ellipsis-start" | "ellipsis-end")[] => {
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [];
    
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    if (startPage > 2) {
      pages.push("ellipsis-start");
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages - 1) {
      pages.push("ellipsis-end");
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>

        {showPageNumbers && visiblePages.map((page, index) => (
          <PaginationItem key={typeof page === "number" ? page : `${page}-${index}`}>
            {typeof page === "number" ? (
              <PaginationLink
                href="#"
                isActive={currentPage === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page);
                }}
                className={cn(
                  "cursor-pointer",
                  currentPage === page && "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                )}
              >
                {page}
              </PaginationLink>
            ) : (
              <PaginationEllipsis />
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) onPageChange(currentPage + 1);
            }}
            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// Simple Load More button for infinite scroll style
interface LoadMoreProps {
  onClick: () => void;
  isLoading?: boolean;
  hasMore: boolean;
  className?: string;
}

export function LoadMore({ onClick, isLoading, hasMore, className }: LoadMoreProps) {
  const t = useT();
  if (!hasMore) return null;

  return (
    <div className={cn("flex justify-center py-8", className)}>
      <Button
        variant="outline"
        size="lg"
        onClick={onClick}
        disabled={isLoading}
        className="min-w-[200px]"
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            {t("state.loading")}
          </>
        ) : (
          "Load More"
        )}
      </Button>
    </div>
  );
}

// Page info display
interface PageInfoProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  className?: string;
}

export function PageInfo({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  className,
}: PageInfoProps) {
  const t = useT();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    /* One interpolated string rather than four fragments: the words
       between the numbers were English literals, so an Arabic reader saw
       "عرض 1 to 20 of 125 results", and the first fragment had no trailing
       space, which is why it read "Showing1". */
    <p className={cn("text-sm text-muted-foreground tabular-nums", className)}>
      {t("list.showingRange", { start: startItem, end: endItem, total: totalItems })}
    </p>
  );
}
