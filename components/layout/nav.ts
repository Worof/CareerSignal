import { BarChart3, BriefcaseBusiness, FileText, LayoutDashboard, Settings, Sparkles, Users } from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/audience", label: "Audience Intelligence", icon: Users },
  { href: "/content", label: "Content Intelligence", icon: FileText },
  { href: "/opportunities", label: "Opportunities", icon: BriefcaseBusiness },
  { href: "/insights", label: "AI Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;
