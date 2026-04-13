import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetadataPanel } from '../../src/components/MetadataPanel/MetadataPanel.tsx';

describe('MetadataPanel', () => {
  it('renders provided fields', () => {
    render(
      <MetadataPanel
        metadata={{
          modality: 'PX',
          bodyPart: 'Jaw region',
          manufacturer: 'Instrumentarium Dental',
          studyDate: '20160330',
        }}
      />,
    );
    expect(screen.getByText('PX')).toBeInTheDocument();
    expect(screen.getByText('Jaw region')).toBeInTheDocument();
    expect(screen.getByText('Instrumentarium Dental')).toBeInTheDocument();
    // study date formatted YYYY-MM-DD
    expect(screen.getByText('2016-03-30')).toBeInTheDocument();
  });

  it('renders placeholder dash for missing fields', () => {
    render(<MetadataPanel metadata={{ modality: 'MR' }} />);
    expect(screen.getByText('MR')).toBeInTheDocument();
    // Body Part field should render with a dash for missing value
    const cells = screen.getAllByText('—');
    expect(cells.length).toBeGreaterThan(0);
  });
});
