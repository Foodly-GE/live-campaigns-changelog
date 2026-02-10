import * as React from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface DetailGroupProps {
    title: string
    count: number
    color: 'green' | 'cyan' | 'pink'
    children: React.ReactNode
    defaultOpen?: boolean
}

export function DetailGroup({ title, count, color, children, defaultOpen = true }: DetailGroupProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    const colorStyles = {
        green: "bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
        cyan: "bg-cyan-600 dark:bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]",
        pink: "bg-rose-600 dark:bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
    }

    return (
        <Collapsible
            open={isOpen}
            onOpenChange={setIsOpen}
            className="border rounded-lg bg-card shadow-sm mb-4 overflow-hidden"
        >
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors select-none group">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all group-hover:ring-offset-1", colorStyles[color])} />
                        <h3 className="font-semibold text-base tracking-tight">{title}</h3>
                        <Badge variant="secondary" className="font-mono text-xs ml-2">
                            {count}
                        </Badge>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform" /> : <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform" />}
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="p-0 border-t">
                    {children}
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
