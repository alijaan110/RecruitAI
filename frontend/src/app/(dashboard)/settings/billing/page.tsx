"use client"

import * as React from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { billingApi, PlanUsage } from "@/src/lib/api"
import { auth } from "@/src/lib/auth"
import { Button } from "@/src/components/ui/button"
import { Check, Loader2, Minus } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/src/lib/utils"
import { LoadingSkeleton } from "@/src/components/shared/LoadingSkeleton"

export default function BillingSettingsPage() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['billing', 'plan'],
    queryFn: () => billingApi.getPlan(),
    retry: 0
  })

  // We fallback to tenant plan info in localStorage if api is unavailable
  const tenant = auth.getTenant()

  if (isLoading) {
    return <LoadingSkeleton className="h-64 w-full max-w-2xl" />
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Billing & Plans</h3>
        <p className="text-sm text-slate-500">Manage your subscription and usage limit.</p>
      </div>

      <div className="bg-white border border-surface-200 rounded-xl p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">Current Plan</h4>
            <span className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium capitalize",
              tenant?.plan === 'enterprise' ? "bg-purple-100 text-purple-700" :
              tenant?.plan === 'pro' ? "bg-brand-100 text-brand-700" :
              "bg-surface-200 text-slate-700"
            )}>
              {tenant?.plan || 'Free'} Plan
            </span>
          </div>
        </div>

        {usage && (
          <div className="space-y-6 border-t border-surface-100 pt-6">
            <UsageBar 
              label="Active Jobs" 
              used={usage.active_jobs.used} 
              limit={usage.active_jobs.limit} 
              unit="jobs used" 
            />
            <UsageBar 
              label="CV Uploads (This month)" 
              used={usage.cv_uploads.used} 
              limit={usage.cv_uploads.limit} 
              unit="uploads" 
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PlanCard 
          plan="free"
          title="Free"
          price="$0"
          features={[
            { name: "Up to 3 Active Jobs", included: true },
            { name: "50 CV Uploads / month", included: true },
            { name: "Basic Kanban Pipeline", included: true },
            { name: "AI Keyword Matcher", included: false },
            { name: "Custom Domain", included: false }
          ]}
          isCurrent={tenant?.plan === 'free'}
          actionLabel={tenant?.plan === 'free' ? "Current Plan" : "Downgrade"}
        />
        <PlanCard 
          plan="pro"
          title="Pro"
          price="$49"
          featured
          features={[
            { name: "Unlimited Active Jobs", included: true },
            { name: "1000 CV Uploads / month", included: true },
            { name: "Advanced Analytics", included: true },
            { name: "AI Keyword Matcher", included: true },
            { name: "Custom Domain", included: false }
          ]}
          isCurrent={tenant?.plan === 'pro'}
          actionLabel="Upgrade to Pro"
          priceId="price_pro_123"
        />
        <PlanCard 
          plan="enterprise"
          title="Enterprise"
          price="$199"
          features={[
            { name: "Unlimited Active Jobs", included: true },
            { name: "Unlimited CV Uploads", included: true },
            { name: "Priority Support", included: true },
            { name: "AI Keyword Matcher", included: true },
            { name: "Custom Domain", included: true }
          ]}
          isCurrent={tenant?.plan === 'enterprise'}
          actionLabel="Contact Us"
        />
      </div>
    </div>
  )
}

function UsageBar({ label, used, limit, unit }: { label: string, used: number, limit: number, unit: string }) {
  const isUnlimited = limit === -1
  const pct = isUnlimited ? 0 : Math.min(100, Math.max(0, (used / limit) * 100))
  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">
          {used} of {isUnlimited ? '∞' : limit} {unit}
        </span>
      </div>
      <div className="w-full h-2 bg-surface-200 rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            pct >= 100 ? "bg-red-500" : pct > 80 ? "bg-amber-500" : "bg-brand-600"
          )}
          style={{ width: `${isUnlimited ? 0 : pct}%` }}
        />
      </div>
    </div>
  )
}

interface PlanCardProps {
  title: string;
  price: string;
  plan: string;
  features: Array<{ name: string; included: boolean }>;
  isCurrent?: boolean;
  featured?: boolean;
  actionLabel: string;
  priceId?: string;
}

function PlanCard({ title, price, features, isCurrent, featured, actionLabel, priceId }: PlanCardProps) {
  const checkoutMutation = useMutation({
    mutationFn: (pid: string) => billingApi.createCheckout(pid, window.location.href, window.location.href),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
    onError: () => toast.error("Billing is currently unavailable")
  })

  return (
    <div className={cn(
      "rounded-xl border p-6 flex flex-col bg-white",
      featured ? "ring-2 ring-brand-600 border-transparent shadow-md relative" : "border-surface-200"
    )}>
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
          Most Popular
        </span>
      )}
      <h4 className="text-lg font-semibold text-slate-900 mb-2">{title}</h4>
      <div className="mb-6">
        <span className="text-3xl font-bold text-slate-900">{price}</span>
        {price !== "$0" && <span className="text-sm text-slate-500">/mo</span>}
      </div>
      
      <ul className="space-y-3 mb-8 flex-1">
        {features.map((f, i) => (
          <li key={i} className={cn("flex items-start gap-2 text-sm", f.included ? "text-slate-700" : "text-slate-400")}>
            {f.included ? <Check className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" /> : <Minus className="w-4 h-4 text-slate-300 flex-shrink-0 mt-0.5" />}
            {f.name}
          </li>
        ))}
      </ul>
      
      <Button 
        variant={featured ? "default" : "outline"}
        className="w-full"
        disabled={isCurrent || checkoutMutation.isPending}
        onClick={() => {
          if (priceId && !isCurrent) checkoutMutation.mutate(priceId)
        }}
      >
        {checkoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : actionLabel}
      </Button>
    </div>
  )
}
