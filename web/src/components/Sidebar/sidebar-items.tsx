import type { SidebarItem } from './types';

const ALL_ITEMS: SidebarItem[] = [
  {
    mode: 'about',
    label: 'How it works',
    sublabel: 'Overview & architecture',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
  },
  {
    mode: 'client',
    label: 'Browser only',
    sublabel: 'Client-side rendering',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M8 20h8M12 18v2" />
      </svg>
    ),
  },
  {
    mode: 'server',
    label: 'Server based',
    sublabel: '.NET + fo-dicom',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="6" rx="1" />
        <rect x="3" y="14" width="18" height="6" rx="1" />
        <path d="M7 7h.01M7 17h.01" />
      </svg>
    ),
  },
  {
    mode: 'pacs',
    label: 'PACS',
    sublabel: 'Orthanc via DICOMweb',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M4 14a4 4 0 0 0 4 4h8a4 4 0 0 0 0-8 5 5 0 0 0-9.9-1A4 4 0 0 0 4 14z" />
      </svg>
    ),
  },
];

/** PACS item appears only in Electron. All other items always visible. */
export function getSidebarItems(): SidebarItem[] {
  const hasPacs = typeof window !== 'undefined' && !!window.pacs;
  return hasPacs ? ALL_ITEMS : ALL_ITEMS.filter((i) => i.mode !== 'pacs');
}
