/**
 * Settings Admin Page
 * System configuration and preferences
 */

import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  Globe,
  Bell,
  Shield,
  Database,
  Mail,
  Palette,
  Save,
  RefreshCw,
  ExternalLink,
  Upload,
  Image,
  X,
  Info,
} from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  // Site settings state
  const [siteTitle, setSiteTitle] = useState("");
  const [siteTagline, setSiteTagline] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [timezone, setTimezone] = useState("Asia/Dubai");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [siteFavicon, setSiteFavicon] = useState("");
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(true);
  const [newUserAlerts, setNewUserAlerts] = useState(true);
  const [contentAlerts, setContentAlerts] = useState(false);

  // Fetch settings from API
  const { data: settings, isLoading, refetch } = trpc.admin.seo.site.getSettings.useQuery();
  const updateSettings = trpc.admin.seo.site.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // Media upload mutation
  const uploadMedia = trpc.admin.media.upload.useMutation();

  // Load settings into state when fetched
  useEffect(() => {
    if (settings) {
      setSiteTitle((settings.site_title as string) || "TechScoop");
      setSiteTagline((settings.site_tagline as string) || "");
      setSiteDescription((settings.site_description as string) || "");
      setContactEmail((settings.contact_email as string) || "");
      setTimezone((settings.timezone as string) || "Asia/Dubai");
      setGoogleAnalyticsId((settings.google_analytics_id as string) || "");
      setSiteLogo((settings.site_logo as string) || "");
      setSiteFavicon((settings.site_favicon as string) || "");
    }
  }, [settings]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings.mutateAsync({
        site_title: siteTitle,
        site_tagline: siteTagline,
        site_description: siteDescription,
        contact_email: contactEmail,
        timezone: timezone,
        google_analytics_id: googleAnalyticsId,
        site_logo: siteLogo,
        site_favicon: siteFavicon,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    file: File, 
    type: 'logo' | 'favicon',
    setter: (url: string) => void
  ) => {
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await uploadMedia.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          base64Data: base64,
          folder: 'branding',
        });
        setter(result.url);
        toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-[#9BA3B0]" />
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
            <h1 className="text-xl font-semibold text-[#1A1F36]">Settings</h1>
            <p className="text-[#697386] mt-0.5 text-[13px]">Configure your site preferences and system settings</p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving || updateSettings.isPending}
            className="bg-emerald-500 hover:bg-[#0066FF] text-white"
          >
            {saving || updateSettings.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="general" className="gap-2">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="seo" className="gap-2">
              <Globe className="h-4 w-4" />
              SEO & Analytics
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Information</CardTitle>
                <CardDescription>Basic information about your website</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteTitle">Site Title *</Label>
                    <Input
                      id="siteTitle"
                      value={siteTitle}
                      onChange={(e) => setSiteTitle(e.target.value)}
                      placeholder="Your site name"
                    />
                    <p className="text-xs text-[#697386]">Appears in browser tab and search results</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siteTagline">Tagline</Label>
                    <Input
                      id="siteTagline"
                      value={siteTagline}
                      onChange={(e) => setSiteTagline(e.target.value)}
                      placeholder="A short tagline for your site"
                    />
                    <p className="text-xs text-[#697386]">Brief description shown with site title</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Dubai">Dubai (GMT+4)</SelectItem>
                      <SelectItem value="Asia/Riyadh">Riyadh (GMT+3)</SelectItem>
                      <SelectItem value="Africa/Cairo">Cairo (GMT+2)</SelectItem>
                      <SelectItem value="Asia/Qatar">Qatar (GMT+3)</SelectItem>
                      <SelectItem value="Asia/Kuwait">Kuwait (GMT+3)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>Configure regional preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select defaultValue="en">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Select defaultValue="mdy">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branding Settings */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Logo</CardTitle>
                <CardDescription>Your main site logo displayed in the header</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-[#E0E3E8] rounded-md p-6 text-center">
                      {siteLogo ? (
                        <div className="relative inline-block">
                          <img 
                            src={siteLogo} 
                            alt="Site Logo" 
                            className="max-h-20 max-w-[200px] mx-auto"
                          />
                          <button
                            onClick={() => setSiteLogo("")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 bg-[#EBF3FF] rounded-md mx-auto mb-3 flex items-center justify-center">
                          <Image className="h-8 w-8 text-[#0066FF]" />
                        </div>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/svg+xml,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'logo', setSiteLogo);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => logoInputRef.current?.click()}
                        className="mt-3"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {siteLogo ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                    </div>
                  </div>
                  <div className="w-64 bg-blue-50 rounded-md p-4">
                    <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                      <Info className="h-4 w-4" />
                      Recommended Sizes
                    </div>
                    <ul className="text-sm text-blue-600 space-y-1">
                      <li>• Header: <strong>200 × 50px</strong></li>
                      <li>• High-res: <strong>400 × 100px</strong></li>
                      <li>• Format: PNG, SVG, WebP</li>
                      <li>• Max size: 2MB</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Or enter logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={siteLogo}
                    onChange={(e) => setSiteLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Favicon</CardTitle>
                <CardDescription>Small icon shown in browser tabs and bookmarks</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-6">
                  <div className="flex-1">
                    <div className="border-2 border-dashed border-[#E0E3E8] rounded-md p-6 text-center">
                      {siteFavicon ? (
                        <div className="relative inline-block">
                          <img 
                            src={siteFavicon} 
                            alt="Favicon" 
                            className="w-16 h-16 mx-auto object-contain"
                          />
                          <button
                            onClick={() => setSiteFavicon("")}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-[#F0F2F5] rounded-md mx-auto mb-3 flex items-center justify-center">
                          <span className="text-[#9BA3B0] text-xs">32×32</span>
                        </div>
                      )}
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/png,image/x-icon,image/svg+xml"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'favicon', setSiteFavicon);
                        }}
                      />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => faviconInputRef.current?.click()}
                        className="mt-3"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {siteFavicon ? 'Change Favicon' : 'Upload Favicon'}
                      </Button>
                    </div>
                  </div>
                  <div className="w-64 bg-amber-50 rounded-md p-4">
                    <div className="flex items-center gap-2 text-amber-700 font-medium mb-2">
                      <Info className="h-4 w-4" />
                      Recommended Sizes
                    </div>
                    <ul className="text-sm text-amber-600 space-y-1">
                      <li>• Standard: <strong>32 × 32px</strong></li>
                      <li>• Small: <strong>16 × 16px</strong></li>
                      <li>• Apple Touch: <strong>180 × 180px</strong></li>
                      <li>• Format: ICO, PNG, SVG</li>
                    </ul>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="faviconUrl">Or enter favicon URL</Label>
                  <Input
                    id="faviconUrl"
                    value={siteFavicon}
                    onChange={(e) => setSiteFavicon(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Theme Settings</CardTitle>
                <CardDescription>Customize the look and feel of your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Theme</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <div className="flex gap-2">
                    {["#4CB944", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"].map((color) => (
                      <button
                        key={color}
                        className="w-10 h-10 rounded-md border-2 border-transparent hover:border-[#C8CDD6] transition-colors"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SEO & Analytics Settings */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Default Meta Tags</CardTitle>
                <CardDescription>Default SEO settings for pages without custom meta tags</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaDescription">Default Meta Description</Label>
                  <Textarea
                    id="metaDescription"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                    placeholder="A brief description for search engines"
                    rows={3}
                  />
                  <p className="text-xs text-[#697386]">{siteDescription.length}/160 characters recommended</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google Analytics</CardTitle>
                <CardDescription>Connect your Google Analytics to track site traffic</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gaId">Google Analytics 4 Measurement ID</Label>
                  <Input
                    id="gaId"
                    value={googleAnalyticsId}
                    onChange={(e) => setGoogleAnalyticsId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                  <p className="text-xs text-[#697386]">
                    Find this in your Google Analytics account under Admin → Data Streams → Web
                  </p>
                </div>
                <div className="bg-[#F7F8FA] rounded-md p-4 text-sm">
                  <p className="font-medium text-[#1A1F36] mb-2">How to get your Measurement ID:</p>
                  <ol className="list-decimal list-inside text-[#697386] space-y-1">
                    <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Analytics</a></li>
                    <li>Click Admin (gear icon) in the bottom left</li>
                    <li>Select your property, then click "Data Streams"</li>
                    <li>Click on your web stream</li>
                    <li>Copy the Measurement ID (starts with G-)</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>Configure when you receive email notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-[#697386]">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Digest</p>
                    <p className="text-sm text-[#697386]">Receive a weekly summary of activity</p>
                  </div>
                  <Switch
                    checked={weeklyDigest}
                    onCheckedChange={setWeeklyDigest}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New User Alerts</p>
                    <p className="text-sm text-[#697386]">Get notified when new users sign up</p>
                  </div>
                  <Switch
                    checked={newUserAlerts}
                    onCheckedChange={setNewUserAlerts}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Content Submission Alerts</p>
                    <p className="text-sm text-[#697386]">Get notified when content is submitted for review</p>
                  </div>
                  <Switch
                    checked={contentAlerts}
                    onCheckedChange={setContentAlerts}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
