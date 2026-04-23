"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CreditCard,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Settings2,
  Wifi,
  WifiOff,
  Link2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ApiBankConnection, workforceApi } from "@/lib/api/workforce"

type BankProvider = ApiBankConnection["provider"]

type BankConnection = {
  id: string
  provider: BankProvider
  status: ApiBankConnection["status"]
  lastSync: string | null
  tokenMasked: string
  connectedAt: string
  lastError: string
  disabledReason: string
}

const bankProviders: Record<BankProvider, { name: string; icon: string; tokenField: string; docs: string }> = {
  monobank: {
    name: "Monobank",
    icon: "M",
    tokenField: "X-Token",
    docs: "https://api.monobank.ua/docs",
  },
  privat24: {
    name: "Privat24",
    icon: "P",
    tokenField: "API Token",
    docs: "https://api.privatbank.ua",
  },
  wise: {
    name: "Wise",
    icon: "W",
    tokenField: "API Key",
    docs: "https://api-docs.wise.com",
  },
  revolut: {
    name: "Revolut",
    icon: "R",
    tokenField: "Access Token",
    docs: "https://developer.revolut.com",
  },
}

const toUiConnection = (connection: ApiBankConnection): BankConnection => ({
  id: String(connection.id),
  provider: connection.provider,
  status: connection.status,
  lastSync: connection.last_sync,
  tokenMasked: connection.token_masked,
  connectedAt: connection.connected_at,
  lastError: connection.last_error,
  disabledReason: connection.disabled_reason,
})

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<BankConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteConnection, setDeleteConnection] = useState<BankConnection | null>(null)
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null)

  const [addData, setAddData] = useState({
    provider: "monobank" as BankProvider,
    token: "",
  })

  const loadConnections = async () => {
    setIsLoading(true)
    try {
      const data = await workforceApi.listBankConnections()
      setConnections(data.map(toUiConnection))
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load bank integrations")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadConnections()
  }, [])

  const handleAddConnection = async () => {
    if (!addData.token.trim()) return

    try {
      const created = await workforceApi.connectBank({ provider: addData.provider, token: addData.token.trim() })
      setConnections((prev) => [toUiConnection(created), ...prev.filter((item) => item.provider !== created.provider)])
      setIsAddDialogOpen(false)
      setAddData({ provider: "monobank", token: "" })
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect bank")
    }
  }

  const handleDeleteConnection = async () => {
    if (!deleteConnection) return

    try {
      await workforceApi.deleteBankConnection(deleteConnection.id)
      setConnections((prev) => prev.filter((c) => c.id !== deleteConnection.id))
      setDeleteConnection(null)
      setErrorMessage(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to disconnect bank")
    }
  }

  const getStatusBadge = (status: BankConnection["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 gap-1">
            <CheckCircle2 className="size-3" />
            Connected
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 gap-1">
            <AlertCircle className="size-3" />
            Error
          </Badge>
        )
      case "syncing":
        return (
          <Badge className="bg-blue-100 text-blue-800 gap-1">
            <RefreshCw className="size-3 animate-spin" />
            Syncing
          </Badge>
        )
      case "disabled":
        return (
          <Badge className="bg-muted text-muted-foreground gap-1">
            <AlertCircle className="size-3" />
            Disabled
          </Badge>
        )
    }
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return "Never"
    return new Date(date).toLocaleString("uk-UA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const connectedBanks = useMemo(() => connections.filter((c) => c.status === "connected").length, [connections])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bank Integrations</h1>
          <p className="text-sm text-muted-foreground">Connect your bank accounts to automatically sync transactions</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Bank
        </Button>
      </div>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected Banks</CardTitle>
            <Wifi className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedBanks}</div>
            <p className="text-xs text-muted-foreground">{connections.length} total connections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active status</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.filter((c) => !c.disabledReason).length}</div>
            <p className="text-xs text-muted-foreground">Without disabled reason</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections[0]?.lastSync ? formatDateTime(connections[0].lastSync) : "N/A"}</div>
            <p className="text-xs text-muted-foreground">From backend audit fields</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {!isLoading && connections.map((connection) => {
          const provider = bankProviders[connection.provider]
          const isExpanded = expandedConnection === connection.id

          return (
            <Card key={connection.id}>
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary font-bold text-lg">
                      {provider.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{provider.name}</span>
                        {getStatusBadge(connection.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Last sync: {formatDateTime(connection.lastSync)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          Connected: {formatDateTime(connection.connectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setExpandedConnection(isExpanded ? null : connection.id)}>
                      <Settings2 className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteConnection(connection)}>
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <>
                    <Separator />
                    <div className="p-4 space-y-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <Label className="text-xs text-muted-foreground">{provider.tokenField}</Label>
                        <div className="font-mono text-sm mt-1">{connection.tokenMasked}</div>
                        <p className="text-xs text-muted-foreground mt-2">Backend stores only encrypted token value. Full token is never returned via API.</p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Last error:</span> {connection.lastError || "—"}</p>
                        <p><span className="font-medium">Disabled reason:</span> {connection.disabledReason || "—"}</p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}

        {!isLoading && connections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <WifiOff className="size-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No Banks Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">Connect your first bank account to start tracking transactions</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add Bank
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Bank Account</DialogTitle>
            <DialogDescription>Token is sent one time on connect and stored encrypted on backend</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Provider</Label>
              <Select value={addData.provider} onValueChange={(v) => setAddData((prev) => ({ ...prev, provider: v as BankProvider }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(bankProviders).map(([key, provider]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{provider.icon}</span>
                        {provider.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">{bankProviders[addData.provider].tokenField}</Label>
              <Input
                id="token"
                type="password"
                placeholder="Paste your token here"
                value={addData.token}
                onChange={(e) => setAddData((prev) => ({ ...prev, token: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="size-3" />
                <a href={bankProviders[addData.provider].docs} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  How to get your {bankProviders[addData.provider].tokenField}
                </a>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddConnection} disabled={!addData.token.trim()}>
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConnection} onOpenChange={() => setDeleteConnection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {deleteConnection && bankProviders[deleteConnection.provider].name}? Transaction sync will stop and you&apos;ll need to reconnect to resume.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConnection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
