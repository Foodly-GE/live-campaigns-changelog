import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeProvider } from "@/components/theme-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import ChangelogPage from "@/pages/changelog"
import CalendarPage from "@/pages/calendar"
import BannersPage from "@/pages/banners"

export default function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="campaign-tracker-theme">
      <BrowserRouter>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <h1 className="font-semibold flex-1">Campaign Tracker</h1>
              <ThemeToggle />
            </header>
            <div className="flex-1 overflow-y-auto p-4 pt-6">
              <Routes>
                <Route path="/" element={<Navigate to="/changelog" replace />} />
                <Route path="/changelog" element={<ChangelogPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/banners" element={<BannersPage />} />
              </Routes>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
