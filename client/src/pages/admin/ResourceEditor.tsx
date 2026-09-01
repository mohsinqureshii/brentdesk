/**
 * Resource Editor Admin Page
 * Comprehensive tabbed form for creating/editing resources
 * SAP Fiori-inspired layout with enterprise-style sections
 */
import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Save, Upload, X, Globe, FileText, Package,
  DollarSign, Shield, Tag, Settings, Link2, ExternalLink, Search,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import RichTextEditor from "@/components/admin/RichTextEditor";
import { EntitySeoTab } from "@/components/admin/EntitySeoTab";

const RESOURCE_TYPES = [
  { value: "template", label: "Template" },
  { value: "toolkit", label: "Toolkit" },
  { value: "perk", label: "Perk / Discount" },
  { value: "regulation", label: "Regulation" },
  { value: "tool", label: "Tool" },
  { value: "playbook", label: "Playbook" },
  { value: "program", label: "Program" },
  { value: "grant", label: "Grant" },
  { value: "other", label: "Other" },
];

const TABS = [
  { id: "basics", label: "Basics", icon: FileText },
  { id: "content", label: "Content", icon: FileText },
  { id: "provider", label: "Provider", icon: Globe },
  { id: "pricing", label: "Pricing & Access", icon: DollarSign },
  { id: "taxonomy", label: "Taxonomy", icon: Tag },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "seo", label: "SEO", icon: Search },
];

