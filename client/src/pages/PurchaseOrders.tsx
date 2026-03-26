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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Brain,
  Filter,
  Mail,
  MoreHorizontal,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function RiskBadge({ level }: { level: string }) {
  const config = {
    green: { label: "On Track", className: "risk-badge-green" },
    yellow: { label: "At Risk", className: "risk-badge-yellow" },
    red: { label: "Critical", className: "risk-badge-red" },
  }[level] || { label: level, className: "risk-badge-green" };

  return <span className={`risk-badge ${config.className}`}>{config.label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    pending: { label: "Pending", variant: "outline" },
    on_hold: { label: "On Hold", variant: "destructive" },
    in_progress: { label: "In Progress", variant: "default" },
    completed: { label: "Completed", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    // JDE Status Codes
    "100": { label: "Pending", variant: "outline" },
    "110": { label: "Pending", variant: "outline" },
    "120": { label: "Pending", variant: "outline" },
    "130": { label: "Pending", variant: "outline" },
    "215": { label: "Pending", variant: "outline" },
    "160": { label: "On Hold", variant: "destructive" },
    "180": { label: "In Progress", variant: "default" },
    "220": { label: "In Progress", variant: "default" },
    "230": { label: "In Progress", variant: "default" },
    "240": { label: "In Progress", variant: "default" },
    "250": { label: "In Progress", variant: "default" },
    "280": { label: "In Progress", variant: "default" },
    "380": { label: "In Progress", variant: "default" },
    "400": { label: "Completed", variant: "secondary" },
    "999": { label: "Cancelled", variant: "destructive" },
  };

  const statusConfig = config[status] || { label: status, variant: "secondary" as const };

  return (
    <Badge variant={statusConfig.variant} className="capitalize">
      {statusConfig.label}
    </Badge>
  );
}

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [showPredictionDialog, setShowPredictionDialog] = useState(false);
  const [showRemediateDialog, setShowRemediateDialog] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [emailMessage, setEmailMessage] = useState("");

  // JDE Purchase Orders - fetched directly from JDE MSSQL tables
  const { data: purchaseOrders, isLoading, refetch } = trpc.purchaseOrder.listJDE.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const predictDelay = trpc.ai.predictDelay.useMutation({
    onSuccess: (data) => {
      setPrediction(data);
    },
    onError: () => {
      toast.error("Failed to generate prediction");
    },
  });

  const emailSupplier = trpc.remediation.emailSupplier.useMutation({
    onSuccess: () => {
      toast.success("Email sent to supplier");
      setShowRemediateDialog(false);
      setEmailMessage("");
    },
    onError: () => {
      toast.error("Failed to send email");
    },
  });

  const filteredOrders = purchaseOrders?.filter((po: any) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(query) ||
      (po.supplierName && po.supplierName.toLowerCase().includes(query))
    );
  });

  const handlePredict = (po: any) => {
    setSelectedPO(po);
    setShowPredictionDialog(true);
    setPrediction(null);
    // For JDE data, we use the poNumber instead of id
    if (po.id) {
      predictDelay.mutate({ purchaseOrderId: po.id });
    } else {
      toast.error("Cannot generate prediction: No local ID available for this JDE order");
      setShowPredictionDialog(false);
    }
  };

  const handleRemediate = (po: any) => {
    setSelectedPO(po);
    setShowRemediateDialog(true);
    setEmailMessage(
      `Dear Supplier,\n\nWe are writing regarding Purchase Order ${po.poNumber}.\n\nOur AI system has detected a potential delay risk for this order. We kindly request an update on the current status and expected delivery timeline.\n\nPlease confirm the revised delivery date at your earliest convenience.\n\nBest regards,\nSupply Chain Team`
    );
  };

  const handleSendEmail = () => {
    if (!selectedPO) return;
    // For JDE orders, we need supplier info - using supplierName from JDE
    if (!selectedPO.id) {
      toast.error("Cannot send email: No local supplier ID available for this JDE order");
      return;
    }
    emailSupplier.mutate({
      supplierId: selectedPO.supplierId,
      subject: `Urgent: Status Update Required for PO ${selectedPO.poNumber}`,
      message: emailMessage,
      relatedEntityType: "purchase_order",
      relatedEntityId: selectedPO.id,
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
              <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
            </div>
            <p className="text-muted-foreground">
              Monitor and manage purchase orders with AI-powered delay predictions
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number or supplier..."
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
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-caption">
              {filteredOrders?.length || 0} Purchase Orders
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
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Requested Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Delay Prob.</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders?.map((po: any) => (
                    <TableRow key={po.id || po.poNumber}>
                      <TableCell className="font-medium">{po.poNumber}</TableCell>
                      <TableCell>{po.supplierName || "-"}</TableCell>
                      <TableCell>
                        {po.orderDate ? (
                          <span>{po.orderDate}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {po.requestedDeliveryDate ? (
                          <span>{po.requestedDeliveryDate}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={po.status} />
                      </TableCell>
                      <TableCell>
                        <span
                          className={`font-medium ${
                            Number(po.delayProbability) > 70
                              ? "text-[oklch(0.55_0.25_27)]"
                              : Number(po.delayProbability) > 40
                                ? "text-[oklch(0.55_0.18_85)]"
                                : "text-[oklch(0.45_0.2_145)]"
                          }`}
                        >
                          {Number(po.delayProbability || 0).toFixed(0)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <RiskBadge level={po.riskLevel || "green"} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePredict(po)}>
                              <Brain className="mr-2 h-4 w-4" />
                              AI Prediction
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleRemediate(po)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Email Supplier
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Feature coming soon")}>
                              <Truck className="mr-2 h-4 w-4" />
                              Track Shipment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Prediction Dialog */}
      <Dialog open={showPredictionDialog} onOpenChange={setShowPredictionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Delay Prediction
            </DialogTitle>
            <DialogDescription>
              {selectedPO?.poNumber} - Powered by machine learning analysis
            </DialogDescription>
          </DialogHeader>

          {predictDelay.isPending ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20" />
            </div>
          ) : prediction ? (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded">
                  <p className="text-caption mb-1">Delay Probability</p>
                  <p
                    className={`text-2xl font-bold ${
                      prediction.delayProbability > 70
                        ? "text-[oklch(0.55_0.25_27)]"
                        : prediction.delayProbability > 40
                          ? "text-[oklch(0.55_0.18_85)]"
                          : "text-[oklch(0.45_0.2_145)]"
                    }`}
                  >
                    {prediction.delayProbability}%
                  </p>
                </div>
                <div className="p-4 bg-muted rounded">
                  <p className="text-caption mb-1">Estimated Delay</p>
                  <p className="text-2xl font-bold">
                    {prediction.estimatedDelayDays} days
                  </p>
                </div>
              </div>

              <div>
                <p className="text-caption mb-2">Risk Factors</p>
                <ul className="space-y-2">
                  {prediction.riskFactors?.map((factor: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-[oklch(0.55_0.25_27)] shrink-0 mt-0.5" />
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="text-caption mb-2">Recommended Actions</p>
                <ul className="space-y-2">
                  {prediction.mitigationActions?.map((action: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="w-5 h-5 bg-primary text-primary-foreground text-xs flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-muted-foreground">
              <p>AI prediction is only available for local purchase orders.</p>
              <p className="text-sm mt-2">This JDE order does not have a local ID for AI analysis.</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPredictionDialog(false)}>
              Close
            </Button>
            <Button onClick={() => handleRemediate(selectedPO)}>
              <Mail className="mr-2 h-4 w-4" />
              Email Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remediate Dialog */}
      <Dialog open={showRemediateDialog} onOpenChange={setShowRemediateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Supplier
            </DialogTitle>
            <DialogDescription>
              Send an automated email to {selectedPO?.supplierName || "Supplier"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-caption mb-2">Subject</p>
              <p className="text-sm font-medium">
                Urgent: Status Update Required for PO {selectedPO?.poNumber}
              </p>
            </div>
            <div>
              <p className="text-caption mb-2">Message</p>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemediateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={emailSupplier.isPending}>
              {emailSupplier.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

