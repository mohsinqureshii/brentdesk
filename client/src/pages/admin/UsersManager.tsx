/**
 * Users Manager Admin Page
 * Manage user accounts, roles, and profiles
 */

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search, MoreHorizontal, Shield, User, Users, Crown, Plus, Loader2,
  Trash2, Edit, ExternalLink, Pencil, Key, Eye, EyeOff, Mail,
  Building2, MapPin, Briefcase, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

const roleColors: Record<string, string> = {
  admin: "bg-purple-100 text-purple-700 border-purple-200",
  user: "bg-blue-100 text-blue-700 border-blue-200",
  editor: "bg-orange-100 text-orange-700 border-orange-200",
  senior_editor: "bg-[#EBF3FF] text-[#0066FF] border-[#C7DCFF]",
  author: "bg-cyan-100 text-cyan-700 border-cyan-200",
  moderator: "bg-pink-100 text-pink-700 border-pink-200",
};

const roleLabels: Record<string, string> = {
  admin: "Admin",
  user: "User",
  editor: "Editor",
  senior_editor: "Sr. Editor",
  author: "Author",
  moderator: "Moderator",
};

const roleIcons: Record<string, React.ReactNode> = {
  admin: <Shield className="h-3 w-3" />,
  user: <User className="h-3 w-3" />,
  editor: <Edit className="h-3 w-3" />,
  senior_editor: <Edit className="h-3 w-3" />,
  author: <Pencil className="h-3 w-3" />,
  moderator: <Eye className="h-3 w-3" />,
};

interface EditUserData {
  id: number;
  name: string;
  email: string;
  role: string;
  username: string;
  nickname: string;
  publicName: string;
  jobTitle: string;
  authorBio: string;
  twitterHandle: string;
  linkedinUrl: string;
}

