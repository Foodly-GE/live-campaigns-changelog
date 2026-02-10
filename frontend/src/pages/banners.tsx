import { useState, useMemo } from "react"
import { useApi } from "@/hooks/use-api"
import { FilterBar, type FilterState, type FilterOptions } from "@/components/filter-bar"
import { DetailGroup } from "@/components/detail-group"
import { DataTable } from "@/components/data-table"
import type { CampaignEntry } from "@/types/api"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface BannersResponse {
    summary: { start: number; update: number; end: number }
    grouped: {
        'banner-start': CampaignEntry[]
        'banner-update': CampaignEntry[]
        'banner-end': CampaignEntry[]
    }
    dates: string[]
    current_date: string
}

function SimpleStat({ label, value, variant }: { label: string, value: number, variant: 'start' | 'update' | 'end' }) {
    const colorStyles = {
        start: "text-[#10b981] dark:text-[#10b981]",
        update: "text-[#4f46e5] dark:text-[#818cf8]",
        end: "text-[#737373] dark:text-[#a3a3a3]"
    }
    const bgStyles = {
        start: "bg-[#10b981]/10 border-[#10b981]/20",
        update: "bg-[#6366f1]/10 border-[#6366f1]/20",
        end: "bg-[#a3a3a3]/10 border-[#a3a3a3]/20",
    }

    return (
        <Card className={cn(bgStyles[variant], "border shadow-sm")}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className={cn("text-4xl font-bold mb-1", colorStyles[variant])}>
                    {value}
                </div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {label}
                </div>
            </CardContent>
        </Card>
    )
}

export default function BannersPage() {
    const [metric, setMetric] = useState<'providers' | 'campaigns'>('providers')
    const [filters, setFilters] = useState<FilterState>({
        accountManager: "",
        spendObjective: "",
        bonusType: "",
        providers: [],
        city: "",
        date: ""
    })

    // API call depends on date filter (if set)
    // Initially empty date means latest.
    const url = `/api/banners${filters.date ? `?date=${filters.date}` : ''}`
    const { data, loading, error } = useApi<BannersResponse>(url)

    // Derived options
    const options = useMemo<FilterOptions>(() => {
        if (!data) return { managers: [], objectives: [], bonusTypes: [], providers: [], cities: [], dates: [] }

        const allEntries = [
            ...(data.grouped?.['banner-start'] || []),
            ...(data.grouped?.['banner-update'] || []),
            ...(data.grouped?.['banner-end'] || [])
        ]

        return {
            managers: Array.from(new Set(allEntries.map(e => e.account_manager).filter(Boolean))).sort(),
            objectives: Array.from(new Set(allEntries.map(e => e.spend_objective).filter(Boolean))).sort(),
            bonusTypes: Array.from(new Set(allEntries.map(e => e.bonus_type).filter(Boolean))).sort(),
            providers: Array.from(new Set(allEntries.map(e => e.provider_name).filter(Boolean))).sort(),
            cities: Array.from(new Set(allEntries.map(e => e.city).filter(Boolean))).sort(),
            dates: data.dates || []
        }
    }, [data])

    // Filtered detailed data
    const filteredGroups = useMemo(() => {
        if (!data?.grouped) return { start: [], update: [], end: [] }

        const filterFn = (e: CampaignEntry) => {
            if (filters.accountManager && e.account_manager !== filters.accountManager) return false
            if (filters.spendObjective && e.spend_objective !== filters.spendObjective) return false
            if (filters.bonusType && e.bonus_type !== filters.bonusType) return false
            if (filters.city && e.city !== filters.city) return false
            if (filters.providers.length > 0 && !filters.providers.includes(e.provider_name)) return false
            return true
        }

        return {
            start: (data.grouped['banner-start'] || []).filter(filterFn),
            update: (data.grouped['banner-update'] || []).filter(filterFn),
            end: (data.grouped['banner-end'] || []).filter(filterFn)
        }
    }, [data, filters])

    // Filtered stats for summary cards
    const filteredStats = useMemo(() => {
        const getStats = (entries: CampaignEntry[]) => {
            if (metric === 'providers') {
                return new Set(entries.map(e => e.provider_id || e.provider_name)).size
            }
            return entries.length
        }
        return {
            start: getStats(filteredGroups.start),
            update: getStats(filteredGroups.update),
            end: getStats(filteredGroups.end)
        }
    }, [filteredGroups, metric])


    if (loading && !data) return (
        <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
            <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
        </div>
    )

    if (error) return (
        <div className="flex items-center justify-center h-[50vh] text-destructive flex-col gap-2">
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
    )

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Banner Actions</h1>
                <p className="text-muted-foreground">Tracking banner requests — grouped by action</p>
            </div>

            <FilterBar
                filters={filters}
                options={options}
                onChange={setFilters}
                showDate={true}
            />

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Daily Progression</h2>
                    <div className="flex bg-muted p-1 rounded-md text-xs font-medium">
                        <button
                            onClick={() => setMetric('providers')}
                            className={cn(
                                "px-3 py-1.5 rounded-sm transition-all",
                                metric === 'providers' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Providers
                        </button>
                        <button
                            onClick={() => setMetric('campaigns')}
                            className={cn(
                                "px-3 py-1.5 rounded-sm transition-all",
                                metric === 'campaigns' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            Campaigns
                        </button>
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                    <SimpleStat
                        label="Banner Start"
                        value={filteredStats.start}
                        variant="start"
                    />
                    <SimpleStat
                        label="Banner Update"
                        value={filteredStats.update}
                        variant="update"
                    />
                    <SimpleStat
                        label="Banner End"
                        value={filteredStats.end}
                        variant="end"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Details</h2>

                <DetailGroup title="Banner Start" count={filteredGroups.start.length} variant="start">
                    <DataTable data={filteredGroups.start} emptyMessage="No banner start actions" />
                </DetailGroup>

                <DetailGroup title="Banner Update" count={filteredGroups.update.length} variant="update">
                    <DataTable data={filteredGroups.update} emptyMessage="No banner update actions" />
                </DetailGroup>

                <DetailGroup title="Banner End" count={filteredGroups.end.length} variant="end">
                    <DataTable data={filteredGroups.end} emptyMessage="No banner end actions" />
                </DetailGroup>
            </section>
        </div>
    )
}
