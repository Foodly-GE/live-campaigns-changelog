import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { MultiSelect, type Option } from "@/components/multi-select"

export interface FilterState {
    accountManager: string
    spendObjective: string
    bonusType: string
    providers: string[]
    city: string
    // Optional date for banners
    date?: string
}

export interface FilterOptions {
    managers: string[]
    objectives: string[]
    bonusTypes: string[]
    providers: string[]
    cities: string[]
    dates?: string[]
}

interface FilterBarProps {
    filters: FilterState
    options: FilterOptions
    onChange: (filters: FilterState) => void
    showDate?: boolean
}

export function FilterBar({ filters, options, onChange, showDate }: FilterBarProps) {
    const update = (key: keyof FilterState, value: any) => {
        onChange({ ...filters, [key]: value === "all" ? "" : value })
    }

    // Convert string arrays to Option objects for MultiSelect
    const providerOptions: Option[] = options.providers.map(p => ({ label: p, value: p }))

    return (
        <div className="flex flex-wrap gap-4 p-4 bg-muted/20 rounded-lg border">
            <div className="flex flex-col gap-1.5 w-[200px]">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Account Manager</label>
                <Select value={filters.accountManager || "all"} onValueChange={(v) => update("accountManager", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All managers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All managers</SelectItem>
                        {options.managers.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-1.5 w-[200px]">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Spend Objective</label>
                <Select value={filters.spendObjective || "all"} onValueChange={(v) => update("spendObjective", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All objectives" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All objectives</SelectItem>
                        {options.objectives.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-1.5 w-[200px]">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Bonus Type</label>
                <Select value={filters.bonusType || "all"} onValueChange={(v) => update("bonusType", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {options.bonusTypes.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[250px] flex-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Provider Name</label>
                <MultiSelect
                    options={providerOptions}
                    selected={filters.providers}
                    onChange={(sel) => update("providers", sel)}
                    placeholder="All providers"
                    className="bg-background"
                />
            </div>

            <div className="flex flex-col gap-1.5 w-[180px]">
                <label className="text-xs font-semibold uppercase text-muted-foreground">City</label>
                <Select value={filters.city || "all"} onValueChange={(v) => update("city", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All cities</SelectItem>
                        {options.cities.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {showDate && options.dates && (
                <div className="flex flex-col gap-1.5 w-[180px]">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
                    <Select value={filters.date || options.dates[0] || ""} onValueChange={(v) => update("date", v)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Latest" />
                        </SelectTrigger>
                        <SelectContent>
                            {options.dates.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>
    )
}
