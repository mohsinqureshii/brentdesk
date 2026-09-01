/**
 * Taxonomy Manager
 * Manage categories, tags, topics, regions, and sectors with hierarchy support
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  FolderOpen,
  Tag,
  Hash,
  Globe,
  Building2,
  ChevronRight,
  MoreHorizontal,
  Merge,
  Loader2,
  ChevronDown,
  Key,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

type TaxonomyType = "categories" | "tags" | "topics" | "regions" | "sectors" | "keywords";

const taxonomyConfig: Record<TaxonomyType, { label: string; icon: React.ElementType; description: string }> = {
  categories: { label: "Categories", icon: FolderOpen, description: "Primary content classification with hierarchy" },
  tags: { label: "Tags", icon: Tag, description: "Flexible content labels" },
  topics: { label: "Topics", icon: Hash, description: "Trending topic clusters" },
  regions: { label: "Regions", icon: Globe, description: "Geographic classification" },
  sectors: { label: "Sectors", icon: Building2, description: "Industry verticals" },
  keywords: { label: "Keywords", icon: Key, description: "SEO focus keywords for articles" },
};

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  parentId: number | null;
  module: "news" | "jobs" | "events" | "resources" | "research";
  isActive: boolean;
}

interface TagFormData {
  name: string;
  slug: string;
  description: string;
}

export default function TaxonomyManager() {
  const [activeTab, setActiveTab] = useState<TaxonomyType>("categories");
  const [search, setSearch] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [selectedModule, setSelectedModule] = useState<"news" | "jobs" | "events" | "resources" | "research">("news");
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Category form state
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    parentId: null,
    module: "news",
    isActive: true,
  });

  // Tag form state
  const [tagForm, setTagForm] = useState<TagFormData>({
    name: "",
    slug: "",
    description: "",
  });

  // API queries
  const categoriesQuery = trpc.admin.taxonomy.categories.list.useQuery({ module: selectedModule });
  const tagsQuery = trpc.admin.taxonomy.tags.list.useQuery({ search: search || undefined });
  const topicsQuery = trpc.admin.taxonomy.topics.list.useQuery({ search: search || undefined });
  const regionsQuery = trpc.admin.taxonomy.regions.list.useQuery({});
  const sectorsQuery = trpc.admin.taxonomy.sectors.list.useQuery({ search: search || undefined });
  const keywordsQuery = trpc.admin.taxonomy.keywords.list.useQuery({ search: search || undefined });

  // Mutations
  const createCategoryMutation = trpc.admin.taxonomy.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      categoriesQuery.refetch();
      setCreateDialogOpen(false);
      resetCategoryForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateCategoryMutation = trpc.admin.taxonomy.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      categoriesQuery.refetch();
      setEditItem(null);
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteCategoryMutation = trpc.admin.taxonomy.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      categoriesQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createTagMutation = trpc.admin.taxonomy.tags.create.useMutation({
    onSuccess: () => {
      toast.success("Tag created successfully");
      tagsQuery.refetch();
      setCreateDialogOpen(false);
      resetTagForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteTagMutation = trpc.admin.taxonomy.tags.delete.useMutation({
    onSuccess: () => {
      toast.success("Tag deleted successfully");
      tagsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const createKeywordMutation = trpc.admin.taxonomy.keywords.create.useMutation({
    onSuccess: () => {
      toast.success("Keyword created successfully");
      keywordsQuery.refetch();
      setCreateDialogOpen(false);
      resetTagForm();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteKeywordMutation = trpc.admin.taxonomy.keywords.delete.useMutation({
    onSuccess: () => {
      toast.success("Keyword deleted successfully");
      keywordsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resetCategoryForm = () => {
    setCategoryForm({
      name: "",
      slug: "",
      description: "",
      parentId: null,
      module: selectedModule,
      isActive: true,
    });
  };

  const resetTagForm = () => {
    setTagForm({ name: "", slug: "", description: "" });
  };

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  };

  const config = taxonomyConfig[activeTab];
  const Icon = config.icon;

  // Get data based on active tab
  const getData = () => {
    switch (activeTab) {
      case "categories": return categoriesQuery.data || [];
      case "tags": return tagsQuery.data || [];
      case "topics": return topicsQuery.data || [];
      case "regions": return regionsQuery.data || [];
      case "sectors": return sectorsQuery.data || [];
      case "keywords": return keywordsQuery.data || [];
      default: return [];
    }
  };

  const currentData = getData() || [];
  const isLoading = activeTab === "categories" ? categoriesQuery.isLoading :
    activeTab === "tags" ? tagsQuery.isLoading :
    activeTab === "topics" ? topicsQuery.isLoading :
    activeTab === "regions" ? regionsQuery.isLoading :
    activeTab === "keywords" ? keywordsQuery.isLoading :
    sectorsQuery.isLoading;

  // Filter data by search
  const filteredData = currentData.filter((item: any) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.slug.toLowerCase().includes(search.toLowerCase())
  );

  // Build hierarchy for categories
  const buildCategoryHierarchy = (items: any[]) => {
    const parentCategories = items.filter((c: any) => !c.parentId);
    const childCategories = items.filter((c: any) => c.parentId);
    
    return parentCategories.map((parent: any) => ({
      ...parent,
      children: childCategories.filter((c: any) => c.parentId === parent.id),
    }));
  };

  const hierarchicalCategories = activeTab === "categories" ? buildCategoryHierarchy(filteredData) : [];

  const toggleCategory = (id: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCreateCategory = () => {
    createCategoryMutation.mutate({
      name: categoryForm.name,
      slug: categoryForm.slug || generateSlug(categoryForm.name),
      description: categoryForm.description || undefined,
      parentId: categoryForm.parentId || undefined,
      module: categoryForm.module,
      isActive: categoryForm.isActive,
    });
  };

  const handleCreateTag = () => {
    createTagMutation.mutate({
      name: tagForm.name,
      slug: tagForm.slug || generateSlug(tagForm.name),
      description: tagForm.description || undefined,
    });
  };

  const handleEditCategory = (item: any) => {
    setEditItem(item);
    setCategoryForm({
      name: item.name,
      slug: item.slug,
      description: item.description || "",
      parentId: item.parentId || null,
      module: item.module,
      isActive: item.isActive ?? true,
    });
  };

  const handleUpdateCategory = () => {
    if (!editItem) return;
    updateCategoryMutation.mutate({
      id: editItem.id,
      name: categoryForm.name,
      slug: categoryForm.slug,
      description: categoryForm.description || undefined,
      parentId: categoryForm.parentId || undefined,
      isActive: categoryForm.isActive,
    });
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category?")) {
      deleteCategoryMutation.mutate({ id });
    }
  };

  const handleDeleteTag = (id: number) => {
    if (confirm("Are you sure you want to delete this tag?")) {
      deleteTagMutation.mutate({ id });
    }
  };

  const handleCreateKeyword = () => {
    createKeywordMutation.mutate({
      name: tagForm.name,
      slug: tagForm.slug || generateSlug(tagForm.name),
      description: tagForm.description || undefined,
    });
  };

  const handleDeleteKeyword = (id: number) => {
    if (confirm("Are you sure you want to delete this keyword?")) {
      deleteKeywordMutation.mutate({ id });
    }
  };

  // Get parent categories for dropdown
  const parentCategories = (categoriesQuery.data || []).filter((c: any) => !c.parentId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Taxonomy Manager</h1>
            <p className="text-muted-foreground mt-1">
              Organize content with categories, tags, topics, regions, and sectors
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(Object.entries(taxonomyConfig) as [TaxonomyType, typeof taxonomyConfig[TaxonomyType]][]).map(([type, cfg]) => {
            const TaxIcon = cfg.icon;
            const count = type === "categories" ? (categoriesQuery.data?.length || 0) :
              type === "tags" ? (tagsQuery.data?.length || 0) :
              type === "topics" ? (topicsQuery.data?.length || 0) :
              type === "regions" ? (regionsQuery.data?.length || 0) :
              type === "keywords" ? (keywordsQuery.data?.length || 0) :
              (sectorsQuery.data?.length || 0);
            return (
              <Card
                key={type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activeTab === type ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setActiveTab(type)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted">
                      <TaxIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{cfg.label}</p>
                      <p className="text-xl font-bold">{count}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {config.label}
                  </CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {activeTab === "categories" && (
                    <Select value={selectedModule} onValueChange={(v: any) => setSelectedModule(v)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="news">News</SelectItem>
                        <SelectItem value="jobs">Jobs</SelectItem>
                        <SelectItem value="events">Events</SelectItem>
                        <SelectItem value="resources">Resources</SelectItem>
                        <SelectItem value="research">Research</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add {config.label.slice(0, -1)}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add {config.label.slice(0, -1)}</DialogTitle>
                        <DialogDescription>
                          Create a new {config.label.toLowerCase().slice(0, -1)}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        {activeTab === "categories" ? (
                          <>
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input
                                placeholder="Enter category name"
                                value={categoryForm.name}
                                onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Slug</Label>
                              <Input
                                placeholder="auto-generated-slug"
                                value={categoryForm.slug}
                                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground">Leave empty to auto-generate</p>
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Optional description"
                                rows={3}
                                value={categoryForm.description}
                                onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Parent Category (for sub-categories)</Label>
                              <Select
                                value={categoryForm.parentId?.toString() || "none"}
                                onValueChange={(v) => setCategoryForm({ ...categoryForm, parentId: v === "none" ? null : parseInt(v) })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="None (main category)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">None (main category)</SelectItem>
                                  {parentCategories.map((cat: any) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Select a parent to create a sub-category
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label>Module</Label>
                              <Select
                                value={categoryForm.module}
                                onValueChange={(v: any) => setCategoryForm({ ...categoryForm, module: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="news">News</SelectItem>
                                  <SelectItem value="jobs">Jobs</SelectItem>
                                  <SelectItem value="events">Events</SelectItem>
                                  <SelectItem value="resources">Resources</SelectItem>
                                  <SelectItem value="research">Research</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                id="isActive"
                                checked={categoryForm.isActive}
                                onCheckedChange={(v) => setCategoryForm({ ...categoryForm, isActive: v })}
                              />
                              <Label htmlFor="isActive">Active</Label>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input
                                placeholder="Enter name"
                                value={tagForm.name}
                                onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Slug</Label>
                              <Input
                                placeholder="auto-generated-slug"
                                value={tagForm.slug}
                                onChange={(e) => setTagForm({ ...tagForm, slug: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Textarea
                                placeholder="Optional description"
                                rows={3}
                                value={tagForm.description}
                                onChange={(e) => setTagForm({ ...tagForm, description: e.target.value })}
                              />
                            </div>
                          </>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button
                          onClick={activeTab === "categories" ? handleCreateCategory : activeTab === "keywords" ? handleCreateKeyword : handleCreateTag}
                          disabled={createCategoryMutation.isPending || createTagMutation.isPending || createKeywordMutation.isPending}
                        >
                          {(createCategoryMutation.isPending || createTagMutation.isPending || createKeywordMutation.isPending) && (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          )}
                          Create
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={`Search ${config.label.toLowerCase()}...`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activeTab === "categories" ? (
                  /* Hierarchical category display */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Articles</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {hierarchicalCategories.map((parent: any) => (
                        <>
                          <TableRow key={parent.id} className="bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {parent.children?.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => toggleCategory(parent.id)}
                                  >
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform ${
                                        expandedCategories.has(parent.id) ? "" : "-rotate-90"
                                      }`}
                                    />
                                  </Button>
                                )}
                                <FolderOpen className="h-4 w-4 text-primary" />
                                <span className="font-medium">{parent.name}</span>
                                {parent.children?.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {parent.children.length} sub
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {parent.slug}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{parent.articleCount || 0}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">Main</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={parent.isActive ? "default" : "secondary"}>
                                {parent.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditCategory(parent)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteCategory(parent.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedCategories.has(parent.id) && parent.children?.map((child: any) => (
                            <TableRow key={child.id}>
                              <TableCell>
                                <div className="flex items-center gap-2 pl-10">
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  <Tag className="h-4 w-4 text-muted-foreground" />
                                  <span>{child.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-sm text-muted-foreground">
                                {child.slug}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium">{child.articleCount || 0}</span>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">Sub</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={child.isActive ? "default" : "secondary"}>
                                  {child.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditCategory(child)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => handleDeleteCategory(child.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ))}
                      {hierarchicalCategories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No categories found. Create your first category.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  /* Flat list for other taxonomy types */
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredData.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{item.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">
                            {item.slug}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => {
                                  if (activeTab === "tags") handleDeleteTag(item.id);
                                  else if (activeTab === "keywords") handleDeleteKeyword(item.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No {config.label.toLowerCase()} found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total {config.label}</span>
                  <span className="font-medium">{currentData.length}</span>
                </div>
                {activeTab === "categories" && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Main Categories</span>
                      <span className="font-medium">{parentCategories.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sub-Categories</span>
                      <span className="font-medium">{currentData.length - parentCategories.length}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Hierarchy</CardTitle>
                <CardDescription>Main categories contain sub-categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-primary" />
                    <span className="font-medium">Main Category</span>
                    <Badge variant="outline" className="text-xs">Parent</Badge>
                  </div>
                  <div className="flex items-center gap-2 pl-6">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <span>Sub-Category</span>
                    <Badge variant="outline" className="text-xs">Child</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit dialog */}
        <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
          <DialogContent>
            {editItem && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Category</DialogTitle>
                  <DialogDescription>Update category details</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Slug</Label>
                    <Input
                      value={categoryForm.slug}
                      onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      rows={3}
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Select
                      value={categoryForm.parentId?.toString() || "none"}
                      onValueChange={(v) => setCategoryForm({ ...categoryForm, parentId: v === "none" ? null : parseInt(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None (main category)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (main category)</SelectItem>
                        {parentCategories.filter((c: any) => c.id !== editItem.id).map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="editIsActive"
                      checked={categoryForm.isActive}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, isActive: v })}
                    />
                    <Label htmlFor="editIsActive">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditItem(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCategory} disabled={updateCategoryMutation.isPending}>
                    {updateCategoryMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Changes
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
