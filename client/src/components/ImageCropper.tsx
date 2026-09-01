/**
 * ImageCropper Component
 * Crops images to consistent banner size (500px height) for featured images
 */

import { useState, useRef, useCallback, useEffect } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCcw, ZoomIn, Crop as CropIcon } from "lucide-react";

// Target dimensions for featured images
const TARGET_HEIGHT = 500;
const ASPECT_RATIO = 16 / 9; // Standard banner aspect ratio

interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedImageBase64: string, mimeType: string) => void;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const newCrop = centerAspectCrop(width, height, ASPECT_RATIO);
    setCrop(newCrop);
  }, []);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setScale(1);
      setCrop(undefined);
      setCompletedCrop(undefined);
    }
  }, [open]);

  // Generate cropped image
  const getCroppedImage = useCallback(async (): Promise<{ base64: string; mimeType: string } | null> => {
    const image = imgRef.current;
    const canvas = canvasRef.current;

    if (!image || !canvas || !completedCrop) {
      return null;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return null;
    }

    // Calculate the scale factor between displayed image and natural image
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Calculate output dimensions maintaining aspect ratio with target height
    const outputHeight = TARGET_HEIGHT;
    const outputWidth = Math.round(outputHeight * ASPECT_RATIO);

    canvas.width = outputWidth;
    canvas.height = outputHeight;

    // Enable high-quality image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Calculate source coordinates
    const sourceX = completedCrop.x * scaleX;
    const sourceY = completedCrop.y * scaleY;
    const sourceWidth = completedCrop.width * scaleX;
    const sourceHeight = completedCrop.height * scaleY;

    // Draw the cropped and scaled image
    ctx.drawImage(
      image,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    // Convert to base64
    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            resolve({ base64, mimeType: "image/jpeg" });
          };
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.92 // High quality JPEG
      );
    });
  }, [completedCrop]);

  const handleCropAndSave = async () => {
    setIsProcessing(true);
    try {
      const result = await getCroppedImage();
      if (result) {
        onCropComplete(result.base64, result.mimeType);
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error cropping image:", error);
    }
    setIsProcessing(false);
  };

  const handleReset = () => {
    setScale(1);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, ASPECT_RATIO));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5" />
            Crop Featured Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            Images will be cropped to <strong>16:9 aspect ratio</strong> and resized to{" "}
            <strong>{TARGET_HEIGHT}px height</strong> for consistent display across all articles.
          </div>

          {/* Crop area */}
          <div className="flex justify-center bg-muted/30 rounded-lg p-4 max-h-[400px] overflow-auto">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={ASPECT_RATIO}
              minHeight={100}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                style={{
                  transform: `scale(${scale})`,
                  maxHeight: "350px",
                  maxWidth: "100%",
                }}
                onLoad={onImageLoad}
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm flex items-center gap-2">
                  <ZoomIn className="h-4 w-4" />
                  Zoom
                </Label>
                <span className="text-sm text-muted-foreground">{Math.round(scale * 100)}%</span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Output preview info */}
          <div className="text-xs text-muted-foreground text-center">
            Output size: {Math.round(TARGET_HEIGHT * ASPECT_RATIO)} × {TARGET_HEIGHT} pixels
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCropAndSave} disabled={!completedCrop || isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CropIcon className="h-4 w-4 mr-2" />
                Crop & Use Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
