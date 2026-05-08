"use client"

import * as React from "react"
import {
  CheckCircle2, AlertTriangle, AlertCircle, Brain, Sparkles,
  Loader2, RotateCw, ShieldCheck, ShieldAlert, BadgeCheck
} from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { applicationsApi } from "@/src/lib/api"
import { toast } from "sonner"

type Recommendation = "shortlist" | "review" | "skip"

interface AgentMeta {
  success: boolean
  provider?: string
  model?: string
  latency_ms?: number
  error?: string | null
  fell_back_to_mock?: boolean
}

interface Evaluation {
  overall_score: number
  recommendation: Recommendation
  headline?: string
  strengths?: string[]
  gaps?: string[]
  interview_questions?: string[]
  confidence?: number
  reasoning?: string
  skills?: any
  experience?: any
  concerns?: any[]
  blend?: {
    tfidf_score: number
    skills_score: number
    experience_score: number
    blended_score: number
    weights: { tfidf: number; skills: number; experience: number }
  }
  meta?: {
    agents: Record<string, AgentMeta>
    fell_back_to_mock: boolean
    any_agent_failed: boolean
  }
}

interface Props {
  applicationId: string
  evaluation?: Evaluation
  onRefreshed?: () => void
}

const RECO_STYLES: Record<Recommendation, { bg: string; text: string; ring: string; icon: any; label: string }> = {
  shortlist: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", icon: BadgeCheck, label: "Shortlist" },
  review:    { bg: "bg-amber-50",   text: "text-amber-800",   ring: "ring-amber-200",   icon: AlertTriangle, label: "Review" },
  skip:      { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     icon: AlertCircle,   label: "Skip" },
}

