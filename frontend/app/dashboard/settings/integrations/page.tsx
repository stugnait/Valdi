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
  Eye,
  EyeOff,
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
import { Switch } from "@/components/ui/switch"
import { ApiError, integrationsApi } from "@/lib/api/integrations"
import { type IntegrationConnectionDto, type IntegrationProvider } from "@/lib/types/integrations"

const bankProviders: Partial<Record<IntegrationProvider, { name: string; icon: string; tokenField: string; docs: string }>> = {
  monobank: {
    name: "Monobank",
    icon: "M",
    tokenField: "X-Token",
    docs: "https://api.monobank.ua/docs",
  },
}

const getProviderMeta = (provider: IntegrationProvider) =>
  bankProviders[provider] ?? {
    name: provider,
    icon: provider.slice(0, 1).toUpperCase(),
    tokenField: "Токен",
    docs: "",
  }

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<IntegrationConnectionDto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [deleteConnection, setDeleteConnection] = useState<IntegrationConnectionDto | null>(null)
  const [expandedConnection, setExpandedConnection] = useState<string | null>(null)
  const [showToken, setShowToken] = useState<Record<string, boolean>>({})
  const [isSyncingById, setIsSyncingById] = useState<Record<string, boolean>>({})
  const [isUpdatingTracking, setIsUpdatingTracking] = useState<Record<string, boolean>>({})
  const [reconnectTarget, setReconnectTarget] = useState<IntegrationConnectionDto | null>(null)
  const [reconnectToken, setReconnectToken] = useState("")
  const [isReconnectPending, setIsReconnectPending] = useState(false)

  const [addData, setAddData] = useState({
    provider: "monobank" as IntegrationProvider,
    token: "",
  })

  const loadConnections = async () => {
    setIsLoading(true)
    setError("")

    try {
      const data = await integrationsApi.listConnections()
      setConnections(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося завантажити інтеграції")
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
      const created = await integrationsApi.createConnection({
        provider: addData.provider,
        token: addData.token.trim(),
      })

      setConnections((prev) => [created, ...prev])
      setIsAddDialogOpen(false)
      setAddData({ provider: "monobank", token: "" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося додати інтеграцію")
    }
  }

  const handleDeleteConnection = async () => {
    if (!deleteConnection) return

    try {
      await integrationsApi.deleteConnection(deleteConnection.id)
      setConnections((prev) => prev.filter((connection) => connection.id !== deleteConnection.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося від'єднати банк")
    } finally {
      setDeleteConnection(null)
    }
  }

  const handleForceSync = async (connectionId: string) => {
    setIsSyncingById((prev) => ({ ...prev, [connectionId]: true }))

    setConnections((prev) =>
      prev.map((connection) =>
        connection.id === connectionId
          ? { ...connection, status: "syncing", last_error_text: null }
          : connection
      )
    )

    try {
      const refreshed = await integrationsApi.forceSync(connectionId)
      setConnections((prev) => prev.map((connection) => (connection.id === connectionId ? refreshed : connection)))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const target = connections.find((connection) => connection.id === connectionId) ?? null
        if (target) {
          setReconnectTarget(target)
          setReconnectToken("")
        }
      }
      setError(err instanceof Error ? err.message : "Не вдалося запустити синхронізацію")
      void loadConnections()
    } finally {
      setIsSyncingById((prev) => ({ ...prev, [connectionId]: false }))
    }
  }

  const handleReconnect = async () => {
    if (!reconnectTarget || !reconnectToken.trim()) return

    setIsReconnectPending(true)
    try {
      const updated = await integrationsApi.reconnect(reconnectTarget.id, { token: reconnectToken.trim() })
      setConnections((prev) => prev.map((connection) => (connection.id === reconnectTarget.id ? updated : connection)))
      setReconnectTarget(null)
      setReconnectToken("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося перепідключити інтеграцію")
    } finally {
      setIsReconnectPending(false)
    }
  }

  const handleToggleAccountTracking = async (connectionId: string, accountId: string) => {
    const connection = connections.find((item) => item.id === connectionId)
    const account = connection?.accounts.find((item) => item.id === accountId)
    if (!connection || !account) return

    const nextValue = !account.is_tracked

    setIsUpdatingTracking((prev) => ({ ...prev, [accountId]: true }))

    // optimistic update
    setConnections((prev) =>
      prev.map((item) =>
        item.id === connectionId
          ? {
              ...item,
              accounts: item.accounts.map((acc) =>
                acc.id === accountId ? { ...acc, is_tracked: nextValue } : acc
              ),
            }
          : item
      )
    )

    try {
      await integrationsApi.updateAccountTracking(accountId, nextValue)
    } catch (err) {
      // rollback
      setConnections((prev) =>
        prev.map((item) =>
          item.id === connectionId
            ? {
                ...item,
                accounts: item.accounts.map((acc) =>
                  acc.id === accountId ? { ...acc, is_tracked: !nextValue } : acc
                ),
              }
            : item
        )
      )
      setError(err instanceof Error ? err.message : "Не вдалося оновити трекінг акаунта")
    } finally {
      setIsUpdatingTracking((prev) => ({ ...prev, [accountId]: false }))
    }
  }

  const getStatusBadge = (status: IntegrationConnectionDto["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 gap-1">
            <CheckCircle2 className="size-3" />
            Підключено
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 gap-1">
            <AlertCircle className="size-3" />
            Помилка
          </Badge>
        )
      case "syncing":
        return (
          <Badge className="bg-blue-100 text-blue-800 gap-1">
            <RefreshCw className="size-3 animate-spin" />
            Синхронізація
          </Badge>
        )
      case "disabled":
        return (
          <Badge className="bg-muted text-muted-foreground gap-1">
            <AlertCircle className="size-3" />
            Вимкнено
          </Badge>
        )
    }
  }

  const formatDateTime = (date: string | null) => {
    if (!date) return "Ніколи"

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return "Ніколи"

    return parsed.toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const connectedBanks = useMemo(
    () => connections.filter((connection) => connection.status === "connected").length,
    [connections]
  )

  const totalAccounts = useMemo(
    () => connections.reduce((sum, connection) => sum + connection.accounts.filter((account) => account.is_tracked).length, 0),
    [connections]
  )

  return (
    <div className="space-y-6">
      {error ? (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Банківські інтеграції</h1>
          <p className="text-sm text-muted-foreground">Підключайте банківські рахунки для автоматичної синхронізації транзакцій</p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
          <Plus className="size-4" />
          Додати банк
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Підключені банки</CardTitle>
            <Wifi className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectedBanks}</div>
            <p className="text-xs text-muted-foreground">{connections.length} підключень всього</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активний статус</CardTitle>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections.filter((c) => c.status !== "disabled").length}</div>
            <p className="text-xs text-muted-foreground">Без вимкнених підключень</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Остання синхронізація</CardTitle>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {connections.length > 0 && connections[0].last_sync_at ? formatDateTime(connections[0].last_sync_at) : "Н/Д"}
            </div>
            <p className="text-xs text-muted-foreground">Автосинхронізація кожні 6 годин</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">Завантаження інтеграцій...</CardContent>
          </Card>
        ) : null}

        {!isLoading && connections.map((connection) => {
          const provider = getProviderMeta(connection.provider)
          const isExpanded = expandedConnection === connection.id
          const needsReconnect = connection.requires_reconnect || connection.last_error_text?.toLowerCase().includes("token")

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
                          <CreditCard className="size-3" />
                          {connection.accounts.filter((account) => account.is_tracked).length} акаунтів відстежується
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDateTime(connection.last_sync_at)}
                        </span>
                      </div>
                      {connection.last_error_text ? (
                        <p className="text-xs text-destructive mt-1">{connection.last_error_text}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleForceSync(connection.id)}
                      disabled={connection.status === "syncing" || isSyncingById[connection.id]}
                      className="gap-1"
                    >
                      <RefreshCw className={`size-4 ${connection.status === "syncing" || isSyncingById[connection.id] ? "animate-spin" : ""}`} />
                      Синхронізувати
                    </Button>
                    {needsReconnect ? (
                      <Button variant="outline" size="sm" onClick={() => setReconnectTarget(connection)}>
                        Перепідключити
                      </Button>
                    ) : null}
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
                {isExpanded ? (
                  <>
                    <Separator />
                    <div className="p-4 space-y-4">
                      {/* Token Display */}
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <Label className="text-xs text-muted-foreground">{provider.tokenField}</Label>
                          <div className="font-mono text-sm mt-1">
                            {showToken[connection.id]
                              ? connection.token_masked ?? "Недоступно"
                              : "••••••••••••"}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowToken((prev) => ({ ...prev, [connection.id]: !prev[connection.id] }))}
                        >
                          {showToken[connection.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </Button>
                      </div>

                      {/* Account Mapper */}
                      <div>
                        <Label className="text-sm font-medium mb-3 block">Мапінг акаунтів</Label>
                        <p className="text-xs text-muted-foreground mb-3">
                          Оберіть акаунти, які потрібно відстежувати у вашій системі
                        </p>
                        <div className="space-y-2">
                          {connection.accounts.map((account) => (
                            <div
                              key={account.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={account.is_tracked}
                                  disabled={isUpdatingTracking[account.id]}
                                  onCheckedChange={() => handleToggleAccountTracking(connection.id, account.id)}
                                />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{account.name}</span>
                                    <span className="text-sm text-muted-foreground">{account.number_masked}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {account.type === "business" ? "Бізнес" : "Особистий"}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  {account.balance.toLocaleString("uk-UA")} {account.currency}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>
          )
        })}

        {!isLoading && connections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <WifiOff className="size-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Банки не підключені</h3>
              <p className="text-sm text-muted-foreground mb-4">Підключіть перший банківський рахунок, щоб почати відстежувати транзакції</p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="size-4" />
                Додати банк
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Підключення банківського акаунта</DialogTitle>
            <DialogDescription>Токен передається один раз під час підключення та зберігається зашифрованим на бекенді</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Банківський провайдер</Label>
              <Select
                value={addData.provider}
                onValueChange={(v) => setAddData((prev) => ({ ...prev, provider: v as IntegrationProvider }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["monobank"] as IntegrationProvider[]).map((key) => { const provider = getProviderMeta(key); return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{provider.icon}</span>
                        {provider.name}
                      </div>
                    </SelectItem>
                  )})}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="token">{getProviderMeta(addData.provider).tokenField}</Label>
              <Input
                id="token"
                type="password"
                placeholder="Вставте токен тут"
                value={addData.token}
                onChange={(e) => setAddData((prev) => ({ ...prev, token: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Link2 className="size-3" />
                <a
                  href={getProviderMeta(addData.provider).docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Як отримати {getProviderMeta(addData.provider).tokenField}
                </a>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleAddConnection} disabled={!addData.token.trim()}>
              Підключити
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconnect Dialog */}
      <Dialog open={!!reconnectTarget} onOpenChange={(open) => (!open ? setReconnectTarget(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Перепідключення інтеграції</DialogTitle>
            <DialogDescription>
              {reconnectTarget
                ? `Підключення до ${getProviderMeta(reconnectTarget.provider).name} не авторизоване (401). Додайте новий токен, щоб продовжити синхронізацію.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="reconnect-token">
              {reconnectTarget ? getProviderMeta(reconnectTarget.provider).tokenField : "Токен"}
            </Label>
            <Input
              id="reconnect-token"
              type="password"
              placeholder="Вставте новий токен"
              value={reconnectToken}
              onChange={(e) => setReconnectToken(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReconnectTarget(null)}>
              Скасувати
            </Button>
            <Button onClick={handleReconnect} disabled={!reconnectToken.trim() || isReconnectPending}>
              {isReconnectPending ? "Збереження..." : "Перепідключити"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConnection} onOpenChange={() => setDeleteConnection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Відключити банк</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете відключити {deleteConnection && getProviderMeta(deleteConnection.provider).name}?
              Синхронізація транзакцій зупиниться, і для відновлення потрібно буде підключити заново.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConnection}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Відключити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
