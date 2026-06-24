/**
 * Intentionally empty function for fire-and-forget promises.
 * Use as: `promise.catch(noop)` when errors are expected and safe to ignore.
 */
export const noop = (): void => {
  // Intentionally empty — see JSDoc
};
