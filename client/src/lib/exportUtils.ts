/**
 * Utility functions for exporting data to CSV/Excel format
 */

type ExportColumn<T> = {
  header: string;
  accessor: keyof T | ((item: T) => string | number | null | undefined);
};

/**
 * Convert data array to CSV string
 */
export function toCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[]
): string {
  // Create header row
  const headers = columns.map((col) => `"${col.header}"`).join(",");

  // Create data rows
  const rows = data.map((item) => {
    return columns
      .map((col) => {
        let value: unknown;
        if (typeof col.accessor === "function") {
          value = col.accessor(item);
        } else {
          value = item[col.accessor];
        }

        // Handle null/undefined
        if (value === null || value === undefined) {
          return '""';
        }

        // Handle dates
        if (value instanceof Date) {
          return `"${value.toISOString()}"`;
        }

        // Handle strings (escape quotes)
        if (typeof value === "string") {
          return `"${value.replace(/"/g, '""')}"`;
        }

        // Handle numbers and booleans
        return `"${String(value)}"`;
      })
      .join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for Excel compatibility with UTF-8
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV and trigger download
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const csv = toCSV(data, columns);
  downloadCSV(csv, filename);
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format datetime for export
 */
export function formatDateTimeForExport(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Pre-defined column configurations for each module

export const articleExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Title", accessor: "title" as const },
  { header: "Slug", accessor: "slug" as const },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Author", accessor: (item: { author?: { name?: string } }) => item.author?.name || "" },
  { header: "Category", accessor: (item: { primaryCategory?: { name?: string } }) => item.primaryCategory?.name || "" },
  { header: "Views", accessor: "viewCount" as const },
  { header: "Is Flash", accessor: (item: { isFlash?: boolean }) => item.isFlash ? "Yes" : "No" },
  { header: "Is Featured", accessor: (item: { isFeatured?: boolean }) => item.isFeatured ? "Yes" : "No" },
  { header: "Published At", accessor: (item: { publishedAt?: string | Date }) => formatDateTimeForExport(item.publishedAt) },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
  { header: "Updated At", accessor: (item: { updatedAt?: string | Date }) => formatDateTimeForExport(item.updatedAt) },
];

export const jobExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Title", accessor: "title" as const },
  { header: "Company", accessor: (item: { company?: { name?: string } }) => item.company?.name || "" },
  { header: "Location", accessor: "location" as const },
  { header: "Employment Type", accessor: "employmentType" as const },
  { header: "Experience Level", accessor: "experienceLevel" as const },
  { header: "Salary Min", accessor: "salaryMin" as const },
  { header: "Salary Max", accessor: "salaryMax" as const },
  { header: "Currency", accessor: "currency" as const },
  { header: "Is Remote", accessor: (item: { isRemote?: boolean }) => item.isRemote ? "Yes" : "No" },
  { header: "Is Featured", accessor: (item: { isFeatured?: boolean }) => item.isFeatured ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Apply URL", accessor: "applyUrl" as const },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const peopleExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Name", accessor: "name" as const },
  { header: "Title", accessor: "title" as const },
  { header: "Company", accessor: (item: { company?: { name?: string } }) => item.company?.name || "" },
  { header: "Email", accessor: "email" as const },
  { header: "LinkedIn", accessor: "linkedinUrl" as const },
  { header: "Twitter", accessor: "twitterUrl" as const },
  { header: "Is Verified", accessor: (item: { isVerified?: boolean }) => item.isVerified ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Country", accessor: (item: { country?: { name?: string } }) => item.country?.name || "" },
  { header: "City", accessor: (item: { city?: { name?: string } }) => item.city?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const companyExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Name", accessor: "name" as const },
  { header: "Slug", accessor: "slug" as const },
  { header: "Website", accessor: "website" as const },
  { header: "Industry", accessor: "industry" as const },
  { header: "Founded Year", accessor: "foundedYear" as const },
  { header: "Employee Count", accessor: "employeeCount" as const },
  { header: "Funding Stage", accessor: "fundingStage" as const },
  { header: "Total Funding", accessor: "totalFunding" as const },
  { header: "Is Verified", accessor: (item: { isVerified?: boolean }) => item.isVerified ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Country", accessor: (item: { country?: { name?: string } }) => item.country?.name || "" },
  { header: "City", accessor: (item: { city?: { name?: string } }) => item.city?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const investorExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Name", accessor: "name" as const },
  { header: "Type", accessor: "type" as const },
  { header: "Website", accessor: "website" as const },
  { header: "Email", accessor: "email" as const },
  { header: "LinkedIn", accessor: "linkedinUrl" as const },
  { header: "Investment Focus", accessor: "investmentFocus" as const },
  { header: "Min Investment", accessor: "minInvestment" as const },
  { header: "Max Investment", accessor: "maxInvestment" as const },
  { header: "Portfolio Count", accessor: "portfolioCount" as const },
  { header: "Is Verified", accessor: (item: { isVerified?: boolean }) => item.isVerified ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Country", accessor: (item: { country?: { name?: string } }) => item.country?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const eventExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Name", accessor: "name" as const },
  { header: "Type", accessor: "type" as const },
  { header: "Location", accessor: "location" as const },
  { header: "Venue", accessor: "venue" as const },
  { header: "Start Date", accessor: (item: { startDate?: string | Date }) => formatDateForExport(item.startDate) },
  { header: "End Date", accessor: (item: { endDate?: string | Date }) => formatDateForExport(item.endDate) },
  { header: "Is Virtual", accessor: (item: { isVirtual?: boolean }) => item.isVirtual ? "Yes" : "No" },
  { header: "Is Free", accessor: (item: { isFree?: boolean }) => item.isFree ? "Yes" : "No" },
  { header: "Registration URL", accessor: "registrationUrl" as const },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Country", accessor: (item: { country?: { name?: string } }) => item.country?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const acceleratorExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Name", accessor: "name" as const },
  { header: "Type", accessor: "type" as const },
  { header: "Website", accessor: "website" as const },
  { header: "Application Deadline", accessor: (item: { applicationDeadline?: string | Date }) => formatDateForExport(item.applicationDeadline) },
  { header: "Program Duration", accessor: "programDuration" as const },
  { header: "Funding Amount", accessor: "fundingAmount" as const },
  { header: "Equity Taken", accessor: "equityTaken" as const },
  { header: "Batch Size", accessor: "batchSize" as const },
  { header: "Is Active", accessor: (item: { isActive?: boolean }) => item.isActive ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Country", accessor: (item: { country?: { name?: string } }) => item.country?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];

export const resourceExportColumns = [
  { header: "ID", accessor: "id" as const },
  { header: "Title", accessor: "title" as const },
  { header: "Type", accessor: "type" as const },
  { header: "Category", accessor: "category" as const },
  { header: "Provider", accessor: "provider" as const },
  { header: "URL", accessor: "url" as const },
  { header: "Is Free", accessor: (item: { isFree?: boolean }) => item.isFree ? "Yes" : "No" },
  { header: "Is Featured", accessor: (item: { isFeatured?: boolean }) => item.isFeatured ? "Yes" : "No" },
  { header: "Status", accessor: (item: { status?: { name?: string } }) => item.status?.name || "" },
  { header: "Created At", accessor: (item: { createdAt?: string | Date }) => formatDateTimeForExport(item.createdAt) },
];
