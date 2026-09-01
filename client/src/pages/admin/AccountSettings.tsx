/**
 * Account Settings Page
 * Allows logged-in users to manage their account security including password
 */

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Key,
  Shield,
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  User,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AccountSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch current user profile to check login method
  const { data: profile, isLoading } = trpc.admin.users.getMyProfile.useQuery();

  // Change password mutation
  const changePasswordMutation = trpc.admin.users.changeOwnPassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Please enter your current password");
      return;
    }
    if (!newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    await changePasswordMutation.mutateAsync({
      currentPassword,
      newPassword,
    });
  };

  const hasPassword = profile?.loginMethod === "password";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-[#0066FF]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-semibold text-[#1A1F36]">Account Settings</h1>
          <p className="text-[#697386] mt-0.5 text-[13px]">Manage your account security and preferences</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 border-b pb-4">
          <Link href="/admin/profile">
            <Button variant="ghost" className="text-[#697386] gap-2">
              <User className="h-4 w-4" />
              Profile
            </Button>
          </Link>
          <Button variant="ghost" className="text-[#0066FF] border-b-2 border-[#0066FF] rounded-none gap-2">
            <Shield className="h-4 w-4" />
            Security
          </Button>
        </div>

        {/* Password Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#0066FF]" />
              <CardTitle>Password</CardTitle>
            </div>
            <CardDescription>
              Change your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasPassword ? (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">No Password Set</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Your account uses OAuth login. Contact an administrator to set up a password for your account.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700">Password authentication is enabled</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="Enter your current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-[#9BA3B0]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#9BA3B0]" />
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password (min 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-[#9BA3B0]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#9BA3B0]" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-[#9BA3B0]" />
                      ) : (
                        <Eye className="h-4 w-4 text-[#9BA3B0]" />
                      )}
                    </Button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <div className="pt-4">
                  <Button
                    className="bg-emerald-500 hover:bg-[#0066FF]"
                    onClick={handleChangePassword}
                    disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Change Password
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#0066FF]" />
              <CardTitle>Account Security</CardTitle>
            </div>
            <CardDescription>
              Information about your account security
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#F7F8FA] rounded-md">
                <p className="text-sm text-[#697386]">Login Method</p>
                <p className="font-medium text-[#1A1F36] capitalize">
                  {profile?.loginMethod || "OAuth"}
                </p>
              </div>
              <div className="p-4 bg-[#F7F8FA] rounded-md">
                <p className="text-sm text-[#697386]">Account Role</p>
                <p className="font-medium text-[#1A1F36] capitalize">
                  {profile?.role?.replace("_", " ") || "User"}
                </p>
              </div>
              <div className="p-4 bg-[#F7F8FA] rounded-md">
                <p className="text-sm text-[#697386]">Account Created</p>
                <p className="font-medium text-[#1A1F36]">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "Unknown"}
                </p>
              </div>
              <div className="p-4 bg-[#F7F8FA] rounded-md">
                <p className="text-sm text-[#697386]">Last Sign In</p>
                <p className="font-medium text-[#1A1F36]">
                  {profile?.lastSignedIn ? new Date(profile.lastSignedIn).toLocaleDateString() : "Unknown"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
