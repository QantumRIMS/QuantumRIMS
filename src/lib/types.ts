export interface Faculty {
  emp_id: string
  dept: string
  name: string
  designation: string
  type?: string
}

export interface FacultyProfile {
  emp_id: string
  name: string
  dept: string
  designation: string
  type?: string
  user_id: string
  is_registered: boolean
}

export interface Submission {
  id: string
  s_no: number
  authors: string
  title: string
  source_title: string
  volume: string
  issue: string
  year: number
  doi: string
  scopus_link: string
  doc_type_scopus: string
  doc_type: string
  doc_type_report: string
  department: string
  faculty_name: string
  isbn_no: string
  issn_no: string
  proof_full_paper_url: string
  proof_scopus_url: string
  proof_published_url: string
  submitted_by?: string
  status: 'pending' | 'approved' | 'rejected'
  rejection_remark?: string | null
  reviewed_at?: string | null
  created_at: string
  incentive_applications?: any[]
}

export type SubmissionInsert = Omit<Submission, 's_no' | 'created_at'>
