import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, UserRound, X } from 'lucide-react';

/** Browser-only photo preview. No upload, API request, or persistence. */
const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
const PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export function validateTeacherPhoto(file: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.has(file.type)) return 'Choose a JPG, PNG or WebP photograph.';
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PHOTO_BYTES) return 'Photograph must be under 3 MB.';
  return null;
}

export function TeacherProfilePhoto({ teacherName }: { teacherName: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('No photograph has been saved.');
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  const choose = (file?: File) => {
    if (!file) return;
    const error = validateTeacherPhoto(file);
    if (error) { setMessage(error); return; }
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setMessage('Local preview only. This photograph is NOT uploaded or saved.');
  };
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    choose(event.target.files?.[0]);
    event.target.value = '';
  };
  const remove = () => { setPhotoUrl(null); setMessage('Photograph removed from this preview.'); };

  return <section aria-label="Teacher profile photograph" className="rounded-2xl border border-sky-100 bg-sky-50 p-3">
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-sky-900 text-white shadow-md">
        {photoUrl ? <img src={photoUrl} alt={`${teacherName} teacher photo (local preview)`} className="h-full w-full object-cover" /> : <UserRound className="h-12 w-12" aria-hidden="true" />}
      </div>
      <h2 className="text-sm font-bold text-slate-900">Teacher Profile Photo</h2>
      <p className="text-xs text-slate-600">Take a photograph or select one from your phone.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" onClick={() => camera.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-sky-900 px-3 py-2 text-xs font-bold text-white"><Camera className="h-4 w-4" />Camera</button>
        <button type="button" onClick={() => gallery.current?.click()} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-sky-800 px-3 py-2 text-xs font-bold text-sky-900"><ImagePlus className="h-4 w-4" />Choose photo</button>
        {photoUrl && <button type="button" onClick={remove} aria-label="Remove preview photograph" className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700"><X className="h-4 w-4" />Remove</button>}
      </div>
      <input className="sr-only" aria-label="Capture teacher photograph" ref={camera} type="file" accept="image/jpeg,image/png,image/webp" capture="user" onChange={handleChange} />
      <input className="sr-only" aria-label="Select teacher photograph" ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} />
      <p role="status" className="text-[11px] text-slate-600">{message}</p>
      <p className="text-[11px] text-amber-800">Preview only · No database/storage upload or teacher verification</p>
    </div>
  </section>;
}
