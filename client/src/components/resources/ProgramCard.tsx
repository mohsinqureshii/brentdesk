import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, DollarSign } from "lucide-react";
import { Program } from "@/data/resourcesData";
import { format, parseISO, differenceInDays } from "date-fns";

interface ProgramCardProps {
  program: Program;
}

export function ProgramCard({ program }: ProgramCardProps) {
  const getStatusColor = () => {
    switch (program.status) {
      case "open":
        return "bg-green-100 text-green-800 border-green-200";
      case "closed":
        return "bg-red-100 text-red-800 border-red-200";
      case "coming":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const daysUntilDeadline = program.deadline !== "Rolling" 
    ? differenceInDays(parseISO(program.deadline), new Date())
    : null;

  const isUrgent = daysUntilDeadline !== null && daysUntilDeadline <= 14 && daysUntilDeadline >= 0;

  return (
    <Card className={`group h-full border transition-all duration-200 hover:shadow-lg ${isUrgent ? 'border-amber-300 bg-amber-50/30' : 'border-border hover:border-foreground/20'}`}>
      <CardContent className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <Badge className={`text-xs font-medium capitalize ${getStatusColor()}`}>
            {program.status === "coming" ? "Coming Soon" : program.status}
          </Badge>
          {program.equityFree && (
            <Badge variant="outline" className="text-xs text-green-700 border-green-300">
              Equity-Free
            </Badge>
          )}
        </div>

        {/* Organization */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {program.organization}
        </p>

        {/* Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-foreground/80">
          {program.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 flex-grow line-clamp-2">
          {program.description}
        </p>

        {/* Meta */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{program.country}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-foreground">{program.ticketSize}</span>
          </div>
          <div className={`flex items-center gap-2 text-sm ${isUrgent ? 'text-amber-700 font-medium' : 'text-muted-foreground'}`}>
            <Calendar className="w-4 h-4" />
            <span>
              {program.deadline === "Rolling" 
                ? "Rolling Applications" 
                : `Deadline: ${format(parseISO(program.deadline), "MMM d, yyyy")}`}
              {isUrgent && ` (${daysUntilDeadline} days left)`}
            </span>
          </div>
        </div>

        {/* Sectors */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {program.sector.slice(0, 3).map((s) => (
            <Badge key={s} variant="outline" className="text-xs">
              {s}
            </Badge>
          ))}
        </div>

        {/* CTA */}
        <Link href={`/resources/programs/${program.id}`}>
          <Button 
            variant={program.status === "open" ? "default" : "outline"} 
            size="sm" 
            className="w-full"
            disabled={program.status === "closed"}
          >
            {program.status === "open" ? "Apply Now" : program.status === "coming" ? "Get Notified" : "Closed"}
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
