import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Check } from "lucide-react";
import { Tool } from "@/data/resourcesData";

interface ToolCardProps {
  tool: Tool;
}

const pricingColors: Record<string, string> = {
  free: "bg-green-100 text-green-800",
  freemium: "bg-blue-100 text-blue-800",
  paid: "bg-purple-100 text-purple-800",
  enterprise: "bg-gray-100 text-gray-800",
};

export function ToolCard({ tool }: ToolCardProps) {
  return (
    <Card className="group h-full border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            <img 
              src={tool.logo} 
              alt={tool.name}
              className="w-8 h-8 object-contain"
              onError={(e) => {
                e.currentTarget.src = `https://ui-avatars.com/api/?name=${tool.name.charAt(0)}&background=random`;
              }}
            />
          </div>
          <Badge className={`text-xs capitalize ${pricingColors[tool.pricing]}`}>
            {tool.pricing}
          </Badge>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-foreground/80">
          {tool.name}
        </h3>

        {/* Category */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
          {tool.category}
        </p>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-2">
          {tool.description}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {tool.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Features */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
          {tool.menaReady && (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-600" />
              MENA Ready
            </span>
          )}
          {tool.arabicSupport && (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-green-600" />
              Arabic
            </span>
          )}
        </div>

        {/* CTA */}
        <Link href={`/resources/tools/${tool.id}`}>
          <Button variant="outline" size="sm" className="w-full gap-2">
            View Tool
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
