"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { userId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !userId) {
      router.push("/login");
    }
  }, [userId, loading, router]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
  }

  if (!userId) {
    return null;
  }
    
  return (
    <div className="flex h-dvh w-full bg-background overflow-hidden relative">
      {/* Sidebar - Desktop */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r shrink-0 z-30 bg-card h-full transition-all duration-300 relative",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        <Sidebar 
          className="h-full border-r-0" 
          isCollapsed={isCollapsed} 
          onToggleCollapse={toggleCollapse}
        />
        
        {/* Absolute positioned toggle button */}
        <button
            onClick={toggleCollapse}
            className="absolute -right-3 top-20 z-50 h-6 w-6 rounded-full border bg-background shadow-md flex items-center justify-center hover:bg-muted text-muted-foreground transition-colors"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
            {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>  
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden h-full relative">
        
        {/* Mobile Header - Visible only on mobile */}
        <header className="flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm md:hidden shrink-0 w-full z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="-ml-2 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </button>
            <span className="font-semibold text-lg truncate">StudyBomBibi</span>
          </div>
          {/* ThemeToggle is visible here on mobile as a convenient location */}
          <div className="block md:hidden">
             
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-all"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Drawer Content */}
            <div className="relative flex w-64 flex-col bg-card h-full shadow-2xl animate-in slide-in-from-left duration-200">
               <div className="absolute top-2 right-2 z-50">
                 <button
                   className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                   onClick={() => setIsMobileMenuOpen(false)}
                 >
                   <X className="h-5 w-5" />
                   <span className="sr-only">Close sidebar</span>
                 </button>
               </div>
               
               {/* We render the sidebar content here */}
               <div className="h-full pt-2">
                  <Sidebar onLinkClick={() => setIsMobileMenuOpen(false)} className="border-r-0 h-full w-full" />
               </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 w-full bg-background scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}
