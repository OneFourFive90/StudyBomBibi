"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Library, BookOpen, GraduationCap, Bot, X, LayoutDashboard} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Personalized Learning System",
    href: "/study-planner",
    icon: BookOpen,
  },
  {
    title: "My Library",
    href: "/library",
    icon: Library,
  },
  {
    title: "Exam Prep",
    href: "/exam-prep",
    icon: GraduationCap,
  },
  {
    title: "AI Assistant",
    href: "/assistant",
    icon: Bot,
  },
];

interface SidebarProps {
  className?: string;
  onLinkClick?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ className, onLinkClick, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-col h-full bg-card text-card-foreground transition-all duration-300", className)}>
      <div
        className={cn(
          "flex items-center border-b h-16 shrink-0 transition-all duration-300",
          isCollapsed ? "justify-center p-2" : "justify-between p-6"
        )}
      >
        <Link href="/" className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center" : "space-x-2")}>
          <Image src="/favicon.ico" alt="Logo" width={24} height={24} />
          {!isCollapsed && <span className="text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden">StudyBomBibi</span>}
        </Link>
        
        {/* Mobile close button */}
        {onLinkClick && (
          <button onClick={onLinkClick} className="md:hidden ml-auto">
            <X className="h-5 w-5" />
          </button>
        )}
        
        {/* Desktop collapse toggle (only if onToggleCollapse is provided) */}
        {!onLinkClick && onToggleCollapse && !isCollapsed && (
           <div className="w-8 ml-auto" /> 
        )}
      </div>

      <nav className={cn("flex-1 py-4 space-y-2 overflow-y-auto overflow-x-hidden", isCollapsed ? "px-2" : "px-4")}>
        {sidebarNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onLinkClick}
            title={isCollapsed ? item.title : undefined}
            className={cn(
              "flex items-center rounded-lg transition-colors text-sm font-medium h-10 group relative",
              isCollapsed ? "justify-center px-0" : "justify-start px-4 space-x-3",
              pathname === item.href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5 shrink-0")} />
            {!isCollapsed && <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.title}</span>}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md hidden group-hover:block whitespace-nowrap z-50">
                {item.title}
              </div>
            )}
          </Link>
        ))}
      </nav>

      <div className={cn("border-t flex items-center shrink-0 h-16 transition-all", isCollapsed ? "justify-center px-2 flex-col gap-2 py-2" : "justify-between px-4")}>
        {!isCollapsed && <span className="text-xs text-muted-foreground whitespace-nowrap">&copy; 2026</span>}
        <ThemeToggle />
      </div>
    </div>
  );
}
