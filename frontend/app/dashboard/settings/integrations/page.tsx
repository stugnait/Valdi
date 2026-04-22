"use client"

import { useState } from "react"
import { 
  CreditCard,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  EyeOff,
  Settings2,
  Wifi,
  WifiOff,
  Link2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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

type BankProvider = "monobank" | "privat24" | "wise" | "revolut"
type ConnectionStatus = "connected" | "error" | "syncing"

interface BankAccount {
  id: string
  name: string
  number: string
  balance: number
  currency: string
  isTracked: boolean
  type: "personal" | "business"
}

interface BankConnection {
  id: string
  provider: BankProvider
  status: ConnectionStatus
  lastSync: string | null
  token: string
  accounts: BankAccount[]
}

const bankProviders: Record<BankProvider, { name: string; icon: string; tokenField: string; docs: string }> = {
  monobank: { 
    name: "Monobank", 
    icon: "M", 
    tokenField: "X-Token",
    docs: "https://api.monobank.ua/docs"
  },
  privat24: { 
    name: "Privat24", 
    icon: "P", 
    tokenField: "API Token",
    docs: "https://api.privatbank.ua"
  },
  wise: { 
    name: "Wise", 
    icon: "W", 
    tokenField: "API Key",
    docs: "https://api-docs.wise.com"
  },
  revolut: { 
    name: "Revolut", 
    icon: "R", 
    tokenField: "Access Token",
    docs: "https://developer.revolut.com"
  },
}

const mockConnections: BankConnection[] = [
  {
    id: "conn1",
    provider: "monobank",
    status: "connected",
    lastSync: "2024-04-20T14:30:00",
    token: "u6gLk...7hN2",
    accounts: [
      { id: "acc1", name: "FOP UAH", number: "*1234", balance: 125000, currency: "UAH", isTracked: true, type: "business" },
      { id: "acc2", name: "FOP USD", number: "*5678", balance: 4500, currency: "USD", isTracked: true, type: "business" },
      { id: "acc3", name: "Personal", number: "*9012", balance: 15000, currency: "UAH", isTracked: false, type: "personal" },
    ],
  },
  {
    id: "conn2",
    provider: "wise",
    status: "connected",
    lastSync: "2024-04-20T12:00:00",
    token: "live_...xyz",
    accounts: [
      { id: "acc4", name: "USD Balance", number: "Main", balance: 12500, currency: "USD", isTracked: true, type: "business" },
      { id: "acc5", name: "EUR Balance", number: "Main", balance: 3200, currency: "EUR", isTracked: true, type: "business" },
    ],
  },
]

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<BankConnection[]>(mockConnections)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteConnection, setDeleteConnection] = useState<BankConnection | null>(null)
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<Record<string, boolean>>({})
  
  const [addData, setAddData] = useState({
    provider: "monobank" as BankProvider,
    token: "",
  })

  const handleAddConnection = () => {
    if (!addData.token.trim()) return
    
    const newConnection: BankConnection = {
      id: `conn${Date.now()}`,
      provider: addData.provider,
      status: "syncing",
      lastSync: null,
      token: addData.token.substring(0, 6) + "..." + addData.token.slice(-3),
      accounts: [],
    }
    
    setConnections(prev => [...prev, newConnection])
    setIsAddDialogOpen(false)
    setAddData({ provider: "monobank", token: "" })
    
    // Simulate sync
    setTimeout(() => {
      setConnections(prev => prev.map(c => {
        if (c.id === newConnection.id) {
          return {
            ...c,
            status: "connected" as ConnectionStatus,
            lastSync: new Date().toISOString(),
            accounts: [
              { id: `acc${Date.now()}`, name: "Default Account", number: "*0000", balance: 0, currency: "UAH", isTracked: true, type: "business" as const },
            ],
          }
        }
        return c
      }))
    }, 2000)
  }

  const handleDeleteConnection = () => {
    if (deleteConnection) {
      setConnections(prev => prev.filter(c => c.id !== deleteConnection.id))
      setDeleteConnection(null)
    }
  }

  const handleForceSync = (connectionId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === connectionId) {
        return { ...c, status: "syncing" as ConnectionStatus }
      }
      return c
    }))
    
    setTimeout(() => {
      setConnections(prev => prev.map(c => {
        if (c.id === connectionId) {
          return { 
            ...c, 
            status: "connected" as ConnectionStatus,
            lastSync: new Date().toISOString(),
          }
        }
        return c
      }))
    }, 1500)
  }

  const handleToggleAccountTracking = (connectionId: string, accountId: string) => {
    setConnections(prev => prev.map(c => {
      if (c.id === connectionId) {
        return {
          ...c,
          accounts: c.accounts.map(acc => {
            if (acc.id === accountId) {
              return { ...acc, isTracked: !acc.isTracked }
            }
            return acc
          }),
        }
      }
      return c
    }))
  }

  const getStatusBadge = (status: ConnectionStatus) => {
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
    }
  }

  const formatLastSync = (date: string | null) => {
    if (!date) return "Never"
    const d = new Date(date)
    return d.toLocaleDateString("uk-UA", { 
      day: "2-digit", 
      month: "short", 
      hour: "2-digit", 
      minute: "2-digit" 
    })
  }

  const connectedBanks = connections.filter(c => c.status === "connected").length
  const totalAccounts = connections.reduce((sum, c) => sum + c.accounts.filter(a => a.isTracked).length, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bank Integrations</h1>
          <p className="text-sm text-muted-foreground">
            Connect your bank accounts to automatically sync transactions
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Add Bank
        </Button>
      </div>

      {/* Stats */}
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
            <CardTitle className="text-sm font-medium">Tracked Accounts</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
            <p className="text-xs text-muted-foreground">Active for sync</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.length > 0 && connections[0].lastSync 
                ? formatLastSync(connections[0].lastSync)
                : "N/A"
              }
            </div>
            <p className="text-xs text-muted-foreground">Auto-sync every 6 hours</p>
          </CardContent>
        </Card>
      </div>

      {/* Connections List */}
      <div className="space-y-4">
        {connections.map(connection => {
          const provider = bankProviders[connection.provider]
          const isExpanded = expandedConnection === connection.id
          
          return (
            <Card key={connection.id}>
              <CardContent className="p-0">
                {/* Connection Header */}
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
                          <CreditCard className="size-3" />
                          {connection.accounts.filter(a => a.isTracked).length} accounts tracked
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatLastSync(connection.lastSync)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleForceSync(connection.id)}
                      disabled={connection.status === "syncing"}
                      className="gap-1"
                    >
                      <RefreshCw className={`size-4 ${connection.status === "syncing" ? "animate-spin" : ""}`} />
                      Sync
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setExpandedConnection(isExpanded ? null : connection.id)}
                    >
                      <Settings2 className="size-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteConnection(connection)}
                    >
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Settings */}
                {isExpanded && (
                  <>
                    <Separator />
                    <div className="p-4 space-y-4">
                      {/* Token Display */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <Label className="text-xs text-muted-foreground">{provider.tokenField}</Label>
                          <div className="font-mono text-sm mt-1">
                            {showToken[connection.id] ? connection.token : "••••••••••••"}
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setShowToken(prev => ({ ...prev, [connection.id]: !prev[connection.id] }))}
                        >
                          {showToken[connection.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>

                      {/* Account Mapper */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Account Mapper</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Select which accounts to track in your system
                        </p>
                        <div className="space-y-2">
                          {connection.accounts.map(account => (
                            <div 
                              key={account.id} 
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={account.isTracked}
                                  onCheckedChange={() => handleToggleAccountTracking(connection.id, account.id)}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{account.name}</span>
                                    <span className="text-sm text-muted-foreground">{account.number}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {account.type === "business" ? "Business" : "Personal"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {account.balance.toLocaleString()} {account.currency}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )
        })}

        {connections.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <WifiOff className="size-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No Banks Connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your first bank account to start tracking transactions
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Add Bank
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Connection Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Bank Account</DialogTitle>
            <DialogDescription>
              Enter your API credentials to connect your bank
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Bank Provider</Label>
              <Select 
                value={addData.provider} 
                onValueChange={(v) => setAddData(prev => ({ ...prev, provider: v as BankProvider }))}
              >
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
                onChange={(e) => setAddData(prev => ({ ...prev, token: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="size-3" />
                <a 
                  href={bankProviders[addData.provider].docs} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  How to get your {bankProviders[addData.provider].tokenField}
                </a>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddConnection}
              disabled={!addData.token.trim()}
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConnection} onOpenChange={() => setDeleteConnection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Bank</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect {deleteConnection && bankProviders[deleteConnection.provider].name}? 
              Transaction sync will stop and you&apos;ll need to reconnect to resume.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
