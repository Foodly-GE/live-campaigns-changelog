import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { CampaignEntry } from "@/types/api"
import { cn } from "@/lib/utils"

interface DataTableProps {
    data: CampaignEntry[]
    emptyMessage?: string
}

// Color palette for categorical field chips - deterministic based on value
const chipColors = [
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
    "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
]

// Hash function for consistent color assignment
function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash = hash & hash
    }
    return Math.abs(hash)
}

function getChipColor(value: string, fieldType: 'objective' | 'bonus' | 'city' | 'manager'): string {
    if (!value) return "bg-muted text-muted-foreground"
    // Use field type + value for unique but consistent coloring
    const hash = hashString(`${fieldType}:${value}`)
    return chipColors[hash % chipColors.length]
}

function ExpandableCell({ children, className }: { children: React.ReactNode, className?: string }) {
    const [expanded, setExpanded] = useState(false)
    const isText = typeof children === 'string' || typeof children === 'number'

    return (
        <div
            className={cn(
                "max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap cursor-default",
                expanded && "whitespace-normal overflow-visible max-w-none break-words",
                className
            )}
            onDoubleClick={() => setExpanded(!expanded)}
            title={isText && !expanded ? String(children) : undefined}
        >
            {children}
        </div>
    )
}

function formatDate(dateStr: string) {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        return d.toLocaleDateString()
    } catch (e) {
        return dateStr
    }
}


function getBannerBadge(action: string | undefined) {
    if (!action) return <span className="text-muted-foreground/30">—</span>

    let className = "whitespace-nowrap text-xs font-medium border-0 "

    if (action.includes('start')) className += "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
    else if (action.includes('end')) className += "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
    else if (action.includes('update')) className += "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300"
    else className += "bg-muted text-muted-foreground"

    return <Badge variant="outline" className={className}>{action}</Badge>
}

function formatDiff(changedFields: string[] | undefined, previousValues: Record<string, any> | undefined, row: CampaignEntry) {
    if (!changedFields || changedFields.length === 0) return null

    return (
        <div className="space-y-1 text-xs">
            {changedFields.map((field) => {
                const prev = previousValues ? previousValues[field] : undefined
                // @ts-ignore - dynamic access
                const curr = row[field]
                return (
                    <div key={field} className="flex flex-col">
                        <span className="font-semibold text-muted-foreground text-[10px]">{field}:</span>
                        <div className="flex items-center gap-1">
                            <span className="line-through text-rose-600/70 dark:text-rose-400/70 text-[10px] truncate max-w-[60px]" title={String(prev)}>{String(prev ?? '-')}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium text-[10px] truncate max-w-[60px]" title={String(curr)}>{String(curr ?? '-')}</span>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}


export function DataTable({ data, emptyMessage = "No data available" }: DataTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-md border p-8 text-center text-muted-foreground bg-muted/5 border-dashed">
                {emptyMessage}
            </div>
        )
    }

    return (
        <div className="rounded-md border overflow-hidden bg-card shadow-sm">
            <div className="overflow-auto w-full">
                <Table className="relative w-full caption-bottom text-sm">
                    <TableHeader className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm shadow-sm">
                        <TableRow>
                            <TableHead className="min-w-[80px] bg-muted/50">Provider ID</TableHead>
                            <TableHead className="min-w-[140px] bg-muted/50">Provider Name</TableHead>
                            <TableHead className="min-w-[120px] bg-muted/50">Account Manager</TableHead>
                            <TableHead className="min-w-[100px] bg-muted/50">City</TableHead>
                            <TableHead className="min-w-[120px] bg-muted/50">Spend Objective</TableHead>
                            <TableHead className="min-w-[120px] bg-muted/50">Bonus Type</TableHead>
                            <TableHead className="min-w-[80px] bg-muted/50">Bonus %</TableHead>
                            <TableHead className="min-w-[100px] bg-muted/50 whitespace-nowrap">Start</TableHead>
                            <TableHead className="min-w-[100px] bg-muted/50 whitespace-nowrap">End</TableHead>
                            <TableHead className="min-w-[80px] bg-muted/50 whitespace-nowrap">Max Val</TableHead>
                            <TableHead className="min-w-[80px] bg-muted/50 whitespace-nowrap">Min Basket</TableHead>
                            <TableHead className="min-w-[120px] bg-muted/50">Campaign ID</TableHead>
                            <TableHead className="min-w-[180px] bg-muted/50">Changes</TableHead>
                            <TableHead className="min-w-[100px] bg-muted/50">Hash ID</TableHead>
                            <TableHead className="min-w-[120px] bg-muted/50">Banner Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, i) => (
                            <TableRow key={i} className="group hover:bg-muted/30 transition-colors">
                                <TableCell><ExpandableCell className="font-mono text-xs">{row.provider_id}</ExpandableCell></TableCell>
                                <TableCell><ExpandableCell className="font-medium">{row.provider_name}</ExpandableCell></TableCell>
                                <TableCell><ExpandableCell>{row.account_manager}</ExpandableCell></TableCell>
                                <TableCell><ExpandableCell>{row.city}</ExpandableCell></TableCell>
                                <TableCell>
                                    {row.spend_objective ? (
                                        <Badge variant="outline" className={cn("text-xs font-medium border-0", getChipColor(row.spend_objective, 'objective'))}>
                                            {row.spend_objective}
                                        </Badge>
                                    ) : <span className="text-muted-foreground/30">—</span>}
                                </TableCell>
                                <TableCell>
                                    {row.bonus_type ? (
                                        <Badge variant="outline" className={cn("text-xs font-medium border-0", getChipColor(row.bonus_type, 'bonus'))}>
                                            {row.bonus_type}
                                        </Badge>
                                    ) : <span className="text-muted-foreground/30">—</span>}
                                </TableCell>
                                <TableCell className="text-right font-mono">{row.bonus_percentage ? `${row.bonus_percentage}%` : '-'}</TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.campaign_start)}</TableCell>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(row.campaign_end)}</TableCell>
                                <TableCell className="text-right font-mono">{row.bonus_max_value || '-'}</TableCell>
                                <TableCell className="text-right font-mono">{row.min_basket_size || '-'}</TableCell>
                                <TableCell><ExpandableCell className="font-mono text-[10px] text-muted-foreground">{row.campaign_id}</ExpandableCell></TableCell>
                                <TableCell>
                                    {row.changed_fields && row.changed_fields.length > 0 ? (
                                        formatDiff(row.changed_fields, row.previous_values, row)
                                    ) : (
                                        <span className="text-muted-foreground/30">—</span>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <ExpandableCell className="font-mono text-[10px] text-muted-foreground/60 max-w-[80px]">
                                        {row.campaign_hash}
                                    </ExpandableCell>
                                </TableCell>
                                <TableCell>{getBannerBadge(row.banner_action)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
