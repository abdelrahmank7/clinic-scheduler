// src/components/layout/Sidebar.jsx
import React, { useState } from "react";
import PropTypes from "prop-types";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Clock,
} from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Clients", href: "/clients", icon: Users },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Payments", href: "/payments", icon: DollarSign },
  { name: "Closed Days", href: "/closed-days", icon: Calendar },
  { name: "Packages", href: "/packages", icon: Package },
  // --- ADD REPORTS TO THE MAIN NAVIGATION LIST ---
  { name: "Reports", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
  {
    name: "Appointment Requests",
    href: "/appointment-requests",
    icon: Clock,
  }, // Use an appropriate icon
];

const Sidebar = ({ className = "", isCollapsed = false, onToggleCollapse }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

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

  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="fixed top-3 left-3 z-40 md:hidden h-8 w-8"
          >
            <Menu className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 z-50">
          <div className="flex flex-col h-full bg-muted/50 border-r">
            {" "}
            {/* Slightly grayish */}
            <div className="flex items-center justify-between p-3 border-b">
              <h2 className="text-base font-semibold">Menu</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6"
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="flex-1 py-1">
              <nav className="grid items-start px-1 text-xs font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground transition-all hover:text-primary ${
                        isActive ? "bg-muted text-primary" : ""
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </ScrollArea>
            <div className="p-2 border-t">
              <div className="flex flex-col gap-2 mb-2">
                <Link to="/closed-days" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full text-xs">
                    Manage Closed Days
                  </Button>
                </Link>
                {/* --- REMOVE REPORTS BUTTON FROM HERE AS IT'S NOW IN THE MAIN LIST --- */}
                {/* <Link to="/reports" onClick={() => setIsOpen(false)}>
                  <Button variant="outline" className="w-full text-xs">
                    Reports
                  </Button>
                </Link> */}
              </div>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-xs"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop sidebar
  return (
    <aside
      className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-30 md:border-r transition-all duration-300 ease-in-out ${className} ${
        isCollapsed ? "md:w-16 bg-muted/30" : "md:w-64 bg-muted/50"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center border-b p-2">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold px-2 truncate">
              Clinic Scheduler
            </h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-3 w-3" />
            ) : (
              <ChevronLeft className="h-3 w-3" />
            )}
          </Button>
        </div>
        <ScrollArea className="flex-1 py-1">
          <nav className="grid items-start px-1 text-xs font-medium">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground transition-all hover:text-primary ${
                    isActive ? "bg-muted text-primary" : ""
                  } ${isCollapsed ? "justify-center" : ""}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && (
                    <span className="truncate">{item.name}</span>
                  )}
                  {isCollapsed && <span className="sr-only">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <div
          className={`p-2 border-t ${isCollapsed ? "flex justify-center" : ""}`}
        >
          {!isCollapsed && (
            <div className="flex flex-col gap-2 mb-2">
              <Link to="/closed-days" className="block">
                <Button variant="outline" className="w-full text-xs">
                  Manage Closed Days
                </Button>
              </Link>
              {/* --- REMOVE REPORTS BUTTON FROM HERE AS IT'S NOW IN THE MAIN LIST --- */}
              {/* <Link to="/reports" className="block">
                <Button variant="outline" className="w-full text-xs">
                  Reports
                </Button>
              </Link> */}
            </div>
          )}
          <Button
            variant="ghost"
            className={`w-full justify-start gap-2 text-xs ${
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
  );
};

export default Sidebar;

Sidebar.propTypes = {
  className: PropTypes.string,
  isCollapsed: PropTypes.bool,
  onToggleCollapse: PropTypes.func,
};
