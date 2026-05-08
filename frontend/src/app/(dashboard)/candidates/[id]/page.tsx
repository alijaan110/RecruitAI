"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useCandidate, useCandidateNotes } from "@/src/hooks/useCandidates"
import { useUpdateStage, useStarApplication, useDisqualify } from "@/src/hooks/useApplications"
import { candidatesApi } from "@/src/lib/api"
import { initials, formatTimeAgo } from "@/src/lib/utils"
import { AppStage } from "@/src/types/application"
import { Mail, Phone, ExternalLink, Star, Lock, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs"
import { Textarea } from "@/src/components/ui/textarea"
import { StageBadge } from "@/src/components/candidates/StageBadge"
import { ScoreBadge } from "@/src/components/candidates/ScoreBadge"
import { EvaluationPanel } from "@/src/components/candidates/EvaluationPanel"
import { ConfirmDialog } from "@/src/components/shared/ConfirmDialog"
import { LoadingSkeleton } from "@/src/components/shared/LoadingSkeleton"
import { EmptyState } from "@/src/components/shared/EmptyState"

export default function CandidateProfilePage({ params }: { params: { id: string } }) {
  const qc = useQueryClient()
  const { data: candidate, isLoading } = useCandidate(params.id)
  
  // App selector state
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null)
  
  React.useEffect(() => {
    if (candidate?.applications?.length && !selectedAppId) {
      setSelectedAppId(candidate.applications[0].id)
    }
  }, [candidate, selectedAppId])

  const app = candidate?.applications?.find(a => a.id === selectedAppId) || candidate?.applications?.[0]
  
  const { data: notes, refetch: refetchNotes } = useCandidateNotes(params.id, app?.id)
  
  const updateStageMutation = useUpdateStage()
  const starMutation = useStarApplication()
  const disqualifyMutation = useDisqualify()

  const [newStage, setNewStage] = React.useState<AppStage | "">("")
  const [stageNote, setStageNote] = React.useState("")
  const [isDisqualifyOpen, setIsDisqualifyOpen] = React.useState(false)
  const [disqualifyReason, setDisqualifyReason] = React.useState("")

  const handleUpdateStage = async () => {
    if (!app || !newStage) return;
    await updateStageMutation.mutateAsync({ id: app.id, stage: newStage as AppStage, note: stageNote })
    setNewStage("")
    setStageNote("")
  }

  const handleDisqualify = async () => {
    if (!app) return;
    await disqualifyMutation.mutateAsync({ id: app.id, reason: disqualifyReason })
    setIsDisqualifyOpen(false)
    setDisqualifyReason("")
  }

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <LoadingSkeleton className="h-32" />
        <div className="grid grid-cols-3 gap-6">
          <LoadingSkeleton className="col-span-2 h-[500px]" />
          <LoadingSkeleton className="col-span-1 h-[500px]" />
        </div>
      </div>
    )
  }

  if (!candidate) return <div className="p-6">Candidate not found</div>

  const { parsed_data } = candidate

  return (
    <div className="p-6 max-w-7xl mx-auto h-full">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="bg-white border border-surface-200 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 text-lg font-semibold rounded-full flex items-center justify-center uppercase shadow-sm">
                {initials(candidate.full_name)}
              </div>
              <div>
                <h1 className="text-xl font-semibold text-slate-900">{candidate.full_name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1.5"><Mail className="w-4 h-4"/> {candidate.email}</span>
                  {candidate.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4"/> {candidate.phone}</span>}
                  {candidate.linkedin_url && (
                    <a href={candidate.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-brand-600 hover:underline">
                      <ExternalLink className="w-4 h-4"/> LinkedIn
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Tabs defaultValue="evaluation" className="flex flex-col">
            <TabsList className="w-full justify-start rounded-xl mb-4 bg-white border border-surface-200 p-1 h-11">
              <TabsTrigger value="evaluation" className="data-[state=active]:bg-surface-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900">AI Evaluation</TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-surface-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900">Overview</TabsTrigger>
              <TabsTrigger value="cv" className="data-[state=active]:bg-surface-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900">CV / Resume</TabsTrigger>
              <TabsTrigger value="notes" className="data-[state=active]:bg-surface-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900">Notes</TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-surface-100 data-[state=active]:shadow-none data-[state=active]:text-slate-900">History</TabsTrigger>
            </TabsList>

            <TabsContent value="evaluation" className="min-h-[400px]">
              <EvaluationPanel
                applicationId={app?.id || ""}
                evaluation={(app as any)?.score_breakdown?.evaluation}
                onRefreshed={() => qc.invalidateQueries({ queryKey: ['candidates', params.id] })}
              />
            </TabsContent>

            <TabsContent value="overview" className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm min-h-[400px]">
              {parsed_data?.summary && (
                <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 text-sm text-slate-600 italic mb-6">
                  "{parsed_data.summary}"
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Skills</h3>
                {parsed_data?.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {parsed_data.skills.map((skill, i) => (
                      <span key={i} className="text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 px-2.5 py-1 rounded-full">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">No skills extracted.</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Experience</h3>
                  {parsed_data?.experience?.length ? (
                    <div className="space-y-4">
                      {parsed_data.experience.map((exp, i) => (
                        <div key={i} className="relative pl-4 border-l-2 border-surface-200 pb-2 last:pb-0">
                          <div className="absolute w-2 h-2 bg-brand-400 rounded-full -left-[5px] top-1.5 border-2 border-white" />
                          <div className="text-sm font-semibold text-slate-900">{exp.title}</div>
                          <div className="text-xs font-medium text-slate-600 mt-0.5">{exp.company} <span className="text-slate-400 font-normal ml-1">({Math.floor(exp.duration_months / 12)}y {exp.duration_months % 12}m)</span></div>
                          {exp.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{exp.description}</p>}
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-400">No experience listed.</p>}
                </div>

                <div>
                  <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-4">Education</h3>
                  {parsed_data?.education?.length ? (
                    <div className="space-y-4">
                      {parsed_data.education.map((edu, i) => (
                        <div key={i} className="relative pl-4 border-l-2 border-surface-200 pb-2 last:pb-0">
                          <div className="absolute w-2 h-2 bg-surface-400 rounded-full -left-[5px] top-1.5 border-2 border-white" />
                          <div className="text-sm font-semibold text-slate-900">{edu.degree}</div>
                          <div className="text-xs text-slate-600 mt-0.5">{edu.institution} {edu.year ? `• ${edu.year}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-slate-400">No education listed.</p>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="cv" className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm min-h-[400px]">
              {candidate.cv_file_name ? (
                <div className="flex flex-col items-center justify-center p-8">
                  <ExternalLink className="w-12 h-12 text-slate-300 mb-4" />
                  <p className="text-sm text-slate-600 mb-4 text-center">To view the full document, please download it or get a secure temporary link.</p>
                  <Button variant="outline" onClick={async () => {
                    const { url } = await candidatesApi.getCvUrl(candidate.id)
                    window.open(url, '_blank')
                  }}>
                    View Document
                  </Button>
                </div>
              ) : (
                <EmptyState icon={AlertCircle} title="No document uploaded" />
              )}
            </TabsContent>

            <TabsContent value="notes" className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm min-h-[400px]">
              {/* Need NoteForm and NoteList inline to save files */}
              <div className="mb-8">
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!app?.id) return;
                    const formData = new FormData(e.currentTarget);
                    await candidatesApi.addNote(candidate.id, {
                      application_id: app.id,
                      content: String(formData.get('content') ?? ''),
                      note_type: String(formData.get('note_type') ?? 'general'),
                      is_private: formData.get('is_private') === 'on',
                    });
                    refetchNotes();
                    (e.target as HTMLFormElement).reset();
                  }}
                  className="bg-surface-50 border border-surface-200 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <select name="note_type" className="text-xs font-medium h-8 bg-white border border-surface-300 px-2 rounded-md">
                      <option value="general">General Note</option>
                      <option value="interview">Interview Note</option>
                      <option value="rejection">Rejection Reason</option>
                      <option value="offer">Offer Detail</option>
                    </select>
                    <label className="text-xs text-slate-600 flex items-center gap-1.5">
                      <input type="checkbox" name="is_private" className="rounded border-surface-300" />
                      <Lock className="w-3 h-3"/> Private
                    </label>
                  </div>
                  <Textarea name="content" required placeholder="Add a note about this candidate..." className="min-h-[80px]" />
                  <div className="flex justify-end">
                    <Button size="sm" type="submit">Add Note</Button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                {notes?.map(note => (
                  <div key={note.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold flex items-center justify-center uppercase flex-shrink-0">
                      {initials(note.author_name)}
                    </div>
                    <div className="flex-1 bg-surface-50 border border-surface-200 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{note.author_name}</span>
                          <span className="text-xs bg-white border border-surface-200 text-slate-500 px-1.5 py-0.5 rounded capitalize">{note.note_type}</span>
                          {note.is_private && <span className="text-xs text-slate-400 flex items-center gap-1"><Lock className="w-3 h-3"/> Private</span>}
                        </div>
                        <span className="text-xs text-slate-400">{formatTimeAgo(note.created_at)}</span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    </div>
                  </div>
                ))}
                {(!notes || notes.length === 0) && <p className="text-sm text-slate-400 text-center py-4">No notes yet.</p>}
              </div>
            </TabsContent>

            <TabsContent value="history" className="bg-white border border-surface-200 rounded-xl p-6 shadow-sm min-h-[400px]">
               {(app as any)?.stage_history ? (
                 <div className="space-y-6">
                   {(app as any).stage_history.map((entry: any, i: number) => (
                     <div key={entry.id} className="relative pl-6 border-l w-full pb-2 last:pb-0 border-surface-200">
                       <div className="absolute w-3 h-3 rounded-full -left-[6.5px] top-1" style={{ backgroundColor: `var(--stage-${entry.to_stage})` }} />
                       <p className="text-sm font-medium text-slate-900">
                         {entry.from_stage ? `${entry.from_stage} → ${entry.to_stage}` : `Moved to ${entry.to_stage}`}
                       </p>
                       <p className="text-xs text-slate-500 mt-1">
                         by {entry.changed_by_name || 'System'} • {formatTimeAgo(entry.created_at)}
                       </p>
                       {entry.note && <p className="text-xs italic text-slate-600 mt-2 bg-surface-50 border border-surface-100 p-2 rounded-md">{entry.note}</p>}
                     </div>
                   ))}
                 </div>
               ) : <p className="text-sm text-slate-400 text-center pb-4">No history available.</p>}
            </TabsContent>

          </Tabs>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          
          {candidate.applications && candidate.applications.length > 1 && (
            <div className="bg-white border border-surface-200 rounded-xl p-3 shadow-sm">
              <label className="text-xs font-medium text-slate-500 uppercase block mb-1">Viewing Application</label>
              <select 
                value={selectedAppId || ""} 
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="w-full text-sm h-9 px-2 rounded-md border border-surface-300 bg-white"
              >
                {candidate.applications.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.job_title || 'Job'} ({a.stage})</option>
                ))}
              </select>
            </div>
          )}

          {app && (
            <>
              {/* Stage Card */}
              <div className="bg-white border border-surface-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Current Stage</h3>
                <div className="mb-4">
                  <StageBadge stage={app.stage} size="md" />
                </div>
                
                <div className="border-t border-surface-100 pt-4 mt-2">
                  <label className="text-xs font-medium text-slate-700 block mb-1.5">Move to Stage</label>
                  <select 
                    value={newStage} 
                    onChange={(e) => setNewStage(e.target.value as AppStage)}
                    className="w-full h-9 px-2 rounded-md border border-surface-300 bg-white text-sm mb-3"
                  >
                     <option value="" disabled>Select stage...</option>
                     {['received', 'screening', 'interview', 'offer', 'hired', 'rejected'].map(s => (
                       <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                     ))}
                  </select>
                  
                  {newStage && newStage !== app.stage && (
                    <Textarea 
                      placeholder="Optional note for stage change..." 
                      className="text-sm min-h-[60px] mb-3 bg-surface-50"
                      value={stageNote}
                      onChange={(e) => setStageNote(e.target.value)}
                    />
                  )}

                  <Button 
                    className="w-full" 
                    disabled={!newStage || newStage === app.stage || updateStageMutation.isPending}
                    onClick={handleUpdateStage}
                  >
                    {updateStageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : "Update Stage"}
                  </Button>
                </div>
              </div>

              {/* Score Card */}
              <div className="bg-white border border-surface-200 rounded-xl p-5 shadow-sm">
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Match Score</h3>
                <div className="mb-5">
                  <span className="text-3xl font-bold text-brand-600">
                    <ScoreBadge score={app.overall_score} size="lg" />
                  </span>
                </div>
                
                {app.score_breakdown ? (
                  <div className="space-y-4 border-t border-surface-100 pt-4">
                    <ScoreBar label="Keyword Match" score={app.score_breakdown.keyword_score} />
                    <ScoreBar label="Skills Match" score={app.score_breakdown.skills_match} />
                    <ScoreBar label="Experience" score={app.score_breakdown.experience_score} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">Score breakdown not available yet.</p>
                )}
              </div>

              {/* Actions */}
              <div className="bg-white border border-surface-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start border-surface-300 hover:bg-amber-50 hover:text-amber-700"
                  onClick={() => starMutation.mutate({ id: app.id, isStarred: !app.is_starred })}
                >
                  <Star className={`w-4 h-4 mr-2 ${app.is_starred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                  {app.is_starred ? 'Unstar Candidate' : 'Star Candidate'}
                </Button>

                {!app.is_disqualified && (
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setIsDisqualifyOpen(true)}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" /> Disqualify
                  </Button>
                )}
                
                {app.is_disqualified && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-red-700 font-medium text-sm mb-1">
                      <AlertCircle className="w-4 h-4" /> Disqualified
                    </div>
                    {app.disqualify_reason && <p className="text-xs text-red-600">{app.disqualify_reason}</p>}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>

      <ConfirmDialog
        open={isDisqualifyOpen}
        onOpenChange={setIsDisqualifyOpen}
        title="Disqualify Candidate"
        description="This will permanently mark the application as disqualified."
        confirmLabel="Disqualify"
        variant="destructive"
        onConfirm={handleDisqualify}
        onCancel={() => { setIsDisqualifyOpen(false); setDisqualifyReason(""); }}
      >
        <Textarea 
          placeholder="Reason for disqualification (optional)..."
          value={disqualifyReason}
          onChange={(e) => setDisqualifyReason(e.target.value)}
          className="mt-2"
        />
      </ConfirmDialog>

    </div>
  )
}

function ScoreBar({ label, score }: { label: string, score: number }) {
  // ensure 0-100
  const normalized = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500 font-semibold">{normalized}%</span>
      </div>
      <div className="w-full bg-surface-200 h-1.5 rounded-full overflow-hidden">
        <div 
          className="h-full bg-brand-600 rounded-full" 
          style={{ width: `${normalized}%` }}
        />
      </div>
    </div>
  )
}
