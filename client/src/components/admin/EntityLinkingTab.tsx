/**
 * Entity Linking Tab Component
 * Allows linking People, Companies, Investors, Accelerators, Events to articles
 * Now with AI-powered suggestions
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  User, Building2, Briefcase, Rocket, Calendar, 
  Search, Plus, X, Loader2, Sparkles, Check, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { QuickCompanyDialog, QuickPersonDialog, QuickInvestorDialog } from "./QuickEntityDialog";

interface EntityLinkingTabProps {
  articleId: number;
  articleTitle?: string;
  articleContent?: string;
  articleExcerpt?: string;
}

const MENTION_TYPES = [
  { value: "primary", label: "Primary Subject", color: "bg-green-500" },
  { value: "mentioned", label: "Mentioned", color: "bg-blue-500" },
  { value: "interview", label: "Interview/Quote", color: "bg-purple-500" },
  { value: "investor_in_round", label: "Investor in Round", color: "bg-yellow-500" },
  { value: "partner", label: "Partnership", color: "bg-orange-500" },
  { value: "speaker", label: "Speaker", color: "bg-pink-500" },
  { value: "sponsor", label: "Sponsor", color: "bg-indigo-500" },
];

interface EntitySuggestion {
  name: string;
  mentionType: string;
  confidence: "high" | "medium" | "low";
  reason: string;
  existingId?: number;
}

interface AiSuggestions {
  companies: EntitySuggestion[];
  people: EntitySuggestion[];
  investors: EntitySuggestion[];
  accelerators: EntitySuggestion[];
  events: EntitySuggestion[];
}

export function EntityLinkingTab({ articleId, articleTitle, articleContent, articleExcerpt }: EntityLinkingTabProps) {
  const [activeTab, setActiveTab] = useState("companies");
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestions | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  
  const suggestEntitiesMutation = trpc.admin.entityLinking.suggestEntities.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data);
      setShowAiSuggestions(true);
      toast.success("AI suggestions generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate suggestions: ${error.message}`);
    },
  });
  
  const handleSuggestWithAi = () => {
    if (!articleTitle || !articleContent) {
      toast.error("Please add article title and content first");
      return;
    }
    setIsLoadingAi(true);
    suggestEntitiesMutation.mutate({
      title: articleTitle,
      content: articleContent,
      excerpt: articleExcerpt,
    }, {
      onSettled: () => setIsLoadingAi(false),
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Entity Linking</h3>
          <p className="text-sm text-muted-foreground">
            Link companies, people, investors, accelerators, and events mentioned in this article
          </p>
        </div>
        <Button 
          onClick={handleSuggestWithAi}
          disabled={isLoadingAi || !articleTitle || !articleContent}
          variant="outline"
          className="gap-2"
        >
          {isLoadingAi ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Suggest with AI
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="companies" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Companies</span>
          </TabsTrigger>
          <TabsTrigger value="people" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">People</span>
          </TabsTrigger>
          <TabsTrigger value="investors" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Investors</span>
          </TabsTrigger>
          <TabsTrigger value="accelerators" className="flex items-center gap-2">
            <Rocket className="h-4 w-4" />
            <span className="hidden sm:inline">Accelerators</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Events</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies" className="mt-4">
          <CompaniesSection 
            articleId={articleId} 
            aiSuggestions={aiSuggestions?.companies}
            showAiSuggestions={showAiSuggestions}
          />
        </TabsContent>
        <TabsContent value="people" className="mt-4">
          <PeopleSection 
            articleId={articleId}
            aiSuggestions={aiSuggestions?.people}
            showAiSuggestions={showAiSuggestions}
          />
        </TabsContent>
        <TabsContent value="investors" className="mt-4">
          <InvestorsSection 
            articleId={articleId}
            aiSuggestions={aiSuggestions?.investors}
            showAiSuggestions={showAiSuggestions}
          />
        </TabsContent>
        <TabsContent value="accelerators" className="mt-4">
          <AcceleratorsSection 
            articleId={articleId}
            aiSuggestions={aiSuggestions?.accelerators}
            showAiSuggestions={showAiSuggestions}
          />
        </TabsContent>
        <TabsContent value="events" className="mt-4">
          <EventsSection 
            articleId={articleId}
            aiSuggestions={aiSuggestions?.events}
            showAiSuggestions={showAiSuggestions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// AI SUGGESTION CARD COMPONENT
// ============================================================

function AiSuggestionCard({ 
  suggestion, 
  onLink, 
  onDismiss,
  isLinking 
}: { 
  suggestion: EntitySuggestion; 
  onLink: () => void;
  onDismiss: () => void;
  isLinking: boolean;
}) {
  const confidenceColors = {
    high: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]",
  };
  
  const isExisting = !!suggestion.existingId;
  
  return (
    <div className={`flex items-center justify-between p-3 border rounded-md ${isExisting ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/50 border-green-200' : 'bg-gradient-to-r from-purple-50/50 to-blue-50/50'}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="font-medium">{suggestion.name}</span>
          <Badge variant="outline" className={confidenceColors[suggestion.confidence]}>
            {suggestion.confidence}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {MENTION_TYPES.find(t => t.value === suggestion.mentionType)?.label || suggestion.mentionType}
          </Badge>
          {isExisting ? (
            <Badge variant="outline" className="text-xs bg-green-100 text-green-800 border-green-300">
              <Check className="h-3 w-3 mr-1" />
              In Database
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
              <AlertCircle className="h-3 w-3 mr-1" />
              New Entity
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={onLink}
          disabled={isLinking}
          variant={isExisting ? "default" : "outline"}
          className={isExisting ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isLinking ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isExisting ? (
            <>
              <Check className="h-4 w-4 mr-1" />
              Link
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" />
              Create & Link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// COMPANIES SECTION
// ============================================================

function CompaniesSection({ 
  articleId, 
  aiSuggestions,
  showAiSuggestions 
}: { 
  articleId: number;
  aiSuggestions?: EntitySuggestion[];
  showAiSuggestions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentionType, setSelectedMentionType] = useState<string>("mentioned");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: linkedCompanies, isLoading } = trpc.admin.entityLinking.getArticleCompanies.useQuery({ articleId });
  const { data: searchResults } = trpc.admin.entityLinking.searchCompanies.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const linkMutation = trpc.admin.entityLinking.linkCompany.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleCompanies.invalidate({ articleId });
      setSearchQuery("");
      toast.success("Company linked successfully");
    },
  });
  
  const unlinkMutation = trpc.admin.entityLinking.unlinkCompany.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleCompanies.invalidate({ articleId });
      toast.success("Company unlinked");
    },
  });

  const handleLink = (companyId: number, mentionType?: string) => {
    linkMutation.mutate({ articleId, companyId, mentionType: (mentionType || selectedMentionType) as any });
  };
  
  const handleLinkFromSuggestion = async (suggestion: EntitySuggestion) => {
    if (suggestion.existingId) {
      linkMutation.mutate({ 
        articleId, 
        companyId: suggestion.existingId, 
        mentionType: suggestion.mentionType as any 
      });
    } else {
      // Need to create the company first
      setQuickCreateName(suggestion.name);
      setShowQuickCreate(true);
    }
  };
  
  const filteredSuggestions = aiSuggestions?.filter(s => !dismissedSuggestions.has(s.name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Linked Companies
        </CardTitle>
        <CardDescription>
          Companies mentioned or featured in this article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {showAiSuggestions && filteredSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Suggestions
            </Label>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.name}
                  suggestion={suggestion}
                  onLink={() => handleLinkFromSuggestion(suggestion)}
                  onDismiss={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.name)))}
                  isLinking={linkMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMentionType} onValueChange={setSelectedMentionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mention type" />
            </SelectTrigger>
            <SelectContent>
              {MENTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-md divide-y">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((company) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {company.logo ? (
                      <img src={company.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{company.name}</p>
                      {company.industry && (
                        <p className="text-sm text-muted-foreground">{company.industry}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(company.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No companies found for "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickCreateName(searchQuery);
                    setShowQuickCreate(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create "{searchQuery}" as new company
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Linked Companies */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedCompanies && linkedCompanies.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="border rounded-md divide-y">
              {linkedCompanies.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    {link.company?.logo ? (
                      <img src={link.company.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{link.company?.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {MENTION_TYPES.find(t => t.value === link.mentionType)?.label || link.mentionType}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ id: link.id })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No companies linked yet
          </p>
        )}
      </CardContent>
      
      {/* Quick Create Dialog */}
      <QuickCompanyDialog
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        initialName={quickCreateName}
        onSuccess={(company) => {
          handleLink(company.id);
          setShowQuickCreate(false);
        }}
      />
    </Card>
  );
}

