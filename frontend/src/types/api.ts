export interface CampaignEntry {
    provider_id: string
    provider_name: string
    account_manager: string
    city: string
    campaign_id: string
    spend_objective: string
    discount_type?: string
    bonus_type: string
    bonus_percentage: number
    bonus_max_value: number
    min_basket_size: number
    campaign_start: string
    campaign_end: string
    campaign_hash: string
    // Changelog-only fields
    event_type?: string
    changed_fields?: string[]
    previous_values?: Record<string, any>
    banner_action?: string
    date?: string
    // Calendar-only
    status?: 'live' | 'finished' | 'scheduled'
    // Raw values used for coloring/class logic
    raw_bonus_percentage?: number
    raw_bonus_max_value?: number
}

export interface FilterState {
    accountManager: string
    spendObjective: string
    bonusType: string
    providers: string[]
    city: string
    date?: string | undefined
}

export interface FilterOptions {
    managers: string[]
    objectives: string[]
    bonusTypes: string[]
    providers: string[]
    cities: string[]
    dates?: string[]
}
