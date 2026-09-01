/**
 * Popups & Banners Manager
 * CMS-driven popups with scheduling and targeting
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Eye,
  EyeOff,
  Copy,
  Calendar,
  Target,
  BarChart3,
  MessageSquare,
  Bell,
  X,
  ExternalLink,
  MousePointer,
} from "lucide-react";

interface Popup {
  id: number;
  name: string;
  type: "modal" | "banner" | "slide_in" | "notification";
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  position: string;
  isEnabled: boolean;
  startDate?: string;
  endDate?: string;
  frequencyCap: number;
  targetPages: string[];
  impressions: number;
  clicks: number;
  dismissals: number;
}

const mockPopups: Popup[] = [
  {
    id: 1,
    name: "Newsletter Signup",
    type: "modal",
    title: "Stay Updated!",
    content: "Get the latest tech news delivered to your inbox weekly.",
    ctaText: "Subscribe",
    ctaUrl: "/newsletter",
    position: "center",
    isEnabled: true,
    frequencyCap: 1,
    targetPages: ["/*"],
    impressions: 15420,
    clicks: 2341,
    dismissals: 8923,
  },
  {
    id: 2,
    name: "Cookie Consent",
    type: "banner",
    title: "Cookie Notice",
    content: "We use cookies to improve your experience.",
    ctaText: "Accept",
    position: "bottom",
    isEnabled: true,
    frequencyCap: 0,
    targetPages: ["/*"],
    impressions: 45000,
    clicks: 38000,
    dismissals: 5000,
  },
  {
    id: 3,
    name: "Black Friday Sale",
    type: "slide_in",
    title: "Black Friday Special!",
    content: "50% off all premium subscriptions.",
    ctaText: "Get Deal",
    ctaUrl: "/pricing",
    position: "bottom-right",
    isEnabled: false,
    startDate: "2026-11-25",
    endDate: "2026-11-30",
    frequencyCap: 3,
    targetPages: ["/", "/pricing"],
    impressions: 0,
    clicks: 0,
    dismissals: 0,
  },
  {
    id: 4,
    name: "New Feature Announcement",
    type: "notification",
    title: "New: Research Reports",
    content: "Check out our new research section with exclusive reports.",
    ctaText: "Explore",
    ctaUrl: "/research",
    position: "top-right",
    isEnabled: true,
    frequencyCap: 1,
    targetPages: ["/"],
    impressions: 8234,
    clicks: 1567,
    dismissals: 4521,
  },
];

const typeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  modal: { label: "Modal", icon: MessageSquare, color: "bg-blue-100 text-blue-600" },
  banner: { label: "Banner", icon: Bell, color: "bg-green-100 text-green-600" },
  slide_in: { label: "Slide-in", icon: ExternalLink, color: "bg-purple-100 text-purple-600" },
  notification: { label: "Notification", icon: Bell, color: "bg-orange-100 text-orange-600" },
};

export default function PopupsManager() {
  const [popups, setPopups] = useState(mockPopups);
  const [activeTab, setActiveTab] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPopup, setEditPopup] = useState<Popup | null>(null);

  const togglePopup = (id: number) => {
    setPopups((prev) =>
      prev.map((popup) =>
        popup.id === id ? { ...popup, isEnabled: !popup.isEnabled } : popup
      )
    );
  };

  const deletePopup = (id: number) => {
    setPopups((prev) => prev.filter((popup) => popup.id !== id));
  };

  const getConversionRate = (popup: Popup) => {
    if (popup.impressions === 0) return "0%";
    return ((popup.clicks / popup.impressions) * 100).toFixed(1) + "%";
  };

  const filteredPopups = popups.filter((popup) => {
    if (activeTab === "all") return true;
    if (activeTab === "active") return popup.isEnabled;
    if (activeTab === "scheduled") return popup.startDate && !popup.isEnabled;
    if (activeTab === "inactive") return !popup.isEnabled && !popup.startDate;
    return popup.type === activeTab;
  });

  const totalImpressions = popups.reduce((sum, p) => sum + p.impressions, 0);
  const totalClicks = popups.reduce((sum, p) => sum + p.clicks, 0);
  const avgConversion = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Popups & Banners</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage promotional popups and banners
            </p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Popup
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Popup</DialogTitle>
                <DialogDescription>
                  Configure your popup or banner settings
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name (internal)</Label>
                    <Input placeholder="e.g., Newsletter Signup" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select defaultValue="modal">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modal">Modal Popup</SelectItem>
                        <SelectItem value="banner">Banner</SelectItem>
                        <SelectItem value="slide_in">Slide-in</SelectItem>
                        <SelectItem value="notification">Notification</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input placeholder="Popup headline" />
                  </div>
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea placeholder="Popup message..." rows={3} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>CTA Button Text</Label>
                    <Input placeholder="e.g., Subscribe" />
                  </div>
                  <div className="space-y-2">
                    <Label>CTA URL</Label>
                    <Input placeholder="/newsletter" />
                  </div>
                  <div className="space-y-2">
                    <Label>Position</Label>
                    <Select defaultValue="center">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Frequency Cap</Label>
                    <Select defaultValue="1">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Show always</SelectItem>
                        <SelectItem value="1">Once per session</SelectItem>
                        <SelectItem value="3">3 times max</SelectItem>
                        <SelectItem value="7">Once per week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Pages</Label>
                    <Input placeholder="/* for all pages" defaultValue="/*" />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setCreateDialogOpen(false)}>
                  Create Popup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100">
                  <Eye className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Impressions</p>
                  <p className="text-2xl font-bold">{totalImpressions.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-green-100">
                  <MousePointer className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Clicks</p>
                  <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-purple-100">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Conversion</p>
                  <p className="text-2xl font-bold">{avgConversion}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-md bg-orange-100">
                  <Bell className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Popups</p>
                  <p className="text-2xl font-bold">{popups.filter((p) => p.isEnabled).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs and table */}
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
                <TabsTrigger value="modal">Modals</TabsTrigger>
                <TabsTrigger value="banner">Banners</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <Table className="w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Name</TableHead>
                  <TableHead className="min-w-[100px] hidden md:table-cell">Type</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">Status</TableHead>
                  <TableHead className="min-w-[140px] hidden md:table-cell">Schedule</TableHead>
                  <TableHead className="min-w-[100px] hidden lg:table-cell">Impressions</TableHead>
                  <TableHead className="min-w-[100px]">Clicks</TableHead>
                  <TableHead className="min-w-[100px]">Conversion</TableHead>
                  <TableHead className="min-w-[60px] hidden lg:table-cell"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPopups.map((popup) => {
                  const config = typeConfig[popup.type];
                  const Icon = config.icon;
                  return (
                    <TableRow key={popup.id}>
                      <TableCell className="hidden md:table-cell">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{popup.name}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {popup.title}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={popup.isEnabled}
                            onCheckedChange={() => togglePopup(popup.id)}
                          />
                          <span className="text-sm">
                            {popup.isEnabled ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {popup.startDate ? (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {popup.startDate} - {popup.endDate}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Always</span>
                        )}
                      </TableCell>
                      <TableCell>{popup.impressions.toLocaleString()}</TableCell>
                      <TableCell>{popup.clicks.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getConversionRate(popup)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditPopup(popup)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            onClick={() => deletePopup(popup.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          </CardContent>
        </Card>

        {/* Preview section */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              See how your popups look on different devices
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(typeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <div
                    key={type}
                    className="aspect-video rounded-md border border-border bg-muted/30 flex flex-col items-center justify-center p-4"
                  >
                    <div className={`p-3 rounded-full ${config.color} mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="font-medium">{config.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click to preview
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Edit dialog */}
        <Dialog open={!!editPopup} onOpenChange={() => setEditPopup(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {editPopup && (
              <>
                <DialogHeader>
                  <DialogTitle>Edit: {editPopup.name}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-6 py-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input defaultValue={editPopup.name} />
                    </div>
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select defaultValue={editPopup.type}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="modal">Modal</SelectItem>
                          <SelectItem value="banner">Banner</SelectItem>
                          <SelectItem value="slide_in">Slide-in</SelectItem>
                          <SelectItem value="notification">Notification</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input defaultValue={editPopup.title} />
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea defaultValue={editPopup.content} rows={3} />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>CTA Text</Label>
                      <Input defaultValue={editPopup.ctaText} />
                    </div>
                    <div className="space-y-2">
                      <Label>CTA URL</Label>
                      <Input defaultValue={editPopup.ctaUrl} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Start Date</Label>
                        <Input type="date" defaultValue={editPopup.startDate} />
                      </div>
                      <div className="space-y-2">
                        <Label>End Date</Label>
                        <Input type="date" defaultValue={editPopup.endDate} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Target Pages</Label>
                      <Input defaultValue={editPopup.targetPages.join(", ")} />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditPopup(null)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setEditPopup(null)}>
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
