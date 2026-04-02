import DashboardLayout from "@/components/DashboardLayout";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Package,
  RefreshCw,
  Search,
  Thermometer,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    info: { variant: "secondary", label: "Info" },
    warning: { variant: "default", label: "Warning" },
    critical: { variant: "destructive", label: "Critical" },
  };

  return (
    <Badge variant={config[severity]?.variant || "secondary"}>
      {config[severity]?.label || severity}
    </Badge>
  );
}

function AlertTypeIcon({ type }: { type: string }) {
  const icons: Record<string, React.ElementType> = {
    stockout_warning: Package,
    delivery_delay: Truck,
    supplier_issue: Users,
    quality_alert: AlertTriangle,
    temperature_alert: Thermometer,
    general: Bell,
  };
  const Icon = icons[type] || Bell;
  return <Icon className="h-5 w-5" />;
}

const isJDEAlert = (alert: any): boolean => alert.id < 0;

const getEffectiveIsRead = (alert: any, readAlerts: Set<number>): boolean => {
  if (!isJDEAlert(alert)) {
    return !!alert.isRead;
  }
  return readAlerts.has(alert.id);
};

const getEffectiveIsResolved = (alert: any, resolvedAlerts: Set<number>): boolean => {
  if (!isJDEAlert(alert)) {
    return !!alert.isResolved;
  }
  return resolvedAlerts.has(alert.id);
};

