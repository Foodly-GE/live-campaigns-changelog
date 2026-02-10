import { useState, useMemo } from "react"
import { useApi } from "@/hooks/use-api"
import { FilterBar, type FilterState, type FilterOptions } from "@/components/filter-bar"
import { StatCard } from "@/components/stat-card"
import { CustomLineChart } from "@/components/line-chart"
import { DetailGroup } from "@/components/detail-group"
import { DataTable } from "@/components/data-table"
import type { CampaignEntry } from "@/types/api"

interface CalendarResponse {
    summary: { live: number; finished: number; scheduled: number }
    prev_summary: { live: number; finished: number; scheduled: number }
    providers: { live: number; finished: number; scheduled: number }
    grouped: {
        live: CampaignEntry[]
        finished: CampaignEntry[]
        scheduled: CampaignEntry[]
    }
    time_series: Record<string, { live: number; finished: number; scheduled: number }>
    filters: { cities: string[]; discount_types: string[] }
    error?: string
}

export default function CalendarPage() {
    const [filters, setFilters] = useState<FilterState>({
        accountManager: "",
        spendObjective: "",
        bonusType: "",
        providers: [],
        city: "",
    })

    // API call depends on city
    const url = `/api/calendar${filters.city ? `?city=${encodeURIComponent(filters.city)}` : ''}`
    const { data, loading, error } = useApi<CalendarResponse>(url)

    // Derived options
    const options = useMemo<FilterOptions>(() => {
        if (!data) return { managers: [], objectives: [], bonusTypes: [], providers: [], cities: [], dates: [] }

        // Grouped contains data filtered by CITY (if applied), but UNFILTERED by local filters
        // However, for filter dropdowns we ideally want ALL options available in the fetched dataset
        const allEntries = [
            ...(data.grouped?.live || []),
            ...(data.grouped?.finished || []),
            ...(data.grouped?.scheduled || [])
        ]

        return {
            managers: Array.from(new Set(allEntries.map(e => e.account_manager).filter(Boolean))).sort(),
            objectives: Array.from(new Set(allEntries.map(e => e.spend_objective).filter(Boolean))).sort(),
            bonusTypes: Array.from(new Set(allEntries.map(e => e.bonus_type).filter(Boolean))).sort(),
            providers: Array.from(new Set(allEntries.map(e => e.provider_name).filter(Boolean))).sort(),
            cities: data.filters?.cities || [], // API provides full list of cities
            dates: []
        }
    }, [data])

    // Chart data
    const chartData = useMemo(() => {
        if (!data?.time_series) return []
        return Object.keys(data.time_series).sort().map(date => ({
            date,
            live: data.time_series[date].live || 0,
            finished: data.time_series[date].finished || 0,
            scheduled: data.time_series[date].scheduled || 0
        }))
    }, [data?.time_series])

    // Local filtering
    const filteredGroups = useMemo(() => {
        if (!data?.grouped) return { live: [], finished: [], scheduled: [] }

        const filterFn = (e: CampaignEntry) => {
            // City is already handled by API, but no harm checking (it matches)
            if (filters.accountManager && e.account_manager !== filters.accountManager) return false
            if (filters.spendObjective && e.spend_objective !== filters.spendObjective) return false
            if (filters.bonusType && e.bonus_type !== filters.bonusType) return false
            if (filters.providers.length > 0 && !filters.providers.includes(e.provider_name)) return false
            return true
        }

        return {
            live: (data.grouped.live || []).filter(filterFn),
            finished: (data.grouped.finished || []).filter(filterFn),
            scheduled: (data.grouped.scheduled || []).filter(filterFn)
        }
    }, [data, filters])

    // Filtered stats for summary cards
    const filteredStats = useMemo(() => {
        return {
            live: filteredGroups.live.length,
            finished: filteredGroups.finished.length,
            scheduled: filteredGroups.scheduled.length
        }
    }, [filteredGroups])

    if (loading && !data) return (
        <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
            <div className="animate-pulse flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="h-4 w-4 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
        </div>
    )

    if (error || data?.error) return (
        <div className="flex items-center justify-center h-[50vh] text-destructive flex-col gap-2">
            <p className="font-semibold">Error loading data</p>
            <p className="text-sm text-muted-foreground">{error?.message || data?.error}</p>
        </div>
    )

    return (
        <div className="space-y-6 pb-20 animate-in fade-in duration-500">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Calendar</h1>
                <p className="text-muted-foreground">Campaign status overview — live, finished & scheduled</p>
            </div>

            <FilterBar
                filters={filters}
                options={options}
                onChange={setFilters}
            />

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Daily Progression</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        label="Live"
                        value={filteredStats.live}
                        previous={data?.prev_summary?.live || 0}
                        color="green"
                    />
                    <StatCard
                        label="Finished"
                        value={filteredStats.finished}
                        previous={data?.prev_summary?.finished || 0}
                        color="pink"
                    />
                    <StatCard
                        label="Scheduled"
                        value={filteredStats.scheduled}
                        previous={data?.prev_summary?.scheduled || 0}
                        color="cyan"
                    />
                </div>

                <div className="h-[350px] w-full border rounded-lg p-4 bg-card shadow-sm">
                    <CustomLineChart
                        data={chartData}
                        traces={[
                            { key: 'live', color: 'hsl(160 84% 39%)', label: 'Live' },
                            { key: 'finished', color: 'hsl(347 77% 50%)', label: 'Finished' },
                            { key: 'scheduled', color: 'hsl(189 94% 43%)', label: 'Scheduled' }
                        ]}
                        height={320}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Details</h2>

                <DetailGroup title="Live" count={filteredGroups.live.length} color="green">
                    <DataTable data={filteredGroups.live} emptyMessage="No live campaigns" />
                </DetailGroup>

                <DetailGroup title="Finished" count={filteredGroups.finished.length} color="pink">
                    <DataTable data={filteredGroups.finished} emptyMessage="No finished campaigns" />
                </DetailGroup>

                <DetailGroup title="Scheduled" count={filteredGroups.scheduled.length} color="cyan">
                    <DataTable data={filteredGroups.scheduled} emptyMessage="No scheduled campaigns" />
                </DetailGroup>
            </section>
        </div>
    )
}
