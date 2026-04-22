"use client"

import { useEffect, useState } from "react"
import { 
  Save,
  Globe,
  Calendar,
  Users,
  Plus,
  Trash2,
  Mail,
  Shield,
  Crown
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { Separator } from "@/components/ui/separator"

type Currency = "USD" | "UAH" | "EUR"
type UserRole = "owner" | "admin" | "member" | "viewer"

interface TeamUser {
  id: string
  name: string
  email: string
  role: UserRole
  joinedAt: string
}

// Mock data
const mockUsers: TeamUser[] = [
  { id: "u1", name: "Олександр Коваленко", email: "alex@agency.ua", role: "owner", joinedAt: "2021-01-15" },
  { id: "u2", name: "Марія Олійник", email: "maria@agency.ua", role: "admin", joinedAt: "2022-03-20" },
  { id: "u3", name: "Дмитро Савченко", email: "dmitry@agency.ua", role: "member", joinedAt: "2023-06-01" },
]

const roleLabels: Record<UserRole, { label: string; color: string; description: string }> = {
  owner: { label: "Owner", color: "bg-amber-100 text-amber-800", description: "Full access, billing management" },
  admin: { label: "Admin", color: "bg-blue-100 text-blue-800", description: "Full access, no billing" },
  member: { label: "Member", color: "bg-green-100 text-green-800", description: "View and edit data" },
  viewer: { label: "Viewer", color: "bg-gray-100 text-gray-800", description: "View only" },
}

const fiscalYearMonths = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
]

export default function GeneralSettingsPage() {
  const [users, setUsers] = useState<TeamUser[]>(mockUsers)
  const [settings, setSettings] = useState({
    baseCurrency: "USD" as Currency,
    fiscalYearStart: "1",
    companyName: "Vardi Agency",
    timezone: "Europe/Kyiv",
  })
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteData, setInviteData] = useState({ email: "", role: "member" as UserRole })
  const [deleteUser, setDeleteUser] = useState<TeamUser | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const savedCompanyName = localStorage.getItem("company_name")
    if (!savedCompanyName?.trim()) return

    setSettings(prev => ({ ...prev, companyName: savedCompanyName }))
  }, [])

  const handleSettingChange = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const handleSaveSettings = () => {
    // In production, this would save to the database
    localStorage.setItem("company_name", settings.companyName.trim())
    setHasChanges(false)
  }

  const handleInviteUser = () => {
    if (!inviteData.email.trim()) return
    
    const newUser: TeamUser = {
      id: `u${Date.now()}`,
      name: inviteData.email.split("@")[0],
      email: inviteData.email.trim(),
      role: inviteData.role,
      joinedAt: new Date().toISOString().split("T")[0],
    }
    
    setUsers(prev => [...prev, newUser])
    setIsInviteDialogOpen(false)
    setInviteData({ email: "", role: "member" })
  }

  const handleDeleteUser = () => {
    if (deleteUser) {
      setUsers(prev => prev.filter(u => u.id !== deleteUser.id))
      setDeleteUser(null)
    }
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">General Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your organization and system preferences
          </p>
        </div>
        <Button 
          onClick={handleSaveSettings} 
          disabled={!hasChanges}
          className="gap-2"
        >
          <Save className="size-4" />
          Save Changes
        </Button>
      </div>

      {/* Core Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="size-5" />
            Core Settings
          </CardTitle>
          <CardDescription>
            Base configuration for your financial system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleSettingChange("companyName", e.target.value)}
                placeholder="Your company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select 
                value={settings.timezone} 
                onValueChange={(v) => handleSettingChange("timezone", v)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/Kyiv">Europe/Kyiv (UTC+2)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (UTC+0)</SelectItem>
                  <SelectItem value="America/New_York">America/New York (UTC-5)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los Angeles (UTC-8)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseCurrency">Base Currency</Label>
              <Select 
                value={settings.baseCurrency} 
                onValueChange={(v) => handleSettingChange("baseCurrency", v as Currency)}
              >
                <SelectTrigger id="baseCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="UAH">UAH - Ukrainian Hryvnia (&#8372;)</SelectItem>
                  <SelectItem value="EUR">EUR - Euro (&euro;)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                All amounts will be converted to this currency for reporting
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fiscalYear">Fiscal Year Start</Label>
              <Select 
                value={settings.fiscalYearStart} 
                onValueChange={(v) => handleSettingChange("fiscalYearStart", v)}
              >
                <SelectTrigger id="fiscalYear">
                  <Calendar className="size-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fiscalYearMonths.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for yearly analytics and tax calculations
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Roles */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" />
                User Roles
              </CardTitle>
              <CardDescription>
                Manage access for co-founders, partners, and team members
              </CardDescription>
            </div>
            <Button onClick={() => setIsInviteDialogOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Invite User
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map(user => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {user.name.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{user.name}</span>
                      {user.role === "owner" && (
                        <Crown className="size-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="size-3" />
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {user.role === "owner" ? (
                    <Badge className={roleLabels[user.role].color}>
                      {roleLabels[user.role].label}
                    </Badge>
                  ) : (
                    <Select 
                      value={user.role} 
                      onValueChange={(v) => handleRoleChange(user.id, v as UserRole)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="size-3" />
                            Admin
                          </div>
                        </SelectItem>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <Users className="size-3" />
                            Member
                          </div>
                        </SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  
                  {user.role !== "owner" && (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setDeleteUser(user)}
                    >
                      <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Role descriptions */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-medium mb-3">Role Permissions</h4>
            <div className="grid gap-2 text-sm">
              {Object.entries(roleLabels).map(([role, info]) => (
                <div key={role} className="flex items-center gap-3">
                  <Badge className={info.color} variant="secondary">
                    {info.label}
                  </Badge>
                  <span className="text-muted-foreground">{info.description}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="partner@example.com"
                value={inviteData.email}
                onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Role</Label>
              <Select 
                value={inviteData.role} 
                onValueChange={(v) => setInviteData(prev => ({ ...prev, role: v as UserRole }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full access, no billing</SelectItem>
                  <SelectItem value="member">Member - View and edit data</SelectItem>
                  <SelectItem value="viewer">Viewer - View only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleInviteUser}
              disabled={!inviteData.email.trim()}
            >
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={() => setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteUser?.name} from your organization? 
              They will lose access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
