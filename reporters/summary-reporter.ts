import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';

/**
 * Custom reporter: prints a compact summary (outcome counts per project and the slowest tests)
 * and, on GitHub Actions, writes the same summary to the job's summary page.
 */
export default class SummaryReporter implements Reporter {
  private results: Array<{ test: TestCase; result: TestResult }> = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({ test, result });
  }

  onEnd(result: FullResult) {
    // Keep only the final attempt of each test (retries produce several results).
    const final = new Map<string, { test: TestCase; result: TestResult }>();
    for (const r of this.results) final.set(r.test.id, r);
    const rows = [...final.values()];

    const byProject = new Map<string, Record<string, number>>();
    for (const { test } of rows) {
      const project = test.parent.project()?.name ?? 'default';
      const counts = byProject.get(project) ?? {};
      const outcome = test.outcome(); // expected | unexpected | flaky | skipped
      counts[outcome] = (counts[outcome] ?? 0) + 1;
      byProject.set(project, counts);
    }

    const slowest = rows
      .filter(({ result }) => result.status !== 'skipped')
      .sort((a, b) => b.result.duration - a.result.duration)
      .slice(0, 5);

    const lines = [
      `## Test summary: ${result.status.toUpperCase()} in ${(result.duration / 1000).toFixed(1)}s`,
      '',
      '| Project | Passed | Failed | Flaky | Skipped |',
      '|---|---|---|---|---|',
      ...[...byProject].map(([p, c]) => `| ${p} | ${c.expected ?? 0} | ${c.unexpected ?? 0} | ${c.flaky ?? 0} | ${c.skipped ?? 0} |`),
      '',
      '**Slowest tests**',
      ...slowest.map(({ test, result }) => `- ${test.titlePath().slice(2).join(' › ')} (${result.duration}ms)`),
    ];

    console.log(`\n${lines.join('\n')}\n`);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
  }

  printsToStdio() {
    return false; // let the built-in list/dot reporter keep handling live output
  }
}
