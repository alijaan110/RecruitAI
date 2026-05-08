"use client"

import * as React from "react"
import { auth } from "@/src/lib/auth"
import { authApi } from "@/src/lib/api"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Loader2, Plus, Users, Trash } from "lucide-react"
import { toast } from "sonner"
import { initials } from "@/src/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog"

export default function TeamSettingsPage() {
  const user = auth.getUser()
  const isAdmin = user?.role === 'admin'
  const [isInviteOpen, setIsInviteOpen] = React.useState(false)
  
  // Dummy team data since we don't have a team list API defined in task, but let's mock it
  const team = [user!]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
          <p className="text-sm text-slate-500">Manage who has access to your workspace.</p>
        </div>
        
        {isAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite true Member</DialogTitle>
                <DialogDescription>
                  Send an email invitation to join your workspace.
                </DialogDescription>
              </DialogHeader>
              <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  try {
                    await authApi.inviteMember(
                      formData.get('email') as string, 
                      formData.get('full_name') as string, 
                      formData.get('role') as string
                    )
                    toast.success("Invitation sent")
                    setIsInviteOpen(false)
                  } catch(err) {
                    toast.error("Failed to send invite")
                  }
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <label className="text-xs font-medium text-slate-700">Full Name</label>
                  <Input name="full_name" required className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Email</label>
                  <Input name="email" type="email" required className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Role</label>
                  <select name="role" className="flex h-9 w-full rounded-md border border-surface-300 bg-white px-3 py-1 text-sm shadow-sm transition-colors mt-1 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="recruiter">Recruiter</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" className="w-full">Send Invitation</Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="bg-white border border-surface-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-surface-200">
          {team.map((member, i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-50 text-brand-700 text-sm font-semibold rounded-full flex items-center justify-center uppercase shadow-sm">
                  {initials(member.full_name)}
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">{member.full_name} {member.id === user?.id && "(You)"}</div>
                  <div className="text-xs text-slate-500">{member.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs font-medium bg-surface-100 text-slate-600 px-2.5 py-1 rounded-full capitalize">
                  {member.role}
                </span>
                {isAdmin && member.id !== user?.id && (
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                    <Trash className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
