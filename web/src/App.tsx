import { Layout } from './components/Layout/Layout';
import { ModeProvider } from './context/ModeContext';
import { StudyProvider } from './context/StudyContext';
import { MetadataPanelProvider } from './context/MetadataPanelContext';

/**
 * Root composition — only providers + layout. All behavior lives in
 * context, pages, and hooks. Runtime init (Cornerstone) happens once in
 * main.tsx before this component mounts.
 */
export default function App() {
  return (
    <ModeProvider>
      <StudyProvider>
        <MetadataPanelProvider>
          <Layout />
        </MetadataPanelProvider>
      </StudyProvider>
    </ModeProvider>
  );
}
