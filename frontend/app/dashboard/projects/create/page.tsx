"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Users,
  AlertTriangle,
  Calculator,
  Percent,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mockTags,
  type ProjectTag,
  type Milestone,
  type ResourceAllocation,
} from "@/lib/types/projects";
import {
  ApiClient,
  ApiDeveloper,
  ApiTeam,
  workforceApi,
} from "@/lib/api/workforce";
import { sharedExpenseCategories } from "@/lib/constants/expense-categories";
import { paymentSourceOptions } from "@/lib/types/spendings";

const steps = [
  { id: 1, name: "Базова інформація", description: "Базова інформація" },
  { id: 2, name: "Модель монетизації", description: "Модель монетизації" },
  { id: 3, name: "Команда та ресурси", description: "Команда та ресурси" },
  { id: 4, name: "Додаткові витрати", description: "Додаткові витрати" },
];

type BillingModel = "fixed" | "time-materials";
type Currency = "USD" | "EUR" | "UAH";
type BillingCycle = "weekly" | "biweekly" | "monthly";

interface FormData {
  // Step 1
  name: string;
  clientId: string;
  newClientName: string;
  startDate: string;
  endDate: string;
  tags: ProjectTag[];

  // Step 2
  billingModel: BillingModel;
  currency: Currency;
  // Fixed
  totalContractValue: string;
  milestones: Milestone[];
  // T&M
  clientHourlyRate: string;
  monthlyCap: string;
  billingCycle: BillingCycle;

  // Step 3
  selectedTeamId: string;
  allocations: ResourceAllocation[];

  // Step 4
  bufferPercent: string;
  directExpenses: {
    name: string;
    amount: string;
    category: string;
    currency: Currency;
    source: "cash" | "monobank" | "privat24" | "wise" | "payoneer";
    expenseType: "irregular" | "recurring";
    cycle: "monthly" | "quarterly" | "yearly";
    date: string;
    status: "pending" | "paid";
    isCollapsed: boolean;
    touched: {
      name: boolean;
      amount: boolean;
      category: boolean;
    };
  }[];
}

const initialFormData: FormData = {
  name: "",
  clientId: "",
  newClientName: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  tags: [],
  billingModel: "fixed",
  currency: "USD",
  totalContractValue: "",
  milestones: [
    { id: "m1", name: "Передоплата", percentage: 30, amount: 0 },
    { id: "m2", name: "Етап 1", percentage: 40, amount: 0 },
    { id: "m3", name: "Фінальна здача", percentage: 30, amount: 0 },
  ],
  clientHourlyRate: "",
  monthlyCap: "",
  billingCycle: "monthly",
  selectedTeamId: "",
  allocations: [],
  bufferPercent: "10",
  directExpenses: [],
};

