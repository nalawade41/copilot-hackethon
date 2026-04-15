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

// Three PACS items (Electron-only): one per protocol path.
// All read studies from the same Orthanc — the difference is the protocol
// each represents in the demo narrative. Studies are tagged in their
// description by the vendor simulator so users can see which arrived how.
const PACS_ITEMS: SidebarItem[] = [
  {
    mode: 'dicomweb-poll',
    label: 'DICOMweb (Poll)',
    sublabel: 'QIDO-RS / WADO-RS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 12a9 9 0 1 1-3-6.7" />
        <polyline points="21 4 21 10 15 10" />
      </svg>
    ),
  },
  {
    mode: 'dimse-push',
    label: 'DIMSE C-STORE',
    sublabel: 'Classic TCP push',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    ),
  },
  {
    mode: 'stowrs-push',
    label: 'STOW-RS',
    sublabel: 'Modern HTTP push',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
];

const BASE_ITEMS: SidebarItem[] = [
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
];

/**
 * Sidebar items for the current runtime:
 * - PACS protocol items: only in Electron (window.pacs exists)
 * - Desktop App (download): only in browser
 */
export function getSidebarItems(): SidebarItem[] {
  const isElectron = typeof window !== 'undefined' && !!window.pacs;
  if (isElectron) {
    return [...BASE_ITEMS, ...PACS_ITEMS];
  }
  return [...BASE_ITEMS, DOWNLOAD_ITEM];
}