function ScoreRing({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value || 0))
  const color = v >= 70 ? "text-emerald-600" : v >= 40 ? "text-amber-500" : "text-red-500"
  const stroke = v >= 70 ? "#10b981" : v >= 40 ? "#f59e0b" : "#ef4444"
  const c = 2 * Math.PI * 40
  const offset = c - (v / 100) * c
  return (
    <div className="relative w-28 h-28">
      <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={stroke} strokeWidth="9"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-bold text-2xl ${color}`}>{Math.round(v)}</div>
    </div>
  )
}

function Bar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const v = Math.max(0, Math.min(100, value))
  const color = v >= 70 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-red-500"
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="text-slate-700 font-medium">{label}</span>
        <span className="text-slate-500">{Math.round(v)}{hint ? ` · ${hint}` : ""}</span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

export function EvaluationPanel({ applicationId, evaluation, onRefreshed }: Props) {
  const [busy, setBusy] = React.useState(false)

  const handleRefresh = async () => {
    setBusy(true)
    try {
      const r = await applicationsApi.reevaluate(applicationId)
      toast.success(
        `Re-evaluated: ${Math.round(r.overall_score)} (${r.recommendation})`,
        { description: r.fell_back_to_mock ? "Some agents fell back to mock — check LLM config." : undefined }
      )
      onRefreshed?.()
    } catch (e: any) {
      toast.error("Re-evaluation failed", { description: e?.response?.data?.error || e.message })
    } finally {
      setBusy(false)
    }
  }

  if (!evaluation) {
    return (
      <div className="bg-white border border-surface-200 rounded-xl p-8 text-center">
        <Brain className="w-10 h-10 mx-auto text-slate-300" />
        <p className="mt-3 text-sm text-slate-600">No AI evaluation yet for this application.</p>
        <Button onClick={handleRefresh} disabled={busy} className="mt-4">
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          Run multi-agent evaluation
        </Button>
      </div>
    )
  }

  const reco = RECO_STYLES[evaluation.recommendation] || RECO_STYLES.review
  const RecoIcon = reco.icon
  const meta = evaluation.meta
  const blend = evaluation.blend

  return (
    <div className="space-y-5">
      {/* Provenance banner */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
        {meta?.fell_back_to_mock ? (
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
        ) : meta?.any_agent_failed ? (
          <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
        ) : (
          <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1">
          <div className="font-medium text-slate-700">
            {meta?.fell_back_to_mock
              ? "Mock fallback in use — configure your LLM provider for real scoring."
              : meta?.any_agent_failed
              ? "Some agents failed — recommendation derived from available signals."
              : "All agents completed successfully."}
          </div>
          {meta?.agents && (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
              {Object.entries(meta.agents).map(([name, m]) => (
                <span
                  key={name}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${
                    m.success ? "bg-white border-slate-200" : "bg-red-50 border-red-200 text-red-700"
                  }`}
                  title={m.error || ""}
                >
                  <span className="capitalize">{name}</span>
                  <span className="text-slate-400">·</span>
                  <span>{m.provider}/{m.model}</span>
                  <span className="text-slate-400">·</span>
                  <span>{m.latency_ms ?? 0}ms</span>
                </span>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Score + Recommendation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-surface-200 rounded-xl p-5 flex items-center gap-5 md:col-span-2">
          <ScoreRing value={evaluation.overall_score} />
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${reco.bg} ${reco.text} ${reco.ring}`}>
              <RecoIcon className="w-3.5 h-3.5" />
              {reco.label}
            </div>
            <h3 className="mt-2 text-base font-semibold text-slate-900 leading-snug">
              {evaluation.headline || "Evaluation summary"}
            </h3>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">{evaluation.reasoning}</p>
            {typeof evaluation.confidence === "number" && (
              <div className="mt-2 text-xs text-slate-500">
                Confidence: <span className="font-medium text-slate-700">{Math.round(evaluation.confidence * 100)}%</span>
              </div>
            )}
          </div>
        </div>

        {/* Score components */}
        <div className="bg-white border border-surface-200 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Score breakdown</h3>
          {blend ? (
            <>
              <Bar label="Skills match" value={blend.skills_score} hint={`weight ${blend.weights.skills}`} />
              <Bar label="Experience" value={blend.experience_score} hint={`weight ${blend.weights.experience}`} />
              <Bar label="Keyword (TF-IDF)" value={blend.tfidf_score} hint={`weight ${blend.weights.tfidf}`} />
            </>
          ) : (
            <p className="text-xs text-slate-500">No breakdown available.</p>
          )}
        </div>
      </div>

      {/* Strengths + Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-3">Strengths</h3>
          {(evaluation.strengths?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No strengths recorded.</p>
          ) : (
            <ul className="space-y-2.5">
              {evaluation.strengths!.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3">Gaps to clarify</h3>
          {(evaluation.gaps?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No gaps flagged.</p>
          ) : (
            <ul className="space-y-2.5">
              {evaluation.gaps!.map((g, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Concerns */}
      {evaluation.concerns && evaluation.concerns.length > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Concerns to ask about</h3>
          <ul className="divide-y divide-surface-100">
            {evaluation.concerns.map((c: any, i: number) => (
              <li key={i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      c.severity === "high"
                        ? "bg-red-100 text-red-700"
                        : c.severity === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {c.severity}
                  </span>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-900">{c.summary}</div>
                    {c.evidence && <div className="text-xs italic text-slate-500 mt-0.5">"{c.evidence}"</div>}
                    {c.interview_question && (
                      <div className="mt-2 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-2">
                        <span className="font-semibold text-slate-600">Ask: </span>{c.interview_question}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interview questions */}
      {(evaluation.interview_questions?.length ?? 0) > 0 && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Tailored interview questions
          </h3>
          <ol className="space-y-2.5 list-decimal list-inside text-sm text-slate-700 leading-relaxed">
            {evaluation.interview_questions!.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Skills evidence */}
      {evaluation.skills?.matched_skills && (
        <div className="bg-white border border-surface-200 rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Skill evidence</h3>
          <div className="flex flex-wrap gap-2">
            {evaluation.skills.matched_skills.map((s: any, i: number) => (
              <div
                key={i}
                title={s.evidence}
                className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3 h-3" />
                {s.skill}
                <span className="text-emerald-600/70">{Math.round((s.confidence ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
          {(evaluation.skills.missing_critical?.length ?? 0) > 0 && (
            <div className="mt-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-red-700 mb-2">Missing — critical</div>
              <div className="flex flex-wrap gap-2">
                {evaluation.skills.missing_critical.map((s: string, i: number) => (
                  <span key={i} className="text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
