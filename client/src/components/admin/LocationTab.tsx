/**
 * Location Tab Component
 * Global Location System for articles - country/region/city selection
 * Now with AI-powered suggestions
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { MapPin, Globe, X, Plus, Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

interface LocationTabProps {
  articleId: number;
  articleTitle?: string;
  articleContent?: string;
  articleExcerpt?: string;
}

// Common countries for tech news
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "JP", name: "Japan" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "SG", name: "Singapore" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "EG", name: "Egypt" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "ZA", name: "South Africa" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "ID", name: "Indonesia" },
  { code: "PK", name: "Pakistan" },
  { code: "BD", name: "Bangladesh" },
  { code: "TR", name: "Turkey" },
  { code: "IL", name: "Israel" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "PL", name: "Poland" },
  { code: "QA", name: "Qatar" },
  { code: "BH", name: "Bahrain" },
  { code: "KW", name: "Kuwait" },
  { code: "OM", name: "Oman" },
  { code: "JO", name: "Jordan" },
  { code: "LB", name: "Lebanon" },
  { code: "MA", name: "Morocco" },
];

// Regions by country
const REGIONS: Record<string, { code: string; name: string }[]> = {
  US: [
    { code: "CA", name: "California" },
    { code: "NY", name: "New York" },
    { code: "TX", name: "Texas" },
    { code: "FL", name: "Florida" },
    { code: "MA", name: "Massachusetts" },
    { code: "WA", name: "Washington" },
    { code: "IL", name: "Illinois" },
    { code: "CO", name: "Colorado" },
    { code: "GA", name: "Georgia" },
    { code: "NC", name: "North Carolina" },
  ],
  UK: [
    { code: "ENG", name: "England" },
    { code: "SCT", name: "Scotland" },
    { code: "WLS", name: "Wales" },
    { code: "NIR", name: "Northern Ireland" },
  ],
  IN: [
    { code: "MH", name: "Maharashtra" },
    { code: "KA", name: "Karnataka" },
    { code: "TN", name: "Tamil Nadu" },
    { code: "DL", name: "Delhi" },
    { code: "TG", name: "Telangana" },
    { code: "GJ", name: "Gujarat" },
    { code: "WB", name: "West Bengal" },
    { code: "UP", name: "Uttar Pradesh" },
  ],
  AE: [
    { code: "DXB", name: "Dubai" },
    { code: "AUH", name: "Abu Dhabi" },
    { code: "SHJ", name: "Sharjah" },
    { code: "AJM", name: "Ajman" },
  ],
  SA: [
    { code: "RUH", name: "Riyadh" },
    { code: "JED", name: "Jeddah" },
    { code: "DMM", name: "Dammam" },
    { code: "MKH", name: "Makkah" },
  ],
  EG: [
    { code: "CAI", name: "Cairo" },
    { code: "ALX", name: "Alexandria" },
    { code: "GIZ", name: "Giza" },
  ],
};

// Cities by region
const CITIES: Record<string, string[]> = {
  "US-CA": ["San Francisco", "Los Angeles", "San Diego", "San Jose", "Palo Alto", "Mountain View"],
  "US-NY": ["New York City", "Brooklyn", "Manhattan", "Buffalo"],
  "US-TX": ["Austin", "Houston", "Dallas", "San Antonio"],
  "US-MA": ["Boston", "Cambridge", "Worcester"],
  "US-WA": ["Seattle", "Bellevue", "Redmond"],
  "UK-ENG": ["London", "Manchester", "Birmingham", "Bristol", "Leeds"],
  "IN-MH": ["Mumbai", "Pune", "Nagpur"],
  "IN-KA": ["Bangalore", "Mysore"],
  "IN-TN": ["Chennai", "Coimbatore"],
  "IN-DL": ["New Delhi", "Gurgaon", "Noida"],
  "IN-TG": ["Hyderabad", "Secunderabad"],
  "AE-DXB": ["Dubai City", "Dubai Marina", "Downtown Dubai", "DIFC"],
  "AE-AUH": ["Abu Dhabi City", "Al Ain"],
  "SA-RUH": ["Riyadh City"],
  "SA-JED": ["Jeddah City"],
  "EG-CAI": ["Cairo City", "Heliopolis", "Maadi"],
};

interface LocationEntry {
  id?: number;
  country: string;
  region: string | null;
  city: string | null;
}

interface LocationSuggestion {
  country: string;
  countryName: string;
  region?: string;
  regionName?: string;
  city?: string;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export function LocationTab({ articleId, articleTitle, articleContent, articleExcerpt }: LocationTabProps) {
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [newLocation, setNewLocation] = useState<LocationEntry>({
    country: "",
    region: "",
    city: "",
  });
  const [aiSuggestions, setAiSuggestions] = useState<LocationSuggestion[]>([]);
  const [showAiSuggestions, setShowAiSuggestions] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();
  
  // Fetch existing locations
  const { data: existingLocations, isLoading } = trpc.admin.entityLinking.getArticleLocations.useQuery(
    { articleId },
    { enabled: articleId > 0 }
  );

  // Add location mutation
  const addLocationMutation = trpc.admin.entityLinking.addArticleLocation.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleLocations.invalidate({ articleId });
      setNewLocation({ country: "", region: "", city: "" });
      toast.success("Location added");
    },
    onError: (error: { message: string }) => {
      toast.error(`Failed to add location: ${error.message}`);
    },
  });

  // Remove location mutation
  const removeLocationMutation = trpc.admin.entityLinking.removeArticleLocation.useMutation({
    onSuccess: () => {
      utils.admin.entityLinking.getArticleLocations.invalidate({ articleId });
      toast.success("Location removed");
    },
  });

  // AI suggestion mutation
  const suggestLocationsMutation = trpc.admin.entityLinking.suggestLocations.useMutation({
    onSuccess: (data) => {
      setAiSuggestions(data.locations);
      setShowAiSuggestions(true);
      toast.success("AI location suggestions generated!");
    },
    onError: (error) => {
      toast.error(`Failed to generate suggestions: ${error.message}`);
    },
  });

  useEffect(() => {
    if (existingLocations) {
      setLocations(existingLocations);
    }
  }, [existingLocations]);

  const handleSuggestWithAi = () => {
    if (!articleTitle || !articleContent) {
      toast.error("Please add article title and content first");
      return;
    }
    setIsLoadingAi(true);
    suggestLocationsMutation.mutate({
      title: articleTitle,
      content: articleContent,
      excerpt: articleExcerpt,
    }, {
      onSettled: () => setIsLoadingAi(false),
    });
  };

  const handleAddLocation = () => {
    if (!newLocation.country) {
      toast.error("Please select a country");
      return;
    }
    addLocationMutation.mutate({
      articleId,
      country: newLocation.country,
      region: newLocation.region || undefined,
      city: newLocation.city || undefined,
    });
  };

  const handleAddFromSuggestion = (suggestion: LocationSuggestion) => {
    addLocationMutation.mutate({
      articleId,
      country: suggestion.country,
      region: suggestion.region || undefined,
      city: suggestion.city || undefined,
    });
  };

  const handleRemoveLocation = (locationId: number) => {
    removeLocationMutation.mutate({ id: locationId });
  };

  const availableRegions = newLocation.country ? REGIONS[newLocation.country] || [] : [];
  const availableCities = newLocation.country && newLocation.region 
    ? CITIES[`${newLocation.country}-${newLocation.region}`] || []
    : [];

  const filteredSuggestions = aiSuggestions.filter(s => 
    !dismissedSuggestions.has(`${s.country}-${s.region || ''}-${s.city || ''}`)
  );

  const confidenceColors = {
    high: "bg-green-100 text-green-800 border-green-200",
    medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
    low: "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Global Location System
              </CardTitle>
              <CardDescription>
                Tag this article with geographic locations for better discoverability
              </CardDescription>
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
                {filteredSuggestions.map((suggestion) => {
                  const key = `${suggestion.country}-${suggestion.region || ''}-${suggestion.city || ''}`;
                  return (
                    <div 
                      key={key}
                      className="flex items-center justify-between p-3 border rounded-md bg-gradient-to-r from-purple-50/50 to-blue-50/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">
                            {[suggestion.countryName, suggestion.regionName, suggestion.city]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                          <Badge variant="outline" className={confidenceColors[suggestion.confidence]}>
                            {suggestion.confidence}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{suggestion.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDismissedSuggestions(prev => new Set(Array.from(prev).concat(key)))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAddFromSuggestion(suggestion)}
                          disabled={addLocationMutation.isPending}
                        >
                          {addLocationMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Add
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add New Location */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Country</Label>
              <Select
                value={newLocation.country}
                onValueChange={(value) => setNewLocation({ country: value, region: "", city: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Region/State</Label>
              <Select
                value={newLocation.region || ""}
                onValueChange={(value) => setNewLocation((prev) => ({ ...prev, region: value, city: null }))}
                disabled={!newLocation.country || availableRegions.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {availableRegions.map((region) => (
                    <SelectItem key={region.code} value={region.code}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>City</Label>
              <Select
                value={newLocation.city || ""}
                onValueChange={(value) => setNewLocation((prev) => ({ ...prev, city: value }))}
                disabled={!newLocation.region || availableCities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleAddLocation}
                disabled={!newLocation.country || addLocationMutation.isPending}
              >
                {addLocationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Location
              </Button>
            </div>
          </div>

          {/* Current Locations */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tagged Locations</Label>
            {locations.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {locations.map((loc) => (
                  <Badge
                    key={loc.id}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    <MapPin className="h-3 w-3" />
                    {[
                      COUNTRIES.find((c) => c.code === loc.country)?.name || loc.country,
                      loc.region && (REGIONS[loc.country]?.find((r) => r.code === loc.region)?.name || loc.region),
                      loc.city,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    <button
                      onClick={() => loc.id && handleRemoveLocation(loc.id)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No locations tagged yet. Add locations to improve discoverability.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