function AlertCard({ alert, onMarkRead, onResolve, readAlerts, resolvedAlerts }: { 
  alert: any; 
  onMarkRead: () => void; 
  onResolve: () => void; 
  readAlerts: Set<number>; 
  resolvedAlerts: Set<number> 
}) {
  const severityColors: Record<string, string> = {
    info: "border-l-[oklch(0.60_0.15_250)]",
    warning: "border-l-[oklch(0.80_0.18_85)]",
    critical: "border-l-[oklch(0.55_0.25_27)]",
  };

  const effectiveIsRead = getEffectiveIsRead(alert, readAlerts);
  const effectiveIsResolved = getEffectiveIsResolved(alert, resolvedAlerts);

  return (
    <Card className={`border-l-4 ${severityColors[alert.severity] || "border-l-border"}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded ${
            alert.severity === "critical" 
              ? "bg-[oklch(0.55_0.25_27/0.1)] text-[oklch(0.55_0.25_27)]"
              : alert.severity === "warning"
                ? "bg-[oklch(0.80_0.18_85/0.1)] text-[oklch(0.55_0.18_85)]"
                : "bg-muted text-muted-foreground"
          }`}>
            <AlertTypeIcon type={alert.type} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <h3 className="font-semibold line-clamp-2">{alert.title}</h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {alert.type.replace(/_/g, " ")} • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SeverityBadge severity={alert.severity} />
                {effectiveIsResolved && (
                  <Badge variant="outline" className="text-[oklch(0.65_0.2_145)]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{alert.message}</p>
            <div className="flex flex-wrap items-center gap-2">
              {!effectiveIsRead && (
                <Button variant="outline" size="sm" onClick={onMarkRead} className="h-8 px-3">
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                  Read
                </Button>
              )}
              {!effectiveIsResolved && (
                <Button variant="default" size="sm" onClick={onResolve} className="h-8 px-3">
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Resolve
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Alerts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("unread");
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [actionTaken, setActionTaken] = useState("");

  // localStorage state
  const [readAlerts, setReadAlerts] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem("jde-visionary-alerts-read");
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });
  const [resolvedAlerts, setResolvedAlerts] = useState<Set<number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem("jde-visionary-alerts-resolved");
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  const utils = trpc.useUtils();
  const resolveMutation = trpc.alert.resolve.useMutation();

  const saveAlertsState = useCallback(() => {
    try {
      localStorage.setItem("jde-visionary-alerts-read", JSON.stringify(Array.from(readAlerts)));
      localStorage.setItem("jde-visionary-alerts-resolved", JSON.stringify(Array.from(resolvedAlerts)));
    } catch {}
  }, [readAlerts, resolvedAlerts]);

  const markAlertRead = useCallback((id: number) => {
    const newRead = new Set(readAlerts);
    newRead.add(id);
    setReadAlerts(newRead);
    saveAlertsState();
    toast.success("Marked as read");
  }, [readAlerts, saveAlertsState]);

  const markAlertResolved = useCallback(async (id: number, switchToResolved = false) => {
    try {
      // Call the server to resolve the alert
      await resolveMutation.mutateAsync({
        id,
        actionTaken: "Resolved via UI" // Default action taken
      });

      // Update local state for immediate UI feedback
      const newResolved = new Set(resolvedAlerts);
      newResolved.add(id);
      setResolvedAlerts(newResolved);

      if (switchToResolved) {
        setActiveTab("resolved");
      }

      saveAlertsState();
      toast.success("Marked as resolved");
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  }, [resolvedAlerts, saveAlertsState, resolveMutation]);

  useEffect(() => {
    saveAlertsState();
    utils.alert.list.refetch();
  }, [readAlerts, resolvedAlerts]);

  const { data: rawAlerts, isLoading, refetch } = trpc.alert.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    isRead: activeTab === "unread" ? false : undefined,
    isResolved: activeTab === "resolved" ? true : activeTab === "unread" ? false : undefined,
  }, {
    refetchOnWindowFocus: false,
  });

  const alerts = rawAlerts?.map((alert) => ({
    ...alert,
    effectiveIsRead: getEffectiveIsRead(alert, readAlerts),
    effectiveIsResolved: getEffectiveIsResolved(alert, resolvedAlerts),
  })) || [];

  const unreadCount = alerts.filter((a) => !getEffectiveIsRead(a, readAlerts) && !getEffectiveIsResolved(a, resolvedAlerts)).length;

  const handleResolve = (alert: any) => {
    setSelectedAlert(alert);
    setShowResolveDialog(true);
  };

  const submitResolve = useCallback(async () => {
    if (!selectedAlert || !actionTaken.trim()) return;

    try {
      // Call the server to resolve the alert
      await resolveMutation.mutateAsync({
        id: selectedAlert.id,
        actionTaken: actionTaken.trim()
      });

      // Update local state for immediate UI feedback
      const newResolved = new Set(resolvedAlerts);
      newResolved.add(selectedAlert.id);
      setResolvedAlerts(newResolved);

      setActiveTab("resolved");
      setShowResolveDialog(false);
      setActionTaken("");
      saveAlertsState();
      toast.success("Marked as resolved");
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast.error("Failed to resolve alert");
    }
  }, [selectedAlert, actionTaken, resolvedAlerts, saveAlertsState, resolveMutation]);

  const filteredAlerts = alerts.filter((alert) => {
    const effectiveRead = getEffectiveIsRead(alert, readAlerts);
    const effectiveResolved = getEffectiveIsResolved(alert, resolvedAlerts);
    
    if (activeTab === "unread" && (effectiveRead || effectiveResolved)) return false;
    if (activeTab === "resolved" && !effectiveResolved) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return alert.title.toLowerCase().includes(query) || alert.message.toLowerCase().includes(query);
    }
    
    return true;
  }).sort((a, b) => {
    const aResolved = getEffectiveIsResolved(a, resolvedAlerts);
    const bResolved = getEffectiveIsResolved(b, resolvedAlerts);
    if (aResolved !== bResolved) return bResolved ? -1 : 1;
    
    const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
    const severityDiff = (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2);
    if (severityDiff !== 0) return severityDiff;
    
    return a.id - b.id;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Alerts</h1>
            </div>
            <p className="text-muted-foreground">Monitor and respond to supply chain alerts</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Alerts</p>
                  <p className="text-2xl font-bold">{rawAlerts?.length || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unread</p>
                  <p className="text-2xl font-bold text-destructive">{unreadCount}</p>
                </div>
                <BellOff className="h-8 w-8" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{alerts.filter((a) => getEffectiveIsResolved(a, resolvedAlerts)).length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical</p>
                  <p className="text-2xl font-bold text-destructive">
                    {alerts.filter((a) => a.severity === "critical" && !getEffectiveIsResolved(a, resolvedAlerts)).length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="unread" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Unread ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              All ({rawAlerts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Resolved ({alerts.filter((a) => getEffectiveIsResolved(a, resolvedAlerts)).length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardContent className="pt-6 pb-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10"
                    />
                  </div>
                  <div className="flex gap-2 lg:w-auto w-full">
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-10 w-[140px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="stockout_warning">Stockout</SelectItem>
                        <SelectItem value="delivery_delay">Delivery</SelectItem>
                        <SelectItem value="supplier_issue">Supplier</SelectItem>
                        <SelectItem value="temperature_alert">Temp</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger className="h-10 w-[140px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {isLoading ? (
              <div className="space-y-4 py-8">
                {[1,2,3,4].map((i) => (
                  <Skeleton key={i} className="h-32 rounded-lg" />
                ))}
              </div>
            ) : filteredAlerts.length > 0 ? (
              <div className="space-y-4 py-2">
                {filteredAlerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={() => markAlertRead(alert.id)}
                    onResolve={() => handleResolve(alert)}
                    readAlerts={readAlerts}
                    resolvedAlerts={resolvedAlerts}
                  />
                ))}
              </div>
            ) : (
              <Card className="mt-8">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No alerts match filters</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {activeTab === "resolved" ? "No resolved alerts" : "No matching alerts found"}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as Resolved</DialogTitle>
            <DialogDescription>Confirm resolution of this alert.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-sm">{selectedAlert?.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{selectedAlert?.message}</p>
            </div>
            <Textarea
              placeholder="Optional: Action taken (for records)"
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitResolve}
              className="flex-1"
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
