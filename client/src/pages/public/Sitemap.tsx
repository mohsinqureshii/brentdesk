import { Link } from "wouter";
import { publication } from "@shared/publication";
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import {
  Home,
  Briefcase,
  Building2,
  Users,
  Calendar,
  Newspaper,
  Mail,
  Info,
  Shield,
  FileText,
  Gift,
  Wrench,
  BookOpen,
  Award,
  Calculator,
  Megaphone
} from "lucide-react";

// Centralized route configuration for auto-update
const siteRoutes = {
  main: {
    title: "Main Pages",
    icon: Home,
    links: [
      { label: "News Homepage", href: "/", description: "Latest industry news and updates" },
      { label: "Dashboard", href: "/dashboard", description: "Your personalized dashboard" },
      { label: "Profile", href: "/profile", description: "Manage your profile settings" },
    ]
  },
  ecosystem: {
    title: "Ecosystem",
    icon: Building2,
    links: [
      { label: "Jobs", href: "/jobs", description: "Browse tech job opportunities" },
      { label: "Companies", href: "/companies", description: "Company directory" },
      { label: "People", href: "/people", description: "Connect with tech professionals" },
      { label: "Events", href: "/events", description: "Upcoming tech events" },
    ]
  },
  company: {
    title: "Company",
    icon: Info,
    links: [
      { label: "About Us", href: "/about", description: `Learn about ${publication.name}` },
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
            A complete overview of all pages and sections on {publication.name}.
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
            In addition to the pages listed above, {publication.name} has dynamic content pages including:
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
              <Users className="h-4 w-4 text-primary mt-1 shrink-0" />
              <div>
                <span className="font-medium text-foreground">People Profiles</span>
                <p className="text-sm text-muted-foreground">/people/:id</p>
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