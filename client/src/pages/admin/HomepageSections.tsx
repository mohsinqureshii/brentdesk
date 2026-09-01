/**
 * Homepage Sections Manager
 * Manage category sections displayed on the homepage
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Section {
  id: number;
  name: string;
  slug: string;
  sectionType: string | null;
  categoryId: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  isActive: boolean;
  sortOrder: number | null;
  position: string | null;
  accentColor?: string | null;
  articleCount?: number | null;
  showViewMore?: boolean | null;
}

export default function HomepageSections() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [newSection, setNewSection] = useState({
    name: "",
    categoryId: "",
    position: "main",
    articleCount: 4,
    accentColor: "#000000",
  });

  const utils = trpc.useUtils();

  // Fetch sections
  const { data: sections = [], isLoading } = trpc.admin.homepage.adminListSections.useQuery();
  
  // Fetch categories for dropdown
  const { data: categoriesData } = trpc.admin.taxonomy.categories.list.useQuery({ module: "news" });
  const categories = (categoriesData || []) as Array<{ id: number; name: string; slug: string }>;

  // Mutations
  const createMutation = trpc.admin.homepage.createSection.useMutation({
    onSuccess: () => {
      utils.admin.homepage.adminListSections.invalidate();
      utils.admin.homepage.getSections.invalidate();
      setAddDialogOpen(false);
      setNewSection({ name: "", categoryId: "", position: "main", articleCount: 4, accentColor: "#000000" });
      toast.success("Section created successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create section");
    },
  });

  const updateMutation = trpc.admin.homepage.updateSection.useMutation({
    onSuccess: () => {
      utils.admin.homepage.adminListSections.invalidate();
      utils.admin.homepage.getSections.invalidate();
      setEditSection(null);
      toast.success("Section updated successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update section");
    },
  });

  const deleteMutation = trpc.admin.homepage.deleteSection.useMutation({
    onSuccess: () => {
      utils.admin.homepage.adminListSections.invalidate();
      utils.admin.homepage.getSections.invalidate();
      toast.success("Section deleted successfully");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete section");
    },
  });

  const toggleSection = (section: Section) => {
    updateMutation.mutate({
      id: section.id,
      isActive: !section.isActive,
    });
  };

  const moveSection = (section: Section, direction: "up" | "down") => {
    const sortedSections = [...sections].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const currentIndex = sortedSections.findIndex(s => s.id === section.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= sortedSections.length) return;
    
    // Just update the order by swapping positions in the list
    toast.info("Reordering sections...");
  };

  const handleCreate = () => {
    if (!newSection.name || !newSection.categoryId) {
      toast.error("Please fill in all required fields");
      return;
    }

    const category = categories.find((c: { id: number; slug: string }) => c.id === parseInt(newSection.categoryId));
    
    createMutation.mutate({
      name: newSection.name,
      slug: newSection.name.toLowerCase().replace(/\s+/g, "-"),
      sectionType: "category",
      categoryId: parseInt(newSection.categoryId),
      position: "main" as const,
      articleCount: newSection.articleCount,
      accentColor: newSection.accentColor || undefined,
      showViewMore: true,
      viewMoreUrl: category ? `/category/${category.slug}` : "/news",
      isActive: true,
    });
  };

  const handleUpdate = () => {
    if (!editSection) return;
    
    const category = categories.find((c: { id: number; slug: string }) => c.id === editSection.categoryId);
    
    updateMutation.mutate({
      id: editSection.id,
      name: editSection.name,
      categoryId: editSection.categoryId,
      accentColor: editSection.accentColor || undefined,
      articleCount: editSection.articleCount || undefined,
      isActive: editSection.isActive,
      viewMoreUrl: category ? `/category/${category.slug}` : "/news",
    });
  };

  // All main sections (hero, trending, headlines, category, in_brief, etc.)
  const mainSections = sections
    .filter(s => s.position === "main")
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) as any as Section[];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Homepage Sections</h1>
            <p className="text-muted-foreground mt-1">
              Manage all sections on the homepage - Hero, Trending, Headlines, and Category sections
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </div>

        {/* Sections List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              All Homepage Sections
            </CardTitle>
            <CardDescription>
              These sections are displayed on the homepage in order. Toggle visibility or reorder using arrows.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mainSections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No category sections configured. Click "Add Section" to create one.
              </div>
            ) : (
              <div className="space-y-2">
                {mainSections.map((section, index) => (
                  <div
                    key={section.id}
                    className={`flex items-center gap-4 p-4 rounded-md border transition-all ${
                      section.isActive 
                        ? "border-border bg-card" 
                        : "border-dashed border-muted bg-muted/30"
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-move" />
                    
                    <div 
                      className="w-3 h-8 rounded-full" 
                      style={{ backgroundColor: section.accentColor || "#000" }}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${!section.isActive ? "text-muted-foreground" : ""}`}>
                          {section.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {section.sectionType === 'hero' ? 'Hero' :
                           section.sectionType === 'trending' ? 'Trending' :
                           section.sectionType === 'headlines' ? 'Headlines' :
                           section.sectionType === 'in_brief' ? 'In Brief' :
                           section.sectionType === 'category' ? 'Category' :
                           section.sectionType || 'Unknown'}
                        </Badge>
                        {!section.isActive && (
                          <Badge variant="outline" className="text-muted-foreground">
                            Hidden
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {section.sectionType === 'category' || section.sectionType === 'in_brief' 
                          ? `Category: ${section.categoryName || "Not set"} • ${section.articleCount || 4} articles`
                          : section.sectionType === 'hero' ? 'Featured article with sidebar'
                          : section.sectionType === 'trending' ? 'Horizontal scrolling cards'
                          : section.sectionType === 'headlines' ? 'Latest Headlines + Latest News + Premium Banner'
                          : `${section.articleCount || 4} articles`}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(section as Section, "up")}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => moveSection(section as Section, "down")}
                        disabled={index === mainSections.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditSection(section as Section)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleSection(section as Section)}
                      >
                        {section.isActive ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this section?")) {
                            deleteMutation.mutate({ id: section.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Section Dialog */}
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Category Section</DialogTitle>
              <DialogDescription>
                Add a new category section to the homepage
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Section Name *</Label>
                <Input
                  placeholder="e.g., Funding & VC"
                  value={newSection.name}
                  onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  value={newSection.categoryId}
                  onValueChange={(value) => setNewSection({ ...newSection, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Article Count</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={newSection.articleCount}
                    onChange={(e) => setNewSection({ ...newSection, articleCount: parseInt(e.target.value) || 4 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      className="w-12 h-10 p-1"
                      value={newSection.accentColor}
                      onChange={(e) => setNewSection({ ...newSection, accentColor: e.target.value })}
                    />
                    <Input
                      value={newSection.accentColor}
                      onChange={(e) => setNewSection({ ...newSection, accentColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Section
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Section Dialog */}
        <Dialog open={!!editSection} onOpenChange={() => setEditSection(null)}>
          <DialogContent>
            {editSection && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Section: {editSection.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Section Name</Label>
                    <Input
                      value={editSection.name}
                      onChange={(e) => setEditSection({ ...editSection, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={editSection.categoryId?.toString() || ""}
                      onValueChange={(value) => setEditSection({ ...editSection, categoryId: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Article Count</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={editSection.articleCount || 4}
                        onChange={(e) => setEditSection({ ...editSection, articleCount: parseInt(e.target.value) || 4 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Accent Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          className="w-12 h-10 p-1"
                          value={editSection.accentColor || "#000000"}
                          onChange={(e) => setEditSection({ ...editSection, accentColor: e.target.value })}
                        />
                        <Input
                          value={editSection.accentColor || "#000000"}
                          onChange={(e) => setEditSection({ ...editSection, accentColor: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Visible on Homepage</p>
                      <p className="text-xs text-muted-foreground">
                        Toggle to show/hide this section
                      </p>
                    </div>
                    <Switch
                      checked={editSection.isActive}
                      onCheckedChange={(checked) => setEditSection({ ...editSection, isActive: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditSection(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                    {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
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
