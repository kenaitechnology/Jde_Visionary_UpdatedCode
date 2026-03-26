import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import {
  Brain,
  Building2,
  CheckCircle2,
  Clock,
  Filter,
  Globe,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { variant: "default" | "secondary" | "outline" | "destructive"; label: string }> = {
    active: { variant: "default", label: "Active" },
    inactive: { variant: "secondary", label: "Inactive" },
    suspended: { variant: "destructive", label: "Suspended" },
  };

  return (
    <Badge variant={config[status]?.variant || "secondary"}>
      {config[status]?.label || status}
    </Badge>
  );
}

function ScoreBar({ score, label, tooltip }: { score: number; label: string; tooltip?: string }) {
  let color = "bg-[oklch(0.65_0.2_145)]";
  if (score < 80) color = "bg-[oklch(0.80_0.18_85)]";
  if (score < 70) color = "bg-[oklch(0.55_0.25_27)]";

  return (
    <div className="space-y-1 group relative">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      {tooltip && (
        <>
          <div className="absolute -top-10 left-0 right-0 bg-background border rounded-md shadow-lg p-2 text-xs opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 whitespace-pre-wrap max-w-xs">
            {tooltip}
          </div>
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-background rotate-45 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-40" />
        </>
      )}
    </div>
  );
}

function SupplierCard({ supplier, onFindAlternatives }: { supplier: any; onFindAlternatives: () => void }) {
  return (
    <Card className="metric-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="font-semibold text-lg">{supplier.name}</p>
            <p className="text-sm text-muted-foreground">{supplier.supplierCode}</p>
          </div>
          <StatusBadge status={supplier.status} />
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span>{supplier.country}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{supplier.leadTimeDays} days lead time</span>
            </div>
          </div>

          <div className="space-y-3">
<ScoreBar 
  score={Number(supplier.reliabilityScore)} 
  label="Reliability" 
  tooltip="On-time receipts: Receipt Date ≤ Requested Date (F4311/F43121)" 
/>
<ScoreBar 
  score={Number(supplier.onTimeDeliveryRate)} 
  label="On-Time Delivery" 
  tooltip="Same as reliability: % receipts on/early (Receipt ≤ Requested)" 
/>
<ScoreBar 
  score={Number(supplier.qualityScore)} 
  label="Quality" 
  tooltip="(Received Qty - Open Qty) / Ordered Qty × 100 (F4311 PDUORG/PDUOPN)" 
/>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Badge variant="outline">{supplier.category}</Badge>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={onFindAlternatives}>
              <Brain className="mr-2 h-4 w-4" />
              Find Alternatives
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Transform JDE supplier data to UI format
function transformJDESupplier(jdeSupplier: any) {
  return {
    id: jdeSupplier.id,
    supplierCode: jdeSupplier.id, // Use ID as code
    name: jdeSupplier.name,
    status: jdeSupplier.type === 'V' ? 'active' : 'inactive', // V = Vendor = Active
    country: jdeSupplier.country || 'N/A',
    leadTimeDays: jdeSupplier.leadDays || 0,
    reliabilityScore: jdeSupplier.reliabilityScore || 0, // From JDE F4311 + F43121
    onTimeDeliveryRate: jdeSupplier.reliabilityScore || 0, // Same as reliability (Receipt Date ≤ Requested Date)
    qualityScore: jdeSupplier.qualityScore || 0, // From JDE F4311: (PDUORG - PDUOPN) / PDUORG × 100
    category: 'Vendor', // JDE type V means Vendor
  };
}

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showAlternativesDialog, setShowAlternativesDialog] = useState(false);
  const [alternatives, setAlternatives] = useState<any>(null);

  // Fetch suppliers from JDE database (F0101 table)
  const { data: jdeSuppliers, isLoading, refetch } = trpc.supplier.listJDE.useQuery();

  // Transform JDE data to UI format
  const suppliers = jdeSuppliers?.map(transformJDESupplier) || [];

  const recommendSuppliers = trpc.ai.recommendSuppliers.useMutation({
    onSuccess: (data) => {
      setAlternatives(data);
    },
    onError: () => {
      toast.error("Failed to find alternative suppliers");
    },
  });

  const categories = Array.from(new Set(suppliers?.map((s: any) => s.category) || []));

  const filteredSuppliers = suppliers?.filter((supplier: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      supplier.name.toLowerCase().includes(query) ||
      supplier.supplierCode?.toLowerCase().includes(query) ||
      supplier.country?.toLowerCase().includes(query)
    );
  });

  const handleFindAlternatives = (supplier: any) => {
    setSelectedSupplier(supplier);
    setShowAlternativesDialog(true);
    setAlternatives(null);
    recommendSuppliers.mutate({
      itemCategory: supplier.category,
      currentSupplierId: Number(supplier.id) || 0,
      urgency: "medium",
    });
  };

  // Calculate average reliability and on-time delivery from JDE data
  const avgReliability = suppliers?.length 
    ? suppliers.reduce((sum: number, s: any) => sum + (s.reliabilityScore || 0), 0) / suppliers.filter((s: any) => s.reliabilityScore > 0).length || 0
    : 0;
  
  // On-Time is the same as reliability (percentage where Receipt Date ≤ Requested Date)
  const avgOnTime = avgReliability;
  
  // Calculate average quality from JDE data
  const avgQuality = suppliers?.length
    ? suppliers.reduce((sum: number, s: any) => sum + (s.qualityScore || 0), 0) / suppliers.filter((s: any) => s.qualityScore > 0).length || 0
    : 0;
  
  // JDE vendors are all active (type V = Vendor)
  const activeCount = suppliers?.filter((s: any) => s.status === "active").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="accent-square-lg" />
              <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
            </div>
            <p className="text-muted-foreground">
              Manage supplier relationships and discover alternatives with AI
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
                  <p className="text-caption">Total Suppliers</p>
                  <p className="text-3xl font-bold">{suppliers?.length || 0}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Active (Vendors)</p>
                  <p className="text-3xl font-bold text-[oklch(0.65_0.2_145)]">
                    {activeCount}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[oklch(0.65_0.2_145)]" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Avg Reliability</p>
                  <p className="text-3xl font-bold">{avgReliability > 0 ? `${avgReliability.toFixed(1)}%` : 'N/A'}</p>
                </div>
                <Star className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="metric-card">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption">Avg On-Time</p>
                  <p className="text-3xl font-bold">{avgOnTime > 0 ? `${avgOnTime.toFixed(1)}%` : 'N/A'}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
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
                  placeholder="Search by name, code, or country..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <Building2 className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Supplier Cards */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-80" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSuppliers?.map((supplier: any) => (
              <SupplierCard
                key={supplier.id}
                supplier={supplier}
                onFindAlternatives={() => handleFindAlternatives(supplier)}
              />
            ))}
          </div>
        )}
      </div>

      {/* AI Alternatives Dialog */}
      <Dialog open={showAlternativesDialog} onOpenChange={setShowAlternativesDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Alternative Suppliers
            </DialogTitle>
            <DialogDescription>
              AI-recommended alternatives to {selectedSupplier?.name}
            </DialogDescription>
          </DialogHeader>

          {recommendSuppliers.isPending ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          ) : alternatives?.recommendations ? (
            <div className="space-y-4 py-4">
              {alternatives.recommendations.map((rec: any, index: number) => (
                <Card key={rec.supplierId}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold">{rec.supplierName}</p>
                          <Badge variant="outline">{rec.score.toFixed(0)} pts</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rec.justification}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">No alternatives found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
