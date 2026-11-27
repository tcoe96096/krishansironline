// Compare private metadata from the disposable database with the encrypted manifest.
// Return only a boolean; never log individual object names or row contents.
import {validateManifest} from './verify-production-storage-archive.mjs';
export function storageMetadataMatches(manifest,metadata){
 validateManifest(manifest);
 if(!Array.isArray(metadata?.buckets)||!Array.isArray(metadata?.objects)||
    metadata.buckets.length!==manifest.buckets.length||
    metadata.objects.length!==manifest.objects.length) return false;
 if(new Set(metadata.buckets).size!==metadata.buckets.length||
    metadata.buckets.some(b=>!manifest.buckets.includes(b)))return false;
 const expected=new Map(manifest.objects.map(o=>[JSON.stringify([o.bucket,o.key]),o.size]));
 const seen=new Set();
 for(const row of metadata.objects){
  const key=JSON.stringify([row.bucket,row.key]);
  if(seen.has(key)||!expected.has(key)||typeof row.size!=='string'||
     !/^(0|[1-9]\d*)$/.test(row.size)||Number(row.size)!==expected.get(key))return false;
  seen.add(key);
 }
 return seen.size===expected.size;
}
