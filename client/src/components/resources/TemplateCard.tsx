import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Table2, FileSpreadsheet, Presentation } from "lucide-react";
import { Template } from "@/data/resourcesData";

interface TemplateCardProps {
  template: Template;
}

const formatIcons: Record<string, React.ElementType> = {
  doc: FileText,
  pdf: FileText,
  sheet: FileSpreadsheet,
  ppt: Presentation,
};

const formatColors: Record<string, string> = {
  doc: "bg-blue-100 text-blue-700",
  pdf: "bg-red-100 text-red-700",
  sheet: "bg-green-100 text-green-700",
  ppt: "bg-orange-100 text-orange-700",
};

export function TemplateCard({ template }: TemplateCardProps) {
  const FormatIcon = formatIcons[template.format] || FileText;
  const formatColor = formatColors[template.format] || "bg-muted text-muted-foreground";

  return (
    <Card className="group h-full border border-border hover:border-foreground/20 hover:shadow-lg transition-all duration-200">
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${formatColor}`}>
            <FormatIcon className="w-5 h-5" />
          </div>
          <div className="flex gap-1.5">
            <Badge variant="secondary" className="text-xs uppercase">
              {template.format}
            </Badge>
            {!template.free && (
              <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                Premium
              </Badge>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/80">
          {template.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 flex-grow line-clamp-2">
          {template.description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />
            {template.downloads.toLocaleString()} downloads
          </span>
          <span>{template.country}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge variant="outline" className="text-xs">
            {template.type}
          </Badge>
        </div>

        {/* CTA */}
        <Button variant="outline" size="sm" className="w-full gap-2">
          <Download className="w-4 h-4" />
          {template.free ? "Download Free" : "Get Template"}
        </Button>
      </CardContent>
    </Card>
  );
}
