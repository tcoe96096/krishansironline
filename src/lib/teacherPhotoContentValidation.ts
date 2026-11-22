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
