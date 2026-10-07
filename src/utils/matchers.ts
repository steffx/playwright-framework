import { expect as baseExpect } from '@playwright/test';

// Custom matchers: domain-specific assertions with readable failure messages.
export const expect = baseExpect.extend({
  toBeSorted(received: Array<string | number>, { descending = false }: { descending?: boolean } = {}) {
    const sorted = [...received].sort((a, b) =>
      typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b)),
    );
    if (descending) sorted.reverse();
    const pass = JSON.stringify(received) === JSON.stringify(sorted);
    return {
      pass,
      name: 'toBeSorted',
      message: () =>
        `expected ${JSON.stringify(received)} ${pass ? 'not ' : ''}to be sorted ${descending ? 'descending' : 'ascending'}` +
        (pass ? '' : `\nexpected order: ${JSON.stringify(sorted)}`),
    };
  },

  toBeMoney(received: number) {
    const cents = received * 100;
    const pass = Number.isFinite(received) && received >= 0 && Math.abs(cents - Math.round(cents)) < 1e-6;
    return { pass, name: 'toBeMoney', message: () => `expected ${received} ${pass ? 'not ' : ''}to be a non-negative amount with at most 2 decimals` };
  },
});
