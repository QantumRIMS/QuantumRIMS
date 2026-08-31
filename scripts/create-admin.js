const path = require('path')
const fs = require('fs')

const envPath = path.join(__dirname, '..', '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const [key, ...rest] = trimmed.split('=')
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '')
    }
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  const response = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({
      email: 'admin@college.edu',
      password: 'SecurePassword123!',
      email_confirm: true
    })
  })

  if (!response.ok) {
    const text = await response.text()
    if (text.includes('already registered')) {
        console.log('✅ Admin user already exists.')
    } else {
        console.error('❌ Error creating user:', text)
    }
  } else {
    console.log('✅ Admin user created successfully: admin@college.edu')
  }
}
main()
