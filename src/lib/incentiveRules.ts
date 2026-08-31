export interface IncentiveRule {
  label: string;
  amount?: number;
  tier1Amount?: number;
  tier2Amount?: number;
}

export const incentiveRules: Record<string, any> = {
  sci_journal: [
    { label: '2 authors, IF > 10, Q1', amount: 25000 },
    { label: '3 authors, IF > 8, Q1/Q2', amount: 15000 },
    { label: '4 authors, IF > 6, Q1/Q2', amount: 12000 },
    { label: 'Up to 4th author (any position)', amount: 10000 },
    { label: '5th author onwards', amount: 5000 },
  ],
  esci_scopus_journal: [
    { label: '2 authors, Q1', amount: 12000 },
    { label: '3 authors, Q1/Q2', amount: 8000 },
    { label: '4 authors, Q1/Q2', amount: 7000 },
    { label: 'Up to 4th author (any position)', amount: 5000 },
    { label: '5th author onwards', amount: 2500 },
  ],
  conference: [
    { label: '2 authors, H-Index ≥ 30', amount: 6000 },
    { label: '3 authors, H-Index ≥ 25', amount: 5000 },
    { label: '4 authors, H-Index ≥ 20', amount: 4000 },
    { label: 'Up to 4th author (any position)', amount: 3000 },
    { label: '5th author onwards', amount: 1500 },
  ],
  book_chapter: [
    { label: '2 authors', tier1Amount: 5000, tier2Amount: 3000 },
    { label: '3 authors', tier1Amount: 4000, tier2Amount: 2000 },
    { label: '4 authors', tier1Amount: 3000, tier2Amount: 1500 },
    { label: 'Up to 4th author (any position)', tier1Amount: 2000, tier2Amount: 1000 },
    { label: '5th author onwards', tier1Amount: 1000, tier2Amount: 500 },
  ],
  book: [
    { label: 'Authored (Springer/Elsevier/ACM)', amount: 15000 },
    { label: 'Authored (Wiley/IGI/Other)', amount: 10000 },
    { label: 'Edited (Springer/Elsevier/ACM)', amount: 8000 },
    { label: 'Edited (Wiley/IGI/Other)', amount: 5000 },
  ],
  patent: [
    { label: 'Grant', amount: 8100 },
    { label: 'Application', amount: 4100 },
    { label: 'Design', amount: 4000 },
  ],
  citations: '₹2,000 for every 10 Scopus/WoS citations'
};
