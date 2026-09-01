import { Link } from "wouter";
import { MapPin, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PersonCardProps {
  id: string;
  name: string;
  title: string;
  company?: string;
  location: string;
  tags: string[];
  avatarUrl?: string;
}

export function PersonCard({ 
  id, 
  name, 
  title,
  company,
  location, 
  tags,
  avatarUrl 
}: PersonCardProps) {
  return (
    <div className="group rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="h-14 w-14 rounded-full bg-accent-coral/20 flex items-center justify-center shrink-0 overflow-hidden">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-foreground/70">{name.charAt(0)}</span>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-body font-semibold text-foreground group-hover:text-foreground/80 transition-colors truncate">
            {name}
          </h3>
          <p className="text-caption text-muted-foreground mt-0.5">
            {title}{company && ` at ${company}`}
          </p>
          
          {/* Location */}
          <div className="flex items-center gap-1.5 mt-2 text-caption text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {location}
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full text-caption font-medium">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <Link href={`/people/${id}`}>
            <Button variant="outline" size="sm">View profile</Button>
          </Link>
          <Button variant="ghost" size="sm">Follow</Button>
        </div>
        
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Linkedin className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
