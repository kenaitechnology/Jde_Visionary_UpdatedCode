import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  AlertTriangle,
  Building2,
  DollarSign,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";

function RiskBadge({ level }: { level: string }) {
  const config = {
    green: { label: "On Track", className: "risk-badge-green" },
    yellow: { label: "At Risk", className: "risk-badge-yellow" },
    red: { label: "Critical", className: "risk-badge-red" },
  }[level] || { label: level, className: "risk-badge-green" };

  return <span className={`risk-badge ${config.className}`}>{config.label}</span>;
}

function StatusBadge({ status, risk }: { status: string; risk?: string }) {
  // JDE Sales Order Status Codes mapping
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    // Pending Orders (527-545)
    "527": { label: "Pending", variant: "outline" },
    "528": { label: "Pending", variant: "outline" },
    "529": { label: "Pending", variant: "outline" },
    "530": { label: "Pending", variant: "outline" },
    "531": { label: "Pending", variant: "outline" },
    "532": { label: "Pending", variant: "outline" },
    "533": { label: "Pending", variant: "outline" },
    "534": { label: "Pending", variant: "outline" },
    "535": { label: "Pending", variant: "outline" },
    "536": { label: "Pending", variant: "outline" },
    "537": { label: "Pending", variant: "outline" },
    "538": { label: "Pending", variant: "outline" },
    "539": { label: "Pending", variant: "outline" },
    "540": { label: "Pick Pending", variant: "outline" },
    "541": { label: "Pick Pending", variant: "outline" },
    "542": { label: "Pick Pending", variant: "outline" },
    "543": { label: "Pick Pending", variant: "outline" },
    "544": { label: "Pick Pending", variant: "outline" },
    "545": { label: "Picking in Progress", variant: "default" },
    // Orders In Progress (550-578)
    "550": { label: "Pick Confirmed", variant: "default" },
    "551": { label: "Pick Confirmed", variant: "default" },
    "552": { label: "Pick Confirmed", variant: "default" },
    "553": { label: "Pick Confirmed", variant: "default" },
    "554": { label: "Pick Confirmed", variant: "default" },
    "555": { label: "Pick Confirmed", variant: "default" },
    "556": { label: "Pick Confirmed", variant: "default" },
    "557": { label: "Pick Confirmed", variant: "default" },
    "558": { label: "Pick Confirmed", variant: "default" },
    "559": { label: "Pick Confirmed", variant: "default" },
    "560": { label: "Shipment Pending", variant: "default" },
    "561": { label: "Shipment Pending", variant: "default" },
    "562": { label: "Shipment Pending", variant: "default" },
    "563": { label: "Shipment Pending", variant: "default" },
    "564": { label: "Shipment Pending", variant: "default" },
    "565": { label: "Shipment Pending", variant: "default" },
    "566": { label: "Shipment Pending", variant: "default" },
    "567": { label: "Shipment Pending", variant: "default" },
    "568": { label: "Shipment Pending", variant: "default" },
    "569": { label: "Shipment Pending", variant: "default" },
    "570": { label: "Shipment Pending", variant: "default" },
    "571": { label: "Shipment Pending", variant: "default" },
    "572": { label: "Shipment Pending", variant: "default" },
    "573": { label: "Shipment Processing", variant: "default" },
    "574": { label: "Shipment Processing", variant: "default" },
    "575": { label: "Shipment Confirmed", variant: "default" },
    "576": { label: "Shipment Confirmed", variant: "default" },
    "577": { label: "Shipment Confirmed", variant: "default" },
    "578": { label: "In Transit", variant: "default" },
    // Shipped/Billing Stage (580-620)
    "580": { label: "Delivered", variant: "secondary" },
    "581": { label: "Delivered", variant: "secondary" },
    "582": { label: "Delivered", variant: "secondary" },
    "583": { label: "Delivered", variant: "secondary" },
    "584": { label: "Delivered", variant: "secondary" },
    "585": { label: "Delivered", variant: "secondary" },
    "586": { label: "Delivered", variant: "secondary" },
    "587": { label: "Delivered", variant: "secondary" },
    "588": { label: "Delivered", variant: "secondary" },
    "589": { label: "Delivered", variant: "secondary" },
    "590": { label: "Delivered", variant: "secondary" },
    "591": { label: "Delivered", variant: "secondary" },
    "592": { label: "Delivered", variant: "secondary" },
    "593": { label: "Delivered", variant: "secondary" },
    "594": { label: "Delivered", variant: "secondary" },
    "595": { label: "Delivered", variant: "secondary" },
    "596": { label: "Delivered", variant: "secondary" },
    "597": { label: "Delivered", variant: "secondary" },
    "598": { label: "Delivered", variant: "secondary" },
    "599": { label: "Delivered", variant: "secondary" },
    "600": { label: "Delivered", variant: "secondary" },
    "601": { label: "Delivered", variant: "secondary" },
    "602": { label: "Delivered", variant: "secondary" },
    "603": { label: "Delivered", variant: "secondary" },
    "604": { label: "Delivered", variant: "secondary" },
    "605": { label: "Delivered", variant: "secondary" },
    "606": { label: "Delivered", variant: "secondary" },
    "607": { label: "Delivered", variant: "secondary" },
    "608": { label: "Delivered", variant: "secondary" },
    "609": { label: "Delivered", variant: "secondary" },
    "610": { label: "Delivered", variant: "secondary" },
    "611": { label: "Delivered", variant: "secondary" },
    "612": { label: "Delivered", variant: "secondary" },
    "613": { label: "Delivered", variant: "secondary" },
    "614": { label: "Delivered", variant: "secondary" },
    "615": { label: "Delivered", variant: "secondary" },
    "616": { label: "Delivered", variant: "secondary" },
    "617": { label: "Delivered", variant: "secondary" },
    "618": { label: "Delivered", variant: "secondary" },
    "619": { label: "Delivered", variant: "secondary" },
    "620": { label: "Invoiced", variant: "secondary" },
    // Completed/Closed
    "999": { label: "Closed", variant: "destructive" },
    // Text-based status mappings
    "Pending": { label: "Pending", variant: "outline" },
    "In Progress": { label: "In Progress", variant: "default" },
    "Shipped/Billing": { label: "Shipped/Billing", variant: "default" },
    "Completed": { label: "Completed", variant: "secondary" },
  };

  // Determine color based on risk level
  const getRiskColor = () => {
    const riskLevel = risk?.toLowerCase() || "green";
    
    switch (riskLevel) {
      case "red":
        return { label: statusConfig[status]?.label || status.replace(/_/g, " "), className: "bg-red-100 text-red-800 border-red-300 hover:bg-red-100" };
      case "yellow":
        return { label: statusConfig[status]?.label || status.replace(/_/g, " "), className: "bg-yellow-100 text-yellow-800 border-yellow-300 hover:bg-yellow-100" };
      case "green":
      default:
        return { label: statusConfig[status]?.label || status.replace(/_/g, " "), className: "bg-green-100 text-green-800 border-green-300 hover:bg-green-100" };
    }
  };

  const config = getRiskColor();

  return (
    <Badge className={`border ${config.className} capitalize`}>
      {config.label}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    low: { label: "Low", variant: "outline" },
    medium: { label: "Medium", variant: "secondary" },
    high: { label: "High", variant: "default" },
    critical: { label: "Critical", variant: "destructive" },
    // JDE Priority Codes
    "1": { label: "Critical", variant: "destructive" },
    "2": { label: "High", variant: "default" },
    "3": { label: "Medium", variant: "secondary" },
    "4": { label: "Low", variant: "outline" },
    "5": { label: "Low", variant: "outline" },
  };

  const priorityConfig = config[priority] || { label: priority, variant: "secondary" as const };

  return (
    <Badge variant={priorityConfig.variant} className="capitalize">
      {priorityConfig.label}
    </Badge>
  );
}

