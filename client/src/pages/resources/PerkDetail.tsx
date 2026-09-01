import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PerkDetail() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/resources/perks");
  }, [setLocation]);

  return null;
}
