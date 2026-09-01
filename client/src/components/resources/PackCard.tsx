import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package } from "lucide-react";
import { Pack } from "@/data/resourcesData";

interface PackCardProps {
  pack: Pack;
}

export function PackCard({ pack }: PackCardProps) {
  return (
    <Link href={`/resources/packs/${pack.id}`}>
      <Card className={`group h-full border-0 hover:shadow-xl transition-all duration-300 overflow-hidden ${pack.color}`}>
        <CardContent className="p-6 flex flex-col h-full">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-4 group-hover:bg-white transition-colors">
            <Package className="w-6 h-6 text-foreground" />
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-foreground/80">
            {pack.name}
          </h3>

          {/* Description */}
          <p className="text-sm text-foreground/70 mb-4">
            {pack.description}
          </p>

          {/* Items preview */}
          <div className="flex-grow mb-4">
            <ul className="space-y-1">
              {pack.items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-xs text-foreground/60 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-foreground/40" />
                  {item}
                </li>
              ))}
              {pack.items.length > 3 && (
                <li className="text-xs text-foreground/50">
                  +{pack.items.length - 3} more items
                </li>
              )}
            </ul>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <Badge className="bg-white/60 text-foreground text-xs font-medium border-0">
              {pack.itemCount} resources
            </Badge>
            <span className="flex items-center text-sm font-semibold text-foreground group-hover:translate-x-1 transition-transform">
              Get Pack
              <ArrowRight className="ml-1 w-4 h-4" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
