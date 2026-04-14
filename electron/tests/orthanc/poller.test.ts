import { describe, it, expect, vi } from 'vitest';
import { createPoller } from '../../src/orthanc/poller';
import type { PacsStudy } from '../../src/orthanc/types';

function study(uid: string): PacsStudy {
  return { studyInstanceUID: uid, patientName: `P-${uid}`, patientId: '', modality: 'PX', studyDate: '20240101', description: '' };
}

describe('orthanc-poller', () => {
  it('emits on first successful tick', async () => {
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies: async () => [study('A')], onChange, onError: () => {} });
    await poller.tick();
    expect(onChange).toHaveBeenCalledWith([study('A')]);
  });

  it('does not re-emit if list is unchanged', async () => {
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies: async () => [study('A')], onChange, onError: () => {} });
    await poller.tick();
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('emits when a new study appears', async () => {
    let studies: PacsStudy[] = [study('A')];
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies: async () => studies, onChange, onError: () => {} });
    await poller.tick();
    studies = [study('A'), study('B')];
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('emits when a study is removed', async () => {
    let studies: PacsStudy[] = [study('A'), study('B')];
    const onChange = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies: async () => studies, onChange, onError: () => {} });
    await poller.tick();
    studies = [study('A')];
    await poller.tick();
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('calls onError without invalidating cache on transient failure', async () => {
    let fail = false;
    const onChange = vi.fn();
    const onError = vi.fn();
    const poller = createPoller({ intervalMs: 10, listStudies: async () => { if (fail) throw new Error('net'); return [study('A')]; }, onChange, onError });
    await poller.tick();
    fail = true;
    await poller.tick();
    expect(onError).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
