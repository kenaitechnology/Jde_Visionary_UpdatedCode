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

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive" }> = {
    draft: { variant: "outline" },
    pending: { variant: "secondary" },
    confirmed: { variant: "default" },
    processing: { variant: "default" },
    shipped: { variant: "default" },
    delivered: { variant: "secondary" },
    cancelled: { variant: "destructive" },
  };

  return (
    <Badge variant={config[status]?.variant || "secondary"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive" }> = {
    low: { variant: "outline" },
    medium: { variant: "secondary" },
    high: { variant: "default" },
    critical: { variant: "destructive" },
  };

  return (
    <Badge variant={config[priority]?.variant || "secondary"} className="capitalize">
      {priority}
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
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
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
                        <StatusBadge status={so.status} />
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
