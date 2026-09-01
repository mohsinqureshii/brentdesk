import { Package } from "lucide-react";
import { ResourceComingSoon } from "@/components/resources/ResourceComingSoon";

export default function Packs() {
  return (
    <ResourceComingSoon
      title="Starter Packs"
      description="Curated resource bundles to help you launch, fundraise, hire, and grow your startup in the MENA region."
      icon={<Package className="w-8 h-8" />}
    />
  );
}
