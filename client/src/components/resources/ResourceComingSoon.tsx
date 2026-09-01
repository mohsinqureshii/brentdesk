import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft, Bell } from "lucide-react";

interface ResourceComingSoonProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function ResourceComingSoon({ title, description, icon }: ResourceComingSoonProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero */}
      <section className="w-full bg-[#4CB944]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link href="/resources" className="inline-flex items-center gap-1.5 text-white/80 hover:text-white text-sm font-medium transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Resources
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {title}
          </h1>
          <p className="text-white/90 text-base sm:text-lg max-w-2xl">
            {description}
          </p>
        </div>
      </section>

      {/* Coming Soon Content */}
      <section className="py-16 sm:py-24">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6 text-muted-foreground">
            {icon}
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Coming Soon</h2>
          <p className="text-muted-foreground mb-8">
            We're curating the best {title.toLowerCase()} for MENA founders. Check back soon or subscribe to get notified when new content is available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/resources">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Browse Resources
              </Button>
            </Link>
            <Button className="gap-2 bg-foreground text-background hover:bg-foreground/90">
              <Bell className="w-4 h-4" />
              Notify Me
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
