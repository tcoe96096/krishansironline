import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { INITIAL_NOTICES } from '../data/portalData';
import { Notice } from '../types';
import { Bell, Plus, ExternalLink, Calendar, Edit3, Trash2, Check, Sparkles } from 'lucide-react';

interface NoticeBoardProps {
  onNavigate: (section: string) => void;
}

export const NoticeBoard: React.FC<NoticeBoardProps> = ({ onNavigate }) => {
  const { language } = useLanguage();
  const [notices, setNotices] = useState<Notice[]>(() => {
    const saved = localStorage.getItem('krishan_portal_notices');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse notices', e);
      }
    }
    return INITIAL_NOTICES;
  });

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);

  // Form states
  const [titleEn, setTitleEn] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [category, setCategory] = useState<Notice['category']>('Test');
  const [detailsEn, setDetailsEn] = useState('');
  const [detailsHi, setDetailsHi] = useState('');
  const [link, setLink] = useState('#tests');

  useEffect(() => {
    localStorage.setItem('krishan_portal_notices', JSON.stringify(notices));
  }, [notices]);

  const handleOpenAdd = () => {
    setEditingNotice(null);
    setTitleEn('');
    setTitleHi('');
    setCategory('Test');
    setDetailsEn('');
    setDetailsHi('');
    setLink('#tests');
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (n: Notice) => {
    setEditingNotice(n);
    setTitleEn(n.title.en);
    setTitleHi(n.title.hi);
    setCategory(n.category);
    setDetailsEn(n.details?.en || '');
    setDetailsHi(n.details?.hi || '');
    setLink(n.link || '#');
    setIsEditorOpen(true);
  };

  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleEn.trim() && !titleHi.trim()) return;

    if (editingNotice) {
      setNotices((prev) =>
        prev.map((item) =>
          item.id === editingNotice.id
            ? {
                ...item,
                title: { en: titleEn || titleHi, hi: titleHi || titleEn },
                category,
                details: { en: detailsEn, hi: detailsHi },
                link,
              }
            : item
        )
      );
    } else {
      const newNotice: Notice = {
        id: 'n_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        category,
        isNew: true,
        title: { en: titleEn || titleHi, hi: titleHi || titleEn },
        details: { en: detailsEn, hi: detailsHi },
        link,
      };
      setNotices([newNotice, ...notices]);
    }

    setIsEditorOpen(false);
    setEditingNotice(null);
  };

  const handleDeleteNotice = (id: string) => {
    setNotices((prev) => prev.filter((item) => item.id !== id));
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset to initial default notices?')) {
      setNotices(INITIAL_NOTICES);
      localStorage.removeItem('krishan_portal_notices');
    }
  };

  const getCategoryBadgeClass = (cat: Notice['category']) => {
    switch (cat) {
      case 'Test':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'Result':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'Exam':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'Notes':
        return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  return (
    <section className="py-10 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
                {language === 'en' ? 'Latest Announcements & Updates' : 'नवीनतम सूचनाएं एवं अपडेट्स'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'en'
                  ? 'Real-time notifications on online assessments, board exams, and study notes'
                  : 'ऑनलाइन टेस्ट, बोर्ड परीक्षा एवं अध्ययन सामग्री की अद्यतन जानकारी'}
              </p>
            </div>
          </div>

          {/* Teacher / Owner Edit Control */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
              title="Add or update notice for students"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'Add Announcement' : 'नई सूचना जोड़ें'}</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="text-slate-400 hover:text-slate-600 p-1.5 text-xs"
              title="Reset notices to official defaults"
            >
              ↺
            </button>
          </div>
        </div>

        {/* Notices Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notices.map((notice) => {
            const title = language === 'hi' ? notice.title.hi : notice.title.en;
            const details = notice.details
              ? language === 'hi'
                ? notice.details.hi
                : notice.details.en
              : '';

            return (
              <div
                key={notice.id}
                className="group relative rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white p-4.5 transition-all shadow-xs hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span
                      className={`px-2 py-0.5 rounded-sm font-semibold border text-[11px] ${getCategoryBadgeClass(
                        notice.category
                      )}`}
                    >
                      {notice.category}
                    </span>
                    {notice.isNew && (
                      <span className="text-[11px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-sm border border-amber-200 animate-pulse">
                        NEW
                      </span>
                    )}
                    <span className="text-slate-400 font-mono text-[11px] flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {notice.date}
                    </span>
                  </div>

                  {/* Owner Controls */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(notice)}
                      className="p-1 text-slate-400 hover:text-sky-700"
                      title="Edit this notice"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteNotice(notice.id)}
                      className="p-1 text-slate-400 hover:text-red-600"
                      title="Delete notice"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-sky-900 transition-colors leading-snug">
                  {title}
                </h3>

                {details && (
                  <p className="mt-1.5 text-xs text-slate-600 leading-relaxed line-clamp-2">
                    {details}
                  </p>
                )}

                {notice.link && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={() => {
                        const target = notice.link?.replace('#', '') || 'home';
                        onNavigate(target);
                      }}
                      className="font-semibold text-sky-700 hover:text-sky-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>{language === 'en' ? 'Open Resource' : 'संसाधन देखें'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span className="text-slate-400 text-[11px]">GGHS Dhanger</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* Owner Notice Editor Modal */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                {editingNotice
                  ? language === 'en'
                    ? 'Edit Announcement'
                    : 'सूचना संपादित करें'
                  : language === 'en'
                  ? 'Add New Announcement (Teacher Mode)'
                  : 'नई सूचना जोड़ें (शिक्षक नियंत्रण)'}
              </h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNotice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Notice['category'])}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="Test">Test (ऑनलाइन टेस्ट)</option>
                  <option value="Result">Result (परीक्षा परिणाम)</option>
                  <option value="Exam">Exam (बोर्ड परीक्षा)</option>
                  <option value="Notes">Notes (अध्ययन सामग्री)</option>
                  <option value="Important">Important (महत्वपूर्ण)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title (English)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 10 Civics Chapter 1 Online Quiz uploaded"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Title (हिंदी)
                </label>
                <input
                  type="text"
                  placeholder="उदा. कक्षा 10 नागरिक शास्त्र अध्याय 1 का ऑनलाइन टेस्ट प्रारंभ"
                  value={titleHi}
                  onChange={(e) => setTitleHi(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Description / Details (English)
                </label>
                <textarea
                  rows={2}
                  placeholder="Short explanation for students..."
                  value={detailsEn}
                  onChange={(e) => setDetailsEn(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Details (हिंदी)
                </label>
                <textarea
                  rows={2}
                  placeholder="विद्यार्थियों के लिए संक्षिप्त विवरण..."
                  value={detailsHi}
                  onChange={(e) => setDetailsHi(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Section Link
                </label>
                <select
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="#tests">Online Tests Section</option>
                  <option value="#materials">Study Materials Section</option>
                  <option value="#results">Results Section</option>
                  <option value="#questions">Question Bank Section</option>
                  <option value="#polity">Political Science & Constitution</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-sky-900 hover:bg-sky-800 rounded-lg shadow-xs"
                >
                  Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
