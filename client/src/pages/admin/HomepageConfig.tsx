/**
 * Homepage Configuration Page
 * CMS-driven content blocks with drag-and-drop reordering
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  GripVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Calendar,
  Clock,
  Newspaper,
  Briefcase,
  Users,
  Building2,
  CalendarDays,
  FileText,
  Star,
  TrendingUp,
  Layout,
  Megaphone,
} from "lucide-react";

interface HomepageBlock {
  id: number;
  type: string;
  title: string;
  config: Record<string, unknown>;
  order: number;
  isEnabled: boolean;
  isCampaign: boolean;
  startDate?: string;
  endDate?: string;
}

const blockTypes = [
  { value: "hero", label: "Hero Section", icon: Layout },
  { value: "featured_articles", label: "Featured Articles", icon: Star },
  { value: "latest_news", label: "Latest News", icon: Newspaper },
  { value: "trending", label: "Trending", icon: TrendingUp },
  { value: "jobs", label: "Jobs Listings", icon: Briefcase },
  { value: "people", label: "People Spotlight", icon: Users },
  { value: "investors", label: "Investors", icon: Building2 },
  { value: "events", label: "Upcoming Events", icon: CalendarDays },
  { value: "resources", label: "Resources", icon: FileText },
  { value: "newsletter", label: "Newsletter CTA", icon: Megaphone },
  { value: "custom_html", label: "Custom HTML", icon: Layout },
];

const mockBlocks: HomepageBlock[] = [
  { id: 1, type: "hero", title: "Hero Banner", config: { headline: "Tech News & Insights", subheadline: "Stay ahead of the curve" }, order: 1, isEnabled: true, isCampaign: false },
  { id: 2, type: "featured_articles", title: "Featured Stories", config: { count: 3, category: "all" }, order: 2, isEnabled: true, isCampaign: false },
  { id: 3, type: "latest_news", title: "Latest News", config: { count: 6, showCategories: true }, order: 3, isEnabled: true, isCampaign: false },
  { id: 4, type: "jobs", title: "Hot Jobs", config: { count: 4, featured: true }, order: 4, isEnabled: true, isCampaign: false },
  { id: 5, type: "trending", title: "Trending This Week", config: { count: 5, period: "week" }, order: 5, isEnabled: true, isCampaign: false },
  { id: 6, type: "events", title: "Upcoming Events", config: { count: 3, type: "all" }, order: 6, isEnabled: true, isCampaign: false },
  { id: 7, type: "newsletter", title: "Newsletter Signup", config: { headline: "Get the weekly digest" }, order: 7, isEnabled: true, isCampaign: false },
  { id: 8, type: "custom_html", title: "Black Friday Campaign", config: { html: "<div>...</div>" }, order: 8, isEnabled: false, isCampaign: true, startDate: "2026-11-25", endDate: "2026-11-30" },
];

export default function HomepageConfig() {
  const [blocks, setBlocks] = useState(mockBlocks);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<HomepageBlock | null>(null);
  const [newBlockType, setNewBlockType] = useState("");
  const [draggedBlock, setDraggedBlock] = useState<number | null>(null);

  const getBlockIcon = (type: string) => {
    const blockType = blockTypes.find((bt) => bt.value === type);
    return blockType?.icon || Layout;
  };

  const toggleBlock = (id: number) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, isEnabled: !block.isEnabled } : block
      )
    );
  };

  const deleteBlock = (id: number) => {
    setBlocks((prev) => prev.filter((block) => block.id !== id));
  };

  const duplicateBlock = (block: HomepageBlock) => {
    const newBlock = {
      ...block,
      id: Math.max(...blocks.map((b) => b.id)) + 1,
      title: `${block.title} (Copy)`,
      order: blocks.length + 1,
    };
    setBlocks((prev) => [...prev, newBlock]);
  };

  const handleDragStart = (id: number) => {
    setDraggedBlock(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggedBlock === null || draggedBlock === targetId) return;

    const draggedIndex = blocks.findIndex((b) => b.id === draggedBlock);
    const targetIndex = blocks.findIndex((b) => b.id === targetId);

    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(draggedIndex, 1);
    newBlocks.splice(targetIndex, 0, removed);

    // Update order
    newBlocks.forEach((block, index) => {
      block.order = index + 1;
    });

    setBlocks(newBlocks);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
  };

  const enabledBlocks = blocks.filter((b) => b.isEnabled).sort((a, b) => a.order - b.order);
  const disabledBlocks = blocks.filter((b) => !b.isEnabled);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Homepage Configuration</h1>
            <p className="text-muted-foreground mt-1">
              Drag and drop to reorder content blocks
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Block
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Content Block</DialogTitle>
                  <DialogDescription>
                    Choose a block type to add to the homepage
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <div className="grid grid-cols-2 gap-3">
                    {blockTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setNewBlockType(type.value)}
                          className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                            newBlockType === type.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      if (newBlockType) {
                        const type = blockTypes.find((bt) => bt.value === newBlockType);
                        setBlocks((prev) => [
                          ...prev,
                          {
                            id: Math.max(...prev.map((b) => b.id)) + 1,
                            type: newBlockType,
                            title: type?.label || "New Block",
                            config: {},
                            order: prev.length + 1,
                            isEnabled: true,
                            isCampaign: false,
                          },
                        ]);
                        setAddDialogOpen(false);
                        setNewBlockType("");
                      }
                    }}
                    disabled={!newBlockType}
                  >
                    Add Block
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active blocks */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  Active Blocks
                </CardTitle>
                <CardDescription>
                  These blocks are visible on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {enabledBlocks.map((block) => {
                    const Icon = getBlockIcon(block.type);
                    return (
                      <div
                        key={block.id}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-4 p-4 rounded-md border border-border bg-card transition-all ${
                          draggedBlock === block.id ? "opacity-50" : ""
                        } hover:shadow-sm cursor-move`}
                      >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div className="p-2 rounded-md bg-muted">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{block.title}</h3>
                            {!!block.isCampaign && (
                              <Badge variant="outline" className="border-purple-500 text-purple-500">
                                Campaign
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground capitalize">
                            {block.type.replace("_", " ")}
                          </p>
                        </div>
                        {!!block.isCampaign && block.startDate && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {block.startDate} - {block.endDate}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditBlock(block)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => duplicateBlock(block)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleBlock(block.id)}
                          >
                            <EyeOff className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deleteBlock(block.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Disabled blocks */}
            {disabledBlocks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <EyeOff className="h-5 w-5 text-muted-foreground" />
                    Disabled Blocks
                  </CardTitle>
                  <CardDescription>
                    These blocks are hidden from the homepage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {disabledBlocks.map((block) => {
                      const Icon = getBlockIcon(block.type);
                      return (
                        <div
                          key={block.id}
                          className="flex items-center gap-4 p-4 rounded-md border border-dashed border-border bg-muted/30"
                        >
                          <div className="p-2 rounded-md bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-muted-foreground">
                                {block.title}
                              </h3>
                              {!!block.isCampaign && (
                                <Badge variant="outline">Campaign</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground capitalize">
                              {block.type.replace("_", " ")}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleBlock(block.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => deleteBlock(block.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Settings panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Campaign
                </Button>
                <Button className="w-full" variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate Layout
                </Button>
                <Button className="w-full" variant="outline">
                  <Clock className="h-4 w-4 mr-2" />
                  View History
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Layout Presets</CardTitle>
                <CardDescription>
                  Quick-apply common homepage layouts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "News Focus", description: "Hero + Latest + Featured" },
                  { name: "Jobs Focus", description: "Hero + Jobs + Events" },
                  { name: "Minimal", description: "Hero + Latest News only" },
                  { name: "Full Featured", description: "All blocks enabled" },
                ].map((preset) => (
                  <button
                    key={preset.name}
                    className="w-full flex items-center justify-between p-3 rounded-md border border-border hover:border-primary/50 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {preset.description}
                      </p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Global Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Cache homepage</p>
                    <p className="text-xs text-muted-foreground">
                      Improve load times
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Show timestamps</p>
                    <p className="text-xs text-muted-foreground">
                      Display publish dates
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="space-y-2">
                  <Label>Cache duration</Label>
                  <Select defaultValue="5">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit block dialog */}
        <Dialog open={!!editBlock} onOpenChange={() => setEditBlock(null)}>
          <DialogContent className="max-w-lg">
            {editBlock && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit Block: {editBlock.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Block Title</Label>
                    <Input defaultValue={editBlock.title} />
                  </div>
                  <div className="space-y-2">
                    <Label>Block Type</Label>
                    <Select defaultValue={editBlock.type}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {blockTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Campaign Mode</p>
                      <p className="text-xs text-muted-foreground">
                        Schedule this block for specific dates
                      </p>
                    </div>
                    <Switch checked={editBlock.isCampaign} />
                  </div>
                  {!!editBlock.isCampaign && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" defaultValue={editBlock.startDate} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" defaultValue={editBlock.endDate} />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditBlock(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setEditBlock(null)}>
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
