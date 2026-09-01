import { useEffect } from "react";
import { useLocation } from "wouter";

export default function PlaybookDetail() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/resources/playbooks");
  }, [setLocation]);

  return null;
}
