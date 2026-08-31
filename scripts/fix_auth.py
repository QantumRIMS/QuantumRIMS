import os
import re

files = [
    "src/app/api/submissions/route.ts",
    "src/app/api/submissions/[id]/route.ts",
    "src/app/api/incentive/apply/route.ts",
    "src/app/api/seed-fund/apply/route.ts",
    "src/app/api/seed-fund/[id]/route.ts",
    "src/app/api/seed-fund/generate-screening-form/route.ts",
    "src/app/api/seed-fund/generate-requisition-form/route.ts"
]

for fpath in files:
    if not os.path.exists(fpath):
        print(f"Not found: {fpath}")
        continue
        
    with open(fpath, 'r') as f:
        content = f.read()
        
    # Add import if missing
    if "verifyToken" not in content:
        if "from '@/lib/supabase'" in content:
            content = content.replace("from '@/lib/supabase'", "from '@/lib/supabase'\nimport { verifyToken } from '@/lib/verifyAuth'")
        else:
            content = "import { verifyToken } from '@/lib/verifyAuth'\n" + content
            
    # Submissions route variant
    patt1 = r"  const userClient = createClient\([\s\S]*?await userClient\.auth\.getUser\(\)\n  if \(authError \|\| !user\) \{\n    return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n  \}"
    if re.search(patt1, content):
        content = re.sub(patt1, "  const authResult = await verifyToken(token)\n  if (!authResult) {\n    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  }\n  const user = { id: authResult.userId }", content)

    # admin.auth.getUser variant
    patt2 = r"  const \{ data: \{ user \}, error: authError \} = await admin\.auth\.getUser\(token\)\n  if \(authError \|\| !user\) \{\n    return NextResponse\.json\(\{ error: 'Unauthorized' \}, \{ status: 401 \}\)\n  \}"
    if re.search(patt2, content):
        content = re.sub(patt2, "  const authResult = await verifyToken(token)\n  if (!authResult) {\n    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })\n  }\n  const user = { id: authResult.userId }", content)

    # Remove createClient if no longer used
    if "createClient" in content and "userClient" not in content and "createAdminClient" in content:
         content = re.sub(r"import \{ createClient \} from '@supabase/supabase-js'\n", "", content)
         
    with open(fpath, 'w') as f:
        f.write(content)
        
    print(f"Processed {fpath}")
