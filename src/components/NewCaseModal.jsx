import React, { useState } from 'react';
import { useCaseStore } from '../useCaseStore';
import { generateNewCase } from '../api';
import { SYSTEM_PROMPTS } from '../prompts';

const DIFFICULTY_OPTIONS = [
  { value: 'سهل', label: 'سهل (أدلة واضحة)', desc: 'قضية مباشرة ومثالية للتدريب الأولي' },
  { value: 'متوسط', label: 'متوسط (تناقضات خفية)', desc: 'تتطلب تدقيقاً في الأقوال وتحليل الحجج' },
  { value: 'صعب', label: 'صعب (تضليل وأدلة ملبسة)', desc: 'شبهات متعددة وأكاذيب مدروسة بعناية' },
  { value: 'صعب جداً', label: 'صعب جداً (جريمة معقدة)', desc: 'تخطيط مسبق، حجج غياب متقنة، وأدلة مبهمة' },
  { value: 'مستوى دولة', label: 'مستوى دولة (شديدة السرية)', desc: 'مؤامرة متشعبة، جهات متعددة، وثغرات حرجة' },
];

const LEGAL_SYSTEM_OPTIONS = [
  {
    value: 'السعودي',
    label: 'النظام القضائي السعودي',
    desc: 'وفق نظام الإجراءات الجزائية: حظر الإكراه، مشروعية الدليل، وضوابط التلبس',
    badge: 'شريعة وإجراءات جزائية',
  },
  {
    value: 'الأمريكي',
    label: 'القانون الجنائي الأمريكي',
    desc: 'Miranda Rights، استبعاد الأدلة غير المشروعة (Fourth Amendment)، وهيئة المحلفين',
    badge: 'Common Law & Due Process',
  },
];

const DEPTH_OPTIONS = [
  { value: 'قصير', label: 'قصير', desc: 'أدلة مركزة واستجوابات سريعة' },
  { value: 'متوسط', label: 'متوسط', desc: 'استجوابات متدرجة وفحوصات معملية' },
  { value: 'طويل', label: 'طويل ومتشعب', desc: 'تشعبات، خيوط وهمية، ومسارات استجواب عميقة' },
];

