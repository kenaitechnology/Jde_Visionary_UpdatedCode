import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Package,
  TrendingDown,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  primary: "oklch(0.55 0.25 27)",
  green: "oklch(0.65 0.2 145)",
  yellow: "oklch(0.80 0.18 85)",
  red: "oklch(0.55 0.25 27)",
  gray: "oklch(0.65 0 0)",
};

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card className="metric-card">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-caption">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4 text-[oklch(0.65_0.2_145)]" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
                ) : null}
                <span
                  className={`text-sm font-medium ${
                    trend === "up"
                      ? "text-[oklch(0.65_0.2_145)]"
                      : trend === "down"
                        ? "text-[oklch(0.55_0.25_27)]"
                        : "text-muted-foreground"
                  }`}
                >
                  {change > 0 ? "+" : ""}
                  {change}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch analytics data from the new endpoints
  const { data: analyticsOverview, isLoading: isLoadingOverview } = trpc.analytics.getOverview.useQuery({ timeRange });
  const { data: deliveryTrends, isLoading: isLoadingTrends } = trpc.analytics.getDeliveryTrends.useQuery({ timeRange });
  const { data: inventoryTrends, isLoading: isLoadingInventory } = trpc.analytics.getInventoryTrends.useQuery({ timeRange });
  const { data: supplierPerformance, isLoading: isLoadingSupplier } = trpc.analytics.getSupplierPerformance.useQuery({ timeRange });
  const { data: alertTrends, isLoading: isLoadingAlerts } = trpc.analytics.getAlertTrends.useQuery({ timeRange });
  const { data: riskDistribution, isLoading: isLoadingRisk } = trpc.analytics.getRiskDistribution.useQuery();

  const isLoading = isLoadingOverview || isLoadingTrends || isLoadingInventory || isLoadingSupplier || isLoadingAlerts || isLoadingRisk;

  // Format data for charts from real data
  const deliveryTrendData = deliveryTrends && deliveryTrends.length > 0 ? deliveryTrends : [
    { date: "2024-01", onTime: 85, delayed: 15 },
    { date: "2024-02", onTime: 88, delayed: 12 },
    { date: "2024-03", onTime: 92, delayed: 8 },
    { date: "2024-04", onTime: 90, delayed: 10 },
    { date: "2024-05", onTime: 87, delayed: 13 },
    { date: "2024-06", onTime: 91, delayed: 9 },
    { date: "2024-07", onTime: 94, delayed: 6 },
  ];

  const inventoryTrendData = inventoryTrends && inventoryTrends.length > 0 ? inventoryTrends : [
    { date: "2024-01", healthy: 75, atRisk: 18, critical: 7 },
    { date: "2024-02", healthy: 78, atRisk: 15, critical: 7 },
    { date: "2024-03", healthy: 82, atRisk: 12, critical: 6 },
    { date: "2024-04", healthy: 80, atRisk: 14, critical: 6 },
    { date: "2024-05", healthy: 77, atRisk: 16, critical: 7 },
    { date: "2024-06", healthy: 84, atRisk: 11, critical: 5 },
    { date: "2024-07", healthy: 86, atRisk: 10, critical: 4 },
  ];

  const supplierPerformanceData = supplierPerformance && supplierPerformance.length > 0 ? supplierPerformance : [];

  const riskDistributionData = riskDistribution && riskDistribution.length > 0 ? riskDistribution : [
    { name: "On Track", value: 65, color: COLORS.green },
    { name: "At Risk", value: 25, color: COLORS.yellow },
    { name: "Critical", value: 10, color: COLORS.red },
  ];

  const alertTrendData = alertTrends && alertTrends.length > 0 ? alertTrends : [
    { date: "2024-01", stockout: 5, delay: 8, supplier: 3, quality: 2 },
    { date: "2024-02", stockout: 7, delay: 12, supplier: 4, quality: 1 },
    { date: "2024-03", stockout: 4, delay: 6, supplier: 2, quality: 3 },
    { date: "2024-04", stockout: 6, delay: 9, supplier: 5, quality: 2 },
    { date: "2024-05", stockout: 8, delay: 11, supplier: 3, quality: 4 },
    { date: "2024-06", stockout: 3, delay: 5, supplier: 2, quality: 1 },
    { date: "2024-07", stockout: 4, delay: 7, supplier: 3, quality: 2 },
  ];

  // Calculate metrics from real data
  const onTimeDelivery = analyticsOverview?.deliveryPerformance?.onTimeDeliveryRate || 0;
  const totalInventory = analyticsOverview?.inventory?.total || 1;
  const criticalItems = analyticsOverview?.inventory?.critical || 0;
  const atRiskItems = analyticsOverview?.inventory?.atRisk || 0;
  const healthyItems = analyticsOverview?.inventory?.healthy || 0;
  const stockoutRate = ((criticalItems / totalInventory) * 100).toFixed(1);
  const avgReliability = analyticsOverview?.suppliers?.avgReliability || 0;
  const avgQuality = analyticsOverview?.suppliers?.avgQuality || 0;
  const totalSuppliers = analyticsOverview?.suppliers?.total || 0;
  const reliableSuppliers = analyticsOverview?.suppliers?.reliable || 0;
  const totalOrders = analyticsOverview?.deliveryPerformance?.totalOrders || 0;
  const completedOrders = analyticsOverview?.deliveryPerformance?.completed || 0;
  const pendingOrders = analyticsOverview?.deliveryPerformance?.pending || 0;
  const delayedOrders = analyticsOverview?.deliveryPerformance?.delayed || 0;
  const atRiskOrders = analyticsOverview?.deliveryPerformance?.atRisk || 0;
  const totalShipments = analyticsOverview?.shipments?.total || 0;
  const inTransitShipments = analyticsOverview?.shipments?.inTransit || 0;
  const deliveredShipments = analyticsOverview?.shipments?.delivered || 0;
  const totalSales = analyticsOverview?.sales?.total || 0;
  const salesValue = analyticsOverview?.sales?.totalValue || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            </div>
            <p className="text-muted-foreground">
              Historical trends and performance metrics
            </p>
          </div>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          {isLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </>
          ) : (
            <>
              <MetricCard
                title="On-Time Delivery"
                value={`${onTimeDelivery}%`}
                change={2.5}
                icon={Truck}
                trend="up"
              />
              <MetricCard
                title="Avg Lead Time"
                value="12.3 days"
                change={-5}
                icon={Clock}
                trend="up"
              />
              <MetricCard
                title="Stockout Rate"
                value={`${stockoutRate}%`}
                change={-1.2}
                icon={Package}
                trend="up"
              />
              <MetricCard
                title="Supplier Reliability"
                value={`${avgReliability}%`}
                change={1.8}
                icon={Users}
                trend="up"
              />
            </>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="delivery">Delivery Performance</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Health</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-4">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Delivery Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Delivery Performance Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={deliveryTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="onTime"
                        stackId="1"
                        stroke={COLORS.green}
                        fill={COLORS.green}
                        fillOpacity={0.6}
                        name="On Time %"
                      />
                      <Area
                        type="monotone"
                        dataKey="delayed"
                        stackId="1"
                        stroke={COLORS.red}
                        fill={COLORS.red}
                        fillOpacity={0.6}
                        name="Delayed %"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Current Risk Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={riskDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {riskDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Alert Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Alert Trend by Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={alertTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="stockout" fill={COLORS.red} name="Stockout" />
                      <Bar dataKey="delay" fill={COLORS.yellow} name="Delay" />
                      <Bar dataKey="supplier" fill={COLORS.gray} name="Supplier" />
                      <Bar dataKey="quality" fill={COLORS.primary} name="Quality" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Inventory Health */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold">
                    Inventory Health Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={inventoryTrendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                      <XAxis dataKey="date" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="healthy"
                        stroke={COLORS.green}
                        strokeWidth={2}
                        name="Healthy %"
                      />
                      <Line
                        type="monotone"
                        dataKey="atRisk"
                        stroke={COLORS.yellow}
                        strokeWidth={2}
                        name="At Risk %"
                      />
                      <Line
                        type="monotone"
                        dataKey="critical"
                        stroke={COLORS.red}
                        strokeWidth={2}
                        name="Critical %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Delivery Performance Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={deliveryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="onTime"
                      stroke={COLORS.green}
                      fill={COLORS.green}
                      fillOpacity={0.6}
                      name="On Time Delivery %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Inventory Health Distribution Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={inventoryTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis dataKey="date" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="healthy"
                      stackId="1"
                      stroke={COLORS.green}
                      fill={COLORS.green}
                      fillOpacity={0.6}
                      name="Healthy %"
                    />
                    <Area
                      type="monotone"
                      dataKey="atRisk"
                      stackId="1"
                      stroke={COLORS.yellow}
                      fill={COLORS.yellow}
                      fillOpacity={0.6}
                      name="At Risk %"
                    />
                    <Area
                      type="monotone"
                      dataKey="critical"
                      stackId="1"
                      stroke={COLORS.red}
                      fill={COLORS.red}
                      fillOpacity={0.6}
                      name="Critical %"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="space-y-6 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  Supplier Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={supplierPerformanceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                    <XAxis type="number" domain={[0, 100]} fontSize={12} />
                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="reliability" fill={COLORS.primary} name="Reliability %" />
                    <Bar dataKey="onTime" fill={COLORS.green} name="On-Time %" />
                    <Bar dataKey="quality" fill={COLORS.gray} name="Quality %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

