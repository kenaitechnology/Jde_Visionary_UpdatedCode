import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  Database,
  Globe,
  Key,
  Mail,
  Server,
  Settings as SettingsIcon,
  Shield,
  User,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Notification settings state
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    criticalOnly: false,
    dailyDigest: true,
    stockoutWarnings: true,
    deliveryDelays: true,
    supplierIssues: true,
  });

  const handleSaveProfile = () => {
    toast.success("Profile settings saved");
  };

  const handleSaveNotifications = () => {
    toast.success("Notification preferences saved");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="accent-square-lg" />
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Profile
                </CardTitle>
                <CardDescription>
                  Your personal information and account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue={user?.name || ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user?.email || ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={user?.role === "admin" ? "default" : "secondary"}>
                      {user?.role === "admin" ? "Administrator" : "Supply Chain Planner"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Contact your administrator to change roles
                    </span>
                  </div>
                </div>
                <Button onClick={handleSaveProfile}>Save Changes</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Two-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast.info("Feature coming soon")}>
                    Enable 2FA
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Active Sessions</p>
                    <p className="text-sm text-muted-foreground">
                      Manage devices where you're logged in
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast.info("Feature coming soon")}>
                    View Sessions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Configure how and when you receive alerts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Alerts</p>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts via email
                      </p>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, emailAlerts: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Critical Alerts Only</p>
                      <p className="text-sm text-muted-foreground">
                        Only notify for critical severity alerts
                      </p>
                    </div>
                    <Switch
                      checked={notifications.criticalOnly}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, criticalOnly: checked })
                      }
                    />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Daily Digest</p>
                      <p className="text-sm text-muted-foreground">
                        Receive a daily summary of all alerts
                      </p>
                    </div>
                    <Switch
                      checked={notifications.dailyDigest}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, dailyDigest: checked })
                      }
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-caption mb-4">Alert Types</p>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[oklch(0.55_0.25_27/0.1)] flex items-center justify-center">
                          <Mail className="h-4 w-4 text-[oklch(0.55_0.25_27)]" />
                        </div>
                        <span>Stockout Warnings</span>
                      </div>
                      <Switch
                        checked={notifications.stockoutWarnings}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, stockoutWarnings: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[oklch(0.80_0.18_85/0.1)] flex items-center justify-center">
                          <Mail className="h-4 w-4 text-[oklch(0.55_0.18_85)]" />
                        </div>
                        <span>Delivery Delays</span>
                      </div>
                      <Switch
                        checked={notifications.deliveryDelays}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, deliveryDelays: checked })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-muted flex items-center justify-center">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span>Supplier Issues</span>
                      </div>
                      <Switch
                        checked={notifications.supplierIssues}
                        onCheckedChange={(checked) =>
                          setNotifications({ ...notifications, supplierIssues: checked })
                        }
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSaveNotifications}>Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  JD Edwards Integration
                </CardTitle>
                <CardDescription>
                  Configure your JDE Orchestrator connection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[oklch(0.65_0.2_145)] flex items-center justify-center">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">JDE Orchestrator</p>
                      <p className="text-sm text-muted-foreground">Connected (Simulated)</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[oklch(0.65_0.2_145)]">
                    Active
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jde-url">Orchestrator URL</Label>
                    <Input
                      id="jde-url"
                      defaultValue="https://jde.example.com/orchestrator"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jde-env">Environment</Label>
                    <Input id="jde-env" defaultValue="Production" disabled />
                  </div>
                </div>

                <div className="pt-4">
                  <p className="text-caption mb-4">Available Modules</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      { name: "Procurement (P4310)", status: "connected" },
                      { name: "Transportation (P4915)", status: "connected" },
                      { name: "Inventory (P41202)", status: "connected" },
                      { name: "Sales (P4210)", status: "connected" },
                      { name: "Supplier Master (P04012)", status: "connected" },
                      { name: "Sales Order Inquiry (P42101)", status: "connected" },
                    ].map((module) => (
                      <div
                        key={module.name}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <span className="text-sm">{module.name}</span>
                        <Badge variant="outline" className="text-[oklch(0.65_0.2_145)]">
                          Connected
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Keys
                </CardTitle>
                <CardDescription>
                  Manage API keys for external integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 border rounded">
                  <div>
                    <p className="font-medium">Production API Key</p>
                    <p className="text-sm text-muted-foreground font-mono">
                      jde_****************************
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast.info("Feature coming soon")}>
                    Regenerate
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Information
                </CardTitle>
                <CardDescription>
                  Application version and system status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 bg-muted rounded">
                    <p className="text-caption mb-1">Application Version</p>
                    <p className="font-mono font-semibold">v1.0.0</p>
                  </div>
                  <div className="p-4 bg-muted rounded">
                    <p className="text-caption mb-1">AI Model</p>
                    <p className="font-mono font-semibold">GPT-4 Turbo</p>
                  </div>
                  <div className="p-4 bg-muted rounded">
                    <p className="text-caption mb-1">Database Status</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.2_145)]" />
                      <span className="font-semibold">Connected</span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted rounded">
                    <p className="text-caption mb-1">Last Data Sync</p>
                    <p className="font-semibold">Just now</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Manage application data and cache
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Clear Cache</p>
                    <p className="text-sm text-muted-foreground">
                      Clear cached data to refresh from source
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast.success("Cache cleared")}>
                    Clear Cache
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Export Data</p>
                    <p className="text-sm text-muted-foreground">
                      Download all your data in CSV format
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => toast.info("Feature coming soon")}>
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