export default function ResourceEditor() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const isNew = !id || id === "new";
  const [activeTab, setActiveTab] = useState("basics");
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    slug: "",
    shortDescription: "",
    description: "",
    type: "template" as string,
    content: "",
    featuredImage: "",
    downloadUrl: "",
    externalUrl: "",
    provider: "",
    providerLogo: "",
    providerWebsite: "",
    isFree: true,
    price: "",
    priceCurrency: "USD",
    discount: "",
    promoCode: "",
    eligibility: "",
    expiresAt: "",
    isFeatured: false,
    isGated: false,
    affiliateUrl: "",
    affiliateCommission: "",
    categoryIds: [] as number[],
    regionIds: [] as number[],
    sectorIds: [] as number[],
  });

  // Fetch existing resource
  const { data: resource, isLoading } = trpc.resources.adminGet.useQuery(
    { id: parseInt(id || "0") },
    { enabled: !isNew && !!id }
  );

  // Fetch taxonomy
  const { data: taxonomyData } = (trpc.admin as any).taxonomy?.useQuery?.();

  // Mutations
  const createMutation = trpc.resources.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("Resource created successfully");
      navigate(`/admin/resources/${data.id}`);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMutation = trpc.resources.update.useMutation({
    onSuccess: () => toast.success("Resource updated successfully"),
    onError: (err: any) => toast.error(err.message),
  });

  const transitionMutation = trpc.resources.transition.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      window.location.reload();
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Load existing data
  useEffect(() => {
    if (resource) {
      setForm({
        title: resource.title || "",
        slug: resource.slug || "",
        shortDescription: resource.shortDescription || "",
        description: resource.description || "",
        type: resource.type || "template",
        content: resource.content || "",
        featuredImage: resource.featuredImage || "",
        downloadUrl: resource.downloadUrl || "",
        externalUrl: resource.externalUrl || "",
        provider: resource.provider || "",
        providerLogo: resource.providerLogo || "",
        providerWebsite: resource.providerWebsite || "",
        isFree: !resource.value || resource.value === "0",
        price: resource.value || "",
        priceCurrency: "USD",
        discount: "",
        promoCode: "",
        eligibility: resource.eligibility || "",
        expiresAt: resource.expiresAt ? resource.expiresAt.split("T")[0] : "",
        isFeatured: resource.isFeatured === 1,
        isGated: resource.isGated === 1,
        affiliateUrl: resource.affiliateUrl || "",
        affiliateCommission: resource.affiliateCommission || "",
        categoryIds: resource.categoryIds || [],
        regionIds: resource.regionIds || [],
        sectorIds: resource.sectorIds || [],
      });
    }
  }, [resource]);

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        slug: form.slug || undefined,
        description: form.description || undefined,
        shortDescription: form.shortDescription || undefined,
        type: form.type as any,
        featuredImage: form.featuredImage || undefined,
        downloadUrl: form.downloadUrl || undefined,
        externalUrl: form.externalUrl || undefined,
        provider: form.provider || undefined,
        providerLogo: form.providerLogo || undefined,
        providerWebsite: form.providerWebsite || undefined,
        isFree: form.isFree,
        price: form.price || undefined,
        priceCurrency: form.priceCurrency || undefined,
        discount: form.discount || undefined,
        promoCode: form.promoCode || undefined,
        eligibility: form.eligibility || undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt) : undefined,
        categoryIds: form.categoryIds.length > 0 ? form.categoryIds : undefined,
        regionIds: form.regionIds.length > 0 ? form.regionIds : undefined,
        sectorIds: form.sectorIds.length > 0 ? form.sectorIds : undefined,
      };

      if (isNew) {
        await createMutation.mutateAsync(payload);
      } else {
        await updateMutation.mutateAsync({ ...payload, id: parseInt(id!) });
      }
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleTaxonomy = (field: "categoryIds" | "regionIds" | "sectorIds", id: number) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((v: number) => v !== id)
        : [...prev[field], id],
    }));
  };

  if (!isNew && isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]" />
        </div>
      </AdminLayout>
    );
  }

  const typeInfo = RESOURCE_TYPES.find((t) => t.value === form.type);

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/resources">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">
              {isNew ? "New Resource" : form.title || "Edit Resource"}
            </h1>
            <p className="text-sm text-[#697386]">
              {isNew ? "Create a new resource" : `Editing resource #${id}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Workflow transitions */}
          {!isNew && resource?.availableTransitions?.map((t: any) => (
            <Button
              key={t.id}
              variant="outline"
              size="sm"
              onClick={() => transitionMutation.mutate({ resourceId: parseInt(id!), transitionId: t.id })}
            >
              {t.name}
            </Button>
          ))}
          <Button onClick={handleSave} disabled={saving} className="bg-[#0066FF] hover:bg-[#0052CC]">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${
                        activeTab === tab.id
                          ? "bg-[#F0F7FF] text-[#0066FF] font-medium"
                          : "text-[#697386] hover:bg-[#F7F8FA]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* Status info */}
          {!isNew && resource && (
            <Card className="mt-4">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-xs text-[#697386]">Status</p>
                  <Badge variant="outline">{resource.statusId === 1 ? "Draft" : "Published"}</Badge>
                </div>
                <div>
                  <p className="text-xs text-[#697386]">Views</p>
                  <p className="text-sm font-medium">{resource.viewCount || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-[#697386]">Downloads</p>
                  <p className="text-sm font-medium">{resource.downloadCount || 0}</p>
                </div>
                {resource.createdAt && (
                  <div>
                    <p className="text-xs text-[#697386]">Created</p>
                    <p className="text-sm">{new Date(resource.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Tab: Basics */}
          {activeTab === "basics" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
                <CardDescription>Core details about this resource</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Title *</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Resource title"
                    />
                  </div>
                  <div>
                    <Label>Slug</Label>
                    <Input
                      value={form.slug}
                      onChange={(e) => updateField("slug", e.target.value)}
                      placeholder="auto-generated-from-title"
                    />
                  </div>
                  <div>
                    <Label>Type *</Label>
                    <Select value={form.type} onValueChange={(v) => updateField("type", v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESOURCE_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Short Description</Label>
                  <Textarea
                    value={form.shortDescription}
                    onChange={(e) => updateField("shortDescription", e.target.value)}
                    placeholder="Brief summary (shown in listings)"
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Detailed description"
                    rows={4}
                  />
                </div>

                <div>
                  <Label>Featured Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={form.featuredImage}
                      onChange={(e) => updateField("featuredImage", e.target.value)}
                      placeholder="https://..."
                    />
                    {form.featuredImage && (
                      <Button variant="ghost" size="icon" onClick={() => updateField("featuredImage", "")}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {form.featuredImage && (
                    <img
                      src={form.featuredImage}
                      alt="Preview"
                      className="mt-2 h-32 w-auto rounded-md object-cover border"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab: Content */}
          {activeTab === "content" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Content</CardTitle>
                <CardDescription>Full content body for this resource</CardDescription>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  {...{
                    value: form.content,
                    onChange: (val: string) => updateField("content", val),
                    placeholder: "Write the resource content...",
                  } as any}
                />
              </CardContent>
            </Card>
          )}

          {/* Tab: Provider */}
          {activeTab === "provider" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Provider Information</CardTitle>
                <CardDescription>Who provides or offers this resource</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Provider Name</Label>
                    <Input
                      value={form.provider}
                      onChange={(e) => updateField("provider", e.target.value)}
                      placeholder="e.g., AWS, Google Cloud"
                    />
                  </div>
                  <div>
                    <Label>Provider Website</Label>
                    <Input
                      value={form.providerWebsite}
                      onChange={(e) => updateField("providerWebsite", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <div>
                  <Label>Provider Logo URL</Label>
                  <Input
                    value={form.providerLogo}
                    onChange={(e) => updateField("providerLogo", e.target.value)}
                    placeholder="https://..."
                  />
                  {form.providerLogo && (
                    <img
                      src={form.providerLogo}
                      alt="Provider logo"
                      className="mt-2 h-12 w-auto rounded border"
                    />
                  )}
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Download URL</Label>
                    <Input
                      value={form.downloadUrl}
                      onChange={(e) => updateField("downloadUrl", e.target.value)}
                      placeholder="Direct download link"
                    />
                  </div>
                  <div>
                    <Label>External URL</Label>
                    <Input
                      value={form.externalUrl}
                      onChange={(e) => updateField("externalUrl", e.target.value)}
                      placeholder="Link to external page"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Affiliate URL</Label>
                    <Input
                      value={form.affiliateUrl}
                      onChange={(e) => updateField("affiliateUrl", e.target.value)}
                      placeholder="Affiliate tracking link"
                    />
                  </div>
                  <div>
                    <Label>Affiliate Commission (%)</Label>
                    <Input
                      value={form.affiliateCommission}
                      onChange={(e) => updateField("affiliateCommission", e.target.value)}
                      placeholder="e.g., 10.00"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab: Pricing & Access */}
          {activeTab === "pricing" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pricing & Access</CardTitle>
                <CardDescription>Pricing, discounts, and access control</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isFree}
                    onCheckedChange={(v) => updateField("isFree", v)}
                  />
                  <Label>Free Resource</Label>
                </div>

                {!form.isFree && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Price</Label>
                      <Input
                        value={form.price}
                        onChange={(e) => updateField("price", e.target.value)}
                        placeholder="99.00"
                      />
                    </div>
                    <div>
                      <Label>Currency</Label>
                      <Select value={form.priceCurrency} onValueChange={(v) => updateField("priceCurrency", v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="SAR">SAR</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Discount</Label>
                      <Input
                        value={form.discount}
                        onChange={(e) => updateField("discount", e.target.value)}
                        placeholder="e.g., 20% off"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Promo Code</Label>
                    <Input
                      value={form.promoCode}
                      onChange={(e) => updateField("promoCode", e.target.value)}
                      placeholder="STARTUP2026"
                    />
                  </div>
                  <div>
                    <Label>Expires At</Label>
                    <Input
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) => updateField("expiresAt", e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Eligibility Criteria</Label>
                  <Textarea
                    value={form.eligibility}
                    onChange={(e) => updateField("eligibility", e.target.value)}
                    placeholder="Who is eligible for this resource?"
                    rows={3}
                  />
                </div>

                <Separator />

                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isGated}
                    onCheckedChange={(v) => updateField("isGated", v)}
                  />
                  <div>
                    <Label>Gated Content</Label>
                    <p className="text-xs text-[#697386]">Require email/signup to access</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab: Taxonomy */}
          {activeTab === "taxonomy" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Taxonomy</CardTitle>
                <CardDescription>Categorize this resource for discovery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Categories */}
                <div>
                  <Label className="text-sm font-medium">Categories</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taxonomyData?.categories?.map((cat: any) => (
                      <Badge
                        key={cat.id}
                        variant={form.categoryIds.includes(cat.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTaxonomy("categoryIds", cat.id)}
                      >
                        {cat.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                <div>
                  <Label className="text-sm font-medium">Regions</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taxonomyData?.regions?.map((reg: any) => (
                      <Badge
                        key={reg.id}
                        variant={form.regionIds.includes(reg.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTaxonomy("regionIds", reg.id)}
                      >
                        {reg.name}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Sectors */}
                <div>
                  <Label className="text-sm font-medium">Sectors</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {taxonomyData?.sectors?.map((sec: any) => (
                      <Badge
                        key={sec.id}
                        variant={form.sectorIds.includes(sec.id) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleTaxonomy("sectorIds", sec.id)}
                      >
                        {sec.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab: Settings */}
          {activeTab === "settings" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Settings</CardTitle>
                <CardDescription>Visibility and feature flags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.isFeatured}
                    onCheckedChange={(v) => updateField("isFeatured", v)}
                  />
                  <div>
                    <Label>Featured Resource</Label>
                    <p className="text-xs text-[#697386]">Highlight this resource on the homepage</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* Tab: SEO */}
          {activeTab === "seo" && (
            <div className="max-w-3xl">
              <EntitySeoTab
                entityType="resources"
                entityId={!isNew ? parseInt(id!) : null}
                entityName={form.title || "Resource"}
                entityDescription={form.shortDescription || form.description?.slice(0, 200) || undefined}
                entityUrl={`/resources/${form.slug}`}
              />
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
