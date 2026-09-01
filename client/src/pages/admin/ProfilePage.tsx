/**
 * User Profile Page
 * Allows logged-in users to view and update their profile information
 */

import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Mail,
  Briefcase,
  Twitter,
  Linkedin,
  Camera,
  Loader2,
  Save,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Link } from "wouter";

export default function ProfilePage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    nickname: "",
    publicName: "",
    jobTitle: "",
    bio: "",
    authorBio: "",
    twitterHandle: "",
    linkedinUrl: "",
    avatar: "",
  });

  // Fetch current user profile
  const { data: profile, isLoading, refetch } = trpc.admin.users.getMyProfile.useQuery();

  // Update profile mutation
  const updateProfileMutation = trpc.admin.users.updateMyProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Populate form when profile data loads
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name || "",
        username: profile.username || "",
        nickname: profile.nickname || "",
        publicName: profile.publicName || "",
        jobTitle: profile.jobTitle || "",
        bio: profile.bio || "",
        authorBio: profile.authorBio || "",
        twitterHandle: profile.twitterHandle || "",
        linkedinUrl: profile.linkedinUrl || "",
        avatar: profile.avatar || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateProfileMutation.mutateAsync({
        name: formData.name || undefined,
        username: formData.username || undefined,
        nickname: formData.nickname || undefined,
        publicName: formData.publicName || undefined,
        jobTitle: formData.jobTitle || undefined,
        bio: formData.bio || undefined,
        authorBio: formData.authorBio || undefined,
        twitterHandle: formData.twitterHandle || undefined,
        linkedinUrl: formData.linkedinUrl || undefined,
        avatar: formData.avatar || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[#1A1F36]">My Profile</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Manage your profile information and public author page</p>
          </div>
          <div className="flex gap-2">
            {formData.username && (
              <Button variant="outline" asChild>
                <Link href={`/author/${formData.username}`} target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Public Profile
                </Link>
              </Button>
            )}
            <Button
              className="bg-emerald-500 hover:bg-[#0066FF]"
              onClick={handleSave}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Profile Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={formData.avatar} alt={formData.name} />
                  <AvatarFallback className="text-2xl bg-[#EBF3FF] text-[#0066FF]">
                    {getInitials(formData.name || "U")}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white"
                  onClick={() => toast.info("Avatar upload coming soon")}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              {/* Basic Info */}
              <div className="flex-1 space-y-1">
                <h2 className="text-xl font-semibold text-[#1A1F36]">
                  {formData.publicName || formData.name || "User"}
                </h2>
                <p className="text-[#697386]">{profile?.email}</p>
                {formData.jobTitle && (
                  <p className="text-[#0066FF] font-medium">{formData.jobTitle}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 capitalize">
                    {profile?.role}
                  </span>
                  {profile?.loginMethod === "password" && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      Password Login
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList>
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="author">Author Profile</TabsTrigger>
            <TabsTrigger value="social">Social Links</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Your personal information used across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Nickname</Label>
                    <Input
                      id="nickname"
                      placeholder="Johnny"
                      value={formData.nickname}
                      onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ""}
                    disabled
                    className="bg-[#F7F8FA]"
                  />
                  <p className="text-xs text-[#697386]">Email cannot be changed</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Short Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="A brief description about yourself..."
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="author">
            <Card>
              <CardHeader>
                <CardTitle>Author Profile</CardTitle>
                <CardDescription>
                  Information displayed on your public author page
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username (URL)</Label>
                    <div className="flex items-center">
                      <span className="text-[#697386] text-sm mr-1">@</span>
                      <Input
                        id="username"
                        placeholder="johndoe"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                      />
                    </div>
                    <p className="text-xs text-[#697386]">
                      Your profile URL: techscoop.com/author/{formData.username || "username"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="publicName">Public Display Name</Label>
                    <Input
                      id="publicName"
                      placeholder="John Doe"
                      value={formData.publicName}
                      onChange={(e) => setFormData({ ...formData, publicName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Senior Reporter"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="authorBio">Author Bio</Label>
                  <Textarea
                    id="authorBio"
                    placeholder="A detailed bio for your author profile page..."
                    value={formData.authorBio}
                    onChange={(e) => setFormData({ ...formData, authorBio: e.target.value })}
                    rows={5}
                  />
                  <p className="text-xs text-[#697386]">
                    This bio is displayed on your public author page
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="social">
            <Card>
              <CardHeader>
                <CardTitle>Social Links</CardTitle>
                <CardDescription>
                  Connect your social media profiles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="twitter">Twitter/X Handle</Label>
                  <div className="flex items-center gap-2">
                    <Twitter className="h-5 w-5 text-[#9BA3B0]" />
                    <span className="text-[#697386]">@</span>
                    <Input
                      id="twitter"
                      placeholder="johndoe"
                      value={formData.twitterHandle}
                      onChange={(e) => setFormData({ ...formData, twitterHandle: e.target.value.replace('@', '') })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linkedin">LinkedIn Profile</Label>
                  <div className="flex items-center gap-2">
                    <Linkedin className="h-5 w-5 text-[#9BA3B0]" />
                    <Input
                      id="linkedin"
                      placeholder="https://linkedin.com/in/johndoe"
                      value={formData.linkedinUrl}
                      onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar">Avatar URL</Label>
                  <Input
                    id="avatar"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar}
                    onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
                  />
                  <p className="text-xs text-[#697386]">
                    Enter a URL to your profile picture
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
