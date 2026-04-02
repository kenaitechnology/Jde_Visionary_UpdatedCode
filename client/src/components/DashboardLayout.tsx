import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  Box,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeft,
  Settings,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShoppingCart, label: "Purchase Orders", path: "/purchase-orders" },
  { icon: FileText, label: "Sales Orders", path: "/sales-orders" },
  { icon: Box, label: "Inventory", path: "/inventory" },
  { icon: Users, label: "Suppliers", path: "/suppliers" },
  { icon: Truck, label: "Shipments", path: "/shipments" },
  { icon: Bell, label: "Alerts", path: "/alerts" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
  { icon: MessageSquare, label: "Digital Assistant", path: "/assistant" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          {/* Swiss style logo */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">JDE Visionary</h1>
              <p className="text-sm text-muted-foreground">Supply Chain Control Tower</p>
            </div>
          </div>
          
          <div className="w-full h-px bg-foreground/20" />
          
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Sign in to continue
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Access real-time supply chain insights, AI-powered predictions, and automated remediation tools.
            </p>
          </div>
          
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  // Fetch unread alerts data for client-side processing
  const { data: unreadAlertsData } = trpc.alert.getUnread.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unreadAlerts = unreadAlertsData || [];
  const unreadCount = unreadAlerts.filter((alert: any) => {
    if (alert.id >= 0) return !alert.isRead && !alert.isResolved; // Local alerts
    // JDE alerts: check local read & resolved state
    try {
      const readStored = localStorage.getItem("jde-visionary-alerts-read");
      const resolvedStored = localStorage.getItem("jde-visionary-alerts-resolved");
      const readIds = readStored ? new Set(JSON.parse(readStored)) : new Set();
      const resolvedIds = resolvedStored ? new Set(JSON.parse(resolvedStored)) : new Set();
      return !readIds.has(alert.id) && !resolvedIds.has(alert.id);
    } catch {
      // Fallback to unread
    }
    return true;
  }).length;

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 bg-primary shrink-0" />
                  <span className="font-bold tracking-tight truncate">
                    JDE Visionary
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                const showBadge = item.path === "/alerts" && unreadCount > 0;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${isActive ? "bg-primary/10" : ""}`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {showBadge && !isCollapsed && (
                        <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.role === "admin" ? "Administrator" : "Supply Chain Planner"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-muted/30">
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background px-3 sticky top-0 z-40">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded bg-background" />
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary" />
                <span className="font-semibold tracking-tight">
                  {activeMenuItem?.label ?? "JDE Visionary"}
                </span>
              </div>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setLocation("/alerts")}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              </Button>
            )}
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
