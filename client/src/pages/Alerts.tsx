import DashboardLayout from "@/components/DashboardLayout";
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
import { useState } from "react";
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

function AlertCard({ alert, onMarkRead, onResolve }: { alert: any; onMarkRead: () => void; onResolve: () => void }) {
  const severityColors: Record<string, string> = {
    info: "border-l-[oklch(0.60_0.15_250)]",
    warning: "border-l-[oklch(0.80_0.18_85)]",
    critical: "border-l-[oklch(0.55_0.25_27)]",
  };

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
                <h3 className="font-semibold">{alert.title}</h3>
                <p className="text-xs text-muted-foreground capitalize">
                  {alert.type.replace(/_/g, " ")} • {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <SeverityBadge severity={alert.severity} />
                {alert.isResolved && (
                  <Badge variant="outline" className="text-[oklch(0.65_0.2_145)]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Resolved
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{alert.message}</p>
            <div className="flex items-center gap-2">
              {!alert.isRead && (
                <Button variant="outline" size="sm" onClick={onMarkRead}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as Read
                </Button>
              )}
              {!alert.isResolved && (
                <Button variant="default" size="sm" onClick={onResolve}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
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

  const utils = trpc.useUtils();

  const { data: alerts, isLoading, refetch } = trpc.alert.list.useQuery({
    type: typeFilter !== "all" ? typeFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
    isRead: activeTab === "unread" ? false : undefined,
    isResolved: activeTab === "resolved" ? true : activeTab === "unread" ? false : undefined,
  });

  const markAsRead = trpc.alert.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("Alert marked as read");
      utils.alert.list.invalidate();
      utils.alert.getUnread.invalidate();
    },
  });

  const resolveAlert = trpc.alert.resolve.useMutation({
    onSuccess: () => {
      toast.success("Alert resolved");
      setShowResolveDialog(false);
      setActionTaken("");
      utils.alert.list.invalidate();
      utils.alert.getUnread.invalidate();
    },
  });

  const filteredAlerts = alerts?.filter((alert: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      alert.title.toLowerCase().includes(query) ||
      alert.message.toLowerCase().includes(query)
    );
  });

  const unreadCount = alerts?.filter((a: any) => !a.isRead).length || 0;
  const criticalCount = alerts?.filter((a: any) => a.severity === "critical" && !a.isResolved).length || 0;

  const handleResolve = (alert: any) => {
    setSelectedAlert(alert);
    setShowResolveDialog(true);
  };

  const submitResolve = () => {
    if (!selectedAlert || !actionTaken.trim()) return;
    resolveAlert.mutate({
      id: selectedAlert.id,
      actionTaken: actionTaken.trim(),
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Alerts</h1>
            </div>
            <p className="text-muted-foreground">
              Monitor and respond to supply chain alerts
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Total Alerts</p>
                  <p className="text-3xl font-bold">{alerts?.length || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Unread</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {unreadCount}
                  </p>
                </div>
                <BellOff className="h-8 w-8 text-[oklch(0.55_0.25_27)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Critical</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {criticalCount}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-[oklch(0.55_0.25_27)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Resolved Today</p>
                  <p className="text-3xl font-bold text-[oklch(0.65_0.2_145)]">
                    {alerts?.filter((a: any) => a.isResolved).length || 0}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[oklch(0.65_0.2_145)]" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="unread" className="flex items-center gap-2">
              Unread
              {unreadCount > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All Alerts</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search alerts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="stockout_warning">Stockout Warning</SelectItem>
                      <SelectItem value="delivery_delay">Delivery Delay</SelectItem>
                      <SelectItem value="supplier_issue">Supplier Issue</SelectItem>
                      <SelectItem value="quality_alert">Quality Alert</SelectItem>
                      <SelectItem value="temperature_alert">Temperature Alert</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={severityFilter} onValueChange={setSeverityFilter}>
                    <SelectTrigger className="w-[180px]">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Alert List */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-40" />
                ))}
              </div>
            ) : filteredAlerts && filteredAlerts.length > 0 ? (
              <div className="space-y-4">
                {filteredAlerts.map((alert: any) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onMarkRead={() => markAsRead.mutate({ id: alert.id })}
                    onResolve={() => handleResolve(alert)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Alerts</h3>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "unread"
                      ? "All alerts have been read."
                      : activeTab === "resolved"
                        ? "No resolved alerts yet."
                        : "No alerts match your filters."}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Alert</DialogTitle>
            <DialogDescription>
              Describe the action taken to resolve this alert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded">
              <p className="font-medium">{selectedAlert?.title}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedAlert?.message}
              </p>
            </div>
            <div>
              <p className="text-caption mb-2">Action Taken</p>
              <Textarea
                placeholder="Describe the resolution action..."
                value={actionTaken}
                onChange={(e) => setActionTaken(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitResolve}
              disabled={!actionTaken.trim() || resolveAlert.isPending}
            >
              {resolveAlert.isPending ? "Resolving..." : "Resolve Alert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
