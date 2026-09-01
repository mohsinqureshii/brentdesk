// Resource data types - data will be managed through the admin panel and database
export interface Perk {
  id: string;
  vendor: string;
  logo: string;
  title: string;
  description: string;
  value: string;
  valueType: 'credits' | 'percent' | 'free' | 'months';
  category: string;
  eligibility: 'public' | 'verified';
  regions: string[];
  featured?: boolean;
}
export interface Template {
  id: string;
  name: string;
  type: string;
  format: 'doc' | 'pdf' | 'sheet' | 'ppt';
  country: string;
  free: boolean;
  downloads: number;
  lastUpdated: string;
  description: string;
}
export interface Regulation {
  id: string;
  title: string;
  country: string;
  category: string;
  lastUpdated: string;
  description: string;
}
export interface Tool {
  id: string;
  name: string;
  logo: string;
  category: string;
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise';
  stage: string[];
  menaReady: boolean;
  arabicSupport: boolean;
  description: string;
  tags: string[];
}
export interface Playbook {
  id: string;
  title: string;
  topic: string;
  country: string;
  readTime: number;
  description: string;
  steps: number;
}
export interface Program {
  id: string;
  name: string;
  organization: string;
  country: string;
  sector: string[];
  equityFree: boolean;
  ticketSize: string;
  deadline: string;
  status: 'open' | 'closed' | 'coming';
  description: string;
}
export interface Calculator {
  id: string;
  name: string;
  description: string;
  icon: string;
}
export interface Vendor {
  id: string;
  name: string;
  logo: string;
  category: string;
  services: string[];
  region: string[];
  verified: boolean;
  startingFrom?: string;
}
export interface Pack {
  id: string;
  name: string;
  description: string;
  itemCount: number;
  items: string[];
  color: string;
}

// Empty arrays - content will be added through the admin panel
export const perks: Perk[] = [];
export const templates: Template[] = [];
export const regulations: Regulation[] = [];
export const tools: Tool[] = [];
export const playbooks: Playbook[] = [];
export const programs: Program[] = [];
export const calculators: Calculator[] = [];
export const vendors: Vendor[] = [];
export const packs: Pack[] = [];

export const countries = [
  { code: "ksa", name: "Saudi Arabia", flag: "🇸🇦", topicsCount: 0 },
  { code: "uae", name: "UAE", flag: "🇦🇪", topicsCount: 0 },
  { code: "qatar", name: "Qatar", flag: "🇶🇦", topicsCount: 0 },
  { code: "bahrain", name: "Bahrain", flag: "🇧🇭", topicsCount: 0 },
  { code: "kuwait", name: "Kuwait", flag: "🇰🇼", topicsCount: 0 },
  { code: "egypt", name: "Egypt", flag: "🇪🇬", topicsCount: 0 },
  { code: "pakistan", name: "Pakistan", flag: "🇵🇰", topicsCount: 0 }
];

export const resourceCategories = [
  {
    id: "perks",
    title: "Founder Perks",
    description: "Exclusive deals and credits for startups",
    icon: "Gift",
    count: perks.length,
    href: "/resources/perks"
  },
  {
    id: "templates",
    title: "Templates & Toolkits",
    description: "Legal, finance, and HR documents",
    icon: "FileText",
    count: templates.length,
    href: "/resources/templates"
  },
  {
    id: "regulations",
    title: "Regulations Hub",
    description: "Country-specific compliance guides",
    icon: "Scale",
    count: regulations.length,
    href: "/resources/regulations"
  },
  {
    id: "tools",
    title: "Tools Directory",
    description: "Curated software for startups",
    icon: "Wrench",
    count: tools.length,
    href: "/resources/tools"
  },
  {
    id: "playbooks",
    title: "Playbooks",
    description: "Step-by-step founder guides",
    icon: "BookOpen",
    count: playbooks.length,
    href: "/resources/playbooks"
  },
  {
    id: "programs",
    title: "Programs & Grants",
    description: "Funding and accelerator programs",
    icon: "Trophy",
    count: programs.length,
    href: "/resources/programs"
  },
  {
    id: "calculators",
    title: "Calculators",
    description: "Financial and business calculators",
    icon: "Calculator",
    count: 8,
    href: "/resources/calculators"
  },
  {
    id: "vendors",
    title: "Vendors & Partners",
    description: "Vetted service providers",
    icon: "Building2",
    count: vendors.length,
    href: "/resources/vendors"
  }
];