export default function NewCaseModal() {
  const {
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
    setIsSettingsModalOpen,
    apiKey,
    selectedModel,
    createCase,
  } = useCaseStore();

  const [difficulty, setDifficulty] = useState('متوسط');
  const [legalSystem, setLegalSystem] = useState('السعودي');
  const [depth, setDepth] = useState('متوسط');
  const [customSeed, setCustomSeed] = useState('');

  // Generation & Briefing review states
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isNewCaseModalOpen) return null;

  const handleClose = () => {
    if (isGenerating) return;
    setGeneratedDraft(null);
    setErrorMessage('');
    setIsNewCaseModalOpen(false);
  };

  /**
   * Generates or regenerates a candidate case draft
   */
  const handleGenerateBriefing = async () => {
    if (!apiKey) {
      setErrorMessage('يجب إدخال مفتاح Gemini API أولاً للمتابعة.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setGeneratedDraft(null);

    try {
      const prompt = SYSTEM_PROMPTS.caseGenerator({
        difficulty,
        legalSystem,
        depth,
        language: 'ar',
      });

      const result = await generateNewCase({
        apiKey,
        model: selectedModel,
        systemPrompt: prompt,
        customSeed: customSeed.trim(),
      });

      if (!result || !result.title || !result.secretSolution) {
        throw new Error('لم يكتمل هيكل بيانات القضية بشكل صحيح. يرجى المحاولة مرة أخرى.');
      }

      setGeneratedDraft(result);
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء صياغة ملف القضية.');
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * User approved the briefing summary -> save case and enter crime scene
   */
  const handleAcceptCase = () => {
    if (!generatedDraft) return;

    createCase(generatedDraft, {
      difficulty,
      legalSystem,
      depth,
      language: 'ar',
    });

    setGeneratedDraft(null);
    setIsNewCaseModalOpen(false);
  };

  /**
   * User rejects current case -> trigger fresh regeneration
   */
  const handleRejectAndRegenerate = () => {
    handleGenerateBriefing();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-noir-900 border border-noir-800 rounded-xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-noir-800 bg-noir-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                فتح ملف قضية جنائية جديدة
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-noir-800 text-slate-400 border border-noir-700">
                  CASE-INIT
                </span>
              </h2>
              <p className="text-xs text-slate-400">حدد المعايير القانونية ليقوم المحرك بتوليد البلاغ والملخص التمهيدي</p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-noir-800 transition disabled:opacity-40"
            title="إغلاق"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Missing API Key Alert */}
          {!apiKey && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 text-xs">
                <p className="font-semibold text-amber-300">مفتاح Google Gemini API غير مسجل بعد</p>
                <p className="text-slate-400 mt-1">يجب ربط مفتاح الـ API الخاص بك لتتمكن من إنشاء القضايا وتوليد الأدلة.</p>
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    setIsSettingsModalOpen(true);
                  }}
                  className="mt-2 text-xs font-medium text-amber-400 underline hover:text-amber-300"
                >
                  فتح لوحة إدخال المفتاح الآن ←
                </button>
              </div>
            </div>
          )}

          {/* Section 1: Parameters Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Legal System */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                1. النظام القانوني المعتمد
              </label>
              <div className="space-y-2">
                {LEGAL_SYSTEM_OPTIONS.map((opt) => {
                  const isSelected = legalSystem === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLegalSystem(opt.value)}
                      className={`w-full p-3 rounded-lg text-right border transition flex flex-col gap-1 ${
                        isSelected
                          ? 'bg-red-950/20 border-red-500/80 text-white shadow-sm'
                          : 'bg-noir-850 border-noir-800 text-slate-400 hover:border-noir-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-sm text-slate-100">{opt.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${isSelected ? 'bg-red-500/20 text-red-300' : 'bg-noir-800 text-slate-500'}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 leading-relaxed">{opt.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Depth */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                2. عمق القضية وتشعب الأدلة
              </label>
              <div className="space-y-2">
                {DEPTH_OPTIONS.map((opt) => {
                  const isSelected = depth === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDepth(opt.value)}
                      className={`w-full p-3 rounded-lg text-right border transition flex items-center justify-between ${
                        isSelected
                          ? 'bg-red-950/20 border-red-500/80 text-white shadow-sm'
                          : 'bg-noir-850 border-noir-800 text-slate-400 hover:border-noir-700 hover:text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-sm text-slate-100">{opt.label}</div>
                        <div className="text-xs text-slate-400">{opt.desc}</div>
                      </div>
                      <span className={`w-3 h-3 rounded-full border ${isSelected ? 'bg-red-500 border-red-400' : 'border-slate-600'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Difficulty Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              3. مستوى صعوبة الجريمة وذكاء الجاني
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {DIFFICULTY_OPTIONS.map((opt) => {
                const isSelected = difficulty === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDifficulty(opt.value)}
                    className={`p-3 rounded-lg text-right border transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-red-950/30 border-red-500 text-white shadow-sm'
                        : 'bg-noir-850 border-noir-800 text-slate-400 hover:border-noir-700 hover:text-slate-200'
                    }`}
                  >
                    <span className="font-bold text-sm text-slate-100">{opt.label}</span>
                    <span className="text-xs text-slate-400 mt-1">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Optional Custom Seed */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              4. فكرة أو مسرح جريمة مخصص (اختياري)
            </label>
            <input
              type="text"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              placeholder="مثال: جريمة وقعت داخل برج أعمال مغلق ليلاً، أو مزرعة نائية أثناء عاصفة رملية..."
              className="w-full px-4 py-2.5 rounded-lg bg-noir-850 border border-noir-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/40 border border-red-600/50 text-red-300 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 4: Briefing Summary Preview Panel (Bottom Area) */}
          {generatedDraft && (
            <div className="p-5 rounded-xl bg-noir-950 border border-amber-500/40 shadow-inner space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-noir-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping"></span>
                  <h3 className="font-bold text-sm text-amber-400">ملخص البلاغ التمهيدي للقضية</h3>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-noir-850 px-2.5 py-1 rounded border border-noir-700">
                  {generatedDraft.title}
                </span>
              </div>

              {/* Preliminary Crime Scene Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-noir-900 p-3 rounded-lg border border-noir-800 font-mono">
                <div>
                  <span className="text-slate-500 block">الضحية:</span>
                  <span className="text-slate-200 font-bold">{generatedDraft.dossier?.victimName || 'غير محدد'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">مسرح الجريمة:</span>
                  <span className="text-slate-200 font-bold">{generatedDraft.dossier?.crimeSceneLocation || 'موقع غير معروف'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">توقيت الحادثة:</span>
                  <span className="text-slate-200 font-bold">{generatedDraft.dossier?.timeOfIncident || 'مجهول'}</span>
                </div>
              </div>

              {/* Narrative Briefing */}
              <div className="text-sm text-slate-300 leading-relaxed bg-noir-900/60 p-3.5 rounded-lg border border-noir-800/80">
                <p className="font-semibold text-xs text-slate-400 mb-1">تقرير العمليات الأولية للمحقق:</p>
                {generatedDraft.briefingSummary}
              </div>

              {/* Choice Action Bar */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-noir-800/80">
                <p className="text-xs text-slate-400">
                  هل توافق على استلام هذا الملف، أم ترغب في رفضه وتوليد بلاغ آخر؟
                </p>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleRejectAndRegenerate}
                    disabled={isGenerating}
                    className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg border border-red-500/40 text-red-400 hover:bg-red-950/30 transition disabled:opacity-40"
                  >
                    {isGenerating ? 'جاري الصياغة...' : 'رفض وإعادة التوليد ↻'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptCase}
                    className="flex-1 sm:flex-none px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <span>قبول وبدء التحقيق</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions (Only visible when no draft has been generated yet) */}
        {!generatedDraft && (
          <div className="px-6 py-4 border-t border-noir-800 bg-noir-950/80 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-mono">
              النموذج النشط: <span className="text-red-400">{selectedModel}</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isGenerating}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleGenerateBriefing}
                disabled={isGenerating || !apiKey}
                className="px-5 py-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>جاري صياغة القضية والملخص...</span>
                  </>
                ) : (
                  <>
                    <span>صياغة ملخص القضية</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
