import { promises as fs } from 'fs';
import { basename, isAbsolute, resolve, sep } from 'path';

/**
 * Membrane workspace policy (P0-A1).
 *
 * Opt-in root containment for filesystem tools. When neither
 * HELA_ALLOWED_ROOTS nor ALLOWED_ROOTS is set, the server keeps its
 * historical full-access behavior (solo-operator default) and logs that
 * fact once at startup. When roots are configured, every path argument of
 * every mutating or reading tool must resolve inside one of them —
 * symlink-aware via realpath, so `..` and symlink escapes are denied.
 */

export class PolicyDeniedError extends Error {
  constructor(path: string) {
    super(`path '${path}' escapes configured workspace roots`);
    this.name = 'PolicyDeniedError';
  }
}

export interface WorkspacePolicy {
  enforced: boolean;
  roots: string[];
}

let loggedProfile = false;

export function loadWorkspacePolicy(): WorkspacePolicy {
  const raw = (process.env['HELA_ALLOWED_ROOTS'] || process.env['ALLOWED_ROOTS'] || '').trim();
  if (!raw) {
    if (!loggedProfile) {
      loggedProfile = true;
      console.error('[membrane-policy] no workspace roots configured — full-access profile (by design)');
    }
    return { enforced: false, roots: [] };
  }
  const roots = raw.split(':').map(r => r.trim()).filter(r => r.length > 0).map(r => resolve(r));
  if (!loggedProfile) {
    loggedProfile = true;
    console.error(`[membrane-policy] enforcing workspace roots: ${roots.join(', ')}`);
  }
  return { enforced: true, roots };
}

/** Resolve a path to its canonical location, tolerating non-existent tails. */
async function canonical(target: string): Promise<string> {
  const abs = isAbsolute(target) ? target : resolve(target);
  try {
    return await fs.realpath(abs);
  } catch {
    // Walk up to the nearest existing ancestor, resolve it, re-append the rest.
    const missing: string[] = [];
    let cursor = abs;
    for (;;) {
      try {
        return resolve(await fs.realpath(cursor), ...missing);
      } catch {
        const parent = resolve(cursor, '..');
        if (parent === cursor) return resolve(cursor, ...missing);
        missing.unshift(basename(cursor));
        cursor = parent;
      }
    }
  }
}

function insideRoot(canon: string, root: string): boolean {
  return canon === root || canon.startsWith(root.endsWith(sep) ? root : root + sep);
}

export async function assertContained(policy: WorkspacePolicy, target: string): Promise<string> {
  const canon = await canonical(target);
  if (!policy.enforced) return canon;
  for (const root of policy.roots) {
    const canonRoot = await canonical(root);
    if (insideRoot(canon, canonRoot)) return canon;
  }
  throw new PolicyDeniedError(target);
}

/** Capability risk metadata per tool (P0-A6 contract, Membrane facet). */
export type MembraneRisk = 'read' | 'write' | 'destructive';
export const TOOL_RISK: Record<string, { risk: MembraneRisk; idempotent: boolean }> = {
  read_file: { risk: 'read', idempotent: true },
  get_file_info: { risk: 'read', idempotent: true },
  list_directory: { risk: 'read', idempotent: true },
  find_files: { risk: 'read', idempotent: true },
  search_in_files: { risk: 'read', idempotent: true },
  compare_files: { risk: 'read', idempotent: true },
  get_directory_size: { risk: 'read', idempotent: true },
  watch_file: { risk: 'read', idempotent: true },
  stop_watching: { risk: 'read', idempotent: true },
  write_file: { risk: 'write', idempotent: false },
  copy_file: { risk: 'write', idempotent: false },
  move_file: { risk: 'write', idempotent: false },
  create_directory: { risk: 'write', idempotent: false },
  archive_files: { risk: 'write', idempotent: false },
  extract_archive: { risk: 'write', idempotent: false },
  delete_file: { risk: 'destructive', idempotent: false },
};

/** Path-bearing argument keys per tool. */
const TOOL_PATH_KEYS: Record<string, string[]> = {
  read_file: ['path'],
  write_file: ['path'],
  copy_file: ['source', 'destination'],
  move_file: ['source', 'destination'],
  delete_file: ['path'],
  get_file_info: ['path'],
  create_directory: ['path'],
  list_directory: ['path'],
  find_files: ['directory'],
  search_in_files: ['directory'],
  watch_file: ['path'],
  stop_watching: ['path'],
  compare_files: ['file1', 'file2'],
  archive_files: ['files', 'archivePath'],
  extract_archive: ['archivePath', 'destination'],
  get_directory_size: ['path'],
};

function pathsOf(tool: string, args: Record<string, unknown>): string[] {
  const keys = TOOL_PATH_KEYS[tool];
  if (!keys) return [];
  const out: string[] = [];
  for (const key of keys) {
    const value: unknown = args[key];
    if (typeof value === 'string' && value.length > 0) out.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) if (typeof item === 'string' && item.length > 0) out.push(item);
    }
  }
  return out;
}

/**
 * Enforce the workspace policy for one tool call. No-op when the policy is
 * not enforced (full-access profile). Throws PolicyDeniedError on escape.
 */
export async function policyCheck(policy: WorkspacePolicy, tool: string, args: Record<string, unknown>): Promise<void> {
  if (!policy.enforced) return;
  for (const target of pathsOf(tool, args)) {
    await assertContained(policy, target);
  }
}
