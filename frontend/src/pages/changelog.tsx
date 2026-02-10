import { useState, useMemo } from "react"
import { useApi } from "@/hooks/use-api"
import { FilterBar, type FilterState, type FilterOptions } from "@/components/filter-bar"
import { StatCard } from "@/components/stat-card"
import { CustomLineChart } from "@/components/line-chart"
import { DetailGroup } from "@/components/detail-group"
import { DataTable } from "@/components/data-table"
import type { CampaignEntry } from "@/types/api"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChangelogResponse {
    summary: {
        latest_date: string
        stats: { 'campaign-start': number; 'campaign-update': number; 'campaign-end': number }
        prev_stats: { 'campaign-start': number; 'campaign-update': number; 'campaign-end': number }
    }
    time_series: Record<string, { 'campaign-start': number; 'campaign-update': number; 'campaign-end': number }>
    grouped: {
        'campaign-start': CampaignEntry[]
        'campaign-update': CampaignEntry[]
        'campaign-end': CampaignEntry[]
    }
    dates: string[]
    detail_date: string
}

export default function ChangelogPage() {
    const [selectedDate, setSelectedDate] = useState<string>("")
    const [filters, setFilters] = useState<FilterState>({
        accountManager: "",
        spendObjective: "",
        bonusType: "",
        providers: [],
        city: "",
    })

    // Basic API call
    const url = `/api/changelog${selectedDate ? `?date=${selectedDate}` : ''}`
    const { data, loading, error } = useApi<ChangelogResponse>(url)

    // Derived options for filters from current data
    const options = useMemo<FilterOptions>(() => {
        if (!data) return { managers: [], objectives: [], bonusTypes: [], providers: [], cities: [], dates: [] }

        // Check if grouping keys exist, data might be structured differently if empty
        const allEntries = [
            ...(data.grouped?.['campaign-start'] || []),
            ...(data.grouped?.['campaign-update'] || []),
            ...(data.grouped?.['campaign-end'] || [])
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

    // Chart data - apply filters
    const chartData = useMemo(() => {
        if (!data?.time_series) return []
        return Object.keys(data.time_series).sort().map(date => ({
            date,
            start: data.time_series[date]['campaign-start'] || 0,
            update: data.time_series[date]['campaign-update'] || 0,
            end: data.time_series[date]['campaign-end'] || 0
        }))
    }, [data?.time_series])

    // Filtered stats for summary cards
    const filteredStats = useMemo(() => {
        if (!data?.grouped) return { start: 0, update: 0, end: 0 }
        
        const filterFn = (e: CampaignEntry) => {
            if (filters.accountManager && e.account_manager !== filters.accountManager) return false
            if (filters.spendObjective && e.spend_objective !== filters.spendObjective) return false
            if (filters.bonusType && e.bonus_type !== filters.bonusType) return false
            if (filters.city && e.city !== filters.city) return false
            if (filters.providers.length > 0 && !filters.providers.includes(e.provider_name)) return false
            return true
        }
        
        return {
            start: (data.grouped['campaign-start'] || []).filter(filterFn).length,
            update: (data.grouped['campaign-update'] || []).filter(filterFn).length,
            end: (data.grouped['campaign-end'] || []).filter(filterFn).length
        }
    }, [data?.grouped, filters])

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
            start: (data.grouped['campaign-start'] || []).filter(filterFn),
            update: (data.grouped['campaign-update'] || []).filter(filterFn),
            end: (data.grouped['campaign-end'] || []).filter(filterFn)
        }
    }, [data, filters])


    // Loading/Error states
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
                <h1 className="text-3xl font-bold tracking-tight">Changelog</h1>
                <p className="text-muted-foreground">Showing activity for the last 2 weeks</p>
            </div>

            <FilterBar
                filters={filters}
                options={options}
                onChange={setFilters}
            />

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Progression</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                        label="Campaign Start"
                        value={filteredStats.start}
                        previous={data?.summary?.prev_stats?.['campaign-start'] || 0}
                        color="green"
                    />
                    <StatCard
                        label="Campaign Update"
                        value={filteredStats.update}
                        previous={data?.summary?.prev_stats?.['campaign-update'] || 0}
                        color="cyan"
                    />
                    <StatCard
                        label="Campaign End"
                        value={filteredStats.end}
                        previous={data?.summary?.prev_stats?.['campaign-end'] || 0}
                        color="pink"
                    />
                </div>

                <div className="h-[350px] w-full border rounded-lg p-4 bg-card shadow-sm">
                    <CustomLineChart
                        data={chartData}
                        traces={[
                            { key: 'start', color: 'hsl(160 84% 39%)', label: 'Start' },
                            { key: 'update', color: 'hsl(189 94% 43%)', label: 'Update' },
                            { key: 'end', color: 'hsl(347 77% 50%)', label: 'End' }
                        ]}
                        height={320}
                    />
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Details</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Showing results from:</span>
                        <Select
                            value={selectedDate || data?.detail_date || ""}
                            onValueChange={setSelectedDate}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder={data?.detail_date || "Select date"} />
                            </SelectTrigger>
                            <SelectContent>
                                {data?.dates?.map(date => (
                                    <SelectItem key={date} value={date}>{date}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DetailGroup title="Campaign Start" count={filteredGroups.start.length} color="green">
                    <DataTable data={filteredGroups.start} emptyMessage="No campaigns started" />
                </DetailGroup>

                <DetailGroup title="Campaign Update" count={filteredGroups.update.length} color="cyan">
                    <DataTable data={filteredGroups.update} emptyMessage="No campaigns updated" />
                </DetailGroup>

                <DetailGroup title="Campaign End" count={filteredGroups.end.length} color="pink">
                    <DataTable data={filteredGroups.end} emptyMessage="No campaigns ended" />
                </DetailGroup>
            </section>
        </div>
    )
}
