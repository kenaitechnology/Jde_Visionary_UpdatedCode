import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  AlertTriangle,
  Box,
  Filter,
  Package,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";

function RiskBadge({ level }: { level: string }) {
  const config = {
    low: { label: "Low", className: "risk-badge-green" },
    medium: { label: "Medium", className: "risk-badge-yellow" },
    high: { label: "High", className: "risk-badge-yellow" },
    critical: { label: "Critical", className: "risk-badge-red" },
  }[level] || { label: level, className: "risk-badge-green" };

  return <span className={`risk-badge ${config.className}`}>{config.label}</span>;
}

function StockLevelBar({ current, reorderPoint, safetyStock }: { current: number; reorderPoint: number; safetyStock: number }) {
  const maxLevel = Math.max(current, reorderPoint * 1.5);
  const currentPercent = (current / maxLevel) * 100;
  const reorderPercent = (reorderPoint / maxLevel) * 100;
  const safetyPercent = (safetyStock / maxLevel) * 100;

  let barColor = "bg-[oklch(0.65_0.2_145)]";
  if (current <= safetyStock) {
    barColor = "bg-[oklch(0.55_0.25_27)]";
  } else if (current <= reorderPoint) {
    barColor = "bg-[oklch(0.80_0.18_85)]";
  }

  return (
    <div className="relative w-full h-6 bg-muted rounded overflow-hidden">
      <div
        className={`absolute h-full ${barColor} transition-all`}
        style={{ width: `${Math.min(currentPercent, 100)}%` }}
      />
      <div
        className="absolute h-full w-0.5 bg-[oklch(0.55_0.25_27)]"
        style={{ left: `${safetyPercent}%` }}
        title={`Safety Stock: ${safetyStock}`}
      />
      <div
        className="absolute h-full w-0.5 bg-[oklch(0.80_0.18_85)]"
        style={{ left: `${reorderPercent}%` }}
        title={`Reorder Point: ${reorderPoint}`}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
        {current.toLocaleString()}
      </span>
    </div>
  );
}

function StockoutRiskCard({ item }: { item: any }) {
  return (
    <Card className="metric-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold">{item.itemCode}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {item.description}
            </p>
          </div>
          <RiskBadge level={item.stockoutRisk} />
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Available Stock</span>
              <span className="font-medium">{item.quantityAvailable?.toLocaleString()}</span>
            </div>
            <StockLevelBar
              current={item.quantityAvailable || 0}
              reorderPoint={item.reorderPoint || 0}
              safetyStock={item.safetyStock || 0}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Days of Supply</p>
              <p className={`font-semibold ${item.daysOfSupply <= 7 ? "text-[oklch(0.55_0.25_27)]" : item.daysOfSupply <= 14 ? "text-[oklch(0.55_0.18_85)]" : ""}`}>
                {item.daysOfSupply} days
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Avg Daily Demand</p>
              <p className="font-semibold">{Number(item.averageDailyDemand).toFixed(0)} units</p>
            </div>
          </div>

          {item.predictedStockoutDate && (
            <div className="flex items-center gap-2 p-2 bg-[oklch(0.55_0.25_27/0.1)] rounded text-sm">
              <AlertTriangle className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
              <span>
                Predicted stockout:{" "}
                <strong>{format(new Date(item.predictedStockoutDate), "MMM d, yyyy")}</strong>
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");

  // JDE inventory from MSSQL
  const { data: inventoryItems, isLoading, refetch } = trpc.inventory.listJDE.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    stockoutRisk: riskFilter !== "all" ? riskFilter : undefined,
  });

  const { data: stockoutRisks } = trpc.inventory.getStockoutRisks.useQuery({ daysThreshold: 14 });

  const categories = Array.from(new Set(inventoryItems?.map((item: any) => item.category) || []));

  const filteredItems = inventoryItems?.filter((item: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.itemCode.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  });

  const criticalItems = filteredItems?.filter((item: any) => 
    item.stockoutRisk === "critical" || item.stockoutRisk === "high"
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
            </div>
            <p className="text-muted-foreground">
              AI Stock-Out Guard monitors demand patterns and predicts stockouts
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
                  <p className="text-caption">Total Items</p>
                  <p className="text-3xl font-bold">{inventoryItems?.length || 0}</p>
                </div>
                <Box className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Critical Risk</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.25_27)]">
                    {inventoryItems?.filter((i: any) => i.stockoutRisk === "critical").length || 0}
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
                  <p className="text-caption">High Risk</p>
                  <p className="text-3xl font-bold text-[oklch(0.55_0.18_85)]">
                    {inventoryItems?.filter((i: any) => i.stockoutRisk === "high").length || 0}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-[oklch(0.55_0.18_85)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Below Reorder</p>
                  <p className="text-3xl font-bold">
                    {inventoryItems?.filter((i: any) => (i.quantityAvailable || 0) <= (i.reorderPoint || 0)).length || 0}
                  </p>
                </div>
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="risks" className="flex items-center gap-2">
              Stock-Out Risks
              {(stockoutRisks?.length || 0) > 0 && (
                <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                  {stockoutRisks?.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4 mt-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by item code or description..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="w-[180px]">
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Risk Level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risk Levels</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-caption">
                  {filteredItems?.length || 0} Inventory Items
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
                        <TableHead>Item Code</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Available</TableHead>
                        <TableHead>Days of Supply</TableHead>
                        <TableHead>Reorder Point</TableHead>
                        <TableHead>Risk Level</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemCode}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {item.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className={item.quantityAvailable <= item.safetyStock ? "text-[oklch(0.55_0.25_27)] font-medium" : ""}>
                              {item.quantityAvailable?.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              item.daysOfSupply <= 7
                                ? "text-[oklch(0.55_0.25_27)]"
                                : item.daysOfSupply <= 14
                                  ? "text-[oklch(0.55_0.18_85)]"
                                  : ""
                            }`}>
                              {item.daysOfSupply} days
                            </span>
                          </TableCell>
                          <TableCell>{item.reorderPoint?.toLocaleString()}</TableCell>
                          <TableCell>
                            <RiskBadge level={item.stockoutRisk} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="risks" className="mt-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="accent-square" />
                <h2 className="text-xl font-bold tracking-tight">
                  Items at Risk of Stockout (14 days)
                </h2>
              </div>

              {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64" />
                  ))}
                </div>
              ) : stockoutRisks && stockoutRisks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {stockoutRisks.map((item: any) => (
                    <StockoutRiskCard key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Box className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No Stockout Risks</h3>
                    <p className="text-sm text-muted-foreground">
                      All inventory items have sufficient stock for the next 14 days.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
