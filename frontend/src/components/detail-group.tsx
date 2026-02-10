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
    variant: 'start' | 'update' | 'end'
    children: React.ReactNode
    defaultOpen?: boolean
}

export function DetailGroup({ title, count, variant, children, defaultOpen = true }: DetailGroupProps) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen)

    const colorStyles = {
        start: "bg-[#10b981] shadow-[0_0_8px_rgba(16,185,129,0.4)]",
        update: "bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.4)]", // Indigo 500
        end: "bg-[#a3a3a3] shadow-[0_0_8px_rgba(163,163,163,0.4)]"
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
                        <div className={cn("w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-transparent transition-all group-hover:ring-offset-1", colorStyles[variant])} />
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
