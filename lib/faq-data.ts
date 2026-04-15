export interface FaqCategory {
  id: string;
  label: string;
  href: string;
}

export const faqCategories: FaqCategory[] = [
  { id: 'about-tpt', label: 'About TPT', href: '#about-tpt' },
  { id: 'general-technical', label: 'General Technical FAQ', href: '#general-technical' },
  { id: 'my-account', label: 'My Account', href: '#my-account' },
  { id: 'membership-levels', label: 'Membership Levels', href: '#membership-levels' },
  { id: 'seller-questions', label: 'Seller Questions', href: '#seller-questions' },
  { id: 'buyer-questions', label: 'Buyer Questions', href: '#buyer-questions' },
  { id: 'community-guidelines', label: 'Community Guidelines', href: '#community-guidelines' },
  { id: 'copyright', label: 'Copyright & Trademark', href: '#copyright' },
  { id: 'school-accounts', label: 'School Accounts', href: '#school-accounts' },
  { id: 'refund-policy', label: 'Refund Policy', href: '#refund-policy' },
  { id: 'classfund', label: 'TPT ClassFund', href: '#classfund' },
  { id: 'easel', label: 'Easel by TPT', href: '#easel' },
  { id: 'school-express', label: 'TPT School Express', href: '#school-express' },
];
