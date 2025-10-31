// src/components/layout/NavigationPane.jsx
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Home,
  Users,
  Calendar,
  DollarSign,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Package,
  FileText,
  BarChart3,
} from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Calendar", href: "/dashboard", icon: Calendar },
  { name: "Payments", href: "/payments", icon: DollarSign },
  { name: "Closed Days", href: "/closed-days", icon: Calendar },
  { name: "Packages", href: "/packages", icon: Package },
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Appointment Requests", href: "/appointment-requests", icon: Clock }, // Use an appropriate icon
];

const NavigationPane = ({ className = "" }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleCollapse = () => setIsCollapsed(!isCollapsed);
  const openMobileMenu = () => setIsMobileOpen(true);
  const closeMobileMenu = () => setIsMobileOpen(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  // Check if we're on a mobile device
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <>
        {/* Mobile Navigation Trigger */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed top-4 left-4 z-50 md:hidden"
              onClick={openMobileMenu}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="text-lg font-semibold">
                Navigation
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-full py-2">
              <nav className="grid items-start px-2 text-sm font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                        isActive ? "bg-muted text-primary" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* Logout Button */}
              <div className="p-2 border-t mt-4 space-y-2">
                <Link to="/closed-days" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full text-sm">
                    Manage Closed Days
                  </Button>
                </Link>
                <Link to="/reports" onClick={closeMobileMenu}>
                  <Button variant="outline" className="w-full text-sm">
                    Reports
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => {
                    closeMobileMenu();
                    handleLogout();
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop Navigation Pane
  return (
    <>
      {/* Collapsible Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-30 md:border-r bg-background transition-all duration-300 ease-in-out ${className} ${
          isCollapsed ? "md:w-16" : "md:w-64"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header with Collapse Button */}
          <div className="flex items-center border-b p-2">
            {!isCollapsed && (
              <h2 className="text-lg font-semibold px-2 truncate">
                Clinic Scheduler
              </h2>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={toggleCollapse}
              aria-label={
                isCollapsed ? "Expand navigation" : "Collapse navigation"
              }
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Navigation Items */}
          <ScrollArea className="flex-1 py-2">
            <nav className="grid items-start px-2 text-sm font-medium">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary ${
                      isActive ? "bg-muted text-primary" : ""
                    } ${isCollapsed ? "justify-center" : ""}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate">{item.name}</span>
                    )}
                    {isCollapsed && (
                      <span className="sr-only">{item.name}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>

          {/* Logout Button */}
          {/* Quick actions + Logout */}
          <div
            className={`p-2 border-t ${
              isCollapsed ? "flex justify-center" : ""
            }`}
          >
            {!isCollapsed && (
              <div className="flex flex-col gap-2 mb-2">
                <Link to="/closed-days" className="block">
                  <Button variant="outline" className="w-full text-xs">
                    Manage Closed Days
                  </Button>
                </Link>
                <Link to="/reports" className="block">
                  <Button variant="outline" className="w-full text-xs">
                    Reports
                  </Button>
                </Link>
              </div>
            )}
            <Button
              variant="ghost"
              className={`w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 ${
                isCollapsed ? "px-2" : ""
              }`}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
              {isCollapsed && <span className="sr-only">Logout</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Spacer to prevent content overlap */}
      <div
        className={`hidden md:block transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-16" : "w-64"
        }`}
        aria-hidden="true"
      />
    </>
  );
};

export default NavigationPane;
