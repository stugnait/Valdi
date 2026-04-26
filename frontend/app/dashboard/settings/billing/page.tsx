"use client"

import { AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function BillingPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Оплата та підписка</h1>
        <p className="text-sm text-muted-foreground">Сторінку тимчасово приховано до підключення реальних billing endpoint-ів.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Billing temporarily unavailable</CardTitle>
          <CardDescription>Mock-state видалено з ключового екрана.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Потрібні backend endpoint-и</AlertTitle>
            <AlertDescription>
              Для повернення екрану потрібні реальні endpoint-и для підписки, інвойсів, payment methods та керування планом.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
