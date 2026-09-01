import {
  TrendingDown, 
  PieChart, 
  Users, 
  DollarSign, 
  LineChart,
  LucideIcon
} from "lucide-react";

export interface CalculatorData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: LucideIcon;
  popular?: boolean;
  slug?: string;
}

export const calculatorsData: CalculatorData[] = [
  // Financial Calculators
  { id: "runway", name: "Runway Calculator", description: "Calculate how long your cash will last based on current burn rate and available funds", category: "Financial", icon: TrendingDown, popular: true, slug: "runway" },
  { id: "dilution", name: "Dilution Calculator", description: "Understand equity dilution across funding rounds and cap table impact", category: "Financial", icon: PieChart, popular: true, slug: "dilution" },
  { id: "valuation", name: "Pre-Money Valuation", description: "Calculate your startup's pre-money valuation using multiple methodologies", category: "Financial", icon: DollarSign, slug: "pre-money-valuation" },
  { id: "post-money", name: "Post-Money Valuation", description: "Determine post-money valuation after investment and new share issuance", category: "Financial", icon: DollarSign, slug: "post-money-valuation" },
  { id: "burn-rate", name: "Burn Rate Calculator", description: "Track your monthly cash burn rate and optimize spending efficiency", category: "Financial", icon: TrendingDown, popular: true, slug: "burn-rate-calculator" },

  // SaaS Metrics Calculators
  { id: "cac-ltv", name: "CAC/LTV Calculator", description: "Measure customer acquisition cost vs lifetime value for unit economics", category: "SaaS", icon: Users, popular: true, slug: "cac-ltv" },
  { id: "mrr", name: "MRR Calculator", description: "Calculate monthly recurring revenue and track growth trends", category: "SaaS", icon: DollarSign, slug: "mrr" },
  { id: "quick-ratio", name: "SaaS Quick Ratio", description: "Growth efficiency metric: (New MRR + Expansion) / (Churned + Contraction)", category: "SaaS", icon: LineChart, popular: true, slug: "saas-quick-ratio" },
];

// Category definitions with counts
export const calculatorCategories = [
  { label: "All", value: "all", count: calculatorsData.length },
  { label: "Financial", value: "Financial", count: calculatorsData.filter(c => c.category === "Financial").length },
  { label: "SaaS", value: "SaaS", count: calculatorsData.filter(c => c.category === "SaaS").length },
];

// Filter groups for the calculator page
export const calculatorFilterGroups = [
  {
    title: "Category",
    key: "category",
    variant: "checkbox" as const,
    options: calculatorCategories.slice(1).map(c => ({ label: c.label, value: c.value, count: c.count })),
  },
  {
    title: "Popularity",
    key: "popular",
    options: [
      { label: "Popular Only", value: "true" },
    ],
  },
];
