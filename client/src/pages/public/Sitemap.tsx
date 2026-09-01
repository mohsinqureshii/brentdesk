import { Link } from "wouter";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { 
  Home, 
  Briefcase, 
  Building2, 
  Users, 
  TrendingUp, 
  Rocket, 
  Calendar, 
  Newspaper, 
  Mail, 
  Info, 
  Shield, 
  FileText,
  Gift,
  Scale,
  Wrench,
  BookOpen,
  Award,
  Calculator,
  Package,
  Megaphone
} from "lucide-react";

// Centralized route configuration for auto-update
const siteRoutes = {
  main: {
    title: "Main Pages",
    icon: Home,
    links: [
      { label: "News Homepage", href: "/", description: "Latest MENA tech news and updates" },
      { label: "Dashboard", href: "/dashboard", description: "Your personalized dashboard" },
      { label: "Profile", href: "/profile", description: "Manage your profile settings" },
    ]
  },
  ecosystem: {
    title: "Ecosystem",
    icon: Building2,
    links: [
      { label: "Jobs", href: "/jobs", description: "Browse tech job opportunities" },
      { label: "Companies", href: "/companies", description: "Discover MENA startups and companies" },
      { label: "Investors", href: "/investors", description: "Find investors and VCs" },
      { label: "People", href: "/people", description: "Connect with tech professionals" },
      { label: "Accelerators", href: "/accelerators", description: "Accelerator programs and grants" },
      { label: "Events", href: "/events", description: "Upcoming tech events" },
    ]
  },
  resources: {
    title: "Resources",
    icon: Package,
    links: [
      { label: "Resources Hub", href: "/resources", description: "All founder resources" },
      { label: "Founder Perks", href: "/resources/perks", description: "Deals and credits for startups" },
      { label: "Templates", href: "/resources/templates", description: "Legal, finance & HR documents" },
      { label: "Regulations Hub", href: "/resources/regulations", description: "Country-specific compliance guides" },
      { label: "Tools Directory", href: "/resources/tools", description: "Curated software stack" },
      { label: "Playbooks", href: "/resources/playbooks", description: "Step-by-step founder guides" },
      { label: "Programs & Grants", href: "/accelerators", description: "Funding opportunities" },
      { label: "Calculators", href: "/resources/calculators", description: "Financial planning tools" },
      { label: "Vendors", href: "/resources/vendors", description: "Verified service providers" },
      { label: "Starter Packs", href: "/resources/packs", description: "Curated resource bundles" },
    ]
  },
  company: {
    title: "Company",
    icon: Info,
    links: [
      { label: "About Us", href: "/about", description: "Learn about TechScoop" },
      { label: "Contact", href: "/contact", description: "Get in touch with us" },
      { label: "Newsletter", href: "/newsletter", description: "Subscribe to our newsletter" },
      { label: "Advertise", href: "/advertise", description: "Advertising opportunities" },
    ]
  },
  legal: {
    title: "Legal",
    icon: Shield,
    links: [
      { label: "Privacy Policy", href: "/privacy", description: "How we handle your data" },
      { label: "Terms of Service", href: "/terms", description: "Terms and conditions" },
    ]
  }
};

const Sitemap = () => {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      
      {/* Hero Section */}
      <section className="w-full bg-foreground">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-background mb-4">
            Sitemap
          </h1>
          <p className="text-background/70 text-lg max-w-2xl">
            A complete overview of all pages and sections on TechScoop.
          </p>
        </div>
      </section>

      {/* Sitemap Content */}
      <section className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
          {Object.entries(siteRoutes).map(([key, section]) => {
            const IconComponent = section.icon;
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-border">
                  <div className="p-2 rounded-lg bg-muted">
                    <IconComponent className="h-5 w-5 text-foreground" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
                </div>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link.href}>
                      <Link 
                        href={link.href}
                        className="group block"
                      >
                        <span className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                          {link.label}
                        </span>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {link.description}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Dynamic Pages Note */}
        <div className="mt-16 p-6 bg-muted/50 rounded-xl border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-3">Dynamic Pages</h3>
          <p className="text-muted-foreground mb-4">
            In addition to the pages listed above, TechScoop has dynamic content pages including:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <li className="flex items-start gap-2">
              <Newspaper className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Articles</span>
                <p className="text-sm text-muted-foreground">/article/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Briefcase className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Job Details</span>
                <p className="text-sm text-muted-foreground">/jobs/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Company Profiles</span>
                <p className="text-sm text-muted-foreground">/companies/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <TrendingUp className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Investor Profiles</span>
                <p className="text-sm text-muted-foreground">/investors/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">People Profiles</span>
                <p className="text-sm text-muted-foreground">/people/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Rocket className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Accelerator Details</span>
                <p className="text-sm text-muted-foreground">/accelerators/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Event Details</span>
                <p className="text-sm text-muted-foreground">/events/:id</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Author Pages</span>
                <p className="text-sm text-muted-foreground">/author/:slug</p>
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Scale className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">Country Regulations</span>
                <p className="text-sm text-muted-foreground">/resources/regulations/:country</p>
              </div>
            </li>
          </ul>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Sitemap;