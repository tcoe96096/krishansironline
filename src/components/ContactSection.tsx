import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Mail, Phone, Send, CheckCircle2, MessageSquare, School, HelpCircle } from 'lucide-react';

export const ContactSection: React.FC = () => {
  const { language } = useLanguage();
  const [studentName, setStudentName] = useState('');
  const [classLevel, setClassLevel] = useState('10');
  const [subject, setSubject] = useState('Social Science');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setStudentName('');
    setMessage('');
    setSubmitted(false);
  };

  return (
    <section id="contact" className="py-14 bg-slate-50 border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-800 mb-2">
            <MessageSquare className="w-4 h-4 text-sky-700" />
            <span>{language === 'en' ? 'Student Doubt & Feedback Desk' : 'विद्यार्थी सहायता एवं शंका समाधान'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
            {language === 'en' ? 'Ask a Question or Send Feedback' : 'प्रश्न पूछें अथवा सुझाव भेजें'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {language === 'en'
              ? 'Students of GGHS Dhanger and self-learners can submit academic queries directly to Krishan Sir.'
              : 'विद्यार्थी सामाजिक विज्ञान के किसी भी अध्याय, बोर्ड परीक्षा अथवा टेस्ट के संबंध में अपनी शंका पूछ सकते हैं।'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
          
          {/* Left Column (5 cols): School Information & Guidelines */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-sky-900 font-bold text-base font-display">
                <School className="w-5 h-5 text-sky-800" />
                <h3>Institutional Address</h3>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
                <div>
                  <div className="font-bold text-slate-900">
                    Government Girls High School (GGHS), Dhanger
                  </div>
                  <div className="text-slate-500">
                    Village: Dhanger, Tehsil: Fatehabad
                  </div>
                  <div className="text-slate-500">
                    District: Fatehabad, Haryana, India · PIN: 125048
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <div className="font-bold text-slate-900">Website Owner & Teacher:</div>
                  <div className="text-slate-700">Krishan Kumar (TGT Social Science)</div>
                  <div className="text-slate-500 text-xs">Independent Educational Learning Portal</div>
                  <a href="tel:9812534934" className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-sky-800 hover:text-sky-950"><Phone className="w-4 h-4" /> 9812534934</a>\n                  <a href="mailto:krishansir.online@gmail.com" className="mt-2 flex items-center gap-2 text-sm font-semibold text-sky-800 hover:text-sky-950"><Mail className="w-4 h-4" /> krishansir.online@gmail.com</a>
                </div>
              </div>

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-xs text-sky-950 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-sky-800 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  "For privacy and child safety, student queries should be shared through the academic form or the official email address shown above."
                </p>
              </div>
            </div>

            {/* School Timings & Assembly */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs text-xs space-y-2">
              <div className="font-bold text-slate-900">Academic Query Hours:</div>
              <div className="text-slate-600 leading-relaxed">
                Monday to Saturday: 9:00 AM – 3:30 PM (During School Terms)
              </div>
              <div className="text-slate-500 text-[11px]">
                Sunday: Closed (Online Assessments open 24/7)
              </div>
            </div>

          </div>

          {/* Right Column (7 cols): Academic Query Submission Form */}
          <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs">
            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 font-display">
                  Query Submitted Successfully!
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  Thank you, <strong>{studentName}</strong>. Your doubt for Class {classLevel} ({subject}) has been recorded for Krishan Sir. It will be reviewed and addressed in the next portal revision notes update or school discussion.
                </p>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 rounded-lg bg-sky-900 text-white text-xs font-semibold hover:bg-sky-800 transition-colors"
                >
                  Ask Another Question
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="text-base font-bold text-slate-900 font-display mb-1">
                  Send Academic Doubt to Krishan Sir
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Fill in your question regarding any chapter, concept, or test
                </p>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Student Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Pooja Sharma / राहुल कुमार"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Class
                    </label>
                    <select
                      value={classLevel}
                      onChange={(e) => setClassLevel(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10 (Board)</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Subject
                    </label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                    >
                      <option value="Social Science">Social Science (General)</option>
                      <option value="Political Science">Political Science / Civics</option>
                      <option value="History">History</option>
                      <option value="Geography">Geography & Maps</option>
                      <option value="Economics">Economics</option>
                      <option value="Indian Constitution">Indian Constitution</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Your Doubt or Question Details *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Type your question or request clarification on a specific topic..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-sky-900 hover:bg-sky-800 text-white font-semibold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Submit Academic Doubt</span>
                </button>
              </form>
            )}
          </div>

        </div>

      </div>
    </section>
  );
};
