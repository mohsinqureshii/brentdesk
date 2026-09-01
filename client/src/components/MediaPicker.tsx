/**
 * MediaPicker Component
 * WordPress-style media picker with upload and library tabs
 */

import { useState, useRef, useCallback } from "react";
import { ImageCropper } from "./ImageCropper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  Upload,
  Search,
  Image as ImageIcon,
  Loader2,
  Check,
  X,
} from "lucide-react";

export interface MediaMetadata {
  id?: number;
  url: string;
  alt: string;
  caption: string;
  title: string;
  description: string;
}

interface MediaPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: MediaMetadata) => void;
  currentImage?: MediaMetadata | null;
}

export function MediaPicker({ open, onOpenChange, onSelect, currentImage }: MediaPickerProps) {
  const [activeTab, setActiveTab] = useState<"upload" | "library">("library");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaMetadata | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<{ name: string; type: string } | null>(null);

  const utils = trpc.useUtils();

  // Fetch media from database - 36 items to fill 6-column grid
  const { data: mediaData, isLoading } = trpc.admin.media.list.useQuery({
    search: search || undefined,
    mimeType: "image",
    page,
    limit: 36,
  });

  // Upload mutation
  const uploadMutation = trpc.admin.media.upload.useMutation({
    onSuccess: (result) => {
      toast.success("Image uploaded successfully");
      utils.admin.media.list.invalidate();
      // Auto-select the uploaded image
      setSelectedMedia({
        id: result.id,
        url: result.url,
        alt: result.alt || "",
        caption: result.caption || "",
        title: result.filename,
        description: "",
      });
      setActiveTab("library");
    },
    onError: (error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Handle file selection - show cropper first
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Read file and show cropper
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageToCrop(dataUrl);
      setPendingFile({ name: file.name, type: file.type });
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle cropped image upload
  const handleCroppedImage = useCallback(async (base64Data: string, mimeType: string) => {
    if (!pendingFile) return;

    setUploading(true);
    setShowCropper(false);
    
    try {
      // Generate filename with crop suffix
      const originalName = pendingFile.name.replace(/\.[^/.]+$/, "");
      const filename = `${originalName}-cropped.jpg`;

      await uploadMutation.mutateAsync({
        filename,
        mimeType,
        base64Data,
        folder: "featured",
      });
    } catch (error) {
      console.error("Upload error:", error);
    }

    setUploading(false);
    setImageToCrop(null);
    setPendingFile(null);
  }, [pendingFile, uploadMutation]);

  const handleSelectFromLibrary = (item: {
    id: number;
    url: string | null;
    alt: string | null;
    caption: string | null;
    filename: string;
  }) => {
    setSelectedMedia({
      id: item.id,
      url: item.url || "",
      alt: item.alt || "",
      caption: item.caption || "",
      title: item.filename,
      description: "",
    });
  };

  const handleConfirm = () => {
    if (selectedMedia) {
      onSelect(selectedMedia);
      onOpenChange(false);
    }
  };

  const mediaItems = mediaData?.items || [];
  const totalPages = mediaData?.totalPages || 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Featured Image</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "library")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload from Computer
            </TabsTrigger>
            <TabsTrigger value="library">
              <ImageIcon className="h-4 w-4 mr-2" />
              Media Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <div 
              className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
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
                    Uploading image...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Drag and drop an image here, or click to select
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Supports: JPG, PNG, GIF, WebP (max 10MB)
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="library" className="mt-4">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search images..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Image Grid */}
              <ScrollArea className="h-[450px]">
                {isLoading ? (
                  <div className="grid grid-cols-6 gap-4">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <ImageIcon className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">No images found</p>
                    <p className="text-sm mt-2">Upload images or try a different search</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-4">
                    {mediaItems.map((item) => (
                      <div
                        key={item.id}
                        className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                          selectedMedia?.id === item.id
                            ? "border-primary ring-2 ring-primary/30"
                            : "border-transparent hover:border-primary/50"
                        }`}
                        onClick={() => handleSelectFromLibrary(item)}
                      >
                        <img
                          src={item.url || ""}
                          alt={item.alt || item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        {selectedMedia?.id === item.id && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

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
          </TabsContent>
        </Tabs>

        {/* Selected Image Details */}
        {selectedMedia && (
          <div className="border-t pt-4 mt-4">
            <h4 className="font-medium mb-3">Image Details</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedMedia.url}
                  alt={selectedMedia.alt}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="col-span-2 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={selectedMedia.title}
                      onChange={(e) => setSelectedMedia({ ...selectedMedia, title: e.target.value })}
                      placeholder="Image title"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Alt Text (SEO)</Label>
                    <Input
                      value={selectedMedia.alt}
                      onChange={(e) => setSelectedMedia({ ...selectedMedia, alt: e.target.value })}
                      placeholder="Describe the image for accessibility"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Caption</Label>
                  <Input
                    value={selectedMedia.caption}
                    onChange={(e) => setSelectedMedia({ ...selectedMedia, caption: e.target.value })}
                    placeholder="Caption displayed below image"
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    value={selectedMedia.description}
                    onChange={(e) => setSelectedMedia({ ...selectedMedia, description: e.target.value })}
                    placeholder="Detailed description (optional)"
                    className="h-16 text-sm resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedMedia}>
            Set Featured Image
          </Button>
        </div>
      </DialogContent>

      {/* Image Cropper Dialog */}
      {imageToCrop && (
        <ImageCropper
          open={showCropper}
          onOpenChange={(open) => {
            setShowCropper(open);
            if (!open) {
              setImageToCrop(null);
              setPendingFile(null);
            }
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCroppedImage}
        />
      )}
    </Dialog>
  );
}
