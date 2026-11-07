import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, Maximize2, Play, Presentation, X } from 'lucide-react';

type PresentationItem = {
  id: string;
  title: string;
  subtitle: string;
  file: string;
  lesson: string;
};

const PRESENTATIONS: PresentationItem[] = [
  {
    id: 'lesson-4-part-1',
    title: 'Lesson 4 – Part 1',
    subtitle: 'Class 10 History',
    file: 'lesson-4.pptx',
    lesson: 'Lesson 4',
  },
  {
    id: 'lesson-4-part-2',
    title: 'Lesson 4 – Part 2',
    subtitle: 'Class 10 History',
    file: 'lesson-4-part-2.pptx',
    lesson: 'Lesson 4',
  },
  {
    id: 'lesson-5-history',
    title: 'Lesson 5 – History',
    subtitle: 'Class 10 History',
    file: 'lesson-5-history.pptx',
    lesson: 'Lesson 5',
  },
];

export const Class10PresentationPlayer: React.FC<{ language: string }> = ({ language }) => {
  const [activePresentation, setActivePresentation] = useState<PresentationItem | null>(null);
  const en = language === 'en';

  const getFileUrl = (file: string) =>
    new URL(`${import.meta.env.BASE_URL}presentations/class10/${file}`, window.location.origin).toString();

  const viewerUrl = useMemo(() => {
    if (!activePresentation) return '';
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(getFileUrl(activePresentation.file))}`;
  }, [activePresentation]);

  return (
    <section className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-800">
            <Presentation className="w-4 h-4" />
            {en ? 'PowerPoint Learning Zone' : 'पावरपॉइंट अध्ययन अनुभाग'}
          </div>
          <h3 className="mt-1 text-lg sm:text-xl font-extrabold text-slate-900">
            {en ? 'Play Class 10 Presentations' : 'कक्षा 10 की PPT चलाएँ'}
          </h3>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            {en ? 'Open a presentation in the online player, or download it for offline study.' : 'PPT को ऑनलाइन प्लेयर में खोलें या ऑफलाइन अध्ययन के लिए डाउनलोड करें।'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-sky-900 border border-sky-100">
          <Presentation className="w-3.5 h-3.5" /> 3 {en ? 'Presentations' : 'प्रस्तुतियाँ'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PRESENTATIONS.map((item, index) => (
          <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 text-sky-900">
                <Presentation className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {en ? `Presentation ${index + 1}` : `प्रस्तुति ${index + 1}`}
              </span>
            </div>
            <h4 className="mt-3 text-sm font-extrabold text-slate-900">{item.title}</h4>
            <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setActivePresentation(item)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-900 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-800 transition-colors"
              >
                <Play className="w-3.5 h-3.5" /> {en ? 'Play PPT' : 'PPT चलाएँ'}
              </button>
              <a
                href={getFileUrl(item.file)}
                download
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> {en ? 'Download' : 'डाउनलोड'}
              </a>
            </div>
          </article>
        ))}
      </div>

      {activePresentation && (
        <div className="fixed inset-0 z-[80] bg-slate-950/90 p-2 sm:p-5 flex items-center justify-center">
          <div className="w-full max-w-6xl h-[94vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 bg-white">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
                  {en ? 'Class 10 · History' : 'कक्षा 10 · इतिहास'}
                </div>
                <h4 className="text-sm sm:text-base font-extrabold text-slate-900 truncate">{activePresentation.title}</h4>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getFileUrl(activePresentation.file)}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> {en ? 'Open file' : 'फाइल खोलें'}
                </a>
                <a
                  href={getFileUrl(activePresentation.file)}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  aria-label={en ? 'Download presentation' : 'प्रस्तुति डाउनलोड करें'}
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setActivePresentation(null)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                  aria-label={en ? 'Close player' : 'प्लेयर बंद करें'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 bg-slate-100">
              <iframe
                key={activePresentation.id}
                src={viewerUrl}
                title={activePresentation.title}
                className="w-full h-full border-0"
                allow="fullscreen"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="px-4 py-2 border-t border-slate-200 bg-white text-[10px] text-slate-500 flex items-center justify-between gap-2">
              <span>{en ? 'Online PowerPoint viewer' : 'ऑनलाइन पावरपॉइंट व्यूअर'}</span>
              <span className="inline-flex items-center gap-1"><Maximize2 className="w-3 h-3" /> {en ? 'Use viewer controls for slide navigation' : 'स्लाइड बदलने के लिए व्यूअर के कंट्रोल का उपयोग करें'}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
