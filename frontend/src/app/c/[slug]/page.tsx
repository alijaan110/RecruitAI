import { notFound } from "next/navigation"
import Link from "next/link"
import { Building2, MapPin, Briefcase } from "lucide-react"
import { Button } from "@/src/components/ui/button"

async function getCompanyBoard(slug: string) {
  const apiUrl = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  try {
    const res = await fetch(`${apiUrl}/api/v1/jobs/company/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.data || data
  } catch {
    return null
  }
}

export default async function CompanyPublicBoardPage({ params }: { params: { slug: string } }) {
  const data = await getCompanyBoard(params.slug)

  if (!data) {
    notFound()
  }

  const { tenant, jobs } = data

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Header */}
      <div className="bg-primary pb-24 pt-12 px-6">
        <div className="max-w-4xl mx-auto text-center text-primary-foreground">
          <div className="inline-flex items-center justify-center p-4 bg-primary-foreground/10 rounded-2xl mb-6 shadow-sm border border-primary-foreground/20 backdrop-blur-sm">
            <Building2 className="w-12 h-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {tenant.name}
          </h1>
          <p className="text-lg text-primary-foreground/90 max-w-2xl mx-auto">
            Join our team and help us build amazing things. We're always looking for talented people to make an impact.
          </p>
        </div>
      </div>

      {/* Main Content (Jobs) */}
      <div className="max-w-4xl mx-auto px-6 -mt-16 pb-20 relative z-10">
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xl font-semibold text-slate-900">
              Open Positions <span className="ml-2 text-sm font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">{jobs.length}</span>
            </h2>
          </div>
          
          <div className="divide-y divide-slate-100">
            {jobs.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                No open positions at the moment. Please check back later!
              </div>
            ) : (
              jobs.map((job: any) => (
                <Link 
                  key={job.id} 
                  href={`/apply/${job.public_slug}`}
                  className="block p-6 hover:bg-slate-50 transition-colors group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-medium text-slate-900 group-hover:text-primary transition-colors mb-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                        {job.department && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {job.department}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {job.location || "Remote"}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                          {job.employment_type?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div>
                      <Button variant="outline" className="w-full md:w-auto bg-white group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                        View Details
                      </Button>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center text-sm text-slate-500">
          Powered by <strong>RecruitAI</strong>
        </div>
      </div>
    </div>
  )
}
