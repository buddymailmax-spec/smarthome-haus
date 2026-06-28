import { createClient } from '@supabase/supabase-js'

// Cloud sync for the house layout (rooms + devices). Configure via .env:
//   VITE_SUPABASE_URL=...
//   VITE_SUPABASE_ANON_KEY=...
// Until configured, the app runs fully on the local sample house.

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anon ? createClient(url, anon) : null
export const cloudEnabled = !!supabase