// ============================================================
// PEOPLE SECTION
// ============================================================

function PeopleSection({ 
  articleId,
  aiSuggestions,
  showAiSuggestions 
}: { 
  articleId: number;
  aiSuggestions?: EntitySuggestion[];
  showAiSuggestions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentionType, setSelectedMentionType] = useState<string>("mentioned");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: linkedPeople, isLoading } = trpc.admin.entityLinking.getArticlePeople.useQuery({ articleId });
  const { data: searchResults } = trpc.admin.entityLinking.searchPeople.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const linkMutation = trpc.admin.entityLinking.linkPerson.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticlePeople.invalidate({ articleId });
      setSearchQuery("");
      toast.success("Person linked successfully");
    },
  });
  
  const unlinkMutation = trpc.admin.entityLinking.unlinkPerson.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticlePeople.invalidate({ articleId });
      toast.success("Person unlinked");
    },
  });

  const handleLink = (personId: number, mentionType?: string) => {
    linkMutation.mutate({ articleId, personId, mentionType: (mentionType || selectedMentionType) as any });
  };
  
  const handleLinkFromSuggestion = async (suggestion: EntitySuggestion) => {
    if (suggestion.existingId) {
      linkMutation.mutate({ 
        articleId, 
        personId: suggestion.existingId, 
        mentionType: suggestion.mentionType as any 
      });
    } else {
      setQuickCreateName(suggestion.name);
      setShowQuickCreate(true);
    }
  };
  
  const filteredSuggestions = aiSuggestions?.filter(s => !dismissedSuggestions.has(s.name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Linked People
        </CardTitle>
        <CardDescription>
          People mentioned or featured in this article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {showAiSuggestions && filteredSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Suggestions
            </Label>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.name}
                  suggestion={suggestion}
                  onLink={() => handleLinkFromSuggestion(suggestion)}
                  onDismiss={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.name)))}
                  isLinking={linkMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMentionType} onValueChange={setSelectedMentionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mention type" />
            </SelectTrigger>
            <SelectContent>
              {MENTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-md divide-y">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((person) => (
                <div
                  key={person.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {person.avatar ? (
                      <img src={person.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{person.name}</p>
                      {person.title && (
                        <p className="text-sm text-muted-foreground">{person.title}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(person.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No people found for "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickCreateName(searchQuery);
                    setShowQuickCreate(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create "{searchQuery}" as new person
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Linked People */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedPeople && linkedPeople.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="border rounded-md divide-y">
              {linkedPeople.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    {link.person?.avatar ? (
                      <img src={link.person.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{link.person?.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {MENTION_TYPES.find(t => t.value === link.mentionType)?.label || link.mentionType}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ id: link.id })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No people linked yet
          </p>
        )}
      </CardContent>
      
      {/* Quick Create Dialog */}
      <QuickPersonDialog
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        initialName={quickCreateName}
        onSuccess={(person) => {
          handleLink(person.id);
          setShowQuickCreate(false);
        }}
      />
    </Card>
  );
}

// ============================================================
// INVESTORS SECTION
// ============================================================

function InvestorsSection({ 
  articleId,
  aiSuggestions,
  showAiSuggestions 
}: { 
  articleId: number;
  aiSuggestions?: EntitySuggestion[];
  showAiSuggestions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentionType, setSelectedMentionType] = useState<string>("mentioned");
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState("");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: linkedInvestors, isLoading } = trpc.admin.entityLinking.getArticleInvestors.useQuery({ articleId });
  const { data: searchResults } = trpc.admin.entityLinking.searchInvestors.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const linkMutation = trpc.admin.entityLinking.linkInvestor.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleInvestors.invalidate({ articleId });
      setSearchQuery("");
      toast.success("Investor linked successfully");
    },
  });
  
  const unlinkMutation = trpc.admin.entityLinking.unlinkInvestor.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleInvestors.invalidate({ articleId });
      toast.success("Investor unlinked");
    },
  });

  const handleLink = (investorId: number, mentionType?: string) => {
    linkMutation.mutate({ articleId, investorId, mentionType: (mentionType || selectedMentionType) as any });
  };
  
  const handleLinkFromSuggestion = async (suggestion: EntitySuggestion) => {
    if (suggestion.existingId) {
      linkMutation.mutate({ 
        articleId, 
        investorId: suggestion.existingId, 
        mentionType: suggestion.mentionType as any 
      });
    } else {
      setQuickCreateName(suggestion.name);
      setShowQuickCreate(true);
    }
  };
  
  const filteredSuggestions = aiSuggestions?.filter(s => !dismissedSuggestions.has(s.name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Linked Investors
        </CardTitle>
        <CardDescription>
          Investors mentioned or featured in this article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {showAiSuggestions && filteredSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Suggestions
            </Label>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.name}
                  suggestion={suggestion}
                  onLink={() => handleLinkFromSuggestion(suggestion)}
                  onDismiss={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.name)))}
                  isLinking={linkMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search investors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMentionType} onValueChange={setSelectedMentionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mention type" />
            </SelectTrigger>
            <SelectContent>
              {MENTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-md divide-y">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((investor) => (
                <div
                  key={investor.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {investor.logo ? (
                      <img src={investor.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{investor.name}</p>
                      {investor.type && (
                        <p className="text-sm text-muted-foreground">{investor.type}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(investor.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No investors found for "{searchQuery}"
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuickCreateName(searchQuery);
                    setShowQuickCreate(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create "{searchQuery}" as new investor
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Linked Investors */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedInvestors && linkedInvestors.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="border rounded-md divide-y">
              {linkedInvestors.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    {link.investor?.logo ? (
                      <img src={link.investor.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{link.investor?.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {MENTION_TYPES.find(t => t.value === link.mentionType)?.label || link.mentionType}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ id: link.id })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No investors linked yet
          </p>
        )}
      </CardContent>
      
      {/* Quick Create Dialog */}
      <QuickInvestorDialog
        open={showQuickCreate}
        onOpenChange={setShowQuickCreate}
        initialName={quickCreateName}
        onSuccess={(investor: { id: number; name: string }) => {
          handleLink(investor.id);
          setShowQuickCreate(false);
        }}
      />
    </Card>
  );
}

// ============================================================
// ACCELERATORS SECTION
// ============================================================

function AcceleratorsSection({ 
  articleId,
  aiSuggestions,
  showAiSuggestions 
}: { 
  articleId: number;
  aiSuggestions?: EntitySuggestion[];
  showAiSuggestions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentionType, setSelectedMentionType] = useState<string>("mentioned");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: linkedAccelerators, isLoading } = trpc.admin.entityLinking.getArticleAccelerators.useQuery({ articleId });
  const { data: searchResults } = trpc.admin.entityLinking.searchAccelerators.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const linkMutation = trpc.admin.entityLinking.linkAccelerator.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleAccelerators.invalidate({ articleId });
      setSearchQuery("");
      toast.success("Accelerator linked successfully");
    },
  });
  
  const unlinkMutation = trpc.admin.entityLinking.unlinkAccelerator.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleAccelerators.invalidate({ articleId });
      toast.success("Accelerator unlinked");
    },
  });

  const handleLink = (acceleratorId: number, mentionType?: string) => {
    linkMutation.mutate({ articleId, acceleratorId, mentionType: (mentionType || selectedMentionType) as any });
  };
  
  const handleLinkFromSuggestion = async (suggestion: EntitySuggestion) => {
    if (suggestion.existingId) {
      linkMutation.mutate({ 
        articleId, 
        acceleratorId: suggestion.existingId, 
        mentionType: suggestion.mentionType as any 
      });
    } else {
      toast.info(`"${suggestion.name}" not in database. Please create it first.`);
    }
  };
  
  const filteredSuggestions = aiSuggestions?.filter(s => !dismissedSuggestions.has(s.name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5" />
          Linked Accelerators
        </CardTitle>
        <CardDescription>
          Accelerators mentioned or featured in this article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {showAiSuggestions && filteredSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Suggestions
            </Label>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.name}
                  suggestion={suggestion}
                  onLink={() => handleLinkFromSuggestion(suggestion)}
                  onDismiss={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.name)))}
                  isLinking={linkMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search accelerators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMentionType} onValueChange={setSelectedMentionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mention type" />
            </SelectTrigger>
            <SelectContent>
              {MENTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-md divide-y">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((accelerator) => (
                <div
                  key={accelerator.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    {accelerator.logo ? (
                      <img src={accelerator.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Rocket className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{accelerator.name}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(accelerator.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No accelerators found for "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground">
                  To add a new accelerator, go to Directory → Accelerators
                </p>
              </div>
            )}
          </div>
        )}

        {/* Linked Accelerators */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedAccelerators && linkedAccelerators.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="border rounded-md divide-y">
              {linkedAccelerators.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    {link.accelerator?.logo ? (
                      <img src={link.accelerator.logo} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                        <Rocket className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{link.accelerator?.name}</p>
                      <Badge variant="secondary" className="text-xs">
                        {MENTION_TYPES.find(t => t.value === link.mentionType)?.label || link.mentionType}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ id: link.id })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No accelerators linked yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================
// EVENTS SECTION
// ============================================================

function EventsSection({ 
  articleId,
  aiSuggestions,
  showAiSuggestions 
}: { 
  articleId: number;
  aiSuggestions?: EntitySuggestion[];
  showAiSuggestions?: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentionType, setSelectedMentionType] = useState<string>("mentioned");
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  
  const utils = trpc.useUtils();
  const { data: linkedEvents, isLoading } = trpc.admin.entityLinking.getArticleEvents.useQuery({ articleId });
  const { data: searchResults } = trpc.admin.entityLinking.searchEvents.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  
  const linkMutation = trpc.admin.entityLinking.linkEvent.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleEvents.invalidate({ articleId });
      setSearchQuery("");
      toast.success("Event linked successfully");
    },
  });
  
  const unlinkMutation = trpc.admin.entityLinking.unlinkEvent.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleEvents.invalidate({ articleId });
      toast.success("Event unlinked");
    },
  });

  const handleLink = (eventId: number, mentionType?: string) => {
    linkMutation.mutate({ articleId, eventId, mentionType: (mentionType || selectedMentionType) as any });
  };
  
  const handleLinkFromSuggestion = async (suggestion: EntitySuggestion) => {
    if (suggestion.existingId) {
      linkMutation.mutate({ 
        articleId, 
        eventId: suggestion.existingId, 
        mentionType: suggestion.mentionType as any 
      });
    } else {
      toast.info(`"${suggestion.name}" not in database. Please create it first.`);
    }
  };
  
  const filteredSuggestions = aiSuggestions?.filter(s => !dismissedSuggestions.has(s.name)) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Linked Events
        </CardTitle>
        <CardDescription>
          Events mentioned or featured in this article
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Suggestions */}
        {showAiSuggestions && filteredSuggestions.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              AI Suggestions
            </Label>
            <div className="space-y-2">
              {filteredSuggestions.map((suggestion) => (
                <AiSuggestionCard
                  key={suggestion.name}
                  suggestion={suggestion}
                  onLink={() => handleLinkFromSuggestion(suggestion)}
                  onDismiss={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(suggestion.name)))}
                  isLinking={linkMutation.isPending}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedMentionType} onValueChange={setSelectedMentionType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Mention type" />
            </SelectTrigger>
            <SelectContent>
              {MENTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery.length >= 2 && (
          <div className="border rounded-md divide-y">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{event.title}</p>
                      {event.type && (
                        <p className="text-sm text-muted-foreground">{event.type}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(event.id)}
                    disabled={linkMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Link
                  </Button>
                </div>
              ))
            ) : (
              <div className="p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No events found for "{searchQuery}"
                </p>
                <p className="text-xs text-muted-foreground">
                  To add a new event, go to Directory → Events
                </p>
              </div>
            )}
          </div>
        )}

        {/* Linked Events */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : linkedEvents && linkedEvents.length > 0 ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Currently Linked</Label>
            <div className="border rounded-md divide-y">
              {linkedEvents.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{link.event?.title}</p>
                      <Badge variant="secondary" className="text-xs">
                        {MENTION_TYPES.find(t => t.value === link.mentionType)?.label || link.mentionType}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => unlinkMutation.mutate({ id: link.id })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events linked yet
          </p>
        )}
      </CardContent>
    </Card>
  );
}
