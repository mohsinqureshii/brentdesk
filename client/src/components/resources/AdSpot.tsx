import { Card, CardContent } from "@/components/ui/card";

interface AdSpotProps {
  variant?: "sidebar" | "banner";
  label?: string;
}

export function AdSpot({ variant = "sidebar", label = "Advertisement" }: AdSpotProps) {
  if (variant === "banner") {
    return (
      <div className="w-full bg-muted/50 border border-border rounded-xl overflow-hidden">
        <div className="h-24 md:h-32 flex flex-col items-center justify-center text-muted-foreground">
          <span className="text-xs uppercase tracking-wider mb-1">{label}</span>
          <div className="w-full max-w-[728px] h-[90px] bg-muted rounded flex items-center justify-center">
            <span className="text-sm">728×90 Leaderboard</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="border border-border overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-muted/30 px-3 py-1.5 border-b border-border">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="h-[250px] flex items-center justify-center text-muted-foreground bg-muted/20">
          <div className="text-center">
            <div className="w-[300px] h-[250px] border border-dashed border-muted-foreground/30 rounded flex items-center justify-center">
              <span className="text-sm">300×250</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
