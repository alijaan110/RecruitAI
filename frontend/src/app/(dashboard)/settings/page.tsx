"use client"

import * as React from "react"
import { auth } from "@/src/lib/auth"
import { Input } from "@/src/components/ui/input"
import { Button } from "@/src/components/ui/button"

export default function GeneralSettingsPage() {
  const user = auth.getUser()
  const tenant = auth.getTenant()
  
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Company Info</h3>
        <p className="text-xs text-slate-500 mb-6">Manage your company's profile information.</p>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-700">Company Name</label>
            <Input 
              defaultValue={tenant?.name} 
              disabled={!isAdmin} 
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-700">Public Slug</label>
            <Input 
              defaultValue={tenant?.slug} 
              disabled 
              className="mt-1 bg-surface-50 cursor-not-allowed"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Your public job board: <a href={`/c/${tenant?.slug}`} target="_blank" className="text-primary hover:underline">Click here to view</a>
            </p>
          </div>
          {isAdmin && (
            <Button className="mt-2">Save Changes</Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Your Account</h3>
        <p className="text-xs text-slate-500 mb-6">Your personal account information.</p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700">Full Name</label>
              <Input 
                defaultValue={user?.full_name} 
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700">Email Address</label>
              <Input 
                defaultValue={user?.email} 
                disabled 
                className="mt-1 bg-surface-50 cursor-not-allowed"
              />
            </div>
          </div>
          
          <div>
            <label className="text-xs font-medium text-slate-700 block">Role</label>
            <span className="inline-flex items-center mt-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-50 text-brand-700 capitalize border border-brand-200">
              {user?.role}
            </span>
          </div>

          <Button className="mt-2">Update Profile</Button>
        </div>
      </div>
    </div>
  )
}
