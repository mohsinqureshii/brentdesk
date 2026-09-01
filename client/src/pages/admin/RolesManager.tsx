/**
 * RBAC Roles Manager Page
 * Manage system and external roles with permissions
 */

import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
// Switch removed - not used
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Users,
  Lock,
  ChevronRight,
  Search,
  RefreshCw,
} from "lucide-react";

export default function RolesManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("system");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    description: "",
    parentRoleId: undefined as number | undefined,
  });

  // Fetch roles
  const { data: rolesData, isLoading, refetch } = trpc.admin.rbac.listRoles.useQuery();
  const { data: permissionsData } = trpc.admin.rbac.listPermissions.useQuery();

  // Mutations
  const createRole = trpc.admin.rbac.createRole.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      setIsCreateDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const updateRole = trpc.admin.rbac.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      setIsEditDialogOpen(false);
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  // Note: deleteRole not implemented in router - roles should not be deleted

  const assignPermission = trpc.admin.rbac.assignPermissionToRole.useMutation({
    onSuccess: () => {
      toast.success("Permission assigned successfully");
      refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const resetForm = () => {
setFormData({
      name: "",
      displayName: "",
      description: "",
      parentRoleId: undefined as number | undefined,
    });
  };

  const handleCreate = () => {
    createRole.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedRole) return;
    updateRole.mutate({
      id: selectedRole.id,
      ...formData,
    });
  };

  const handleDelete = (role: any) => {
    if (role.roleType === 'system') {
      toast.error("Cannot delete system roles");
      return;
    }
    toast.info("Role deletion is disabled for safety");
  };

  const openEditDialog = (role: any) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      displayName: role.displayName,
      description: role.description || "",
      parentRoleId: role.parentRoleId || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const openPermissionsDialog = (role: any) => {
    setSelectedRole(role);
    setIsPermissionsDialogOpen(true);
  };

  // Filter roles
  const systemRoles = rolesData?.filter((r: any) => r.roleType === 'system') || [];
  const externalRoles = rolesData?.filter((r: any) => r.roleType === 'external') || [];

  const filteredRoles = (activeTab === "system" ? systemRoles : externalRoles).filter(
    (role: any) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group permissions by resource - use pre-grouped data from API
  const groupedPermissions = (permissionsData as any)?.grouped || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">Roles Management</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">
              Manage system and external roles with their permissions
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Role
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Shield className="h-8 w-8 text-[#0066FF]" />
                <span className="text-3xl font-bold">{systemRoles.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">External Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-500" />
                <span className="text-3xl font-bold">{externalRoles.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-[#697386]">Total Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Lock className="h-8 w-8 text-purple-500" />
                <span className="text-3xl font-bold">{(permissionsData as any)?.permissions?.length || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="system">System Roles</TabsTrigger>
                  <TabsTrigger value="external">External Roles</TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9BA3B0]" />
                  <Input
                    placeholder="Search roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-[#9BA3B0]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Parent Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoles.map((role: any) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-md ${role.roleType === 'system' ? "bg-[#EBF3FF]" : "bg-blue-100"}`}>
                            <Shield className={`h-4 w-4 ${role.roleType === 'system' ? "text-[#0066FF]" : "text-blue-600"}`} />
                          </div>
                          <div>
                            <p className="font-medium">{role.displayName}</p>
                            <p className="text-sm text-[#697386]">{role.name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm text-[#697386] max-w-xs truncate">
                          {role.description || "-"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {role.parentRoleId ? (
                          <Badge variant="outline">
                            {rolesData?.find((r: any) => r.id === role.parentRoleId)?.displayName || "Unknown"}
                          </Badge>
                        ) : (
                          <span className="text-[#9BA3B0]">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPermissionsDialog(role)}
                        >
                          <Lock className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(role)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {role.roleType !== 'system' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRoles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-[#697386]">
                        No roles found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Role Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Add a new role to the system with specific permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Role Name (slug)</Label>
                <Input
                  id="name"
                  placeholder="e.g., content_manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  placeholder="e.g., Content Manager"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role's responsibilities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="parentRole">Parent Role (Optional)</Label>
                <Select
                  value={formData.parentRoleId?.toString() || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parentRoleId: value === "none" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {rolesData?.map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={createRole.isPending}>
                {createRole.isPending ? "Creating..." : "Create Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Role Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Role</DialogTitle>
              <DialogDescription>
                Update role details and settings
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Role Name (slug)</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  disabled={selectedRole?.isSystem}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-displayName">Display Name</Label>
                <Input
                  id="edit-displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-parentRole">Parent Role (Optional)</Label>
                <Select
                  value={formData.parentRoleId?.toString() || "none"}
                  onValueChange={(value) => setFormData({ ...formData, parentRoleId: value === "none" ? undefined : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select parent role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {rolesData?.filter((r: any) => r.id !== selectedRole?.id).map((role: any) => (
                      <SelectItem key={role.id} value={role.id.toString()}>
                        {role.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateRole.isPending}>
                {updateRole.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={isPermissionsDialogOpen} onOpenChange={setIsPermissionsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>
                Manage Permissions - {selectedRole?.displayName}
              </DialogTitle>
              <DialogDescription>
                Select the permissions this role should have access to
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6">
                {Object.entries(groupedPermissions).map(([resource, perms]: [string, any]) => (
                  <div key={resource} className="space-y-3">
                    <h4 className="font-medium text-[#1A1F36] capitalize flex items-center gap-2">
                      <ChevronRight className="h-4 w-4" />
                      {resource.replace(/_/g, " ")}
                    </h4>
                    <div className="grid grid-cols-2 gap-2 ml-6">
                      {perms.map((perm: any) => (
                        <div key={perm.id} className="flex items-center space-x-2">
                          <Checkbox id={`perm-${perm.id}`} />
                          <label
                            htmlFor={`perm-${perm.id}`}
                            className="text-sm text-[#697386] cursor-pointer"
                          >
                            {perm.action} ({perm.scope})
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPermissionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => toast.info("Permissions saved")}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
