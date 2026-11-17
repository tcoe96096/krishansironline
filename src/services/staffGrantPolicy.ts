export type DelegatedRole = 'result_manager' | 'academic_admin' | 'content_manager' | 'teacher' | 'viewer';

/** Client contract mirrors (but never replaces) PostgreSQL role/capability CHECK constraints. */
export const delegationCapabilities: Record<DelegatedRole, readonly string[]> = {
  result_manager: ['results.read','results.export','results.correction.request','results.release.propose'],
  academic_admin: ['results.read','tests.manage','results.correction.request','materials.read','materials.draft.write','materials.review.propose'],
  content_manager: ['materials.read','materials.draft.write','materials.review.propose'],
  teacher: ['results.read','results.correction.request','materials.read','materials.draft.write','materials.review.propose'],
  viewer: ['results.read','materials.read']
};

export function grantIsWithinRole(role: DelegatedRole, requested: string[], materialBackendReady: boolean): boolean {
  if (!materialBackendReady && role === 'content_manager') return false;
  return requested.length > 0
    && new Set(requested).size === requested.length
    && requested.every((capability) =>
      delegationCapabilities[role].includes(capability) &&
      (materialBackendReady || !capability.startsWith('materials.'))
    );
}
