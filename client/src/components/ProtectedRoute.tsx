/**
 * Protected Route Component
 * - For admin routes: redirects to admin login if not authenticated, or to home if not admin
 * - For user routes: redirects to signin if not authenticated
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      // Not authenticated — redirect to appropriate login
      if (requireAdmin || location.startsWith("/admin")) {
        setLocation("/admin/login");
      } else {
        setLocation("/signin");
      }
      return;
    }

    // Authenticated but not admin — block admin access
    if ((requireAdmin || location.startsWith("/admin")) && user.role !== "admin") {
      setLocation("/dashboard");
    }
  }, [user, loading, setLocation, requireAdmin, location]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#2E7D32] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Block non-admin users from admin routes
  if ((requireAdmin || location.startsWith("/admin")) && user.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
