/**
 * Media Library Page
 * Upload, organize, and manage media files
 */

import { useState, useRef, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  Search,
  Grid,
  List,
  Folder,
  FolderPlus,
  Image,
  FileText,
  Film,
  Music,
  Trash2,
  Download,
  Copy,
  Edit,
  X,
  HardDrive,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface MediaItem {
  id: number;
  filename: string;
  originalFilename: string | null;
  mimeType: string | null;
  size: number | null;
  url: string | null;
  alt: string | null;
  caption: string | null;
  folder: string | null;
  width: number | null;
  height: number | null;
  createdAt: Date | null;
}

export default function MediaLibrary() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("All Files");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFolder, setUploadFolder] = useState("articles");

  const utils = trpc.useUtils();

  // Fetch media from database
  const { data: mediaData, isLoading: mediaLoading, refetch } = trpc.admin.media.list.useQuery({
    search: search || undefined,
    folder: selectedFolder === "All Files" ? undefined : selectedFolder,
    page,
    limit: 50,
  });

  // Fetch folders
  const { data: foldersData } = trpc.admin.media.getFolders.useQuery();

  // Fetch stats
  const { data: statsData } = trpc.admin.media.getStats.useQuery();

  // Upload mutation
  const uploadMutation = trpc.admin.media.upload.useMutation({
    onSuccess: () => {
      toast.success("File uploaded successfully");
      utils.admin.media.list.invalidate();
      utils.admin.media.getStats.invalidate();
      utils.admin.media.getFolders.invalidate();
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = trpc.admin.media.delete.useMutation({
    onSuccess: () => {
      toast.success("File deleted");
      utils.admin.media.list.invalidate();
      utils.admin.media.getStats.invalidate();
      setSelectedMedia(null as any);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = trpc.admin.media.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.deleted} files deleted`);
      utils.admin.media.list.invalidate();
      utils.admin.media.getStats.invalidate();
      setSelectedItems([]);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = trpc.admin.media.update.useMutation({
    onSuccess: () => {
      toast.success("Media updated");
      utils.admin.media.list.invalidate();
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Create folder mutation
  const createFolderMutation = trpc.admin.media.createFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder created");
      setNewFolderDialogOpen(false);
      setNewFolderName("");
      utils.admin.media.getFolders.invalidate();
    },
  });

  // Generate alt text mutation
  const generateAltTextMutation = trpc.admin.media.generateAndSaveAltText.useMutation({
    onSuccess: () => {
      utils.admin.media.list.invalidate();
    },
  });

  const folders: string[] = ["All Files", ...(foldersData || []).filter((f): f is string => f !== null)];
  const mediaItems = mediaData?.items || [];
  const totalItems = mediaData?.total || 0;
  const totalPages = mediaData?.totalPages || 1;

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string | null) => {
    if (!mimeType) return FileText;
    if (mimeType.startsWith("image/")) return Image;
    if (mimeType.startsWith("video/")) return Film;
    if (mimeType.startsWith("audio/")) return Music;
    return FileText;
  };

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    
    for (const file of Array.from(files)) {
      try {
        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            // Remove data URL prefix
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);
        const base64Data = await base64Promise;

        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          base64Data,
          folder: uploadFolder,
        });
      } catch (error) {
        console.error("Upload error:", error);
      }
    }

    setUploading(false);
    setUploadDialogOpen(false);
  }, [uploadMutation, uploadFolder]);

  const copyUrl = (url: string | null) => {
    if (url) {
      navigator.clipboard.writeText(url);
      toast.success("URL copied to clipboard");
    }
  };

  const totalSize = statsData?.totalSize || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Media Library</h1>
            <p className="text-muted-foreground mt-1">
              {totalItems} files • {formatFileSize(totalSize)} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Dialog open={newFolderDialogOpen} onOpenChange={setNewFolderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  New Folder
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Folder</DialogTitle>
                  <DialogDescription>
                    Enter a name for the new folder
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Folder Name</Label>
                    <Input 
                      placeholder="my-folder" 
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewFolderDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => createFolderMutation.mutate({ name: newFolderName })}
                    disabled={!newFolderName}
                  >
                    Create Folder
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Upload Files</DialogTitle>
                  <DialogDescription>
                    Drag and drop files or click to browse
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*,.pdf"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <div 
                    className="border-2 border-dashed border-border rounded-md p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFileUpload(e.dataTransfer.files);
                    }}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          Uploading files...
                        </p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                        <p className="mt-4 text-sm text-muted-foreground">
                          Drag and drop files here, or click to select
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Supports: JPG, PNG, GIF, SVG, WebP, MP4, MP3, PDF (max 50MB)
                        </p>
                      </>
                    )}
                  </div>
                  <div className="mt-4 space-y-2">
                    <Label>Upload to folder</Label>
                    <Select value={uploadFolder} onValueChange={setUploadFolder}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {folders.filter(f => f !== "All Files").map((folder) => (
                          <SelectItem key={folder} value={folder}>
                            {folder}
                          </SelectItem>
                        ))}
                        <SelectItem value="wordpress-import">wordpress-import</SelectItem>
                        <SelectItem value="articles">articles</SelectItem>
                        <SelectItem value="featured">featured</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Folders */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Folders</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-2 space-y-1">
                  {folders.map((folder) => (
                    <button
                      key={folder}
                      onClick={() => {
                        setSelectedFolder(folder);
                        setPage(1);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedFolder === folder
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <Folder className="h-4 w-4" />
                      <span className="flex-1 text-left truncate">{folder}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <HardDrive className="h-4 w-4" />
                  <span>{formatFileSize(totalSize)} used</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              {selectedItems.length > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => bulkDeleteMutation.mutate({ ids: selectedItems })}
                  disabled={bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete ({selectedItems.length})
                </Button>
              )}
            </div>

            {/* Media Grid/List */}
            {mediaLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-md" />
                ))}
              </div>
            ) : mediaItems.length === 0 ? (
              <Card className="p-12 text-center">
                <Image className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No media files</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Upload files to get started
                </p>
                <Button className="mt-4" onClick={() => setUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </Button>
              </Card>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaItems.map((item) => {
                  const FileIcon = getFileIcon(item.mimeType);
                  const isImage = item.mimeType?.startsWith("image/");
                  return (
                    <div
                      key={item.id}
                      className={`group relative aspect-square rounded-md border overflow-hidden cursor-pointer transition-all ${
                        selectedItems.includes(item.id)
                          ? "ring-2 ring-primary"
                          : "hover:ring-2 hover:ring-primary/50"
                      }`}
                      onClick={() => setSelectedMedia(item as any)}
                    >
                      {isImage && item.url ? (
                        <img
                          src={item.url}
                          alt={item.alt || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <FileIcon className="h-12 w-12 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" variant="secondary" onClick={(e) => {
                          e.stopPropagation();
                          copyUrl(item.url);
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="secondary" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMedia(item as any);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="absolute top-2 left-2">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="bg-white/80"
                        />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-xs text-white truncate">{item.filename}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Card>
                <div className="divide-y">
                  {mediaItems.map((item) => {
                    const FileIcon = getFileIcon(item.mimeType);
                    const isImage = item.mimeType?.startsWith("image/");
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-4 p-4 cursor-pointer transition-colors ${
                          selectedItems.includes(item.id)
                            ? "bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                        onClick={() => setSelectedMedia(item as any)}
                      >
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="w-12 h-12 rounded overflow-hidden bg-muted flex items-center justify-center">
                          {isImage && item.url ? (
                            <img
                              src={item.url}
                              alt={item.alt || item.filename}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileIcon className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatFileSize(item.size)} • {item.mimeType}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="icon" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            copyUrl(item.url);
                          }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={(e) => {
                            e.stopPropagation();
                            deleteMutation.mutate({ id: item.id });
                          }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Media Detail Dialog */}
        <Dialog open={!!selectedMedia} onOpenChange={() => setSelectedMedia(null as any)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedMedia && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedMedia.filename}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="aspect-square rounded-md overflow-hidden bg-muted flex items-center justify-center">
                    {selectedMedia.mimeType?.startsWith("image/") && selectedMedia.url ? (
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.alt || selectedMedia.filename}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <FileText className="h-24 w-24 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>File URL</Label>
                      <div className="flex gap-2 mt-1">
                        <Input value={selectedMedia.url || ""} readOnly className="text-xs" />
                        <Button size="icon" variant="outline" onClick={() => copyUrl(selectedMedia.url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Size</Label>
                        <p className="font-medium">{formatFileSize(selectedMedia.size)}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <p className="font-medium">{selectedMedia.mimeType}</p>
                      </div>
                      {selectedMedia.width && selectedMedia.height && (
                        <div>
                          <Label className="text-muted-foreground">Dimensions</Label>
                          <p className="font-medium">{selectedMedia.width} × {selectedMedia.height}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">Folder</Label>
                        <p className="font-medium">{selectedMedia.folder || "None"}</p>
                      </div>
                    </div>
                    <div>
                      <Label className="flex items-center justify-between">
                        <span>Alt Text</span>
                        {selectedMedia.mimeType?.startsWith("image/") && selectedMedia.url && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 text-xs gap-1"
                            onClick={async () => {
                              if (!selectedMedia.url) return;
                              toast.info("Generating alt text with AI...");
                              try {
                                const result = await generateAltTextMutation.mutateAsync({
                                  mediaId: selectedMedia.id,
                                });
                                setSelectedMedia({
                                  ...selectedMedia,
                                  alt: result.altText,
                                  caption: result.caption || selectedMedia.caption,
                                });
                                toast.success("Alt text generated!");
                              } catch (error) {
                                toast.error("Failed to generate alt text");
                              }
                            }}
                            disabled={generateAltTextMutation.isPending}
                          >
                            {generateAltTextMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            Generate with AI
                          </Button>
                        )}
                      </Label>
                      <Input 
                        value={selectedMedia.alt || ""} 
                        placeholder="Describe this image..."
                        onChange={(e) => setSelectedMedia({ ...selectedMedia, alt: e.target.value })}
                      />
                      {!selectedMedia.alt && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                          <AlertCircle className="h-3 w-3" />
                          Missing alt text affects SEO and accessibility
                        </p>
                      )}
                    </div>
                    <div>
                      <Label>Caption</Label>
                      <Textarea 
                        value={selectedMedia.caption || ""} 
                        placeholder="Add a caption..."
                        onChange={(e) => setSelectedMedia({ ...selectedMedia, caption: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    variant="destructive" 
                    onClick={() => {
                      deleteMutation.mutate({ id: selectedMedia.id });
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button 
                    onClick={() => {
                      updateMutation.mutate({
                        id: selectedMedia.id,
                        alt: selectedMedia.alt || undefined,
                        caption: selectedMedia.caption || undefined,
                      });
                      setSelectedMedia(null as any);
                    }}
                    disabled={updateMutation.isPending}
                  >
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
