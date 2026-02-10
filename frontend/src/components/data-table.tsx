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

    let variant: "default" | "secondary" | "destructive" | "outline" = "outline"

    if (action.includes('start')) variant = "default"
    else if (action.includes('end')) variant = "destructive"
    else if (action.includes('update')) variant = "secondary"

    return <Badge variant={variant} className="whitespace-nowrap">{action}</Badge>
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
                            <span className="line-through text-red-500/70 text-[10px] truncate max-w-[60px]" title={String(prev)}>{String(prev ?? '-')}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-green-600 font-medium text-[10px] truncate max-w-[60px]" title={String(curr)}>{String(curr ?? '-')}</span>
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
                                null
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
