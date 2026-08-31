interface SciIncentiveParams {
  authorCount: number;
  authorPosition: number;
  impactFactor: number;
  journalQuartile: string | null;
  selfCitationCount: number;
}

export function calculateSciIncentive({
  authorCount,
  authorPosition,
  impactFactor,
  journalQuartile,
  selfCitationCount
}: SciIncentiveParams): { base: number; finalAmount: number; discounted: boolean } {
  let base = 5000; // default (authorPosition >= 5 or no higher tier matched)

  if (authorCount === 2 && impactFactor > 10 && journalQuartile === 'Q1') {
    base = 25000;
  } else if (authorCount === 3 && impactFactor > 8 && (journalQuartile === 'Q1' || journalQuartile === 'Q2')) {
    base = 15000;
  } else if (authorCount === 4 && impactFactor > 6 && (journalQuartile === 'Q1' || journalQuartile === 'Q2')) {
    base = 12000;
  } else if (authorPosition <= 4) {
    base = 10000;
  }

  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);

  return { base, finalAmount, discounted };
}

interface EsciScopusIncentiveParams {
  authorCount: number;
  authorPosition: number;
  journalQuartile: string | null;
  selfCitationCount: number;
}

export function calculateEsciScopusIncentive({
  authorCount,
  authorPosition,
  journalQuartile,
  selfCitationCount
}: EsciScopusIncentiveParams) {
  let base = 2500;
  if (authorCount === 2 && journalQuartile === 'Q1') base = 12000;
  else if (authorCount === 3 && (journalQuartile === 'Q1' || journalQuartile === 'Q2')) base = 8000;
  else if (authorCount === 4 && (journalQuartile === 'Q1' || journalQuartile === 'Q2')) base = 7000;
  else if (authorPosition <= 4) base = 5000;
  
  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

interface ConferenceIncentiveParams {
  authorCount: number;
  authorPosition: number;
  hIndex: number;
  selfCitationCount: number;
}

export function calculateConferenceIncentive({
  authorCount,
  authorPosition,
  hIndex,
  selfCitationCount
}: ConferenceIncentiveParams) {
  let base = 1500;
  if (authorCount === 2 && hIndex >= 30) base = 6000;
  else if (authorCount === 3 && hIndex >= 25) base = 5000;
  else if (authorCount === 4 && hIndex >= 20) base = 4000;
  else if (authorPosition <= 4) base = 3000;

  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

interface BookChapterIncentiveParams {
  authorCount: number;
  authorPosition: number;
  publisherTier: string | null;
  selfCitationCount: number;
}

export function calculateBookChapterIncentive({
  authorCount,
  authorPosition,
  publisherTier,
  selfCitationCount
}: BookChapterIncentiveParams) {
  let base = 500;
  const isTier1 = publisherTier === 'springer_elsevier_acm';
  
  if (authorCount === 2) base = isTier1 ? 5000 : 3000;
  else if (authorCount === 3) base = isTier1 ? 4000 : 2000;
  else if (authorCount === 4) base = isTier1 ? 3000 : 1500;
  else if (authorPosition <= 4) base = isTier1 ? 2000 : 1000;
  else base = isTier1 ? 1000 : 500;

  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

interface BookIncentiveParams {
  bookType: string | null;
  publisherTier: string | null;
  selfCitationCount: number;
}

export function calculateBookIncentive({
  bookType,
  publisherTier,
  selfCitationCount
}: BookIncentiveParams) {
  let base = 0;
  const isAuthored = bookType === 'authored';
  const isTier1 = publisherTier === 'springer_elsevier_acm';

  if (isAuthored) {
    base = isTier1 ? 15000 : 10000;
  } else {
    base = isTier1 ? 8000 : 5000;
  }

  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

interface PatentIncentiveParams {
  patentType: string | null;
  selfCitationCount: number;
}

export function calculatePatentIncentive({
  patentType,
  selfCitationCount
}: PatentIncentiveParams) {
  let base = 4000; // design default
  if (patentType === 'application') base = 4100;
  else if (patentType === 'grant') base = 8100;

  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

interface CitationsIncentiveParams {
  citationCount: number;
  selfCitationCount: number;
}

export function calculateCitationsIncentive({
  citationCount,
  selfCitationCount
}: CitationsIncentiveParams) {
  const base = Math.floor(citationCount / 10) * 2000;
  
  const discounted = selfCitationCount < 2;
  const finalAmount = Math.round(discounted ? base * 0.6 : base);
  return { base, finalAmount, discounted };
}

export function calculateIncentive(category: string, fields: any) {
  const selfCitationCount = Number(fields.selfCitationCount || 0);
  switch (category) {
    case 'sci_journal':
      return calculateSciIncentive({
        authorCount: Number(fields.authorCount || 0),
        authorPosition: Number(fields.authorPosition || 0),
        impactFactor: Number(fields.impactFactor || 0),
        journalQuartile: fields.journalQuartile || null,
        selfCitationCount
      });
    case 'esci_scopus_journal':
      return calculateEsciScopusIncentive({
        authorCount: Number(fields.authorCount || 0),
        authorPosition: Number(fields.authorPosition || 0),
        journalQuartile: fields.journalQuartile || null,
        selfCitationCount
      });
    case 'conference':
      return calculateConferenceIncentive({
        authorCount: Number(fields.authorCount || 0),
        authorPosition: Number(fields.authorPosition || 0),
        hIndex: Number(fields.hIndex || 0),
        selfCitationCount
      });
    case 'book_chapter':
      return calculateBookChapterIncentive({
        authorCount: Number(fields.authorCount || 0),
        authorPosition: Number(fields.authorPosition || 0),
        publisherTier: fields.publisherTier || null,
        selfCitationCount
      });
    case 'book':
      return calculateBookIncentive({
        bookType: fields.bookType || null,
        publisherTier: fields.publisherTier || null,
        selfCitationCount
      });
    case 'patent':
      return calculatePatentIncentive({
        patentType: fields.patentType || null,
        selfCitationCount
      });
    case 'citations':
      return calculateCitationsIncentive({
        citationCount: Number(fields.citationCount || 0),
        selfCitationCount
      });
    default:
      return { base: 0, finalAmount: 0, discounted: false };
  }
}
