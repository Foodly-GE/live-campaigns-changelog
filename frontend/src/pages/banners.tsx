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

function SimpleStat({ label, value, color }: { label: string, value: number, color: 'green' | 'cyan' | 'pink' }) {
    const colorStyles = {
        green: "text-emerald-600 dark:text-emerald-400",
        cyan: "text-cyan-600 dark:text-cyan-400",
        pink: "text-rose-600 dark:text-rose-400"
    }
    const bgStyles = {
        green: "bg-emerald-500/10 border-emerald-500/20",
        cyan: "bg-cyan-500/10 border-cyan-500/20",
        pink: "bg-rose-500/10 border-rose-500/20",
    }

    return (
        <Card className={cn(bgStyles[color], "border shadow-sm")}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className={cn("text-4xl font-bold mb-1", colorStyles[color])}>
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
        return {
            start: filteredGroups.start.length,
            update: filteredGroups.update.length,
            end: filteredGroups.end.length
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
                <h2 className="text-xl font-semibold tracking-tight">Summary</h2>
                <div className="grid gap-4 md:grid-cols-3">
                    <SimpleStat
                        label="Banner Start"
                        value={filteredStats.start}
                        color="green"
                    />
                    <SimpleStat
                        label="Banner Update"
                        value={filteredStats.update}
                        color="cyan"
                    />
                    <SimpleStat
                        label="Banner End"
                        value={filteredStats.end}
                        color="pink"
                    />
                </div>
            </section>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold tracking-tight">Details</h2>

                <DetailGroup title="Banner Start" count={filteredGroups.start.length} color="green">
                    <DataTable data={filteredGroups.start} emptyMessage="No banner start actions" />
                </DetailGroup>

                <DetailGroup title="Banner Update" count={filteredGroups.update.length} color="cyan">
                    <DataTable data={filteredGroups.update} emptyMessage="No banner update actions" />
                </DetailGroup>

                <DetailGroup title="Banner End" count={filteredGroups.end.length} color="pink">
                    <DataTable data={filteredGroups.end} emptyMessage="No banner end actions" />
                </DetailGroup>
            </section>
        </div>
    )
}
