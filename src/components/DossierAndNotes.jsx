// src/components/DossierAndNotes.jsx
import React, { useState } from 'react';
import { useCaseStore } from '../useCaseStore';

export default function DossierAndNotes() {
  const { activeCase, notepadContent, setNotepadContent } = useCaseStore();
  const [activeTab, setActiveTab] = useState('evidence'); // 'evidence' | 'suspects' | 'overview'
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const clearTimeoutRef = React.useRef(null);

  // Clear timeout on unmount to prevent React memory leaks
  React.useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  // Fallback if no active case
  if (!activeCase) {
    return (
      <div className="w-80 xl:w-96 h-full hidden lg:flex flex-col bg-noir-950 border-l border-noir-800 p-6 items-center justify-center text-center text-slate-500">
        <div className="w-12 h-12 rounded-xl bg-noir-900 border border-noir-800 flex items-center justify-center text-slate-600 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-xs text-slate-400 font-medium">سجل الأدلة والملاحظات بانتظار فتح ملف القضية.</p>
      </div>
    );
  }

  const dossier = activeCase.dossier || {};
  const evidenceList = activeCase.evidenceList || [];
  const suspects = dossier.suspects || [];

  const handleCopyNotes = () => {
    if (!notepadContent) return;
    navigator.clipboard.writeText(notepadContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClearNotes = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
      clearTimeoutRef.current = setTimeout(() => setIsConfirmingClear(false), 3000);
      return;
    }
    setNotepadContent('');
    setIsConfirmingClear(false);
    if (clearTimeoutRef.current) clearTimeout(clearTimeoutRef.current);
  };

  const wordCount = notepadContent.trim() ? notepadContent.trim().split(/\s+/).length : 0;

  return (
    <div className="w-full lg:w-80 xl:w-96 h-full flex flex-col bg-noir-950 border-l border-noir-800 flex-shrink-0 select-text overflow-hidden">
      
      {/* ========================================================================= */}
      {/* TOP SECTION: INVESTIGATOR'S FREE NOTEPAD (Auto-saved to localStorage)    */}
      {/* ========================================================================= */}
      <div className="h-[45%] flex flex-col border-b border-noir-800 bg-noir-900/50">
        
        {/* Notepad Header */}
        <div className="h-11 px-3 sm:px-4 border-b border-noir-850 flex items-center justify-between bg-noir-900/90">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-xs font-bold text-slate-200 tracking-wide">دفتر ملاحظات المحقق</h3>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">({wordCount} كلمة)</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
              حفظ تلقائي ✓
            </span>
            <button
              onClick={handleCopyNotes}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-noir-850 transition text-xs"
              title="نسخ الملاحظات"
            >
              {isCopied ? 'تم النسخ!' : '📋'}
            </button>
            <button
              onClick={handleClearNotes}
              className={`p-1.5 rounded transition text-xs flex items-center gap-1 ${
                isConfirmingClear
                  ? 'bg-red-600/30 text-red-300 border border-red-500/50 px-2'
                  : 'text-slate-400 hover:text-red-400 hover:bg-noir-850'
              }`}
              title="مسح الدفتر"
            >
              {isConfirmingClear ? 'تأكيد المسح؟' : '🗑️'}
            </button>
          </div>
        </div>

        {/* Notepad Textarea with grid texture */}
        <div className="flex-1 p-2 sm:p-3 relative">
          <textarea
            value={notepadContent}
            onChange={(e) => setNotepadContent(e.target.value)}
            placeholder="دوّن هنا استنتاجاتك الحرة، التناقضات الزمنية، أسماء المشتبه بهم، أو الفرضيات المبدئية... تُحفظ الملاحظات تلقائياً حتى عند إغلاق المتصفح."
            className="w-full h-full p-2.5 bg-noir-950/80 border border-noir-800 rounded-lg text-xs leading-relaxed text-amber-100/90 placeholder-slate-600 focus:outline-none focus:border-amber-500/50 resize-none font-mono selection:bg-amber-500/30 selection:text-white"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SECTION: CASE DOSSIER & DISCOVERED EVIDENCE LOG                    */}
      {/* ========================================================================= */}
      <div className="h-[55%] flex flex-col bg-noir-950">
        
        {/* Navigation Tabs */}
        <div className="h-11 px-2 border-b border-noir-800 bg-noir-900/80 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('evidence')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1 ${
                activeTab === 'evidence'
                  ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-noir-850'
              }`}
            >
              <span>الأدلة الجنائية</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-noir-800 text-slate-300 font-mono">
                {evidenceList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('suspects')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1 ${
                activeTab === 'suspects'
                  ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-noir-850'
              }`}
            >
              <span>المشتبه بهم</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-noir-800 text-slate-300 font-mono">
                {suspects.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('overview')}
              className={`px-2.5 sm:px-3 py-1.5 text-xs font-bold rounded-md transition ${
                activeTab === 'overview'
                  ? 'bg-red-600/20 text-red-400 border border-red-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-noir-850'
              }`}
            >
              ملف البلاغ
            </button>
          </div>

          <span className="text-[9px] font-mono text-slate-500 px-1 uppercase hidden sm:inline">
            DOSSIER
          </span>
        </div>

        {/* Tab Content Display */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
          
          {/* TAB 1: EVIDENCE LOG */}
          {activeTab === 'evidence' && (
            <div className="space-y-2.5">
              {evidenceList.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-noir-900/60 border border-noir-850 text-xs text-slate-500">
                  لم يتم تحريز أي أدلة في المسرح حتى الآن. اطلب من فني المعمل أو افحص المسرح في الشات الأوسط.
                </div>
              ) : (
                evidenceList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-lg bg-noir-900 border border-noir-800 hover:border-noir-700 transition space-y-1.5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <span className="text-red-500">🏷️</span>
                        <span>{item.name}</span>
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-noir-800 text-red-300/90 border border-red-950">
                        {item.type || 'أثر مادي'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: SUSPECTS & ALIBIS */}
          {activeTab === 'suspects' && (
            <div className="space-y-2.5">
              {suspects.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-noir-900/60 border border-noir-850 text-xs text-slate-500">
                  لا توجد أسماء مشتبه بهم مسجلة في البلاغ الأولي.
                </div>
              ) : (
                suspects.map((susp, idx) => (
                  <div
                    key={susp.id || idx}
                    className="p-3 rounded-lg bg-noir-900 border border-noir-800 hover:border-noir-700 transition space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-noir-800 border border-noir-700 flex items-center justify-center text-xs text-slate-300 font-mono">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-bold text-slate-100">{susp.name}</span>
                      </div>
                      <span className="text-[10px] text-amber-400/90 bg-amber-950/30 px-2 py-0.5 rounded border border-amber-900/50">
                        {susp.role || 'مشتبه به'}
                      </span>
                    </div>

                    {susp.alibi && (
                      <div className="p-2 rounded bg-noir-950/70 border border-noir-850 text-[11px] text-slate-300">
                        <span className="text-slate-500 block text-[10px] font-mono mb-0.5">حجة الغياب / الادعاء الأولي:</span>
                        {susp.alibi}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: CASE BRIEFING OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-noir-900 border border-noir-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-noir-850 pb-1.5">
                  <span className="text-slate-500">الضحية:</span>
                  <span className="text-slate-200 font-bold">{dossier.victimName || 'مجهول'}</span>
                </div>
                <div className="flex justify-between border-b border-noir-850 pb-1.5">
                  <span className="text-slate-500">العمر والصفة:</span>
                  <span className="text-slate-300">{dossier.victimAge || '-'} سنة ({dossier.victimOccupation || '-'})</span>
                </div>
                <div className="flex justify-between border-b border-noir-850 pb-1.5">
                  <span className="text-slate-500">مسرح الجريمة:</span>
                  <span className="text-slate-300">{dossier.crimeSceneLocation || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between border-b border-noir-850 pb-1.5">
                  <span className="text-slate-500">وقت الحادثة:</span>
                  <span className="text-slate-300">{dossier.timeOfIncident || 'مجهول'}</span>
                </div>
                <div className="flex justify-between border-b border-noir-850 pb-1.5">
                  <span className="text-slate-500">الصعوبة:</span>
                  <span className="text-red-400 font-bold">{activeCase.parameters?.difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">النظام القانوني:</span>
                  <span className="text-sky-400 font-bold">النظام {activeCase.parameters?.legalSystem}</span>
                </div>
              </div>

              {activeCase.briefingSummary && (
                <div className="p-3 rounded-lg bg-noir-900 border border-noir-800 text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-slate-400 block font-bold mb-1 text-xs">نص البلاغ التمهيدي:</span>
                  {activeCase.briefingSummary}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
