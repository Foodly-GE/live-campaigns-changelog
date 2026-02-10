import { useState, useMemo } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CampaignEntry } from "@/types/api"
import { cn } from "@/lib/utils"
import { Copy, Check } from "lucide-react"

interface DataTableProps {
    data: CampaignEntry[]
    emptyMessage?: string
}


function getChipColor(value: string, fieldType: 'objective' | 'bonus' | 'city' | 'manager'): string {
    if (!value) return "bg-muted text-muted-foreground"

    switch (fieldType) {
        case 'objective':
            // Use Indigo/Blue for objectives
            return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
        case 'bonus':
            // Keep Violet for bonus types
            return "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300 border-violet-200 dark:border-violet-800"
        default:
            return "bg-slate-100 text-slate-100 dark:bg-slate-800 dark:text-slate-300"
    }
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

    if (action.includes('start')) className += "bg-[#10b981]/15 text-[#047857] dark:bg-[#10b981]/25 dark:text-[#a7f3d0]"
    else if (action.includes('end')) className += "bg-[#a3a3a3]/15 text-[#525252] dark:bg-[#a3a3a3]/25 dark:text-[#e5e5e5]"
    else if (action.includes('update')) className += "bg-[#e0e7ff] text-[#4338ca] dark:bg-[#312e81]/50 dark:text-[#c7d2fe]" // Indigo 100/700 and 900/200
    else className += "bg-muted text-muted-foreground"

    return <Badge variant="outline" className={className}>{action}</Badge>
}

function ChangesCell({ changedFields, previousValues, row }: { changedFields: string[] | undefined, previousValues: Record<string, any> | undefined, row: CampaignEntry }) {
    const [copied, setCopied] = useState(false)

    if (!changedFields || changedFields.length === 0) {
        return <span className="text-muted-foreground/30">—</span>
    }

    const copyToClipboard = () => {
        const text = changedFields.map((field) => {
            const prev = previousValues ? previousValues[field] : undefined
            // @ts-ignore - dynamic access
            const curr = row[field]
            return `${field}: ${prev ?? '-'} → ${curr ?? '-'}`
        }).join('\n')

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        })
    }

    return (
        <div className="flex items-start gap-2">
            <div className="space-y-1 text-xs flex-1">
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
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={copyToClipboard}
                title="Copy changes"
            >
                {copied ? (
                    <Check className="h-3 w-3 text-emerald-600" />
                ) : (
                    <Copy className="h-3 w-3" />
                )}
            </Button>
        </div>
    )
}


export function DataTable({ data, emptyMessage = "No data available" }: DataTableProps) {
    const sortedData = useMemo(() => {
        if (!data) return []
        return [...data].sort((a, b) => {
            // 1. provider_name ascending
            const nameA = a.provider_name || ""
            const nameB = b.provider_name || ""
            const nameCompare = nameA.localeCompare(nameB)
            if (nameCompare !== 0) return nameCompare

            // 2. bonus % descending
            const bonusA = a.bonus_percentage || 0
            const bonusB = b.bonus_percentage || 0
            if (bonusB !== bonusA) return bonusB - bonusA

            // 3. campaign end ascending
            const endA = a.campaign_end || ""
            const endB = b.campaign_end || ""
            return endA.localeCompare(endB)
        })
    }, [data])

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
                        {sortedData.map((row, i) => (
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
                                    <ChangesCell
                                        changedFields={row.changed_fields}
                                        previousValues={row.previous_values}
                                        row={row}
                                    />
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
