import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
    label: string
    value: number
    previous: number
    variant: 'start' | 'update' | 'end'
}

export function StatCard({ label, value, previous, variant }: StatCardProps) {
    const diff = value - previous
    const isPositive = diff > 0
    const isNegative = diff < 0

    const colorStyles = {
        start: "text-[#10b981] dark:text-[#10b981]",
        update: "text-[#4f46e5] dark:text-[#818cf8]", // Indigo 600 / 400
        end: "text-[#737373] dark:text-[#a3a3a3]"
    }

    const bgStyles = {
        start: "bg-[#10b981]/10 border-[#10b981]/20",
        update: "bg-[#6366f1]/10 border-[#6366f1]/20", // Indigo 500
        end: "bg-[#a3a3a3]/10 border-[#a3a3a3]/20",
    }

    return (
        <Card className={cn(bgStyles[variant], "border shadow-sm")}>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className={cn("text-4xl font-bold mb-1", colorStyles[variant])}>
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
