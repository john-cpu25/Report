import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fabuhzarlzstcsaerfut.supabase.co'
const SUPABASE_KEY = 'sb_publishable_gmnEl52U7VAkWW_3lZLTFw_hJ9BgLLm' // using the anon key I saw earlier

async function listCoords() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/NMK_User?select=full_name,offset_xy,location&order=level`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  })
  const data = await res.json()
  
  const vnData = data.filter(u => u.location?.toUpperCase() === 'VIETNAM' && u.full_name)
  
  console.log('| User | X | Y |')
  console.log('|---|---|---|')
  vnData.forEach(user => {
    let x = 0, y = 0
    if (user.offset_xy) {
      try {
        const parsed = typeof user.offset_xy === 'string' ? JSON.parse(user.offset_xy) : user.offset_xy
        x = parsed.x || 0
        y = parsed.y || 0
      } catch(e) {}
    }
    console.log(`| ${user.full_name} | ${x} | ${y} |`)
  })
}

listCoords()
