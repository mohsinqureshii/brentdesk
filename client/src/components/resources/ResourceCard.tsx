import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Gift, FileText, Scale, Wrench, BookOpen, Trophy, Calculator, Building2 } from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Gift,
  FileText,
  Scale,
  Wrench,
  BookOpen,
  Trophy,
  Calculator,
  Building2,
};

interface ResourceCardProps {
  title: string;
  description: string;
  icon: string | React.ElementType;
  count?: number;
  href: string;
}

export function ResourceCard({ title, description, icon, count, href }: ResourceCardProps) {
  const IconComponent = typeof icon === 'string' ? (iconMap[icon] || Gift) : icon;
  
  return (
    <Link href={href}>
      <Card className="group h-full border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-200 bg-card">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center group-hover:bg-foreground group-hover:text-background transition-colors">
              <IconComponent className="w-6 h-6" />
            </div>
            {count !== undefined && (
              <Badge variant="secondary" className="text-xs font-medium">
                {count} items
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-foreground/80">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-2">
            {description}
          </p>
          <div className="flex items-center text-sm font-medium text-foreground group-hover:text-foreground/70">
            Explore
            <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
