import { Building2 } from "lucide-react";
import { ResourceComingSoon } from "@/components/resources/ResourceComingSoon";

export default function Vendors() {
  return (
    <ResourceComingSoon
      title="Vendors & Partners"
      description="Vetted service providers for legal, accounting, design, development, and marketing — trusted by MENA startups."
      icon={<Building2 className="w-8 h-8" />}
    />
  );
}
