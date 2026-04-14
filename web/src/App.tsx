import { Layout } from './components/Layout/Layout';
import { ModeProvider } from './context/ModeContext';
import { StudyProvider } from './context/StudyContext';
import { MetadataPanelProvider } from './context/MetadataPanelContext';

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
