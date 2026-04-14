import type { SidebarItem } from './types';

const DOWNLOAD_ITEM: SidebarItem = {
  mode: 'download',
  label: 'Desktop App',
  sublabel: 'Download for Mac / Windows',
  icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

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

/**
 * Returns sidebar items for the current runtime:
 * - PACS: only in Electron (window.pacs exists)
 * - Desktop App (download): only in browser (no window.pacs — users already HAVE the app in Electron)
 */
export function getSidebarItems(): SidebarItem[] {
  const isElectron = typeof window !== 'undefined' && !!window.pacs;
  if (isElectron) {
    // Electron: show PACS, hide download
    return ALL_ITEMS;
  }
  // Browser: hide PACS, show download
  return [...ALL_ITEMS.filter((i) => i.mode !== 'pacs'), DOWNLOAD_ITEM];
}
