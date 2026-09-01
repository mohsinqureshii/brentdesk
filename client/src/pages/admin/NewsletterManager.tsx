/**
 * Newsletter Manager - Admin page for managing subscribers, lists, and campaigns
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail,
  Users,
  Send,
  Plus,
  Search,
  MoreHorizontal,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  Download,
  Filter,
  BarChart3,
  ListChecks,
} from "lucide-react";

export default function NewsletterManager() {
  const [activeTab, setActiveTab] = useState("subscribers");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateCampaignOpen, setIsCreateCampaignOpen] = useState(false);
  const [isCreateListOpen, setIsCreateListOpen] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<any>(null);

  // Form states
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    subject: "",
    previewText: "",
    listId: "",
    content: "",
  });

  const [listForm, setListForm] = useState({
    name: "",
    slug: "",
    description: "",
  });

  // Fetch data
  const { data: subscribersData, isLoading: subscribersLoading, refetch: refetchSubscribers } = 
    trpc.admin.newsletter.listSubscribers.useQuery({ limit: 100, offset: 0 });
  
  const { data: listsData, refetch: refetchLists } = 
    trpc.admin.newsletter.listSubscriptionLists.useQuery();
  
  const { data: campaignsData, isLoading: campaignsLoading, refetch: refetchCampaigns } = 
    trpc.admin.newsletter.listCampaigns.useQuery({ limit: 50, offset: 0 });
  
  const { data: statsData } = 
    trpc.admin.newsletter.getStats.useQuery();

  // Mutations
  const createList = trpc.admin.newsletter.createList.useMutation({
    onSuccess: () => {
      toast.success("List created successfully");
      setIsCreateListOpen(false);
      refetchLists();
      setListForm({ name: "", slug: "", description: "" });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const createCampaign = trpc.admin.newsletter.createCampaign.useMutation({
    onSuccess: () => {
      toast.success("Campaign created successfully");
      setIsCreateCampaignOpen(false);
      refetchCampaigns();
      setCampaignForm({ name: "", subject: "", previewText: "", listId: "", content: "" });
    },
    onError: (error: any) => toast.error(error.message),
  });

  const unsubscribe = trpc.admin.newsletter.unsubscribe.useMutation({
    onSuccess: () => {
      toast.success("Subscriber removed");
      refetchSubscribers();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Filter subscribers
  const filteredSubscribers = subscribersData?.subscribers?.filter((sub: any) =>
    sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter campaigns
  const filteredCampaigns = campaignsData?.campaigns?.filter((campaign: any) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      draft: { color: "bg-[#F0F2F5] text-[#1A1F36]", icon: Clock },
      scheduled: { color: "bg-blue-100 text-blue-700", icon: Clock },
      sending: { color: "bg-yellow-100 text-yellow-700", icon: Send },
      sent: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-700", icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Newsletter Manager</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage subscribers, lists, and email campaigns</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsCreateListOpen(true)}>
              <ListChecks className="h-4 w-4 mr-2" />
              New List
            </Button>
            <Button onClick={() => setIsCreateCampaignOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-3xl font-bold">{statsData?.subscribers?.total || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold">{statsData?.subscribers?.active || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subscription Lists</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <ListChecks className="h-8 w-8 text-purple-500" />
                <span className="text-3xl font-bold">{listsData?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Campaigns Sent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Send className="h-8 w-8 text-orange-500" />
                <span className="text-3xl font-bold">{statsData?.campaigns?.total || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="subscribers">
                <Users className="h-4 w-4 mr-2" />
                Subscribers
              </TabsTrigger>
              <TabsTrigger value="lists">
                <ListChecks className="h-4 w-4 mr-2" />
                Lists
              </TabsTrigger>
              <TabsTrigger value="campaigns">
                <Mail className="h-4 w-4 mr-2" />
                Campaigns
              </TabsTrigger>
              <TabsTrigger value="leads">
                <TrendingUp className="h-4 w-4 mr-2" />
                Leads
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input
                  placeholder="Search..."
                  className="pl-9 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Lists</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading subscribers...
                        </TableCell>
                      </TableRow>
                    ) : filteredSubscribers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#697386]">
                          No subscribers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSubscribers.map((subscriber: any) => (
                        <TableRow key={subscriber.id}>
                          <TableCell className="font-medium">{subscriber.email}</TableCell>
                          <TableCell>{subscriber.firstName} {subscriber.lastName}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{subscriber.subscriberType}</Badge>
                          </TableCell>
                          <TableCell>{subscriber.source || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{subscriber.listCount || 0} lists</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(subscriber.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm("Remove this subscriber?")) {
                                    unsubscribe.mutate({ email: subscriber.email });
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Lists Tab */}
          <TabsContent value="lists" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {listsData?.map((list: any) => (
                <Card key={list.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{list.name}</CardTitle>
                      <Badge variant={list.isActive ? "default" : "secondary"}>
                        {list.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <CardDescription>{list.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#697386]">Subscribers</span>
                      <span className="font-medium">{list.subscriberCount || 0}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-[#697386]">Slug</span>
                      <code className="text-xs bg-[#F0F2F5] px-2 py-1 rounded">{list.slug}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Campaigns Tab */}
          <TabsContent value="campaigns" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>List</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Open Rate</TableHead>
                      <TableHead>Click Rate</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaignsLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          Loading campaigns...
                        </TableCell>
                      </TableRow>
                    ) : filteredCampaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-[#697386]">
                          No campaigns found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCampaigns.map((campaign: any) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{campaign.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{campaign.listName || "All"}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell>
                            {campaign.sentAt 
                              ? new Date(campaign.sentAt).toLocaleDateString() 
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {campaign.openRate ? `${(campaign.openRate * 100).toFixed(1)}%` : "-"}
                          </TableCell>
                          <TableCell>
                            {campaign.clickRate ? `${(campaign.clickRate * 100).toFixed(1)}%` : "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon">
                                <BarChart3 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Lead Capture</CardTitle>
                <CardDescription>
                  Leads captured from gated content, calculators, and newsletter signups
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[#697386] text-center py-8">
                  Lead management coming soon. View leads in the database directly.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create List Dialog */}
        <Dialog open={isCreateListOpen} onOpenChange={setIsCreateListOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subscription List</DialogTitle>
              <DialogDescription>
                Create a new list to segment your subscribers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="listName">List Name</Label>
                <Input
                  id="listName"
                  placeholder="e.g., Weekly Digest"
                  value={listForm.name}
                  onChange={(e) => setListForm({ ...listForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listSlug">Slug</Label>
                <Input
                  id="listSlug"
                  placeholder="e.g., weekly-digest"
                  value={listForm.slug}
                  onChange={(e) => setListForm({ ...listForm, slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="listDescription">Description</Label>
                <Textarea
                  id="listDescription"
                  placeholder="What is this list for?"
                  value={listForm.description}
                  onChange={(e) => setListForm({ ...listForm, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateListOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createList.mutate(listForm)}
                disabled={createList.isPending || !listForm.name || !listForm.slug}
              >
                {createList.isPending ? "Creating..." : "Create List"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Campaign Dialog */}
        <Dialog open={isCreateCampaignOpen} onOpenChange={setIsCreateCampaignOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Email Campaign</DialogTitle>
              <DialogDescription>
                Create a new email campaign to send to your subscribers
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaignName">Campaign Name</Label>
                  <Input
                    id="campaignName"
                    placeholder="Internal name for this campaign"
                    value={campaignForm.name}
                    onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaignList">Target List</Label>
                  <Select
                    value={campaignForm.listId}
                    onValueChange={(value) => setCampaignForm({ ...campaignForm, listId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a list" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Subscribers</SelectItem>
                      {listsData?.map((list: any) => (
                        <SelectItem key={list.id} value={list.id.toString()}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  id="subject"
                  placeholder="Subject line for your email"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previewText">Preview Text</Label>
                <Input
                  id="previewText"
                  placeholder="Text shown in email preview"
                  value={campaignForm.previewText}
                  onChange={(e) => setCampaignForm({ ...campaignForm, previewText: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Email Content (HTML)</Label>
                <Textarea
                  id="content"
                  placeholder="Enter your email content..."
                  className="min-h-[200px] font-mono text-sm"
                  value={campaignForm.content}
                  onChange={(e) => setCampaignForm({ ...campaignForm, content: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCampaignOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createCampaign.mutate({
                  name: campaignForm.name,
                  subject: campaignForm.subject,
                  preheader: campaignForm.previewText,
                  listId: campaignForm.listId ? parseInt(campaignForm.listId) : undefined,
                  htmlContent: campaignForm.content,
                })}
                disabled={createCampaign.isPending || !campaignForm.name || !campaignForm.subject}
              >
                {createCampaign.isPending ? "Creating..." : "Create Campaign"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
