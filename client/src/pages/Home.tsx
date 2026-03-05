import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  Package,
  ShoppingCart,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { useLocation } from "wouter";

function RiskBadge({ level }: { level: string }) {
  const config = {
    green: { label: "On Track", className: "risk-badge-green" },
    yellow: { label: "At Risk", className: "risk-badge-yellow" },
    red: { label: "Critical", className: "risk-badge-red" },
    low: { label: "Low", className: "risk-badge-green" },
    medium: { label: "Medium", className: "risk-badge-yellow" },
    high: { label: "High", className: "risk-badge-yellow" },
    critical: { label: "Critical", className: "risk-badge-red" },
  }[level] || { label: level, className: "risk-badge-green" };

  return <span className={`risk-badge ${config.className}`}>{config.label}</span>;
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  onClick,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: { value: number; label: string };
  onClick?: () => void;
}) {
  return (
    <Card
      className={`metric-card ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-caption">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-display text-3xl">{value}</div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-2 mt-2">
            <span
              className={`text-sm font-medium ${trend.value >= 0 ? "text-[oklch(0.65_0.2_145)]" : "text-[oklch(0.55_0.25_27)]"}`}
            >
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">{trend.label}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RiskOverviewSection() {
  const [, setLocation] = useLocation();
  const { data: riskData, isLoading } = trpc.dashboard.getRiskOverview.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="accent-square" />
          <h2 className="text-xl font-bold tracking-tight">Risk Overview</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setLocation("/alerts")}>
          View All Alerts
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Delayed Purchase Orders */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
                Delayed Purchase Orders
              </CardTitle>
              <Badge variant="destructive">{riskData?.delayedPurchaseOrders?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskData?.delayedPurchaseOrders?.slice(0, 3).map((po: any) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 transition-colors"
                  onClick={() => setLocation("/purchase-orders")}
                >
                  <div>
                    <p className="font-medium text-sm">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(po.delayProbability).toFixed(0)}% delay probability
                    </p>
                  </div>
                  <RiskBadge level={po.riskLevel} />
                </div>
              ))}
              {(!riskData?.delayedPurchaseOrders || riskData.delayedPurchaseOrders.length === 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.65_0.2_145)]" />
                  No delayed orders
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stockout Risks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[oklch(0.80_0.18_85)]" />
                Stockout Risks (14 days)
              </CardTitle>
              <Badge variant="secondary">{riskData?.stockoutRisks?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskData?.stockoutRisks?.slice(0, 3).map((item: any) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 transition-colors"
                  onClick={() => setLocation("/inventory")}
                >
                  <div>
                    <p className="font-medium text-sm">{item.itemCode}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.daysOfSupply} days of supply
                    </p>
                  </div>
                  <RiskBadge level={item.stockoutRisk} />
                </div>
              ))}
              {(!riskData?.stockoutRisks || riskData.stockoutRisks.length === 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.65_0.2_145)]" />
                  No stockout risks
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <XCircle className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
                Critical Alerts
              </CardTitle>
              <Badge variant="destructive">{riskData?.criticalAlerts?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskData?.criticalAlerts?.slice(0, 3).map((alert: any) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 transition-colors"
                  onClick={() => setLocation("/alerts")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {alert.type.replace(/_/g, " ")}
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-2 shrink-0">Critical</Badge>
                </div>
              ))}
              {(!riskData?.criticalAlerts || riskData.criticalAlerts.length === 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.65_0.2_145)]" />
                  No critical alerts
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* At-Risk Shipments */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
                At-Risk Shipments
              </CardTitle>
              <Badge variant="secondary">{riskData?.atRiskShipments?.length || 0}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskData?.atRiskShipments?.slice(0, 3).map((shipment: any) => (
                <div
                  key={shipment.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/50 -mx-2 px-2 transition-colors"
                  onClick={() => setLocation("/shipments")}
                >
                  <div>
                    <p className="font-medium text-sm">{shipment.shipmentNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {shipment.carrier} • {shipment.status.replace(/_/g, " ")}
                    </p>
                  </div>
                  <RiskBadge level={shipment.riskLevel} />
                </div>
              ))}
              {(!riskData?.atRiskShipments || riskData.atRiskShipments.length === 0) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <CheckCircle2 className="h-4 w-4 text-[oklch(0.65_0.2_145)]" />
                  No at-risk shipments
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = trpc.dashboard.getStats.useQuery();

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Control Tower</h1>
            </div>
            <p className="text-muted-foreground">
              Real-time supply chain visibility and AI-powered risk management
            </p>
          </div>
          <Button onClick={() => setLocation("/assistant")}>
            Ask Digital Assistant
          </Button>
        </div>

        {/* Divider */}
        <div className="swiss-divider-bold" />

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="Purchase Orders"
                value={stats?.purchaseOrders?.total || 0}
                subtitle={`${stats?.purchaseOrders?.atRisk || 0} at risk`}
                icon={ShoppingCart}
                onClick={() => setLocation("/purchase-orders")}
              />
              <MetricCard
                title="Inventory Items"
                value={stats?.inventory?.total || 0}
                subtitle={`${stats?.inventory?.lowStock || 0} low stock`}
                icon={Box}
                onClick={() => setLocation("/inventory")}
              />
              <MetricCard
                title="Active Suppliers"
                value={stats?.suppliers?.active || 0}
                subtitle={`${Number(stats?.suppliers?.avgReliability || 0).toFixed(1)}% avg reliability`}
                icon={Users}
                onClick={() => setLocation("/suppliers")}
              />
              <MetricCard
                title="Pending Alerts"
                value={stats?.alerts?.unread || 0}
                subtitle={`${stats?.alerts?.critical || 0} critical`}
                icon={AlertTriangle}
                onClick={() => setLocation("/alerts")}
              />
            </>
          )}
        </div>

        {/* Risk Overview */}
        <RiskOverviewSection />

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="accent-square" />
            <h2 className="text-xl font-bold tracking-tight">Quick Actions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/purchase-orders")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Review Delayed Orders</h3>
                    <p className="text-sm text-muted-foreground">
                      Check orders with high delay probability
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/inventory")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                    <Box className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Stock-Out Guard</h3>
                    <p className="text-sm text-muted-foreground">
                      Items at risk of stockout within 14 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/assistant")}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-primary/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Find Suppliers</h3>
                    <p className="text-sm text-muted-foreground">
                      Discover alternative suppliers with AI
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