export default function SalesOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // JDE Sales Orders - fetched directly from JDE MSSQL tables
  const { data: salesOrders, isLoading, refetch } = trpc.salesOrder.listJDE.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const getJDEItemName = (itemNumber: string) => {
    if (!itemNumber) return "N/A";
    return `Item #${itemNumber}`;
  };

  const filteredOrders = salesOrders?.filter((so: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      so.soNumber.toLowerCase().includes(query) ||
      so.customerName.toLowerCase().includes(query)
    );
  });

  const totalValue = (filteredOrders?.reduce((acc: number, so: any) => acc + Number(so.totalAmount), 0) || 0);
  const atRiskOrders = filteredOrders?.filter((so: any) => so.fulfillmentRisk === "yellow" || so.fulfillmentRisk === "red");
  const highPriorityOrders = filteredOrders?.filter((so: any) => so.priority === "high" || so.priority === "critical");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
            </div>
            <p className="text-muted-foreground">
              Track customer orders and fulfillment status
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
                  <p className="text-caption">Total Orders</p>
                  <p className="text-3xl font-bold">{filteredOrders?.length || 0}</p>
                </div>
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Total Value</p>
                  <p className="text-3xl font-bold">${(totalValue / 1000).toFixed(0)}K</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">At Risk</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {atRiskOrders?.length || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-[oklch(0.55_0.25_27)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">High Priority</p>
                  <p className="text-3xl font-bold">{highPriorityOrders?.length || 0}</p>
                </div>
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SO number or customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="shipped_billing">Shipped/Billing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-caption">
              {filteredOrders?.length || 0} Sales Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Ship Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((so: any) => (
                    <TableRow key={so.id || so.soNumber}>
                      <TableCell className="font-medium">{so.soNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {so.customerName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getJDEItemName(so.itemNumber)}
                      </TableCell>
                      <TableCell>{so.quantity}</TableCell>
                      <TableCell className="font-medium">
                        ${Number(so.totalAmount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {so.requestedShipDate ? (
                          <span>{so.requestedShipDate}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={so.status} risk={so.fulfillmentRisk} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={so.priority} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={so.fulfillmentRisk} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
