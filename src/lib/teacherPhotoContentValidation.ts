/** Check the RIFF/WebP container marker on untrusted private Storage bytes.
 * This is a lightweight format gate, not a full image decoder or malware scan.
 */
export function hasWebpContainerHeader(bytes:Uint8Array):boolean{
 if(bytes.length<12)return false;
 const riff=[0x52,0x49,0x46,0x46],webp=[0x57,0x45,0x42,0x50];
 if(!riff.every((v,i)=>bytes[i]===v)||!webp.every((v,i)=>bytes[i+8]===v))return false;
 const declared=(bytes[4]|bytes[5]<<8|bytes[6]<<16|bytes[7]<<24)>>>0;
 return declared>=4;
}

/** Validate complete downloaded bytes, including RIFF size and WebP chunk marker.
 * Still not a decoder or malware scanner; private Storage RLS remains mandatory.
 */
export function hasConsistentWebpContainer(bytes:Uint8Array):boolean{
 if(!hasWebpContainerHeader(bytes)||bytes.length<20)return false;
 const size=(bytes[4]|bytes[5]<<8|bytes[6]<<16|bytes[7]<<24)>>>0;
 if(size!==bytes.length-8)return false;
 const chunk=String.fromCharCode(...bytes.subarray(12,16));
 if(!['VP8 ','VP8L','VP8X'].includes(chunk))return false;
 const chunkSize=(bytes[16]|bytes[17]<<8|bytes[18]<<16|bytes[19]<<24)>>>0;
 return chunkSize<=bytes.length-20 && chunkSize+(chunkSize%2)<=bytes.length-20;
}
