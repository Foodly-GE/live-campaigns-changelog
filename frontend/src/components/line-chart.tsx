import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts"

interface ChartProps {
    data: any[]
    traces: {
        key: string
        color: string
        label: string
    }[]
    height?: number
}

export function CustomLineChart({ data, traces, height = 300 }: ChartProps) {
    if (!data || data.length === 0) {
        return <div className="h-[300px] flex items-center justify-center text-muted-foreground border rounded-lg bg-muted/5">No data available</div>
    }

    return (
        <div style={{ width: '100%', height }} className="w-full">
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.1} vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        }}
                        dy={10}
                    />
                    <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                        dx={-10}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))", borderRadius: "var(--radius)" }}
                        itemStyle={{ color: "hsl(var(--foreground))" }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString()}
                        cursor={{ stroke: "hsl(var(--muted-foreground))", strokeOpacity: 0.2 }}
                    />
                    {traces.map((trace) => (
                        <Line
                            key={trace.key}
                            type="monotone"
                            dataKey={trace.key}
                            stroke={trace.color}
                            strokeWidth={2}
                            dot={{ r: 3, fill: trace.color, strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 0 }}
                            isAnimationActive={true}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
