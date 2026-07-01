/**
 * Pure helpers for building Render create-service payloads. Kept dependency-free
 * (no MCP SDK / inquirer imports) so they can be unit-tested in isolation.
 */

/** Recursively drop undefined values so we don't send empty keys to the API. */
export function pruneUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = pruneUndefined(v);
      if (Object.keys(nested).length > 0) out[k] = nested;
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/**
 * Render's create-service API models autoDeploy as the string enum "yes"/"no",
 * not a JSON boolean. Map through; leave undefined untouched so it's pruned.
 */
export function toAutoDeploy(value: boolean | undefined): 'yes' | 'no' | undefined {
  if (value === undefined) return undefined;
  return value ? 'yes' : 'no';
}

/**
 * Build the runtime-appropriate envSpecificDetails block. Docker services use
 * dockerCommand (not buildCommand/startCommand), so shape the payload per runtime.
 */
export function buildEnvSpecificDetails(runtime: string | undefined, buildCommand?: string, startCommand?: string) {
  if (runtime === 'docker') {
    // dockerfilePath/dockerContext default on Render's side when omitted.
    return pruneUndefined({ dockerCommand: startCommand });
  }
  return pruneUndefined({ buildCommand, startCommand });
}
