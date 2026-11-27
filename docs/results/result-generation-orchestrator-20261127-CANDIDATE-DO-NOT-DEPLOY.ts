// REVIEW ONLY: private worker composition. No HTTP listener, secrets, or live deployment.
import {createHash} from 'node:crypto';
import {renderPrivateResultDraft} from './result-generation-private-renderer-20261127-CANDIDATE-DO-NOT-DEPLOY.ts';
type Snapshot=Parameters<typeof renderPrivateResultDraft>[0]&{studentId:string};
type Design=Parameters<typeof renderPrivateResultDraft>[1];
type Draft=Awaited<ReturnType<typeof renderPrivateResultDraft>>;
type Request={attemptId:string;expectedVersion:number;requestKey:string};
type Approval={state:'approved';version:number;sha256:string};
type PrivateBackend={
  // Implement only with server-verified bearer identity, never browser actor claims.
  verifySuperAdmin(bearer:string):Promise<string>;
  getSnapshot(actorId:string,attemptId:string):Promise<Snapshot>;
  getPublishedDesign():Promise<Design>;
  // Immutable create: conflict must never overwrite existing bytes.
  putPrivatePdf(key:string,bytes:Uint8Array):Promise<void>;
  readPrivatePdf(key:string,maxBytes:number):Promise<Uint8Array>;
  approve(input:{actorId:string;attemptId:string;expectedVersion:number;requestKey:string;sha256:string;expectedSnapshot:Snapshot}):Promise<'approved'>;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');

/** Generate and approve a server-produced artifact, only after explicit admin action.
 * The renderer is isolated and the backend never accepts client-supplied scores,
 * template JSON, PDF bytes, recipient ID or object paths. Publication is separate.
 * An uncertain outcome requires status reconciliation, not automatic regeneration.
 */
export async function generateAndApprovePrivateResult(
  backend:PrivateBackend,bearer:string,request:Request,
  renderer:(snapshot:Snapshot,design:Design)=>Promise<Draft>
):Promise<Approval>{
  if(!uuid.test(request.attemptId)||!uuid.test(request.requestKey)||
    !Number.isSafeInteger(request.expectedVersion)||request.expectedVersion<1||
    !bearer)throw new Error('Invalid generation request');
  const attemptId=request.attemptId.toLowerCase();
  const actorId=await backend.verifySuperAdmin(bearer);
  if(!uuid.test(actorId))throw new Error('Authorization unavailable');
  const snapshot=await backend.getSnapshot(actorId,attemptId);
  const design=await backend.getPublishedDesign();
  if(snapshot.attemptId!==attemptId||!uuid.test(snapshot.studentId))throw new Error('Snapshot identity mismatch');
  const artifact=await renderer(snapshot,design);
  if(artifact.attemptId!==attemptId||artifact.templateVersion!==design.version||
    artifact.bytes.length<8||artifact.bytes.length>10485760||
    artifact.bytes.subarray(0,5).toString('ascii')!=='%PDF-'||
    hash(artifact.bytes)!==artifact.sha256)throw new Error('Invalid generated artifact');
  const key=attemptId+'/v'+request.expectedVersion+'/'+artifact.sha256+'.pdf';
  if(await backend.verifySuperAdmin(bearer)!==actorId)throw new Error('Authorization changed');
  const currentDesign=await backend.getPublishedDesign();
  if(currentDesign.version!==design.version)throw new Error('Template changed; regenerate');
  await backend.putPrivatePdf(key,artifact.bytes);
  const readback=await backend.readPrivatePdf(key,10485760);
  if(readback.length!==artifact.bytes.length||hash(readback)!==artifact.sha256)throw new Error('Private object verification failed');
  if(await backend.verifySuperAdmin(bearer)!==actorId)throw new Error('Authorization changed');
  const approval=await backend.approve({
    actorId,attemptId,expectedVersion:request.expectedVersion,requestKey:request.requestKey,
    sha256:artifact.sha256,expectedSnapshot:snapshot,
  });
  if(approval!=='approved')throw new Error('Approval not confirmed');
  return {state:'approved',version:request.expectedVersion,sha256:artifact.sha256};
}
// Activation requires a private sandboxed runtime, concrete server-only adapter,
// real JWT and Storage checks, snapshot consistency and independent recovery.
// Keep manual upload disabled until artifact content-to-recipient validation is proven.
