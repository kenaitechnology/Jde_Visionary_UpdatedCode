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
  Clock,
  Filter,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Thermometer,
  Truck,
} from "lucide-react";
import { useState } from "react";

function RiskBadge({ level }: { level: string }) {
  const config = {
    green: { label: "On Track", className: "risk-badge-green" },
    yellow: { label: "At Risk", className: "risk-badge-yellow" },
    red: { label: "Delayed", className: "risk-badge-red" },
  }[level] || { label: level, className: "risk-badge-green" };

  return <span className={`risk-badge ${config.className}`}>{config.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { variant: "outline" },
    picked_up: { variant: "secondary" },
    in_transit: { variant: "default" },
    out_for_delivery: { variant: "default" },
    delivered: { variant: "secondary" },
    delayed: { variant: "destructive" },
    exception: { variant: "destructive" },
    "Pending": { variant: "outline" },
    "Picked Up": { variant: "secondary" },
    "In Transit": { variant: "default" },
    "Arrived": { variant: "default" },
    "Out for Delivery": { variant: "default" },
    "Delivered": { variant: "secondary" },
    "Completed": { variant: "secondary" },
    "Cancelled": { variant: "destructive" },
    // JDE Status Codes
    "420": { variant: "outline" },
    "430": { variant: "secondary" },
    "440": { variant: "default" },
    "450": { variant: "default" },
    "460": { variant: "default" },
    "470": { variant: "secondary" },
    "480": { variant: "secondary" },
    "999": { variant: "destructive" },
  };

  return (
    <Badge variant={config[status]?.variant || "secondary"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export default function Shipments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  // JDE Shipments from MSSQL
  const { data: shipments, isLoading, refetch } = trpc.shipment.listJDE.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    riskLevel: riskFilter !== "all" ? riskFilter : undefined,
  });

  const filteredShipments = shipments?.filter((shipment: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      shipment.shipmentNumber?.toLowerCase().includes(query) ||
      shipment.carrier?.toLowerCase().includes(query) ||
      shipment.trackingNumber?.toLowerCase().includes(query)
    );
  });

  const inTransitCount = shipments?.filter((s: any) => s.status === "in_transit" || s.status === "In Transit").length || 0;
  const delayedCount = shipments?.filter((s: any) => s.status === "delayed" || s.riskLevel === "red").length || 0;
  const tempAlertCount = shipments?.filter((s: any) => s.temperatureAlert).length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
            </div>
            <p className="text-muted-foreground">
              Track shipments and monitor delivery performance
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Total Shipments</p>
                  <p className="text-3xl font-bold">{shipments?.length || 0}</p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">In Transit</p>
                  <p className="text-3xl font-bold">{inTransitCount}</p>
                </div>
                <Truck className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Delayed</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {delayedCount}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-[oklch(0.55_0.25_27)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Temp Alerts</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {tempAlertCount}
                  </p>
                </div>
                <Thermometer className="h-8 w-8 text-[oklch(0.55_0.25_27)]" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by shipment number, carrier, or tracking..."
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
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[180px]">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="green">On Track</SelectItem>
                  <SelectItem value="yellow">At Risk</SelectItem>
                  <SelectItem value="red">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-caption">
              {filteredShipments?.length || 0} Shipments
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
                    <TableHead>Shipment #</TableHead>
                    <TableHead>Carrier</TableHead>
                    <TableHead>Origin</TableHead>
                    <TableHead>Destination</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Temp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShipments?.map((shipment: any) => (
                    <TableRow key={shipment.id || shipment.shipmentNumber}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{shipment.shipmentNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {shipment.trackingNumber}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{shipment.carrier}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[120px]">
                            {(shipment.originCity && shipment.originCountry 
                              ? `${shipment.originCity}, ${shipment.originCountry}`
                              : shipment.originCity) || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm truncate max-w-[120px]">
                            {shipment.destination || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {shipment.eta ? (
                          <span>{shipment.eta}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={shipment.status} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={shipment.riskLevel} />
                      </TableCell>
                      <TableCell>
                        {shipment.temperature ? (
                          <div className={`flex items-center gap-1 ${shipment.temperatureAlert ? "text-[oklch(0.55_0.25_27)]" : ""}`}>
                            <Thermometer className="h-4 w-4" />
                            <span className="font-medium">
                              {Number(shipment.temperature).toFixed(1)}°C
                            </span>
                            {shipment.temperatureAlert && (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">N/A</span>
                        )}
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
