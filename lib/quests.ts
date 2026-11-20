export type QuestScope = 'local' | 'global'
export type QuestCurrency = 'USD' | 'SOL'
export type QuestCredential =
  | 'aegis_holder'
  | 'water_treatment'
  | 'medical_professional'
  | 'licensed_engineer'
  | 'field_technician'

export interface Quest {
  id: string
  created_at: string
  title: string
  description: string
  location_label: string
  latitude: number
  longitude: number
  scope: QuestScope
  radius_km: number | null
  credential_minimum: QuestCredential
  reward_amount: number | string
  reward_currency: QuestCurrency
  status: 'pending_payment' | 'open' | 'in_progress' | 'completed' | 'cancelled'
  is_author?: boolean
  funding_status?: 'checkout_pending' | 'funded' | 'paid' | null
}

export interface QuestPoint {
  latitude: number
  longitude: number
}

export interface QuestPayload {
  title: string
  description: string
  locationLabel: string
  latitude: number
  longitude: number
  scope: QuestScope
  radiusKm: number | null
  credentialMinimum: QuestCredential
  rewardAmount: number
  rewardCurrency: 'USD'
}

export const CREDENTIAL_LABELS: Record<QuestCredential, string> = {
  aegis_holder: 'Any Aegis holder',
  water_treatment: 'Water treatment operator',
  medical_professional: 'Medical professional',
  licensed_engineer: 'Licensed engineer',
  field_technician: 'Field technician',
}
