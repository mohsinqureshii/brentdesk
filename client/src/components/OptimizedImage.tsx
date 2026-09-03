/**
 * OptimizedImage Component
 * Provides lazy loading, WebP support, and Core Web Vitals optimization
 */

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean; // Load immediately for above-the-fold images
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
  sizes?: string;
  aspectRatio?: string;
}

/**
 * Generate srcset for responsive images
 */
function generateSrcSet(src: string): string {
  // If it's an Unsplash image, use their resize API
  if (src.includes('unsplash.com')) {
    const widths = [320, 640, 768, 1024, 1280, 1920];
    return widths
      .map(w => {
        const url = new URL(src);
        url.searchParams.set('w', w.toString());
        url.searchParams.set('auto', 'format');
        url.searchParams.set('fit', 'crop');
        url.searchParams.set('q', '80');
        return `${url.toString()} ${w}w`;
      })
      .join(', ');
  }
  
  // For S3/other images, return original
  return src;
}

/**
 * Convert image URL to WebP if supported
 */
function getOptimizedUrl(src: string): string {
  // Unsplash automatically serves WebP when format=auto
  if (src.includes('unsplash.com')) {
    const url = new URL(src);
    url.searchParams.set('auto', 'format');
    url.searchParams.set('q', '80');
    return url.toString();
  }
  return src;
}

/**
 * Generate a low-quality placeholder
 */
function getPlaceholderUrl(src: string): string {
  if (src.includes('unsplash.com')) {
    const url = new URL(src);
    url.searchParams.set('w', '20');
    url.searchParams.set('q', '10');
    url.searchParams.set('blur', '20');
    return url.toString();
  }
  return '';
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  placeholder = 'empty',
  blurDataURL,
  onLoad,
  onError,
  sizes = '100vw',
  aspectRatio,
}: OptimizedImageProps) {
  const t = useT();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '200px', // Start loading 200px before entering viewport
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const optimizedSrc = getOptimizedUrl(src);
  const placeholderSrc = blurDataURL || (placeholder === 'blur' ? getPlaceholderUrl(src) : '');
  const srcSet = generateSrcSet(src);

  // Fallback for error state
  if (hasError) {
    return (
      <div
        className={cn(
          'bg-muted flex items-center justify-center text-muted-foreground',
          className
        )}
        style={{ width, height, aspectRatio }}
      >
        <span className="text-sm">{t("state.imageUnavailable")}</span>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={cn('relative overflow-hidden', className)}
      style={{ width, height, aspectRatio }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && placeholderSrc && !isLoaded && (
        <img
          src={placeholderSrc}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-lg"
        />
      )}

      {/* Main image */}
      {isInView && (
        <img
          src={optimizedSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Loading skeleton */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
}

/**
 * Preload critical images for LCP optimization
 */
export function preloadImage(src: string): void {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedUrl(src);
  document.head.appendChild(link);
}

/**
 * Hook to preload images on mount
 */
export function usePreloadImages(srcs: string[]): void {
  useEffect(() => {
    srcs.forEach(preloadImage);
  }, [srcs]);
}

export default OptimizedImage;
