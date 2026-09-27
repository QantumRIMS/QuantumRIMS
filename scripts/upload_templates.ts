import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      fetch: fetch,
    },
    auth: {
      persistSession: false,
    },
    realtime: {
      transport: ws as any
    }
  }
)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const TEMPLATES = [
  // Seed Fund Templates
  {
    path: 'public/templates/25. CFRD_SM _RR_02- Seed Money Release Request Form Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'release_request',
    doc_label: 'Seed Money Release Request Form',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/26. CFRD_SM _DR_03- Seed Fund Deliverable Report Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'deliverable_report',
    doc_label: 'Seed Fund Deliverable Report',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/27. CFRD_SM _ARR_04- Additional Seed Money Release Request Form Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'additional_release_request',
    doc_label: 'Additional Seed Money Release Request Form',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/28. CFRD_SM _PC_05- Project Completion Report Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'project_completion_report',
    doc_label: 'Project Completion Report',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/29. CFRD_SM _CD_06- Certificate of Declaration Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'certificate_of_declaration',
    doc_label: 'Certificate of Declaration',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/30. CFRD_SM _UC_07 Seed Fund - Utilization Certificate Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'utilization_certificate',
    doc_label: 'Utilization Certificate',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/31. CFRD_SM _CC _08- Closer Checklist Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'closer_checklist',
    doc_label: 'Closer Checklist',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/32. CFRD_SM _FC _09- SEED FUND INCOMPLETE PROJECT CLOSURE FORM Ver 2.0.docx',
    module: 'seed_fund',
    doc_key: 'incomplete_closure_form',
    doc_label: 'Incomplete Project Closure Form',
    version_label: 'Ver 2.0',
  },
  {
    path: 'public/templates/33. Seed Fund Closure Form.docx',
    module: 'seed_fund',
    doc_key: 'closure_form',
    doc_label: 'Closure Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/CFRD_IRSF_01 - RESEARCH INITIAL REQUEST SCREENING FORM.docx',
    module: 'seed_fund',
    doc_key: 'initial_screening_form',
    doc_label: 'Initial Request Screening Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/seed-fund-proposal-template.pdf',
    module: 'seed_fund',
    doc_key: 'proposal_form',
    doc_label: 'Seed Fund Proposal Template',
    version_label: 'PDF Version',
  },

  {
    path: 'public/templates/PPT Template for presentation - Seed money funded project 2025-2026.pptx',
    module: 'seed_fund',
    doc_key: 'ppt_template',
    doc_label: 'PPT Template for Presentation',
    version_label: 'Ver 1.0',
  },
  // Consultancy Templates
  {
    path: 'public/templates/consultancy/CFRD_CON_PF_01 - CONSULTANCY PROPOSAL FORM.docx',
    module: 'consultancy',
    doc_key: 'proposal_form',
    doc_label: 'Proposal Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_MOU_02 - MEMORANDUM OF UNDERSTANDING FOR CONSULTANCY SERVICES.docx',
    module: 'consultancy',
    doc_key: 'mou',
    doc_label: 'Memorandum of Understanding',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_WM_03 - CONSULTANCY WORK MONITORING FORM.docx',
    module: 'consultancy',
    doc_key: 'work_monitoring',
    doc_label: 'Work Monitoring Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_PR_04 - CONSULTANCY PAYMENT RECEIPT FORM.docx',
    module: 'consultancy',
    doc_key: 'payment_receipt',
    doc_label: 'Payment Receipt Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_WE_05 - CONSULTANCY WORK EXPENSE REPORT.docx',
    module: 'consultancy',
    doc_key: 'work_expense',
    doc_label: 'Work Expense Report',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_ED_06 - CONSULTANCY EXPENDITURE DOCUMENTATION CHECKLIST.docx',
    module: 'consultancy',
    doc_key: 'expenditure_documentation',
    doc_label: 'Expenditure Documentation Checklist',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_AS_07 - CONSULTANCY AUDIT STATEMENT.docx',
    module: 'consultancy',
    doc_key: 'audit_statement',
    doc_label: 'Audit Statement',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_ACF_08 - CONSULTANCY AGREEMENT CLOSURE FORM.docx',
    module: 'consultancy',
    doc_key: 'agreement_closure',
    doc_label: 'Agreement Closure Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_RS_09 - CONSULTANCY REVENUE SHARING FORM.docx',
    module: 'consultancy',
    doc_key: 'revenue_sharing',
    doc_label: 'Revenue Sharing Form',
    version_label: 'Ver 1.0',
  },
  {
    path: 'public/templates/consultancy/CFRD_CON_RS_10 - CONSULTANCY Closer Checklist Ver 2.0.docx',
    module: 'consultancy',
    doc_key: 'closer_checklist',
    doc_label: 'Closer Checklist',
    version_label: 'Ver 2.0',
  },

  // Project Grants
  {
    path: 'public/templates/project-grants/CFRD_RP_PS_01 - RESEARCH PROJECT PROPOSAL SUBMISSION FORM.docx',
    module: 'project_grants',
    doc_key: 'proposal_submission_form',
    doc_label: 'Project Proposal Submission Form',
    version_label: 'Ver 1.0',
  },
]

async function uploadToCloudinary(filePath: string) {
  return new Promise<string>((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      {
        resource_type: 'raw',
        folder: 'carf/templates',
      },
      (error, result) => {
        if (error || !result) reject(error)
        else resolve(result.secure_url)
      }
    )
  })
}

async function run() {
  console.log('Starting template migration...')

  for (const template of TEMPLATES) {
    if (!fs.existsSync(template.path)) {
      console.log(`Skipping missing file: ${template.path}`)
      continue
    }

    try {
      console.log(`Uploading ${template.path}...`)
      const file_url = await uploadToCloudinary(template.path)
      console.log(`Uploaded to: ${file_url}`)

      const { data, error } = await supabase.from('document_templates').insert({
        module: template.module,
        doc_key: template.doc_key,
        doc_label: template.doc_label,
        version_label: template.version_label,
        file_url: file_url,
        is_current: true,
      })

      if (error) {
        console.error(`Database insert error for ${template.doc_key}:`, error)
      } else {
        console.log(`Successfully migrated ${template.doc_key}`)
      }
    } catch (e) {
      console.error(`Failed to process ${template.path}:`, e)
    }
  }

  console.log('Migration completed.')
}

run()
