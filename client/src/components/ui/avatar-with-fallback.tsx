import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarWithFallbackProps {
  src?: string | null;
  alt: string;
  name: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
}

// Generate a consistent color based on the name
function getColorFromName(name: string): string {
  const colors = [
    "bg-orange-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-red-500",
    "bg-yellow-500",
    "bg-cyan-500",
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

// Get initials from name (first letter of first name)
function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}

const sizeClasses = {
  xs: "w-8 h-8 text-xs",
  sm: "w-10 h-10 text-sm",
  md: "w-12 h-12 text-base",
  lg: "w-16 h-16 text-xl",
  xl: "w-20 h-20 text-2xl",
  "2xl": "w-24 h-24 text-3xl",
};

export function AvatarWithFallback({
  src,
  alt,
  name,
  size = "md",
  className,
}: AvatarWithFallbackProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidImage = src && !imageError;
  
  const initial = getInitial(name);
  const bgColor = getColorFromName(name);
  
  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex items-center justify-center flex-shrink-0",
        sizeClasses[size],
        !hasValidImage && bgColor,
        className
      )}
    >
      {hasValidImage ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <span className="font-semibold text-white">{initial}</span>
      )}
    </div>
  );
}

export default AvatarWithFallback;
