import { useState } from "react";
import { Bookmark, FileEdit, Send, MessageSquare, Eye, MoreHorizontal, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Job {
  id: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  salary?: string;
  matchScore?: number;
}

const mockJobs: Record<string, Job[]> = {
  saved: [
    { id: "1", title: "Senior Product Manager", company: "Careem", location: "Dubai, UAE", salary: "$120k-$150k", matchScore: 92 },
    { id: "2", title: "Growth Lead", company: "Tabby", location: "Riyadh, KSA", salary: "$100k-$130k", matchScore: 88 },
  ],
  started: [
    { id: "3", title: "Engineering Manager", company: "Kitopi", location: "Dubai, UAE", matchScore: 85 },
  ],
  applied: [
    { id: "4", title: "VP of Product", company: "Tamara", location: "Riyadh, KSA", salary: "$180k-$220k", matchScore: 94 },
  ],
  interviewing: [],
  seen: [
    { id: "5", title: "Head of Design", company: "Salla", location: "Riyadh, KSA", matchScore: 78 },
  ],
};

const pipelineTabs = [
  { value: "saved", label: "Saved", icon: Bookmark },
  { value: "started", label: "Application started", icon: FileEdit },
  { value: "applied", label: "Applied", icon: Send },
  { value: "interviewing", label: "Interviewing", icon: MessageSquare },
  { value: "seen", label: "Seen", icon: Eye },
];

function JobCard({ job }: { job: Job }) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-soft transition-shadow">
      {/* Company Logo */}
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <span className="text-lg font-bold text-muted-foreground">
          {job.company.charAt(0)}
        </span>
      </div>
      
      {/* Job Info */}
      <div className="flex-1 min-w-0">
        <h4 className="text-body font-semibold text-foreground truncate">{job.title}</h4>
        <p className="text-caption text-muted-foreground">{job.company} · {job.location}</p>
        {job.salary && (
          <p className="text-caption text-muted-foreground mt-0.5">{job.salary}</p>
        )}
      </div>
      
      {/* Match Score */}
      {job.matchScore && (
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-accent-mint/30 flex items-center justify-center">
            <span className="text-caption font-semibold text-foreground">{job.matchScore}%</span>
          </div>
        </div>
      )}
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:flex gap-1.5">
          <ExternalLink className="h-3.5 w-3.5" />
          View
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function JobPipeline() {
  const [activeTab, setActiveTab] = useState("saved");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-h3 text-foreground">Your job pipeline</h2>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start h-auto p-1 bg-muted/50 rounded-xl gap-1 flex-wrap">
          {pipelineTabs.map((tab) => {
            const Icon = tab.icon;
            const count = mockJobs[tab.value]?.length || 0;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 data-[state=active]:bg-card data-[state=active]:shadow-soft rounded-lg px-4 py-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span className="h-5 min-w-5 px-1.5 rounded-full bg-foreground/10 text-caption font-medium">
                    {count}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {pipelineTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-4">
            <div className="space-y-3">
              {mockJobs[tab.value]?.length > 0 ? (
                mockJobs[tab.value].map((job) => (
                  <JobCard key={job.id} job={job} />
                ))
              ) : (
                <div className="text-center py-12 rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground">No jobs in this stage yet</p>
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
