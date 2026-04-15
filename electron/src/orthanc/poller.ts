import type { PacsStudy } from './types';

export interface PollerConfig {
  intervalMs: number;
  listStudies: () => Promise<PacsStudy[]>;
  onChange: (studies: PacsStudy[]) => void;
  onError: (err: unknown) => void;
}

export interface Poller {
  start(): void;
  stop(): void;
  tick(): Promise<void>;
}

/**
 * Polls `listStudies` on an interval. Emits `onChange` only when the set
 * of study UIDs differs from the previous successful response. Transient
 * errors call `onError` without clearing the cached list.
 */
export function createPoller(cfg: PollerConfig): Poller {
  let timer: ReturnType<typeof setInterval> | null = null;
  let last: string | null = null;

  async function tick() {
    try {
      const studies = await cfg.listStudies();
      const sig = studies.map((s) => s.studyInstanceUID).sort().join('|');
      if (sig !== last) {
        last = sig;
        cfg.onChange(studies);
      }
    } catch (err) {
      // Reset the cached signature so the next successful poll is guaranteed
      // to fire onChange, even if the returned list happens to match the
      // last-seen one. Without this, the UI (which clears on error) would
      // stay empty on recovery if nothing on the PACS actually changed.
      last = null;
      cfg.onError(err);
    }
  }

  return {
    start() {
      if (timer) return;
      void tick();
      timer = setInterval(tick, cfg.intervalMs);
    },
    stop() {
      if (timer) { clearInterval(timer); timer = null; }
    },
    tick,
  };
}
