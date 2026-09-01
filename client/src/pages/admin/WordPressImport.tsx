/**
 * WordPress Import Page
 * Import content from WordPress with URL parity tracking
 */

import { useState, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowRight,
  Link as LinkIcon,
  Clock,
  AlertTriangle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ParsedPost {
  wpId: number;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: string;
  publishedAt?: Date;
}

interface ParsedCategory {
  wpId: number;
  name: string;
  slug: string;
  description?: string;
  parentWpId?: number;
}

interface ParsedTag {
  wpId: number;
  name: string;
  slug: string;
  description?: string;
}

export default function WordPressImport() {
  const [activeTab, setActiveTab] = useState("import");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importOptions, setImportOptions] = useState({
    posts: true,
    pages: false,
    categories: true,
    tags: true,
    authors: true,
    media: true,
    createRedirects: true,
    preserveSlugs: true,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importStep, setImportStep] = useState("");
  const [parsedData, setParsedData] = useState<{
    posts: ParsedPost[];
    categories: ParsedCategory[];
    tags: ParsedTag[];
  } | null>(null);

  // Fetch migration status from API
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = trpc.admin.wpImport.getStatus.useQuery();

  // Import mutations
  const importPostsMutation = trpc.admin.wpImport.importPosts.useMutation();
  const importCategoriesMutation = trpc.admin.wpImport.importCategories.useMutation();
  const importTagsMutation = trpc.admin.wpImport.importTags.useMutation();
  const generateParityMutation = trpc.admin.wpImport.generateParityReport.useMutation();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedData(null);
      parseXMLFile(file);
    }
  };

  const parseXMLFile = async (file: File) => {
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");

      // Parse posts
      const items = xmlDoc.querySelectorAll("item");
      const posts: ParsedPost[] = [];
      const categories: ParsedCategory[] = [];
      const tags: ParsedTag[] = [];
      const categoryMap = new Map<string, ParsedCategory>();
      const tagMap = new Map<string, ParsedTag>();

      items.forEach((item, index) => {
        const postType = item.querySelector("wp\\:post_type, post_type")?.textContent;
        const status = item.querySelector("wp\\:status, status")?.textContent;

        if (postType === "post" && status !== "trash") {
          const title = item.querySelector("title")?.textContent || "";
          const slug = item.querySelector("wp\\:post_name, post_name")?.textContent || "";
          const content = item.querySelector("content\\:encoded, encoded")?.textContent || "";
          const excerpt = item.querySelector("excerpt\\:encoded")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent;
          const wpId = parseInt(item.querySelector("wp\\:post_id, post_id")?.textContent || "0");

          posts.push({
            wpId: wpId || index + 1,
            title,
            slug,
            content,
            excerpt,
            status: status || "draft",
            publishedAt: pubDate ? new Date(pubDate) : undefined,
          });

          // Extract categories from post
          item.querySelectorAll("category").forEach((cat) => {
            const domain = cat.getAttribute("domain");
            const nicename = cat.getAttribute("nicename") || "";
            const name = cat.textContent || "";

            if (domain === "category" && !categoryMap.has(nicename)) {
              categoryMap.set(nicename, {
                wpId: categoryMap.size + 1,
                name,
                slug: nicename,
              });
            } else if (domain === "post_tag" && !tagMap.has(nicename)) {
              tagMap.set(nicename, {
                wpId: tagMap.size + 1,
                name,
                slug: nicename,
              });
            }
          });
        }
      });

      // Also parse wp:category elements if present
      xmlDoc.querySelectorAll("wp\\:category, category").forEach((cat, index) => {
        const name = cat.querySelector("wp\\:cat_name, cat_name")?.textContent;
        const slug = cat.querySelector("wp\\:category_nicename, category_nicename")?.textContent;
        if (name && slug && !categoryMap.has(slug)) {
          categoryMap.set(slug, {
            wpId: index + 1,
            name,
            slug,
            description: cat.querySelector("wp\\:category_description, category_description")?.textContent || undefined,
          });
        }
      });

      // Also parse wp:tag elements if present
      xmlDoc.querySelectorAll("wp\\:tag, tag").forEach((tag, index) => {
        const name = tag.querySelector("wp\\:tag_name, tag_name")?.textContent;
        const slug = tag.querySelector("wp\\:tag_slug, tag_slug")?.textContent;
        if (name && slug && !tagMap.has(slug)) {
          tagMap.set(slug, {
            wpId: index + 1,
            name,
            slug,
            description: tag.querySelector("wp\\:tag_description, tag_description")?.textContent || undefined,
          });
        }
      });

      categories.push(...Array.from(categoryMap.values()));
      tags.push(...Array.from(tagMap.values()));

      setParsedData({ posts, categories, tags });
      toast.success(`Parsed ${posts.length} posts, ${categories.length} categories, ${tags.length} tags`);
    } catch (error) {
      toast.error("Failed to parse XML file");
      console.error("Parse error:", error);
    }
  };

  const startImport = async () => {
    if (!selectedFile || !parsedData) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      let progress = 0;

      // Import categories first
      if (importOptions.categories && parsedData.categories.length > 0) {
        setImportStep("Importing categories...");
        const catResult = await importCategoriesMutation.mutateAsync({
          categories: parsedData.categories,
        });
        toast.success(`Imported ${catResult.imported} categories`);
        progress += 20;
        setImportProgress(progress);
      }

      // Import tags
      if (importOptions.tags && parsedData.tags.length > 0) {
        setImportStep("Importing tags...");
        const tagResult = await importTagsMutation.mutateAsync({
          tags: parsedData.tags,
        });
        toast.success(`Imported ${tagResult.imported} tags`);
        progress += 20;
        setImportProgress(progress);
      }

      // Import posts
      if (importOptions.posts && parsedData.posts.length > 0) {
        setImportStep("Importing posts...");
        const postResult = await importPostsMutation.mutateAsync({
          posts: parsedData.posts,
        });
        toast.success(`Imported ${postResult.imported} posts (${postResult.skipped} skipped, ${postResult.failed} failed)`);
        if (postResult.errors.length > 0) {
          console.error("Import errors:", postResult.errors);
        }
        progress += 60;
        setImportProgress(progress);
      }

      setImportProgress(100);
      setImportStep("Import complete!");
      toast.success("Import completed successfully");
      refetchStatus();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "matched":
        return <Badge variant="outline" className="border-green-500 text-green-500">Matched</Badge>;
      case "redirected":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Redirected</Badge>;
      case "changed":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500">Changed</Badge>;
      case "missing":
        return <Badge variant="outline" className="border-red-500 text-red-500">Missing</Badge>;
      case "success":
        return <Badge variant="outline" className="border-green-500 text-green-500">Success</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-red-500 text-red-500">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate stats from API data
  const stats = statusData?.stats || {
    posts: { total: 0, success: 0, failed: 0 },
    categories: { total: 0, success: 0, failed: 0 },
    tags: { total: 0, success: 0, failed: 0 },
    authors: { total: 0, success: 0, failed: 0 },
    media: { total: 0, success: 0, failed: 0 },
  };

  const logs = statusData?.logs || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">WordPress Import</h1>
            <p className="text-muted-foreground mt-1">
              Migrate content from WordPress with URL preservation
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              Import
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Clock className="h-4 w-4" />
              Migration Log
            </TabsTrigger>
            <TabsTrigger value="parity" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              URL Parity
            </TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload section */}
              <Card>
                <CardHeader>
                  <CardTitle>Upload WordPress Export</CardTitle>
                  <CardDescription>
                    Upload your WordPress XML export file to begin migration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div
                    className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
                      selectedFile
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <input
                      type="file"
                      accept=".xml"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="wp-upload"
                    />
                    <label htmlFor="wp-upload" className="cursor-pointer">
                      {selectedFile ? (
                        <>
                          <FileText className="h-12 w-12 mx-auto text-primary" />
                          <p className="mt-4 font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          {parsedData && (
                            <div className="mt-2 text-sm">
                              <p className="text-green-600">{parsedData.posts.length} posts found</p>
                              <p className="text-blue-600">{parsedData.categories.length} categories</p>
                              <p className="text-purple-600">{parsedData.tags.length} tags</p>
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="mt-4">
                            Change File
                          </Button>
                        </>
                      ) : (
                        <>
                          <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="mt-4 font-medium">
                            Drop your WordPress export file here
                          </p>
                          <p className="text-sm text-muted-foreground">
                            or click to browse
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            Supports .xml files up to 500MB
                          </p>
                        </>
                      )}
                    </label>
                  </div>

                  {isImporting && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{importStep}</span>
                        <span>{Math.round(importProgress)}%</span>
                      </div>
                      <Progress value={importProgress} />
                    </div>
                  )}

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Before importing</AlertTitle>
                    <AlertDescription>
                      Make sure to backup your database. The import will create new
                      content and redirects based on your settings.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Options section */}
              <Card>
                <CardHeader>
                  <CardTitle>Import Options</CardTitle>
                  <CardDescription>
                    Select what content to import from WordPress
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-base">Content Types</Label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="posts"
                          checked={importOptions.posts}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({ ...prev, posts: !!checked }))
                          }
                        />
                        <Label htmlFor="posts" className="cursor-pointer">
                          <span className="block">Posts</span>
                          <span className="text-xs text-muted-foreground">
                            {parsedData?.posts.length || 0} found
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="categories"
                          checked={importOptions.categories}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({ ...prev, categories: !!checked }))
                          }
                        />
                        <Label htmlFor="categories" className="cursor-pointer">
                          <span className="block">Categories</span>
                          <span className="text-xs text-muted-foreground">
                            {parsedData?.categories.length || 0} found
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="tags"
                          checked={importOptions.tags}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({ ...prev, tags: !!checked }))
                          }
                        />
                        <Label htmlFor="tags" className="cursor-pointer">
                          <span className="block">Tags</span>
                          <span className="text-xs text-muted-foreground">
                            {parsedData?.tags.length || 0} found
                          </span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-base">URL Handling</Label>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="redirects"
                          checked={importOptions.createRedirects}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({ ...prev, createRedirects: !!checked }))
                          }
                        />
                        <Label htmlFor="redirects" className="cursor-pointer">
                          <span className="block">Create 301 redirects</span>
                          <span className="text-xs text-muted-foreground">
                            Redirect old WordPress URLs to new locations
                          </span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="slugs"
                          checked={importOptions.preserveSlugs}
                          onCheckedChange={(checked) =>
                            setImportOptions((prev) => ({ ...prev, preserveSlugs: !!checked }))
                          }
                        />
                        <Label htmlFor="slugs" className="cursor-pointer">
                          <span className="block">Preserve URL slugs</span>
                          <span className="text-xs text-muted-foreground">
                            Keep original post slugs where possible
                          </span>
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    disabled={!selectedFile || !parsedData || isImporting}
                    onClick={startImport}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Start Import
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <div className="space-y-6">
              {/* Stats summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Posts</p>
                    <p className="text-2xl font-bold">{stats.posts.total}</p>
                    <p className="text-xs text-green-600">{stats.posts.success} success</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Categories</p>
                    <p className="text-2xl font-bold">{stats.categories.total}</p>
                    <p className="text-xs text-green-600">{stats.categories.success} success</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Tags</p>
                    <p className="text-2xl font-bold">{stats.tags.total}</p>
                    <p className="text-xs text-green-600">{stats.tags.success} success</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Authors</p>
                    <p className="text-2xl font-bold">{stats.authors.total}</p>
                    <p className="text-xs text-green-600">{stats.authors.success} success</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground">Media</p>
                    <p className="text-2xl font-bold">{stats.media.total}</p>
                    <p className="text-xs text-green-600">{stats.media.success} success</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Migration Log</CardTitle>
                    <CardDescription>
                      Recent import activity and results
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchStatus()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {statusLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No import history yet</p>
                      <p className="text-sm">Upload a WordPress export file to get started</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>WP ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Old URL</TableHead>
                          <TableHead>New URL</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.slice(0, 50).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell className="font-mono">{log.wpPostId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.wpPostType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground max-w-[200px] truncate">
                              {log.wpUrl}
                            </TableCell>
                            <TableCell className="font-mono text-sm max-w-[200px] truncate">
                              {log.newUrl || "-"}
                            </TableCell>
                            <TableCell>{getStatusBadge(log.status)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(log.migratedAt).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* URL Parity Tab */}
          <TabsContent value="parity" className="mt-6">
            <div className="space-y-6">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>URL Parity Check</AlertTitle>
                <AlertDescription>
                  This feature compares WordPress URLs with their new locations in TechScoop.
                  Upload a list of WordPress URLs to check their migration status.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>URL Parity Report</CardTitle>
                  <CardDescription>
                    Compare old WordPress URLs with new TechScoop URLs based on migration logs
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <LinkIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No migration data available</p>
                      <p className="text-sm">Import content first to see URL parity</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Old URL</TableHead>
                          <TableHead></TableHead>
                          <TableHead>New URL</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.filter((log: any) => log.status === "success").slice(0, 50).map((log: any) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {log.wpPostType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                              {log.wpUrl}
                            </TableCell>
                            <TableCell>
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {log.newUrl || (
                                <span className="text-red-500">Not found</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.wpUrl !== log.newUrl ? (
                                <Badge variant="outline" className="border-blue-500 text-blue-500">Redirected</Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-500 text-green-500">Matched</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
