"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { workforceApi, type ApiClient, type ApiTeam } from "@/lib/api/workforce"

export default function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [clients, setClients] = useState<ApiClient[]>([])
  const [teams, setTeams] = useState<ApiTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    clientId: "",
    status: "lead",
    startDate: "",
    endDate: "",
    billingModel: "fixed",
    totalContractValue: "",
    currency: "USD",
    teamId: "none",
    bufferPercent: "0",
  })

  useEffect(() => {
    const load = async () => {
      try {
        const [project, clientsResponse, teamsResponse] = await Promise.all([
          workforceApi.getProject(id),
          workforceApi.listClients(),
          workforceApi.listTeams(),
        ])
        setClients(clientsResponse)
        setTeams(teamsResponse)
        setForm({
          name: project.name,
          clientId: String(project.client),
          status: project.status,
          startDate: project.start_date,
          endDate: project.end_date,
          billingModel: project.billing_model,
          totalContractValue: project.total_contract_value || "",
          currency: project.currency,
          teamId: project.team ? String(project.team) : "none",
          bufferPercent: project.buffer_percent || "0",
        })
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не вдалося завантажити проєкт")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [id])

  const handleSave = async () => {
    if (!form.name.trim() || !form.clientId) return setError("Назва та клієнт обовʼязкові")
    if (new Date(form.endDate) < new Date(form.startDate)) return setError("Дата завершення не може бути раніше старту")
    try {
      setSaving(true)
      setError(null)
      await workforceApi.updateProject(id, {
        name: form.name.trim(),
        client: Number(form.clientId),
        status: form.status as "lead" | "active" | "finished" | "paused",
        start_date: form.startDate,
        end_date: form.endDate,
        billing_model: form.billingModel as "fixed" | "time-materials",
        total_contract_value: form.billingModel === "fixed" ? (form.totalContractValue || "0") : null,
        currency: form.currency as "USD" | "EUR" | "UAH",
        team: form.teamId && form.teamId != "none" ? Number(form.teamId) : null,
        buffer_percent: form.bufferPercent || "0",
      })
      router.push(`/dashboard/projects/${id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося зберегти зміни")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link href={`/dashboard/projects/${id}`}><ArrowLeft className="size-4" /></Link></Button>
        <h1 className="text-2xl font-bold">Редагування проєкту</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Основні дані</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div><Label>Назва</Label><Input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} /></div>
          <div><Label>Клієнт</Label><Select value={form.clientId} onValueChange={(v)=>setForm({...form,clientId:v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clients.map(c=><SelectItem key={c.id} value={String(c.id)}>{c.company_name || c.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Статус</Label><Select value={form.status} onValueChange={(v)=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="lead">Потенційний</SelectItem><SelectItem value="active">Активний</SelectItem><SelectItem value="paused">Призупинений</SelectItem><SelectItem value="finished">Завершений</SelectItem></SelectContent></Select></div>
          <div><Label>Команда</Label><Select value={form.teamId} onValueChange={(v)=>setForm({...form,teamId:v})}><SelectTrigger><SelectValue placeholder="Без команди"/></SelectTrigger><SelectContent><SelectItem value="none">Без команди</SelectItem>{teams.map(t=><SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Дата старту</Label><Input type="date" value={form.startDate} onChange={(e)=>setForm({...form,startDate:e.target.value})}/></div>
          <div><Label>Дата завершення</Label><Input type="date" value={form.endDate} onChange={(e)=>setForm({...form,endDate:e.target.value})}/></div>
          <div><Label>Модель монетизації</Label><Select value={form.billingModel} onValueChange={(v)=>setForm({...form,billingModel:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="fixed">Фіксована</SelectItem><SelectItem value="time-materials">Time & Materials</SelectItem></SelectContent></Select></div>
          <div><Label>Валюта</Label><Select value={form.currency} onValueChange={(v)=>setForm({...form,currency:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="UAH">UAH</SelectItem></SelectContent></Select></div>
          <div><Label>Вартість контракту</Label><Input type="number" min="0" value={form.totalContractValue} onChange={(e)=>setForm({...form,totalContractValue:e.target.value})}/></div>
          <div><Label>Резерв (%)</Label><Input type="number" min="0" value={form.bufferPercent} onChange={(e)=>setForm({...form,bufferPercent:e.target.value})}/></div>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" asChild><Link href={`/dashboard/projects/${id}`}>Скасувати</Link></Button>
        <Button onClick={handleSave} disabled={loading || saving}>{saving ? "Зберігаємо..." : "Зберегти"}</Button>
      </div>
    </div>
  )
}
