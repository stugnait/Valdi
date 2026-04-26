"use client"

import { useEffect, useState } from "react"
import { 
  Plus, 
  Search, 
  Zap, 
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  Tag,
  DollarSign,
  CreditCard,
  Building2,
  Users,
  FolderKanban,
  Clock,
  Activity,
  Sparkles
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  AutomationRule,
  PaymentSource,
  AllocationTarget,
  expenseCategories,
} from "@/lib/types/spendings"
import { mockTeams } from "@/lib/types/teams"
import { mockProjects } from "@/lib/types/projects"
import { workforceApi, type ApiAutomationRule } from "@/lib/api/workforce"

type ConditionType = "keyword" | "amount_range" | "source"

export default function RulesPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null)
  const [deleteRule, setDeleteRule] = useState<AutomationRule | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    conditionType: "keyword" as ConditionType,
    keywords: [""],
    minAmount: "",
    maxAmount: "",
    source: "" as PaymentSource | "",
    setCategory: "",
    setRecurring: false,
    allocationType: "all" as AllocationTarget,
    teamId: "",
    projectId: "",
  })

  const mapApiRule = (rule: ApiAutomationRule): AutomationRule => ({
    id: rule.id.toString(),
    name: rule.name,
    isActive: rule.is_active,
    conditions: (rule.conditions || []) as AutomationRule["conditions"],
    actions: (rule.actions || {}) as AutomationRule["actions"],
    matchCount: rule.match_count,
    lastMatchDate: rule.last_match_date || undefined,
    createdAt: rule.created_at,
  })

  const loadRules = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await workforceApi.listAutomationRules()
      setRules(data.map(mapApiRule))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Не вдалося завантажити правила автоматизації")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRules()
  }, [])

  // Stats
  const activeRules = rules.filter(r => r.isActive).length
  const totalMatches = rules.reduce((sum, r) => sum + r.matchCount, 0)

  // Filtered rules
  const filteredRules = rules.filter(rule => 
    rule.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const resetForm = () => {
    setFormData({
      name: "",
      conditionType: "keyword",
      keywords: [""],
      minAmount: "",
      maxAmount: "",
      source: "",
      setCategory: "",
      setRecurring: false,
      allocationType: "all",
      teamId: "",
      projectId: "",
    })
    setEditingRule(null)
  }

  const handleOpenAdd = () => {
    resetForm()
    setIsAddDialogOpen(true)
  }

  const handleOpenEdit = (rule: AutomationRule) => {
    const keywordConditions = rule.conditions.filter(c => c.type === "keyword")
    const amountCondition = rule.conditions.find(c => c.type === "amount_range")
    const sourceCondition = rule.conditions.find(c => c.type === "source")

    let conditionType: ConditionType = "keyword"
    if (amountCondition) conditionType = "amount_range"
    else if (sourceCondition && !keywordConditions.length) conditionType = "source"

    setFormData({
      name: rule.name,
      conditionType,
      keywords: keywordConditions.length ? keywordConditions.map(c => c.keyword || "") : [""],
      minAmount: amountCondition?.minAmount?.toString() || "",
      maxAmount: amountCondition?.maxAmount?.toString() || "",
      source: sourceCondition?.source || "",
      setCategory: rule.actions.setCategory || "",
      setRecurring: rule.actions.setRecurring || false,
      allocationType: rule.actions.setAllocation?.type || "all",
      teamId: rule.actions.setAllocation?.teamId || "",
      projectId: rule.actions.setAllocation?.projectId || "",
    })
    setEditingRule(rule)
    setIsAddDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) return
    
    const selectedTeam = mockTeams.find(t => t.id === formData.teamId)
    const selectedProject = mockProjects.find(p => p.id === formData.projectId)

    const conditions: AutomationRule["conditions"] = []
    
    if (formData.conditionType === "keyword") {
      const validKeywords = formData.keywords.filter(k => k.trim())
      if (validKeywords.length > 0) {
        validKeywords.forEach(keyword => {
          conditions.push({ type: "keyword", keyword: keyword.trim() })
        })
      }
    } else if (formData.conditionType === "amount_range") {
      conditions.push({
        type: "amount_range",
        minAmount: formData.minAmount ? parseFloat(formData.minAmount) : undefined,
        maxAmount: formData.maxAmount ? parseFloat(formData.maxAmount) : undefined,
      })
    } else if (formData.conditionType === "source" && formData.source) {
      conditions.push({ type: "source", source: formData.source as PaymentSource })
    }

    // Ensure at least one condition exists
    if (conditions.length === 0 && formData.conditionType === "keyword") {
      return
    }

    const payload = {
      name: formData.name.trim(),
      is_active: editingRule?.isActive ?? true,
      conditions,
      actions: {
        setCategory: formData.setCategory || undefined,
        setRecurring: formData.setRecurring || undefined,
        setAllocation: formData.allocationType !== "none" ? {
          type: formData.allocationType,
          teamId: formData.allocationType === "team" ? formData.teamId : undefined,
          teamName: formData.allocationType === "team" ? selectedTeam?.name : undefined,
          projectId: formData.allocationType === "project" ? formData.projectId : undefined,
          projectName: formData.allocationType === "project" ? selectedProject?.name : undefined,
        } : undefined,
      },
    }
    try {
      if (editingRule) {
        await workforceApi.updateAutomationRule(editingRule.id, payload)
      } else {
        await workforceApi.createAutomationRule(payload)
      }
      await loadRules()
      setIsAddDialogOpen(false)
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Не вдалося зберегти правило автоматизації")
    }
  }

  const handleDelete = async () => {
    if (deleteRule) {
      try {
        await workforceApi.deleteAutomationRule(deleteRule.id)
        await loadRules()
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Не вдалося видалити правило автоматизації")
      }
      setDeleteRule(null)
    }
  }

  const handleToggleActive = async (rule: AutomationRule) => {
    try {
      await workforceApi.updateAutomationRule(rule.id, { is_active: !rule.isActive })
      await loadRules()
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Не вдалося оновити статус правила")
    }
  }

  const addKeyword = () => {
    setFormData(prev => ({ ...prev, keywords: [...prev.keywords, ""] }))
  }

  const updateKeyword = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.map((k, i) => i === index ? value : k)
    }))
  }

  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }))
  }

  const getSourceLabelUa = (source: PaymentSource) => {
    switch (source) {
      case "monobank":
        return "Monobank"
      case "privat24":
        return "Privat24"
      case "wise":
        return "Wise"
      case "payoneer":
        return "Payoneer"
      case "cash":
        return "Готівка"
      default:
        return source
    }
  }

  const getConditionBadges = (rule: AutomationRule) => {
    return rule.conditions.map((condition, idx) => {
      switch (condition.type) {
        case "keyword":
          return (
            <Badge key={idx} variant="outline" className="gap-1">
              <Tag className="size-3" /> {condition.keyword}
            </Badge>
          )
        case "amount_range":
          return (
            <Badge key={idx} variant="outline" className="gap-1">
              <DollarSign className="size-3" /> 
              {condition.minAmount ? `$${condition.minAmount}` : "Будь-яка"}
              {" - "}
              {condition.maxAmount ? `$${condition.maxAmount}` : "Будь-яка"}
            </Badge>
          )
        case "source":
          return (
            <Badge key={idx} variant="outline" className="gap-1">
              <CreditCard className="size-3" /> {condition.source ? getSourceLabelUa(condition.source) : ""}
            </Badge>
          )
        default:
          return null
      }
    })
  }

  const getActionBadges = (rule: AutomationRule) => {
    const badges = []
    
    if (rule.actions.setCategory) {
      const category = expenseCategories.find(c => c.id === rule.actions.setCategory)
      badges.push(
        <Badge 
          key="category" 
          variant="secondary"
          style={{ 
            backgroundColor: category ? `${category.color}20` : undefined, 
            color: category?.color,
          }}
        >
          {category?.name || rule.actions.setCategory}
        </Badge>
      )
    }
    
    if (rule.actions.setRecurring) {
      badges.push(
        <Badge key="recurring" variant="secondary" className="gap-1">
          <Zap className="size-3" /> Регулярна
        </Badge>
      )
    }
    
    if (rule.actions.setAllocation) {
      const allocation = rule.actions.setAllocation
      if (allocation.type === "team") {
        badges.push(
          <Badge key="allocation" variant="secondary" className="gap-1">
            <Building2 className="size-3" /> {allocation.teamName}
          </Badge>
        )
      } else if (allocation.type === "project") {
        badges.push(
          <Badge key="allocation" className="gap-1">
            <FolderKanban className="size-3" /> {allocation.projectName}
          </Badge>
        )
      } else if (allocation.type === "all") {
        badges.push(
          <Badge key="allocation" variant="outline" className="gap-1">
            <Users className="size-3" /> Усі учасники
          </Badge>
        )
      }
    }
    
    return badges
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Правила автоматизації</h1>
          <p className="text-sm text-muted-foreground">
            Автоматично категоризуйте та розподіляйте витрати
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="size-4" />
          Додати правило
        </Button>
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="pt-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Завантажуємо правила автоматизації…</CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Активні правила</CardTitle>
            <Sparkles className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRules}</div>
            <p className="text-xs text-muted-foreground">Усього правил: {rules.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Усього збігів</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMatches}</div>
            <p className="text-xs text-muted-foreground">Транзакцій автоматично категоризовано</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Пошук правил…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Rules List */}
      <div className="space-y-4">
        {filteredRules.map((rule) => (
          <Card key={rule.id} className={rule.isActive ? "" : "opacity-60"}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Toggle */}
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={() => handleToggleActive(rule)}
                  className="mt-1"
                />

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{rule.name}</span>
                    {!rule.isActive && (
                      <Badge variant="outline" className="text-muted-foreground">Вимкнено</Badge>
                    )}
                  </div>
                  
                  {/* Conditions */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Коли збігається:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getConditionBadges(rule)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Тоді застосувати:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {getActionBadges(rule)}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="size-3" />
                      {rule.matchCount} збігів
                    </span>
                    {rule.lastMatchDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        Останній: {new Date(rule.lastMatchDate).toLocaleDateString("uk-UA")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleToggleActive(rule)}>
                      {rule.isActive ? (
                        <><PowerOff className="size-4 mr-2" /> Вимкнути</>
                      ) : (
                        <><Power className="size-4 mr-2" /> Увімкнути</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenEdit(rule)}>
                      <Pencil className="size-4 mr-2" />
                      Редагувати
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setDeleteRule(rule)}
                    >
                      <Trash2 className="size-4 mr-2" />
                      Видалити
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredRules.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Правила автоматизації не знайдено
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRule ? "Редагувати правило" : "Створити правило автоматизації"}
            </DialogTitle>
            <DialogDescription>
              Налаштуйте умови та дії для автоматичної категоризації
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Rule Name */}
            <div>
              <Label htmlFor="name">Назва правила</Label>
              <Input
                id="name"
                placeholder="Наприклад: Автокатегоризація AWS"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* Condition Type */}
            <div className="space-y-4">
              <Label>Тип умови</Label>
              <RadioGroup 
                value={formData.conditionType}
                onValueChange={(v) => setFormData({ ...formData, conditionType: v as ConditionType })}
                className="grid grid-cols-3 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="keyword" id="keyword" />
                  <Label htmlFor="keyword" className="cursor-pointer">
                    <div className="font-medium">Збіг за ключовим словом</div>
                    <div className="text-xs text-muted-foreground">Пошук тексту в описі</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="amount_range" id="amount_range" />
                  <Label htmlFor="amount_range" className="cursor-pointer">
                    <div className="font-medium">Діапазон суми</div>
                    <div className="text-xs text-muted-foreground">Збіг за сумою</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="source" id="source_type" />
                  <Label htmlFor="source_type" className="cursor-pointer">
                    <div className="font-medium">Джерело оплати</div>
                    <div className="text-xs text-muted-foreground">Збіг за банком/джерелом</div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Keyword inputs */}
              {formData.conditionType === "keyword" && (
                <div className="space-y-2">
                  <Label>Ключові слова (будь-який збіг)</Label>
                  {formData.keywords.map((keyword, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Наприклад: AWS, Amazon"
                        value={keyword}
                        onChange={(e) => updateKeyword(index, e.target.value)}
                      />
                      {formData.keywords.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => removeKeyword(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addKeyword}>
                    <Plus className="size-4 mr-2" /> Додати ключове слово
                  </Button>
                </div>
              )}

              {/* Amount range inputs */}
              {formData.conditionType === "amount_range" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Мінімальна сума ($)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={formData.minAmount}
                      onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Максимальна сума ($)</Label>
                    <Input
                      type="number"
                      placeholder="Будь-яка"
                      value={formData.maxAmount}
                      onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Source selection */}
              {formData.conditionType === "source" && (
                <div>
                  <Label>Джерело оплати</Label>
                  <Select 
                    value={formData.source} 
                    onValueChange={(v) => setFormData({ ...formData, source: v as PaymentSource })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть джерело" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monobank">🏦 Monobank</SelectItem>
                      <SelectItem value="privat24">💳 Privat24</SelectItem>
                      <SelectItem value="wise">🌐 Wise</SelectItem>
                      <SelectItem value="payoneer">💱 Payoneer</SelectItem>
                      <SelectItem value="cash">💵 Готівка</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              <Label>Дії (коли є збіг)</Label>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Встановити категорію</Label>
                  <Select 
                    value={formData.setCategory || "none"} 
                    onValueChange={(v) => setFormData({ ...formData, setCategory: v === "none" ? "" : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть категорію" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Не встановлювати</SelectItem>
                      {expenseCategories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <Checkbox
                    id="recurring"
                    checked={formData.setRecurring}
                    onCheckedChange={(checked) => setFormData({ ...formData, setRecurring: !!checked })}
                  />
                  <Label htmlFor="recurring" className="cursor-pointer">
                    Позначати як регулярну витрату
                  </Label>
                </div>
              </div>

              {/* Allocation */}
              <div className="space-y-2">
                <Label>Встановити розподіл</Label>
                <Select 
                  value={formData.allocationType} 
                  onValueChange={(v) => setFormData({ ...formData, allocationType: v as AllocationTarget })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Розподілити між усіма учасниками</SelectItem>
                    <SelectItem value="team">Призначити на команду</SelectItem>
                    <SelectItem value="project">Віднести на проєкт</SelectItem>
                    <SelectItem value="none">Без розподілу</SelectItem>
                  </SelectContent>
                </Select>

                {formData.allocationType === "team" && (
                  <Select 
                    value={formData.teamId} 
                    onValueChange={(v) => setFormData({ ...formData, teamId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть команду" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockTeams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {formData.allocationType === "project" && (
                  <Select 
                    value={formData.projectId} 
                    onValueChange={(v) => setFormData({ ...formData, projectId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть проєкт" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockProjects.filter(p => p.status === "active").map(project => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Скасувати
            </Button>
            <Button 
              onClick={handleSave}
              disabled={
                !formData.name.trim() || 
                (formData.conditionType === "keyword" && formData.keywords.every(k => !k.trim())) ||
                (formData.conditionType === "source" && !formData.source) ||
                (formData.allocationType === "team" && !formData.teamId) ||
                (formData.allocationType === "project" && !formData.projectId)
              }
            >
              {editingRule ? "Зберегти зміни" : "Створити правило"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteRule} onOpenChange={() => setDeleteRule(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Видалити правило</AlertDialogTitle>
            <AlertDialogDescription>
              Ви впевнені, що хочете видалити &quot;{deleteRule?.name}&quot;? Цю дію неможливо скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Видалити
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
