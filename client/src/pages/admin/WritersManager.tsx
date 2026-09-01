/**
 * Writers Manager - Admin page for managing writer applications, profiles, and payouts
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
  PenTool,
  Users,
  DollarSign,
  FileText,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  UserCheck,
  UserX,
  TrendingUp,
  Award,
  Wallet,
} from "lucide-react";

const writerTiers = [
  { value: "new", label: "New Writer", rate: "40%", color: "bg-[#F0F2F5] text-[#1A1F36]" },
  { value: "regular", label: "Regular", rate: "50%", color: "bg-blue-100 text-blue-700" },
  { value: "senior", label: "Senior", rate: "60%", color: "bg-purple-100 text-purple-700" },
  { value: "expert", label: "Expert", rate: "70%", color: "bg-amber-100 text-amber-700" },
];

export default function WritersManager() {
  const [activeTab, setActiveTab] = useState("applications");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");

  // Fetch data
  const { data: applicationsData, isLoading: applicationsLoading, refetch: refetchApplications } = 
    trpc.admin.writers.listApplications.useQuery({ status: "pending", limit: 100 });
  
  const { data: writersData, isLoading: writersLoading, refetch: refetchWriters } = 
    trpc.admin.writers.listProfiles.useQuery({ limit: 100 });
  
  const { data: earningsData } = 
    trpc.admin.writers.getWriterStats.useQuery();

  // Mutations
  const reviewApplication = trpc.admin.writers.reviewApplication.useMutation({
    onSuccess: () => {
      toast.success("Application reviewed successfully");
      setIsReviewDialogOpen(false);
      refetchApplications();
      setSelectedApplication(null);
      setReviewNotes("");
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateWriterProfile = trpc.admin.writers.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Writer tier updated");
      refetchWriters();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Filter applications
  const filteredApplications = applicationsData?.applications?.filter((app: any) =>
    app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Filter writers
  const filteredWriters = writersData?.profiles?.filter((writer: any) =>
    writer.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    writer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
      under_review: { color: "bg-blue-100 text-blue-700", icon: Eye },
      approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const tierConfig = writerTiers.find(t => t.value === tier) || writerTiers[0];
    return (
      <Badge className={tierConfig.color}>
        <Award className="h-3 w-3 mr-1" />
        {tierConfig.label} ({tierConfig.rate})
      </Badge>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Writers Manager</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage writer applications, profiles, and earnings</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <FileText className="h-8 w-8 text-yellow-500" />
                <span className="text-3xl font-bold">{applicationsData?.total || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active Writers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-3xl font-bold">{writersData?.total || 0}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Earnings (This Month)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-8 w-8 text-green-500" />
                <span className="text-3xl font-bold">
                  ${earningsData?.earnings?.totalRevenue?.toLocaleString() || 0}
                </span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="h-8 w-8 text-purple-500" />
                <span className="text-3xl font-bold">
                  ${earningsData?.earnings?.pendingPayouts?.toLocaleString() || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="applications">
                <FileText className="h-4 w-4 mr-2" />
                Applications
                {(applicationsData?.total ?? 0) > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {applicationsData?.total ?? 0}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="writers">
                <PenTool className="h-4 w-4 mr-2" />
                Writers
              </TabsTrigger>
              <TabsTrigger value="earnings">
                <DollarSign className="h-4 w-4 mr-2" />
                Earnings
              </TabsTrigger>
              <TabsTrigger value="payouts">
                <Wallet className="h-4 w-4 mr-2" />
                Payouts
              </TabsTrigger>
            </TabsList>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
              <Input
                placeholder="Search..."
                className="pl-9 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Applications Tab */}
          <TabsContent value="applications" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Applicant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Expertise</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationsLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          Loading applications...
                        </TableCell>
                      </TableRow>
                    ) : filteredApplications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-[#697386]">
                          No pending applications
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredApplications.map((app: any) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.fullName}</TableCell>
                          <TableCell>{app.email}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {app.expertiseAreas?.slice(0, 2).map((area: string) => (
                                <Badge key={area} variant="outline" className="text-xs">
                                  {area}
                                </Badge>
                              ))}
                              {app.expertiseAreas?.length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{app.expertiseAreas.length - 2}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell>
                            {new Date(app.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedApplication(app);
                                  setIsReviewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-green-600"
                                onClick={() => {
                                  if (confirm("Approve this application?")) {
                                    reviewApplication.mutate({
                                      applicationId: app.id,
                                      status: "approved",
                                    });
                                  }
                                }}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-red-600"
                                onClick={() => {
                                  if (confirm("Reject this application?")) {
                                    reviewApplication.mutate({
                                      applicationId: app.id,
                                      status: "rejected",
                                    });
                                  }
                                }}
                              >
                                <UserX className="h-4 w-4" />
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

          {/* Writers Tab */}
          <TabsContent value="writers" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Writer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Articles</TableHead>
                      <TableHead>Total Earnings</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {writersLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          Loading writers...
                        </TableCell>
                      </TableRow>
                    ) : filteredWriters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-[#697386]">
                          No writers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredWriters.map((writer: any) => (
                        <TableRow key={writer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {writer.avatar ? (
                                <img 
                                  src={writer.avatar} 
                                  alt={writer.displayName}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#E0E3E8] flex items-center justify-center">
                                  <PenTool className="h-4 w-4 text-[#697386]" />
                                </div>
                              )}
                              <span className="font-medium">{writer.displayName}</span>
                            </div>
                          </TableCell>
                          <TableCell>{writer.email}</TableCell>
                          <TableCell>
                            <Select
                              value={writer.tier || "new"}
                              onValueChange={(value) => {
                                updateWriterProfile.mutate({
                                  userId: writer.userId,
                                  tier: value as any,
                                });
                              }}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {writerTiers.map((tier) => (
                                  <SelectItem key={tier.value} value={tier.value}>
                                    {tier.label} ({tier.rate})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>{writer.articleCount || 0}</TableCell>
                          <TableCell className="font-medium text-green-600">
                            ${writer.totalEarnings?.toLocaleString() || 0}
                          </TableCell>
                          <TableCell>
                            {new Date(writer.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Overview</CardTitle>
                <CardDescription>
                  Track article earnings and revenue share across all writers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-4 bg-[#F7F8FA] rounded-md">
                    <p className="text-sm text-[#697386]">Total Revenue (All Time)</p>
                    <p className="text-2xl font-bold">${earningsData?.earnings?.totalRevenue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-[#F7F8FA] rounded-md">
                    <p className="text-sm text-[#697386]">Writer Earnings (All Time)</p>
                    <p className="text-2xl font-bold">${earningsData?.earnings?.totalWriterEarnings?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-4 bg-[#F7F8FA] rounded-md">
                    <p className="text-sm text-[#697386]">Pending Payouts</p>
                    <p className="text-2xl font-bold">${earningsData?.earnings?.pendingPayouts?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Payout Management</CardTitle>
                <CardDescription>
                  Process and track writer payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-[#697386] text-center py-8">
                  Payout processing coming soon. Currently managed manually.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Review Application Dialog */}
        <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application</DialogTitle>
              <DialogDescription>
                Review the writer application details
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[#697386]">Full Name</Label>
                    <p className="font-medium">{selectedApplication.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-[#697386]">Email</Label>
                    <p className="font-medium">{selectedApplication.email}</p>
                  </div>
                </div>
                <div>
                  <Label className="text-[#697386]">Expertise Areas</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedApplication.expertiseAreas?.map((area: string) => (
                      <Badge key={area} variant="outline">{area}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#697386]">Writing Samples</Label>
                  <div className="mt-1 space-y-1">
                    {selectedApplication.writingSamples?.map((sample: string, i: number) => (
                      <a 
                        key={i}
                        href={sample}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-blue-600 hover:underline text-sm"
                      >
                        {sample}
                      </a>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-[#697386]">Why They Want to Join</Label>
                  <p className="mt-1 text-sm">{selectedApplication.whyJoin}</p>
                </div>
                <div>
                  <Label htmlFor="reviewNotes">Review Notes (Optional)</Label>
                  <Textarea
                    id="reviewNotes"
                    placeholder="Add notes about this application..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => {
                  reviewApplication.mutate({
                    applicationId: selectedApplication.id,
                    status: "rejected",
                    reviewNotes,
                  });
                }}
                disabled={reviewApplication.isPending}
              >
                <UserX className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button 
                onClick={() => {
                  reviewApplication.mutate({
                    applicationId: selectedApplication.id,
                    status: "approved",
                    reviewNotes,
                  });
                }}
                disabled={reviewApplication.isPending}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Approve
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