export default function UsersManager() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user" as const, password: "" });
  const [editUser, setEditUser] = useState<EditUserData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [passwordUser, setPasswordUser] = useState<{ id: number; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    page, limit: 20,
    search: search || undefined,
    role: roleFilter !== "all" ? roleFilter : undefined,
  });

  const { data: stats } = trpc.admin.users.stats.useQuery();

  const inviteMutation = trpc.admin.users.invite.useMutation({
    onSuccess: () => {
      toast.success("User created successfully");
      setIsAddDialogOpen(false);
      setNewUser({ name: "", email: "", role: "user", password: "" });
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateUserMutation = trpc.admin.users.update.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setEditUser(null);
      refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const deleteMutation = trpc.admin.users.delete.useMutation({
    onSuccess: () => { toast.success("User deleted"); refetch(); },
    onError: (error) => toast.error(error.message),
  });

  const changePasswordMutation = trpc.admin.users.adminChangePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed");
      setIsPasswordDialogOpen(false);
      setPasswordUser(null);
      setNewPassword("");
    },
    onError: (error) => toast.error(error.message),
  });

  const handleInviteUser = async () => {
    if (!newUser.name || !newUser.email) { toast.error("Please fill in all fields"); return; }
    setIsSubmitting(true);
    try {
      await inviteMutation.mutateAsync({
        name: newUser.name, email: newUser.email,
        role: newUser.role as any, password: newUser.password || undefined,
      });
    } finally { setIsSubmitting(false); }
  };

  const handleChangePassword = (user: { id: number; name: string }) => {
    setPasswordUser(user);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const handleSavePassword = async () => {
    if (!passwordUser || !newPassword) { toast.error("Please enter a new password"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    await changePasswordMutation.mutateAsync({ userId: passwordUser.id, newPassword });
  };

  const handleEditUser = (user: any) => {
    setEditUser({
      id: user.id, name: user.name || "", email: user.email || "",
      role: user.role || "user", username: user.username || "",
      nickname: user.nickname || "", publicName: user.publicName || "",
      jobTitle: user.jobTitle || "", authorBio: user.authorBio || "",
      twitterHandle: user.twitterHandle || "", linkedinUrl: user.linkedinUrl || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editUser) return;
    setIsSubmitting(true);
    try {
      await updateUserMutation.mutateAsync({
        userId: editUser.id, name: editUser.name || undefined,
        role: editUser.role as any, username: editUser.username || undefined,
        nickname: editUser.nickname || undefined, publicName: editUser.publicName || undefined,
        jobTitle: editUser.jobTitle || undefined, authorBio: editUser.authorBio || undefined,
        twitterHandle: editUser.twitterHandle || undefined, linkedinUrl: editUser.linkedinUrl || undefined,
      });
    } finally { setIsSubmitting(false); }
  };

  const handleDeleteUser = (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteMutation.mutate({ userId });
    }
  };

  const users = data?.users || [];
  const pagination = data?.pagination;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Users & Roles</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage user accounts, roles, and author profiles</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-500 hover:bg-[#0066FF]">
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
                <DialogDescription>Create a new user account with role assignment.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="John Doe" value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="john@example.com" value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="senior_editor">Senior Editor</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Optional)</Label>
                  <div className="relative">
                    <Input id="password" type={showNewUserPassword ? "text" : "password"}
                      placeholder="Min 6 characters" value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                    <Button type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}>
                      {showNewUserPassword ? <EyeOff className="h-4 w-4 text-[#9BA3B0]" /> : <Eye className="h-4 w-4 text-[#9BA3B0]" />}
                    </Button>
                  </div>
                  <p className="text-xs text-[#697386]">Leave empty if user will sign in via OAuth</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button className="bg-emerald-500 hover:bg-[#0066FF]" onClick={handleInviteUser} disabled={isSubmitting}>
                  {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-[#697386] uppercase tracking-wider">Total</p>
                  <p className="text-xl font-bold text-[#1A1F36]">{stats?.total || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-purple-50 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-[#697386] uppercase tracking-wider">Admins</p>
                  <p className="text-xl font-bold text-[#1A1F36]">{stats?.admins || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center">
                  <Edit className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-[#697386] uppercase tracking-wider">Editors</p>
                  <p className="text-xl font-bold text-[#1A1F36]">{stats?.editors || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-cyan-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-cyan-50 flex items-center justify-center">
                  <Pencil className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <p className="text-xs text-[#697386] uppercase tracking-wider">Authors</p>
                  <p className="text-xl font-bold text-[#1A1F36]">{stats?.authors || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-[#F7F8FA] flex items-center justify-center">
                  <User className="h-5 w-5 text-[#697386]" />
                </div>
                <div>
                  <p className="text-xs text-[#697386] uppercase tracking-wider">Readers</p>
                  <p className="text-xl font-bold text-[#1A1F36]">{stats?.users || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                <Input placeholder="Search users by name or email..." value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
              </div>
              <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="senior_editor">Senior Editor</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="w-full">
                  <TableHeader>
                    <TableRow className="bg-[#F7F8FA]/50">
                      <TableHead className="min-w-[240px]">User</TableHead>
                      <TableHead className="min-w-[100px]">Role</TableHead>
                      <TableHead className="min-w-[160px] hidden lg:table-cell">Company / Title</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell">Location</TableHead>
                      <TableHead className="min-w-[100px] hidden md:table-cell">Last Active</TableHead>
                      <TableHead className="min-w-[100px]">Joined</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 text-[#C8CDD6]" />
                            <p className="text-[#697386] font-medium">No users found</p>
                            <p className="text-[#9BA3B0] text-sm">Try adjusting your search or filters</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user: any) => (
                        <TableRow key={user.id} className="group hover:bg-[#F7F8FA]/50 cursor-pointer"
                          onClick={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}>
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-10 w-10 shrink-0 ring-2 ring-gray-100">
                                <AvatarImage src={user.avatar || ""} />
                                <AvatarFallback className={`text-sm font-medium ${
                                  user.role === "admin" ? "bg-purple-100 text-purple-600" :
                                  user.role === "editor" || user.role === "senior_editor" ? "bg-orange-100 text-orange-600" :
                                  user.role === "author" ? "bg-cyan-100 text-cyan-600" :
                                  "bg-[#EBF3FF] text-[#0066FF]"
                                }`}>
                                  {(user.name || "U").charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="font-medium text-[#1A1F36] truncate">
                                  {user.publicName || user.name || "Unknown"}
                                </p>
                                <p className="text-xs text-[#697386] truncate">{user.email || "No email"}</p>
                                {user.username && (
                                  <p className="text-xs text-[#0066FF] font-mono">@{user.username}</p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs font-medium border ${roleColors[user.role] || "bg-[#F0F2F5] text-[#1A1F36] border-[#E0E3E8]"}`}>
                              {roleIcons[user.role]}
                              <span className="ml-1">{roleLabels[user.role] || user.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="min-w-0">
                              {user.company && (
                                <div className="flex items-center gap-1 text-sm text-[#1A1F36]">
                                  <Building2 className="h-3 w-3 text-[#9BA3B0] shrink-0" />
                                  <span className="truncate">{user.company}</span>
                                </div>
                              )}
                              {user.jobTitle && (
                                <p className="text-xs text-[#697386] truncate">{user.jobTitle}</p>
                              )}
                              {!user.company && !user.jobTitle && (
                                <span className="text-[#C8CDD6]">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {user.location ? (
                              <div className="flex items-center gap-1 text-sm text-[#697386]">
                                <MapPin className="h-3 w-3 text-[#9BA3B0] shrink-0" />
                                <span className="truncate">{user.location}</span>
                              </div>
                            ) : (
                              <span className="text-[#C8CDD6]">—</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-[#697386]">
                            {user.lastSignedIn ? format(new Date(user.lastSignedIn), "MMM d, yyyy") : (
                              <span className="text-[#C8CDD6]">Never</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-[#697386]">
                            {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "—"}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditUser(user)}>
                                  <Pencil className="h-4 w-4 mr-2" />Edit User
                                </DropdownMenuItem>
                                {user.username && (
                                  <DropdownMenuItem asChild>
                                    <Link href={`/author/${user.username}`} target="_blank">
                                      <ExternalLink className="h-4 w-4 mr-2" />View Profile
                                    </Link>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => toast.info("Email feature coming soon")}>
                                  <Mail className="h-4 w-4 mr-2" />Send Email
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleChangePassword({ id: user.id, name: user.name || 'User' })}>
                                  <Key className="h-4 w-4 mr-2" />Change Password
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteUser(user.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />Delete User
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-sm text-[#697386]">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, pagination.total)} of {pagination.total} users
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                const p = i + 1;
                return (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm"
                    className={p === page ? "bg-emerald-500 hover:bg-[#0066FF]" : ""}
                    onClick={() => setPage(p)}>
                    {p}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user profile information and role settings.</DialogDescription>
            </DialogHeader>
            {editUser && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-name">Display Name</Label>
                    <Input id="edit-name" value={editUser.name}
                      onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email">Email (read-only)</Label>
                    <Input id="edit-email" value={editUser.email} disabled className="bg-[#F7F8FA]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="author">Author</SelectItem>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="senior_editor">Senior Editor</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium text-[#1A1F36] mb-4">Author Profile</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-username">Username (URL slug)</Label>
                        <div className="flex items-center">
                          <span className="text-[#697386] text-sm mr-1">@</span>
                          <Input id="edit-username" placeholder="username" value={editUser.username}
                            onChange={(e) => setEditUser({ ...editUser, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })} />
                        </div>
                        <p className="text-xs text-[#697386]">URL: /author/{editUser.username || 'username'}</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-nickname">Nickname</Label>
                        <Input id="edit-nickname" placeholder="Nickname" value={editUser.nickname}
                          onChange={(e) => setEditUser({ ...editUser, nickname: e.target.value })} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-publicName">Public Name</Label>
                        <Input id="edit-publicName" placeholder="Public display name" value={editUser.publicName}
                          onChange={(e) => setEditUser({ ...editUser, publicName: e.target.value })} />
                        <p className="text-xs text-[#697386]">Shown on articles and author page</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-jobTitle">Job Title</Label>
                        <Input id="edit-jobTitle" placeholder="Senior Reporter" value={editUser.jobTitle}
                          onChange={(e) => setEditUser({ ...editUser, jobTitle: e.target.value })} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-authorBio">Author Bio</Label>
                      <Textarea id="edit-authorBio" placeholder="Author biography..." value={editUser.authorBio}
                        onChange={(e) => setEditUser({ ...editUser, authorBio: e.target.value })} rows={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-twitter">Twitter/X Handle</Label>
                        <div className="flex items-center">
                          <span className="text-[#697386] text-sm mr-1">@</span>
                          <Input id="edit-twitter" placeholder="handle" value={editUser.twitterHandle}
                            onChange={(e) => setEditUser({ ...editUser, twitterHandle: e.target.value.replace('@', '') })} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-linkedin">LinkedIn URL</Label>
                        <Input id="edit-linkedin" placeholder="https://linkedin.com/in/..." value={editUser.linkedinUrl}
                          onChange={(e) => setEditUser({ ...editUser, linkedinUrl: e.target.value })} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-[#0066FF]" onClick={handleSaveUser} disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Password Dialog */}
        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Password</DialogTitle>
              <DialogDescription>Set a new password for {passwordUser?.name || 'this user'}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input id="new-password" type={showPassword ? "text" : "password"}
                    placeholder="Min 6 characters" value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)} />
                  <Button type="button" variant="ghost" size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-[#9BA3B0]" /> : <Eye className="h-4 w-4 text-[#9BA3B0]" />}
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-500 hover:bg-[#0066FF]" onClick={handleSavePassword}
                disabled={changePasswordMutation.isPending || !newPassword}>
                {changePasswordMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