export default function CreateProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [clients, setClients] = useState<ApiClient[]>([]);
  const [teams, setTeams] = useState<ApiTeam[]>([]);
  const [developers, setDevelopers] = useState<ApiDeveloper[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const getClientOptionLabel = (client: ApiClient) => {
    const clientName = (client.company_name || client.name || "").trim();
    const contactPerson = (client.contact_person || "").trim();
    if (
      !contactPerson ||
      contactPerson.toLowerCase() === clientName.toLowerCase()
    )
      return clientName;
    return `${clientName} — ${contactPerson}`;
  };
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const developerRateById = useMemo(
    () =>
      developers.reduce<Record<number, number>>((acc, developer) => {
        acc[developer.id] = Number(developer.hourly_rate || 0);
        return acc;
      }, {}),
    [developers],
  );

  const selectedTeam = useMemo(
    () => teams.find((team) => team.id.toString() === formData.selectedTeamId),
    [teams, formData.selectedTeamId],
  );

  const loadData = async () => {
    try {
      setIsLoadingData(true);
      setError(null);
      const [clientsResponse, teamsResponse, developersResponse] =
        await Promise.all([
          workforceApi.listClients(),
          workforceApi.listTeams(),
          workforceApi.listDevelopers(),
        ]);
      setClients(clientsResponse);
      setTeams(teamsResponse);
      setDevelopers(developersResponse);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не вдалося завантажити дані.",
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: formData.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Calculations
  const totalContractValue = parseFloat(formData.totalContractValue) || 0;
  const estimatedMonthlyCost = formData.allocations.reduce(
    (sum, a) => sum + a.monthlyCost,
    0,
  );
  const directExpensesTotal = formData.directExpenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0),
    0,
  );
  const bufferAmount =
    (totalContractValue * (parseFloat(formData.bufferPercent) || 0)) / 100;
  const showTeamCostInPreview = currentStep >= 3;
  const showStep4FinanceInPreview = currentStep >= 4;
  const effectiveLaborCost = showTeamCostInPreview ? estimatedMonthlyCost : 0;
  const effectiveDirectExpenses = showStep4FinanceInPreview
    ? directExpensesTotal
    : 0;
  const effectiveBufferAmount = showStep4FinanceInPreview ? bufferAmount : 0;

  const projectedProfit =
    formData.billingModel === "fixed"
      ? totalContractValue -
        effectiveLaborCost -
        effectiveDirectExpenses -
        effectiveBufferAmount
      : (parseFloat(formData.clientHourlyRate) || 0) *
          (parseFloat(formData.monthlyCap) || 160) -
        effectiveLaborCost;

  const projectedMargin =
    totalContractValue > 0 ? (projectedProfit / totalContractValue) * 100 : 0;

  // Update milestones when contract value changes
  const updateMilestones = (value: string) => {
    const total = parseFloat(value) || 0;
    setFormData({
      ...formData,
      totalContractValue: value,
      milestones: formData.milestones.map((m) => ({
        ...m,
        amount: total * (m.percentage / 100),
      })),
    });
  };

  const updateMilestonePercentage = (id: string, percentage: number) => {
    const total = parseFloat(formData.totalContractValue) || 0;
    setFormData({
      ...formData,
      milestones: formData.milestones.map((m) =>
        m.id === id
          ? { ...m, percentage, amount: total * (percentage / 100) }
          : m,
      ),
    });
  };

  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: `m-${Date.now()}`,
      name: `Milestone ${formData.milestones.length + 1}`,
      percentage: 0,
      amount: 0,
    };
    setFormData({
      ...formData,
      milestones: [...formData.milestones, newMilestone],
    });
  };

  const removeMilestone = (id: string) => {
    setFormData({
      ...formData,
      milestones: formData.milestones.filter((m) => m.id !== id),
    });
  };

  const toggleTag = (tag: ProjectTag) => {
    const exists = formData.tags.find((t) => t.id === tag.id);
    if (exists) {
      setFormData({
        ...formData,
        tags: formData.tags.filter((t) => t.id !== tag.id),
      });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const assignTeam = (teamId: string) => {
    const team = teams.find((item) => item.id.toString() === teamId);
    const teamAllocations = (team?.memberships || []).map((membership) => {
      const hourlyRate = developerRateById[membership.developer] || 0;
      const role =
        developers.find((developer) => developer.id === membership.developer)
          ?.role || "Розробник";
      return {
        id: `alloc-${teamId}-${membership.developer}`,
        memberId: `${teamId}-${membership.developer}`,
        memberName:
          membership.developer_name || `Розробник #${membership.developer}`,
        memberRole: role,
        teamId: teamId,
        teamName: team?.name || "Команда",
        allocation: membership.allocation || 100,
        monthlyCost: hourlyRate * 160 * ((membership.allocation || 100) / 100),
      };
    });

    setFormData({
      ...formData,
      selectedTeamId: teamId,
      allocations: teamAllocations,
    });
  };

  const markAllDirectExpenseFieldsTouched = () => {
    setFormData({
      ...formData,
      directExpenses: [
        ...formData.directExpenses,
        {
          name: "",
          amount: "",
          category: "",
          currency: formData.currency,
          source: "cash",
          expenseType: "irregular",
          cycle: "monthly",
          date: new Date().toISOString().split("T")[0],
          status: "pending",
          isCollapsed: false,
          touched: {
            name: false,
            amount: false,
            category: false,
          },
        },
      ],
    });
  };

  const toggleDirectExpenseCollapsed = (index: number) => {
    setFormData({
      ...formData,
      directExpenses: formData.directExpenses.map((e, i) =>
        i === index ? { ...e, [field]: value } : e,
      ),
    });
  };

  const markDirectExpenseFieldTouched = (
    index: number,
    field: "name" | "amount" | "category",
  ) => {
    setFormData({
      ...formData,
      directExpenses: formData.directExpenses.filter((_, i) => i !== index),
    });
  };

  const toggleDirectExpenseCardCollapsed = (index: number) => {
    setFormData({
      ...formData,
      directExpenses: formData.directExpenses.map((expense, i) =>
        i === index
          ? { ...expense, isCollapsed: !expense.isCollapsed }
          : expense,
      ),
    });
  };

  const touchDirectExpenseField = (
    index: number,
    field: "name" | "amount" | "category",
  ) => {
    setFormData({
      ...formData,
      directExpenses: formData.directExpenses.map((expense, i) =>
        i === index
          ? { ...expense, touched: { ...expense.touched, [field]: true } }
          : expense,
      ),
    });
  };

  const touchAllDirectExpenseFields = () => {
    setFormData({
      ...formData,
      directExpenses: formData.directExpenses.map((expense) => ({
        ...expense,
        touched: { name: true, amount: true, category: true },
      })),
    });
  };

  const getDirectExpenseValidationErrors = (
    expense: FormData["directExpenses"][number],
  ) => {
    const parsedAmount = Number(expense.amount);
    return {
      name: expense.name.trim() ? "" : "Вкажіть назву витрати.",
      amount: !expense.amount
        ? "Вкажіть суму витрати."
        : parsedAmount <= 0
          ? "Сума має бути більшою за 0."
          : "",
      category: expense.category ? "" : "Оберіть категорію витрати.",
    };
  };

  const hasAnyInvalidDirectExpenses = () =>
    formData.directExpenses.some((expense) => {
      const errors = getDirectExpenseValidationErrors(expense);
      return Boolean(errors.name || errors.amount || errors.category);
    });

  const hasInvalidDirectExpenses = () =>
    formData.directExpenses.some((expense) => {
      const errors = getDirectExpenseErrors(expense)
      return Boolean(errors.name || errors.amount || errors.category)
    })

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      if (hasAnyInvalidDirectExpenses()) {
        touchAllDirectExpenseFields();
        setError("Заповніть обовʼязкові поля у прямих витратах проєкту.");
        return;
      }

      let selectedClientId = formData.clientId;
      if (isCreatingClient && formData.newClientName.trim()) {
        const createdClient = await workforceApi.createClient({
          name: formData.newClientName.trim(),
          company_name: formData.newClientName.trim(),
        });
        selectedClientId = createdClient.id.toString();
      }

      if (!selectedClientId) {
        setError("Оберіть клієнта або створіть нового.");
        return;
      }

      const createdProject = await workforceApi.createProject({
        name: formData.name.trim(),
        client: Number(selectedClientId),
        status: "lead",
        start_date: formData.startDate,
        end_date: formData.endDate,
        billing_model: formData.billingModel,
        currency: formData.currency,
        total_contract_value:
          formData.billingModel === "fixed"
            ? formData.totalContractValue || "0"
            : null,
        client_hourly_rate:
          formData.billingModel === "time-materials"
            ? formData.clientHourlyRate || "0"
            : null,
        monthly_cap:
          formData.billingModel === "time-materials" && formData.monthlyCap
            ? Number(formData.monthlyCap)
            : null,
        billing_cycle:
          formData.billingModel === "time-materials"
            ? formData.billingCycle
            : null,
        revenue: "0",
        labor_cost: estimatedMonthlyCost.toFixed(2),
        direct_overheads: directExpensesTotal.toFixed(2),
        buffer_percent: formData.bufferPercent || "0",
        team: formData.selectedTeamId ? Number(formData.selectedTeamId) : null,
      });

      const projectExpenseDrafts = formData.directExpenses
        .map((expense) => ({
          ...expense,
          amount: parseFloat(expense.amount) || 0,
        }))
        .filter(
          (expense) =>
            expense.name.trim() && expense.amount > 0 && expense.category,
        );

      await Promise.all(
        projectExpenseDrafts.map((expense) => {
          if (expense.expenseType === "recurring") {
            return workforceApi.createRecurringExpense({
              name: expense.name.trim(),
              amount: expense.amount.toString(),
              currency: expense.currency,
              cycle: expense.cycle,
              category: expense.category,
              source: expense.source,
              status: expense.status,
              allocation_type: "project",
              project: Number(createdProject.id),
              last_paid_date: expense.date,
              next_payment_date: expense.date,
              description: "",
            });
          }

          return workforceApi.createVariableExpense({
            name: expense.name.trim(),
            amount: expense.amount.toString(),
            currency: expense.currency,
            category: expense.category,
            source: expense.source,
            status: expense.status,
            expense_date: expense.date,
            allocation_type: "project",
            project: Number(createdProject.id),
            description: "",
          });
        }),
      );

      router.push("/dashboard/projects");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не вдалося створити проєкт.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.name &&
          (formData.clientId || formData.newClientName) &&
          formData.startDate &&
          formData.endDate
        );
      case 2:
        if (formData.billingModel === "fixed") {
          return formData.totalContractValue && formData.milestones.length > 0;
        }
        return formData.clientHourlyRate;
      case 3:
        return true; // Optional
      case 4:
        return true; // Optional
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/projects">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Створення проєкту
          </h1>
          <p className="text-sm text-muted-foreground">
            Створення нового проєкту
          </p>
        </div>
      </div>

      {isLoadingData && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Завантажуємо клієнтів, команди та девелоперів...
          </CardContent>
        </Card>
      )}

      {/* Steps Indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
                currentStep === step.id
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step.id
                    ? "bg-emerald-500/10 text-emerald-600"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  currentStep > step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-background"
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="size-3.5" />
                ) : (
                  step.id
                )}
              </div>
              <span className="text-sm font-medium hidden sm:inline">
                {step.name}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`h-0.5 w-8 mx-2 ${
                  currentStep > step.id ? "bg-emerald-500" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2">
          {/* Step 1: Базова інформація */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Базова інформація</CardTitle>
                <CardDescription>
                  Основні дані про проєкт та клієнта
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Назва проєкту</Label>
                  <Input
                    placeholder="напр. E-commerce App Redesign"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Клієнт</Label>
                  {isCreatingClient ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Назва нового клієнта"
                        value={formData.newClientName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            newClientName: e.target.value,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setIsCreatingClient(false);
                          setFormData({ ...formData, newClientName: "" });
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Select
                        value={formData.clientId}
                        onValueChange={(v) =>
                          setFormData({ ...formData, clientId: v })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Оберіть клієнта..." />
                        </SelectTrigger>
                        <SelectContent>
                          {clients.map((client) => (
                            <SelectItem
                              key={client.id}
                              value={client.id.toString()}
                            >
                              {getClientOptionLabel(client)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => setIsCreatingClient(true)}
                      >
                        <Plus className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дата старту</Label>
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Орієнтовна дата завершення</Label>
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Теги / Технології</Label>
                  <p className="text-xs text-muted-foreground">
                    Допоможе в аналітиці зрозуміти, яка ніша приносить найбільше
                    прибутку
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {mockTags.map((tag) => {
                      const isSelected = formData.tags.some(
                        (t) => t.id === tag.id,
                      );
                      return (
                        <Badge
                          key={tag.id}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer transition-colors"
                          style={
                            isSelected
                              ? { backgroundColor: tag.color }
                              : { borderColor: tag.color, color: tag.color }
                          }
                          onClick={() => toggleTag(tag)}
                        >
                          {tag.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Модель монетизації */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Модель монетизації</CardTitle>
                <CardDescription>
                  Оберіть тип контракту та налаштуйте фінанси
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Model Selector */}
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      formData.billingModel === "fixed"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() =>
                      setFormData({ ...formData, billingModel: "fixed" })
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Фіксована ціна</p>
                        <p className="text-xs text-muted-foreground">
                          Фіксований бюджет
                        </p>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                      formData.billingModel === "time-materials"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() =>
                      setFormData({
                        ...formData,
                        billingModel: "time-materials",
                      })
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Clock className="size-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">Погодинна оплата</p>
                        <p className="text-xs text-muted-foreground">
                          Погодинна оплата
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Фіксована ціна Options */}
                {formData.billingModel === "fixed" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Загальна вартість контракту</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={formData.totalContractValue}
                          onChange={(e) => updateMilestones(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Валюта</Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(v) =>
                            setFormData({
                              ...formData,
                              currency: v as Currency,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="UAH">UAH (₴)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Графік оплат (Етапи оплати)</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={addMilestone}
                        >
                          <Plus className="size-4 mr-1" />
                          Додати
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {formData.milestones.map((milestone, idx) => (
                          <div
                            key={milestone.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                          >
                            <div className="flex-1 grid grid-cols-3 gap-3 items-center">
                              <Input
                                value={milestone.name}
                                onChange={(e) =>
                                  setFormData({
                                    ...formData,
                                    milestones: formData.milestones.map((m) =>
                                      m.id === milestone.id
                                        ? { ...m, name: e.target.value }
                                        : m,
                                    ),
                                  })
                                }
                                placeholder="Назва milestone"
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={milestone.percentage}
                                  onChange={(e) =>
                                    updateMilestonePercentage(
                                      milestone.id,
                                      parseInt(e.target.value) || 0,
                                    )
                                  }
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">
                                  %
                                </span>
                              </div>
                              <span className="font-medium text-right">
                                {formatCurrency(milestone.amount)}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeMilestone(milestone.id)}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {formData.milestones.reduce(
                        (sum, m) => sum + m.percentage,
                        0,
                      ) !== 100 && (
                        <p className="text-sm text-amber-600">
                          Сума відсотків:{" "}
                          {formData.milestones.reduce(
                            (sum, m) => sum + m.percentage,
                            0,
                          )}
                          % (має бути 100%)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* T&M Options */}
                {formData.billingModel === "time-materials" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Client Hourly Rate</Label>
                        <Input
                          type="number"
                          placeholder="напр. 75"
                          value={formData.clientHourlyRate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              clientHourlyRate: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Скільки ви виставляєте клієнту
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Валюта</Label>
                        <Select
                          value={formData.currency}
                          onValueChange={(v) =>
                            setFormData({
                              ...formData,
                              currency: v as Currency,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                            <SelectItem value="UAH">UAH (₴)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Monthly Cap (опціонально)</Label>
                        <Input
                          type="number"
                          placeholder="напр. 160"
                          value={formData.monthlyCap}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              monthlyCap: e.target.value,
                            })
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Максимум годин на місяць
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Billing Cycle</Label>
                        <Select
                          value={formData.billingCycle}
                          onValueChange={(v) =>
                            setFormData({
                              ...formData,
                              billingCycle: v as BillingCycle,
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="weekly">Щотижня</SelectItem>
                            <SelectItem value="biweekly">
                              Раз на 2 тижні
                            </SelectItem>
                            <SelectItem value="monthly">Щомісяця</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Команда та ресурси */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Команда та ресурси</CardTitle>
                <CardDescription>
                  Привʼяжіть існуючу команду. Залученість редагується лише на
                  сторінці Команди.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Оберіть команду</Label>
                  <Select
                    value={formData.selectedTeamId}
                    onValueChange={assignTeam}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Оберіть команду..." />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name} · {team.memberships.length} учасн.
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedTeam ? (
                  <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                    <Users className="size-12 mx-auto mb-3 opacity-50" />
                    <p>Команду ще не призначено</p>
                    <p className="text-sm mt-1">
                      Оберіть команду з селектора вище
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">Команда</p>
                        <p className="font-semibold">{selectedTeam.name}</p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Учасників
                        </p>
                        <p className="font-semibold">
                          {selectedTeam.memberships.length}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          Вартість / місяць
                        </p>
                        <p className="font-semibold">
                          {formatCurrency(estimatedMonthlyCost)}
                        </p>
                      </div>
                    </div>
                    {formData.allocations.map((allocation) => (
                      <div
                        key={allocation.id}
                        className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {allocation.memberName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {allocation.teamName}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {allocation.memberRole}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span>Залученість</span>
                              <span className="font-medium">
                                {allocation.allocation}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Редагується на сторінці Команди
                            </p>
                          </div>
                          <div className="text-right w-24">
                            <p className="font-semibold">
                              {formatCurrency(allocation.monthlyCost)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              /міс
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Командне налаштування
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Додаткові витрати */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Додаткові витрати</CardTitle>
                <CardDescription>
                  Резерв та прямі проєктні витрати
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <Label>Резерв</Label>
                    <span className="text-sm font-medium">
                      {formData.bufferPercent}%
                    </span>
                  </div>
                  <Slider
                    value={[parseFloat(formData.bufferPercent) || 0]}
                    onValueChange={([v]) =>
                      setFormData({ ...formData, bufferPercent: v.toString() })
                    }
                    max={30}
                    min={0}
                    step={5}
                  />
                  <p className="text-xs text-muted-foreground">
                    Сума на непередбачувані витрати:{" "}
                    {formatCurrency(bufferAmount)}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Прямі витрати проєкту</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addDirectExpense}
                    >
                      <Plus className="size-4 mr-1" />
                      Додати витрату
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Витрати суто під цей проєкт (сервери, API, ліцензії тощо)
                  </p>

                  {formData.directExpenses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                      <p className="text-sm">Немає запланованих витрат</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.directExpenses.map((expense, idx) => (
                        <div key={idx} className="rounded-lg border bg-card">
                          <div className="flex items-center justify-between p-4 border-b">
                            <div>
                              <p className="font-medium">Витрата #{idx + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                {expense.name.trim() || "Нова витрата"}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleDirectExpenseCardCollapsed(idx)
                              }
                              className="gap-1"
                            >
                              {expense.isCollapsed ? "Розгорнути" : "Згорнути"}
                              {expense.isCollapsed ? (
                                <ChevronDown className="size-4" />
                              ) : (
                                <ChevronUp className="size-4" />
                              )}
                            </Button>
                          </div>
                          {!expense.isCollapsed && (
                            <div className="space-y-4 p-4">
                              <div className="space-y-2">
                                <Label>Назва витрати *</Label>
                                <Input
                                  value={expense.name}
                                  onChange={(e) =>
                                    updateDirectExpense(
                                      idx,
                                      "name",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={() =>
                                    touchDirectExpenseField(idx, "name")
                                  }
                                  placeholder="Наприклад: AWS Infrastructure"
                                />
                                {expense.touched.name &&
                                  getDirectExpenseValidationErrors(expense)
                                    .name && (
                                    <p className="text-xs text-destructive">
                                      {
                                        getDirectExpenseValidationErrors(
                                          expense,
                                        ).name
                                      }
                                    </p>
                                  )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Сума *</Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={expense.amount}
                                    onChange={(e) =>
                                      updateDirectExpense(
                                        idx,
                                        "amount",
                                        e.target.value,
                                      )
                                    }
                                    onBlur={() =>
                                      touchDirectExpenseField(idx, "amount")
                                    }
                                    placeholder="1000"
                                  />
                                  {expense.touched.amount &&
                                    getDirectExpenseValidationErrors(expense)
                                      .amount && (
                                      <p className="text-xs text-destructive">
                                        {
                                          getDirectExpenseValidationErrors(
                                            expense,
                                          ).amount
                                        }
                                      </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                  <Label>Валюта *</Label>
                                  <Select
                                    value={expense.currency}
                                    onValueChange={(v) =>
                                      updateDirectExpense(idx, "currency", v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Оберіть валюту" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="USD">USD</SelectItem>
                                      <SelectItem value="EUR">EUR</SelectItem>
                                      <SelectItem value="UAH">UAH</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Категорія *</Label>
                                  <Select
                                    value={expense.category}
                                    onValueChange={(v) => {
                                      updateDirectExpense(idx, "category", v);
                                      touchDirectExpenseField(idx, "category");
                                    }}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Оберіть категорію" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {sharedExpenseCategories.map(
                                        (category) => (
                                          <SelectItem
                                            key={category.value}
                                            value={category.value}
                                          >
                                            {category.label}
                                          </SelectItem>
                                        ),
                                      )}
                                    </SelectContent>
                                  </Select>
                                  {expense.touched.category &&
                                    getDirectExpenseValidationErrors(expense)
                                      .category && (
                                      <p className="text-xs text-destructive">
                                        {
                                          getDirectExpenseValidationErrors(
                                            expense,
                                          ).category
                                        }
                                      </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                  <Label>Тип витрати</Label>
                                  <Select
                                    value={expense.expenseType}
                                    onValueChange={(v) =>
                                      updateDirectExpense(idx, "expenseType", v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="recurring">
                                        Регулярна
                                      </SelectItem>
                                      <SelectItem value="irregular">
                                        Нерегулярна
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Джерело оплати</Label>
                                  <Select
                                    value={expense.source}
                                    onValueChange={(v) =>
                                      updateDirectExpense(idx, "source", v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {paymentSourceOptions.map((source) => (
                                        <SelectItem
                                          key={source.value}
                                          value={source.value}
                                        >
                                          {source.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Статус</Label>
                                  <Select
                                    value={expense.status}
                                    onValueChange={(v) =>
                                      updateDirectExpense(idx, "status", v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">
                                        Очікується
                                      </SelectItem>
                                      <SelectItem value="paid">
                                        Сплачено
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label>Дата</Label>
                                  <Input
                                    type="date"
                                    value={expense.date}
                                    onChange={(e) =>
                                      updateDirectExpense(
                                        idx,
                                        "date",
                                        e.target.value,
                                      )
                                    }
                                  />
                                </div>
                                {expense.expenseType === "recurring" && (
                                  <div className="space-y-2">
                                    <Label>Періодичність</Label>
                                    <Select
                                      value={expense.cycle}
                                      onValueChange={(v) =>
                                        updateDirectExpense(idx, "cycle", v)
                                      }
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monthly">
                                          Щомісяця
                                        </SelectItem>
                                        <SelectItem value="quarterly">
                                          Щокварталу
                                        </SelectItem>
                                        <SelectItem value="yearly">
                                          Щороку
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => removeDirectExpense(idx)}
                              >
                                <X className="size-4 mr-1" />
                                Видалити витрату
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Попередній розрахунок */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="size-5" />
                Попередній розрахунок
              </CardTitle>
              <CardDescription>Калькулятор прибутковості</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.billingModel === "fixed" && totalContractValue > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Вартість контракту:
                    </span>
                    <span className="font-medium">
                      {formatCurrency(totalContractValue)}
                    </span>
                  </div>
                </div>
              )}

              {showTeamCostInPreview && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Вартість команди за місяць:
                    </span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(estimatedMonthlyCost)}
                    </span>
                  </div>
                </div>
              )}

              {showStep4FinanceInPreview && (
                <>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Прямі витрати:
                      </span>
                      <span className="font-medium text-destructive">
                        -{formatCurrency(directExpensesTotal)}
                      </span>
                    </div>
                    {bufferAmount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Резерв ({formData.bufferPercent}%):
                        </span>
                        <span className="font-medium text-destructive">
                          -{formatCurrency(bufferAmount)}
                        </span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        Очікувана маржинальність:
                      </span>
                      <span
                        className={`font-bold ${projectedMargin >= 20 ? "text-emerald-600" : projectedMargin >= 0 ? "text-amber-600" : "text-destructive"}`}
                      >
                        {projectedMargin.toFixed(1)}%
                      </span>
                    </div>
                    {formData.billingModel === "fixed" && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">
                          Очікуваний прибуток:
                        </span>
                        <span
                          className={`font-semibold ${projectedProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}
                        >
                          {formatCurrency(projectedProfit)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {showStep4FinanceInPreview &&
                projectedMargin < 20 &&
                projectedMargin !== 0 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-600 font-medium">
                        Занизька маржа!
                      </p>
                      <p className="text-xs text-amber-600/80 mt-0.5">
                        Рекомендовано мінімум 20% маржі для такого складу
                        команди
                      </p>
                    </div>
                  </div>
                )}

              <Separator />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                <span>
                  {selectedTeam
                    ? `${selectedTeam.name} · ${selectedTeam.memberships.length} учасники`
                    : "Команду ще не призначено"}
                </span>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge
                      key={tag.id}
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${tag.color}15`,
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="size-4 mr-2" />
          Назад
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={() => setCurrentStep((s) => Math.min(4, s + 1))}
            disabled={!canProceed()}
          >
            Далі
            <ArrowRight className="size-4 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || isLoadingData}
          >
            <Check className="size-4 mr-2" />
            {isSubmitting ? "Зберігаємо..." : "Створити проєкт"}
          </Button>
        )}
      </div>
    </div>
  );
}
