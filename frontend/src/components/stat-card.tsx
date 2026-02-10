import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    label: string
    value: number
    previous: number
    color: 'violet' | 'sky' | 'amber'
}

export function StatCard({ label, value, previous, color }: StatCardProps) {
    const diff = value - previous
    const isPositive = diff > 0
    const isNegative = diff < 0

    const colorStyles = {
        violet: "text-violet-600 dark:text-violet-400",
        sky: "text-sky-600 dark:text-sky-400",
        amber: "text-amber-600 dark:text-amber-400"
    }

    const bgStyles = {
        violet: "bg-violet-500/10 border-violet-500/20",
        sky: "bg-sky-500/10 border-sky-500/20",
        amber: "bg-amber-500/10 border-amber-500/20",
    }

    return (
        <Card className={cn(bgStyles[color], "border shadow-sm")}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className={cn("text-4xl font-bold mb-1", colorStyles[color])}>
                    {value}
                </div>
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    {label}
                </div>

                <div className="flex items-center gap-1 text-xs font-medium">
                    {isPositive ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center">
                            <ArrowUp className="w-3 h-3 mr-0.5" />
                            +{diff}
                        </span>
                    ) : isNegative ? (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center">
                            <ArrowDown className="w-3 h-3 mr-0.5" />
                            {diff}
                        </span>
                    ) : (
                        <span className="text-muted-foreground flex items-center">
                            <Minus className="w-3 h-3 mr-0.5" />
                            0
                        </span>
                    )}
                    <span className="text-muted-foreground/70">vs prev day</span>
                </div>
            </CardContent>
        </Card>
    )
}
