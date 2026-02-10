import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react'

interface MasterState {
  last_processed: string | null
  last_current_file?: string
  last_current_modified?: string
  last_previous_file?: string
  last_previous_modified?: string
}

interface SyncResponse {
  success: boolean
  files_in_drive?: number
  current_file?: string
  current_modified?: string
  previous_file?: string
  previous_modified?: string
  entries_created?: number
  date?: string
  error?: string
}

export default function AdminPage() {
  const [state, setState] = useState<MasterState | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null)

  const fetchState = async () => {
    try {
      const response = await fetch('/api/admin/state')
      const data = await response.json()
      setState(data)
    } catch (error) {
      console.error('Failed to fetch state:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchState()
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    
    try {
      const response = await fetch('/api/sync', { method: 'POST' })
      const data = await response.json()
      setSyncResult(data)
      
      if (data.success) {
        // Refresh state after successful sync
        await fetchState()
      }
    } catch (error) {
      setSyncResult({
        success: false,
        error: 'Failed to trigger sync'
      })
    } finally {
      setSyncing(false)
    }
  }

  const getNextScheduledRun = () => {
    // Cloud Scheduler runs daily at 9:00 AM UTC
    const now = new Date()
    const next = new Date()
    next.setUTCHours(9, 0, 0, 0)
    
    // If we've passed 9 AM today, schedule for tomorrow
    if (now.getTime() > next.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1)
    }
    
    return next
  }

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never'
    const date = new Date(dateStr)
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return null
    
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  const nextRun = getNextScheduledRun()
  const timeUntilNext = nextRun.getTime() - new Date().getTime()
  const hoursUntilNext = Math.floor(timeUntilNext / 3600000)
  const minsUntilNext = Math.floor((timeUntilNext % 3600000) / 60000)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Status</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage the snapshot processing pipeline
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Last Processed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Last Processed
            </CardTitle>
            <CardDescription>Most recent snapshot comparison</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">
                {formatDateTime(state?.last_processed)}
              </div>
              {state?.last_processed && (
                <div className="text-sm text-muted-foreground mt-1">
                  {getTimeAgo(state.last_processed)}
                </div>
              )}
            </div>
            
            {state?.last_current_modified && (
              <>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current snapshot:</span>
                    <div className="font-medium">{formatDateTime(state.last_current_modified)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Previous snapshot:</span>
                    <div className="font-medium">{formatDateTime(state.last_previous_modified)}</div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Next Scheduled Run */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Next Scheduled Run
            </CardTitle>
            <CardDescription>Automated daily processing via Cloud Scheduler</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-2xl font-bold">
                {formatDateTime(nextRun.toISOString())}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                In {hoursUntilNext}h {minsUntilNext}m
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline">campaign-changelog-sync</Badge>
              </div>
              <div className="text-muted-foreground">
                Runs daily at 9:00 AM UTC
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Manual Processing</CardTitle>
          <CardDescription>
            Trigger snapshot processing manually. This will compare the 2 most recent files from Google Drive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            className="w-full sm:w-auto"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Process Snapshots Now
              </>
            )}
          </Button>

          {syncResult && (
            <div className={`p-4 rounded-lg border ${
              syncResult.success 
                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {syncResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <div className="font-medium">
                    {syncResult.success ? 'Processing Complete' : 'Processing Failed'}
                  </div>
                  
                  {syncResult.success && (
                    <div className="text-sm space-y-1">
                      <div>Created <strong>{syncResult.entries_created}</strong> changelog entries</div>
                      <div className="text-muted-foreground">
                        Compared {syncResult.files_in_drive} files from Google Drive
                      </div>
                      {syncResult.current_modified && (
                        <div className="text-xs text-muted-foreground mt-2">
                          {formatDateTime(syncResult.current_modified)} vs {formatDateTime(syncResult.previous_modified)}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {syncResult.error && (
                    <div className="text-sm text-red-600 dark:text-red-400">
                      {syncResult.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Data Flow</CardTitle>
          <CardDescription>How snapshot processing works</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                1
              </div>
              <div>
                <div className="font-medium">Download from Google Drive</div>
                <div className="text-muted-foreground">
                  Fetch all CSV files from the configured Drive folder
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                2
              </div>
              <div>
                <div className="font-medium">Validate & Sort by Ingestion Time</div>
                <div className="text-muted-foreground">
                  Extract "Last Ingested Ts Time" from each CSV and sort by most recent ingestion (not file modification time)
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                3
              </div>
              <div>
                <div className="font-medium">Compare Top 2 Snapshots</div>
                <div className="text-muted-foreground">
                  Detect campaign starts, ends, and updates by comparing campaign hashes between the 2 most recently ingested files
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                4
              </div>
              <div>
                <div className="font-medium">Generate Changelog</div>
                <div className="text-muted-foreground">
                  Create entries for each detected change with banner action recommendations
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                5
              </div>
              <div>
                <div className="font-medium">Persist to GCS</div>
                <div className="text-muted-foreground">
                  Save changelog entries, latest snapshot CSV (for Calendar page), and master state. Keep only 10 most recent snapshots.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
