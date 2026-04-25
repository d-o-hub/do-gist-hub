/**
 * Interaction timing utility.
 * Measures duration of user interactions and warns if budgets are exceeded.
 */

import { PERFORMANCE_BUDGETS } from './budgets';
import { safeWarn } from '../security/logger';

/**
 * Timer for measuring interaction performance.
 * Usage:
 *   const timer = new InteractionTimer('gist-list-render');
 *   renderGistList();
 *   timer.end();
 */
export class InteractionTimer {
  private startTime: number;
  private ended = false;

  constructor(
    private name: string,
    private customBudget?: number
  ) {
    this.startTime = performance.now();
    performance.mark(`${name}-start`);
  }

  /**
   * End the timer and check against budget.
   * Returns the measured duration in milliseconds.
   */
  end(overrideBudget?: number): number {
    if (this.ended) {
      safeWarn(`[InteractionTimer] Timer "${this.name}" already ended`);
      return 0;
    }

    this.ended = true;
    const duration = performance.now() - this.startTime;
    const budget = overrideBudget ?? this.customBudget ?? PERFORMANCE_BUDGETS.interactionTarget;

    performance.mark(`${this.name}-end`);
    performance.measure(this.name, `${this.name}-start`, `${this.name}-end`);

    if (duration > budget) {
      safeWarn(`[Perf Budget] "${this.name}" took ${duration.toFixed(0)}ms (budget: ${budget}ms)`);
    }

    return duration;
  }

  /**
   * Cancel the timer without reporting.
   */
  cancel(): void {
    this.ended = true;
  }
}

/**
 * Async helper to measure an async operation.
 * Usage:
 *   const duration = await measureAsync('fetch-gists', async () => {
 *     return await fetchGists();
 *   });
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>,
  budget?: number
): Promise<T> {
  const timer = new InteractionTimer(name, budget);
  try {
    const result = await fn();
    timer.end();
    return result;
  } catch (error) {
    timer.cancel();
    throw error;
  }
}
