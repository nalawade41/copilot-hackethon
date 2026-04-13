import type { ReactNode } from 'react';
import type { RenderMode } from '../../../types';

export interface SidebarItem {
  mode: RenderMode;
  label: string;
  sublabel: string;
  icon: ReactNode;
}

export interface SidebarProps {
  mode: RenderMode;
  onChange: (mode: RenderMode) => void;
}
