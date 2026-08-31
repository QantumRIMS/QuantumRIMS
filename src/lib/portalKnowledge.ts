export const PORTAL_KNOWLEDGE = `
# How the CARF Research Portal Works

## 1. Paper Submissions
Faculty can submit their published research papers.
- **Required Details:** Authors, Title, Source Title (Journal/Conference name), Volume, Issue, Year, DOI (unique), Scopus Link, Category (Scopus, SCI, Web of Science, etc.), Department, ISBN/ISSN.
- **Required Documents:** 
  1. Full Paper Proof (scanned/PDF)
  2. Scopus Indexing Proof
  3. Published Proof
- **Approval Flow:** Submissions are marked 'pending'. An Admin reviews and can either 'approve' or 'reject' them. If rejected, faculty can see the rejection remark.

## 2. Incentive Applications
Faculty can claim financial incentives for published research.
- **Prerequisite:** You MUST first submit your paper in "Paper Submissions" and wait for an Admin to 'approve' it. You cannot claim an incentive on pending or rejected papers, nor on someone else's paper.
- **Categories:** SCI Journal, ESCI/Scopus Journal, Conference, Book Chapter, Book, Patent, Citations.
- **Required Details:** Author count, Author position, Impact factor, Journal quartile (Q1-Q4), Self-citation count.
- **Approval Flow:** Goes to 'pending'. Admin reviews the claim against the linked approved paper, calculates the final incentive amount, and sets status to 'approved' or 'rejected'. If rejected, it can be updated and resubmitted by the faculty.

## 3. Seed Fund Applications
A funding process for internal research projects (CFRD/IRSF/01).
- **Required Details:** Title, Funding Agency, Announcement details, PI Name/Designation, Co-investigators, Amount Requested, Objectives, Expected Utilization, Proposed Location, Duration, Expected Outcomes, Collaborating Industry.
- **Required Documents:** A scanned, signed copy of the final Seed Fund proposal document.
- **Approval Flow:** Submitted as 'pending'. Admin reviews. If rejected, the faculty can update and re-upload the document.

## 4. Project Grant Applications
For external research grants.
- **Required Details:** Research Project Title, Funding Agency, Announcement details, Submission deadline, Co-investigators, Collaborating Industry, Project duration (months), Total proposed budget, External reviewer feedback, Expected outcomes (papers, patents, infrastructure), Additional resources.
- **Required Documents:** Signed/scanned copy of the Proposal Form.
- **Approval Flow:** Submitted as 'pending', reviewed by Admin (approved/rejected).

## 5. Consultancy Applications
For industry consultancy projects.
- **Required Details:** Project Title, PI Email/Mobile, Client Name/City/State/Pincode, Contact Person Name/Designation/Email/Phone, Objectives, Nature of Work, Scope/Expected Outcomes, Deliverables, Project timeline, Consultancy Fee, Payment terms (advance/installments/after completion).
- **Required Documents:** 
  - Proposal Form
  - MOU
  - Work Monitoring Document
  - Payment Receipt
  - Work Expense Report
  - Expenditure Documentation Checklist
  - Audit Statement
  - Agreement Closure
  - Revenue Sharing Document
  - Closer Checklist
- **Approval Flow:** Submitted as 'pending', reviewed by Admin (approved/rejected).

## 6. Profile Edit Requests
Faculty can request changes to their master profile.
- **Usage:** Typically used to request an update to Name, Designation, Department, or Type (e.g., notifying the admin that you have completed your PhD).
- **Approval Flow:** Submitted as 'pending'. Admin reviews and approves it, which then updates the central master_faculty record.
`
