// src/components/layout/ClientLayout.jsx
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom"; // Import useLocation
import { Button } from "@/components/ui/button";
import { LogOut, Home, Calendar, User, Menu } from "lucide-react";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"; // Use Sheet for mobile sidebar
import { ScrollArea } from "@/components/ui/scroll-area";

const ClientLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); // To check current path for active links
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false); // State for mobile sidebar

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/"); // Redirect to login page
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const navItems = [
    { name: "Dashboard", href: "/client-dashboard", icon: Home },
    { name: "Book Appointment", href: "/book-appointment", icon: Calendar }, // Placeholder route
    { name: "My Profile", href: "/my-profile", icon: User }, // Placeholder route
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Mobile Sidebar Trigger */}
      <header className="md:hidden sticky top-0 z-30 w-full border-b bg-background/80 backdrop-blur-sm p-2 flex items-center justify-between">
        <h1 className="text-xl font-bold">Client Portal</h1>
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full bg-muted/50 border-r">
              <div className="flex items-center justify-between p-3 border-b">
                <h2 className="text-base font-semibold">Client Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-6 w-6"
                >
                  <X className="h-3 w-3" /> {/* Assuming X icon is imported */}
                </Button>
              </div>
              <ScrollArea className="flex-1 py-1">
                <nav className="grid items-start px-2 text-xs font-medium">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.href;
                    return (
                      <Button
                        key={item.name}
                        variant={isActive ? "secondary" : "ghost"}
                        onClick={() => {
                          navigate(item.href);
                          setSidebarOpen(false); // Close sidebar after navigation
                        }}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-muted-foreground transition-all hover:text-primary w-full justify-start ${
                          isActive ? "bg-muted text-primary" : ""
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </Button>
                    );
                  })}
                </nav>
              </ScrollArea>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-xs"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col md:fixed md:inset-y-0 md:z-30 md:border-r bg-background transition-all duration-300 ease-in-out w-48`} // Fixed width for desktop
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-2 border-b">
            <h2 className="text-sm font-semibold px-2 truncate">
              Client Portal
            </h2>
          </div>
          <nav className="flex-1 py-2">
            <ul className="space-y-1 px-1 text-xs font-medium">
              {" "}
              {/* Smaller text */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={`w-full justify-start gap-2`}
                      onClick={() => navigate(item.href)}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="p-2 border-t">
            <Button
              variant="ghost"
              className={`w-full justify-start gap-2 text-xs`}
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Spacer to prevent content overlap on desktop */}
      <div
        className={`hidden md:block transition-all duration-300 ease-in-out w-48`} // Match sidebar width
        aria-hidden="true"
      />

      {/* Main content area for client pages */}
      <div className="flex-1 transition-all duration-300 ease-in-out pt-0 w-full">
        {/* Client-specific Top Navigation Bar (optional, could be in MainLayout too) - Already handled by mobile header */}
        {/* <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur-sm p-2 flex items-center justify-between md:hidden"> */}
        {/*   <Button variant="outline" size="sm" onClick={toggleSidebar}> */}
        {/*     <Menu className="h-4 w-4" /> */}
        {/*   </Button> */}
        {/*   <h1 className="text-lg font-bold">Client Portal</h1> */}
        {/*   <div></div> {/* Spacer for symmetry */}
        {/* </header> */}
        {/* Page content */}
        <main className="p-0 md:p-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Import X icon for closing the mobile sidebar
import { X } from "lucide-react";

export default ClientLayout;
