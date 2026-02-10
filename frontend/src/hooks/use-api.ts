import { useState, useEffect } from "react"

export function useApi<T>(url: string) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        // Basic AbortController to cancel previous requests
        const controller = new AbortController()
        const signal = controller.signal

        setLoading(true)
        fetch(url, { signal })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
                return res.json()
            })
            .then(data => {
                if (!signal.aborted) {
                    setData(data)
                    setError(null)
                }
            })
            .catch(err => {
                if (!signal.aborted) {
                    setError(err)
                }
            })
            .finally(() => {
                if (!signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [url])

    return { data, loading, error }
}
