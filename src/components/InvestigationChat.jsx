// src/components/InvestigationChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useCaseStore } from '../useCaseStore';
import { sendInvestigationMessage } from '../api';
import { SYSTEM_PROMPTS } from '../prompts';

export default function InvestigationChat() {
  const {
    activeCase,
    apiKey,
    selectedModel,
    addInvestigationMessage,
    addDiscoveredEvidence,
    closeCaseWithIndictment,
    getDecryptedSolution,
  } = useCaseStore();

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Indictment modal states
  const [isIndictmentModalOpen, setIsIndictmentModalOpen] = useState(false);
  const [accusedName, setAccusedName] = useState('');
  const [allegedMotive, setAllegedMotive] = useState('');
  const [allegedMethod, setAllegedMethod] = useState('');
  const [decisiveEvidenceText, setDecisiveEvidenceText] = useState('');
  const [isSubmittingIndictment, setIsSubmittingIndictment] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCase?.investigationChat, isLoading]);

  if (!activeCase) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center bg-noir-900 border-x border-noir-800">
        <div className="w-16 h-16 rounded-full bg-noir-800/80 border border-noir-700 flex items-center justify-center text-slate-500 mb-4 shadow-inner">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-slate-200 mb-1">لا يوجد ملف قضية نشط حالياً</h3>
        <p className="text-xs text-slate-400 max-w-sm">
          قم بفتح قضية جديدة من الشريط الجانبي أو اختر إحدى القضايا السابقة للبدء في استجواب الشهود ومعاينة مسرح الجريمة.
        </p>
      </div>
    );
  }

  const decryptedSolution = getDecryptedSolution(activeCase);

  /**
   * Sending investigation prompt or interrogation line to Game Master
   */
  const handleSendMessage = async (customText = null) => {
    const textToSend = typeof customText === 'string' ? customText.trim() : inputMessage.trim();
    if (!textToSend || isLoading) return;

    if (!apiKey) {
      setErrorMessage('يجب إدخال مفتاح Gemini API في الإعدادات للمتابعة.');
      return;
    }

    setErrorMessage('');
    setInputMessage('');

    // Append user's action to local state
    addInvestigationMessage(activeCase.id, {
      sender: 'user',
      text: textToSend,
    });

    setIsLoading(true);

    try {
      const systemPrompt = SYSTEM_PROMPTS.investigationMaster({
        caseData: activeCase,
        secretSolution: decryptedSolution || {},
        legalSystem: activeCase.parameters.legalSystem,
      });

      const response = await sendInvestigationMessage({
        apiKey,
        model: selectedModel,
        systemPrompt,
        history: activeCase.investigationChat,
        userMessage: textToSend,
      });

      // 1. Add model reply to chat
      addInvestigationMessage(activeCase.id, {
        sender: 'game_master',
        text: response.reply,
      });

      // 2. If new evidence was discovered, update the case dossier
      if (response.newEvidence && response.newEvidence.length > 0) {
        addDiscoveredEvidence(activeCase.id, response.newEvidence);
      }
    } catch (err) {
      setErrorMessage(err.message || 'فشل الاتصال بمحرك التحقيق. تحقق من الشبكة ومفتاح API.');
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  /**
   * Handle Final Indictment submission
   */
  const handleSubmitIndictment = async (e) => {
    e.preventDefault();
    if (!accusedName.trim() || !allegedMotive.trim()) return;

    setIsSubmittingIndictment(true);
    setErrorMessage('');

    const indictmentNarrative = `
[إعلان لائحة الاتهام الرسمية - قفل ملف التحقيق]:
- المتهم المُدان: ${accusedName.trim()}
- الدافع المزعوم: ${allegedMotive.trim()}
- الأداة / أسلوب الجريمة: ${allegedMethod.trim() || 'غير محدد'}
- الدليل الحاسم المقدم: ${decisiveEvidenceText.trim() || 'استناداً إلى الأدلة المجمعة في السجل'}
`.trim();

    // 1. Post only user's accusation to chat history (NOT the secret solution prompt!)
    addInvestigationMessage(activeCase.id, {
      sender: 'user',
      text: indictmentNarrative,
    });

    try {
      const evaluationPrompt = `
لقد قرر المحقق إنهاء التحقيق وتقديم لائحة الاتهام التالية:
${indictmentNarrative}

الحل السري الحقيقي للقضية:
- الجاني الحقيقي: ${decryptedSolution?.culpritName}
- الدافع الحقيقي: ${decryptedSolution?.motive}
- الأداة / الأسلوب الحقيقي: ${decryptedSolution?.weaponOrMethod}
- الدليل الحاسم: ${decryptedSolution?.keyEvidence}
- ثغرة حجة الغياب: ${decryptedSolution?.flawInAlibi}
- الرواية الكاملة: ${decryptedSolution?.fullNarrative}

المطلوب:
1. تقييم الاتهام هل هو صحيح أم خاطئ وفق معايير النظام القضائي (${activeCase.parameters.legalSystem}).
2. إصدار الحكم الصادر من المحكمة (إدانة تامة / براءة لعدم كفاية الأدلة / إدانة المتهم الخطأ).
3. كشف كامل للرواية الواقعية للجريمة وما حدث خلف الكواليس بدقة وسرد بوليسي ممتع.
`.trim();

      // Pass indictment history along with the evaluation prompt behind the scenes
      const virtualHistory = [
        ...activeCase.investigationChat,
        { sender: 'user', text: indictmentNarrative }
      ];

      const response = await sendInvestigationMessage({
        apiKey,
        model: selectedModel,
        systemPrompt: SYSTEM_PROMPTS.investigationMaster({
          caseData: activeCase,
          secretSolution: decryptedSolution || {},
          legalSystem: activeCase.parameters.legalSystem,
        }),
        history: virtualHistory,
        userMessage: evaluationPrompt,
      });

      // Append court verdict message
      addInvestigationMessage(activeCase.id, {
        sender: 'game_master',
        text: response.reply,
      });

      // Mark case as solved
      closeCaseWithIndictment(activeCase.id, {
        accused: accusedName,
        submittedAt: new Date().toISOString(),
        verdictText: response.reply,
        realSolution: decryptedSolution,
      });

      setIsIndictmentModalOpen(false);
    } catch (err) {
      setErrorMessage(err.message || 'حدث خطأ أثناء مداولة لائحة الاتهام.');
    } finally {
      setIsSubmittingIndictment(false);
    }
  };

  const isSolved = activeCase.isSolved;

  return (
    <div className="flex-1 h-full min-w-0 flex flex-col bg-noir-900 border-x-0 lg:border-x border-noir-800 relative">
      
      {/* Top Header */}
      <div className="h-14 px-3 sm:px-5 border-b border-noir-800 bg-noir-950/70 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
          <div className="truncate">
            <h2 className="text-xs sm:text-sm font-bold text-slate-100 truncate">{activeCase.title}</h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
              <span className="truncate max-w-[140px] sm:max-w-none">مسرح الجريمة: {activeCase.dossier?.crimeSceneLocation}</span>
              <span>•</span>
              <span className="text-red-400">نظام {activeCase.parameters?.legalSystem}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isSolved ? (
            <span className="px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>القضية مغلقة</span>
            </span>
          ) : (
            <button
              onClick={() => setIsIndictmentModalOpen(true)}
              className="px-2.5 sm:px-3.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-300 hover:text-white transition shadow-sm flex items-center gap-1.5 min-h-[36px]"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>تقديم لائحة الاتهام</span>
            </button>
          )}
        </div>
      </div>

      {/* Case Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 overscroll-contain">
        {activeCase.investigationChat.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full sm:max-w-2xl lg:max-w-3xl ${isUser ? 'mr-auto' : 'ml-auto'}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className={`text-[11px] font-mono font-semibold ${isUser ? 'text-red-400' : 'text-slate-400'}`}>
                  {isUser ? 'المحقق' : 'إدارة مسرح الجريمة والاستجواب'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{msg.timestamp}</span>
              </div>

              <div
                className={`p-3 sm:p-4 rounded-xl text-xs sm:text-sm leading-relaxed whitespace-pre-line border ${
                  isUser
                    ? 'bg-red-950/30 border-red-500/40 text-slate-100 rounded-tr-none'
                    : 'bg-noir-850/90 border-noir-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 max-w-lg">
            <div className="p-3.5 rounded-xl bg-noir-850 border border-noir-800 text-xs text-slate-400 flex items-center gap-2 shadow-md">
              <svg className="animate-spin w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>جاري التحري، معالجة الأدلة، وردود المشتبه بهم...</span>
            </div>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-600 text-red-300 text-xs flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage('')} className="text-red-400 hover:text-white text-xs mr-2">✕</button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Action Suggestion Chips (Available if case is ongoing) */}
      {!isSolved && (
        <div className="px-3 sm:px-4 py-2 border-t border-noir-800/60 bg-noir-950/40 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] text-slate-500 flex-shrink-0 font-mono">أوامر سريعة:</span>
          
          <button
            onClick={() => handleSendMessage('أريد فحص مسرح الجريمة والبحث عن أي آثار أو بصمات إضافية.')}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-md bg-noir-850 hover:bg-noir-800 border border-noir-750 text-slate-300 hover:text-white flex-shrink-0 transition text-xs active:scale-95"
          >
            🔍 مسح مسرح الجريمة
          </button>

          <button
            onClick={() => handleSendMessage('اطلب من فني الأدلة الجنائية فحص وتفريغ كاميرات المراقبة المحيطة.')}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-md bg-noir-850 hover:bg-noir-800 border border-noir-750 text-slate-300 hover:text-white flex-shrink-0 transition text-xs active:scale-95"
          >
            📹 فحص كاميرات المراقبة
          </button>

          <button
            onClick={() => handleSendMessage('اطلب تقرير الطب الشرعي المفصل حول وقت وطريقة الوفاة.')}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-md bg-noir-850 hover:bg-noir-800 border border-noir-750 text-slate-300 hover:text-white flex-shrink-0 transition text-xs active:scale-95"
          >
            🩺 تقرير الطب الشرعي
          </button>

          {activeCase.dossier?.suspects?.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSendMessage(`استدعِ المشتبه به "${s.name}" (${s.role}) لغرفة التحقيق واستجوبه حول مكان تواجده وعلاقته بالجريمة.`)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-md bg-noir-850 hover:bg-noir-800 border border-noir-750 text-amber-300 hover:text-amber-200 flex-shrink-0 transition text-xs active:scale-95"
            >
              ⚖️ استجواب {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div className="p-2.5 sm:p-4 border-t border-noir-800 bg-noir-950/80">
        {isSolved ? (
          <div className="p-3 rounded-lg bg-noir-850 border border-noir-700 text-center text-xs text-slate-400">
            تم إغلاق ملف القضية وتقديم لائحة الاتهام. يمكنك مراجعة السجل والملاحظات والأدلة، أو بدء قضية جديدة.
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="وجّه سؤالاً، أو استدعِ شاهداً، أو اطلب إجراءً جنائياً..."
              disabled={isLoading}
              className="flex-1 px-3 sm:px-4 py-2.5 rounded-xl bg-noir-850 border border-noir-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 transition disabled:opacity-50 min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="px-3.5 sm:px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition disabled:opacity-40 flex items-center gap-1.5 min-h-[44px] min-w-[44px] justify-center"
            >
              <span className="hidden sm:inline">إرسال</span>
              <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        )}
      </div>

      {/* Indictment Modal Overlay (Fully scrollable & responsive) */}
      {isIndictmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl max-h-[92dvh] flex flex-col bg-noir-900 border border-red-500/40 rounded-xl shadow-2xl overflow-hidden text-slate-200">
            
            <div className="px-5 py-3.5 border-b border-noir-800 bg-red-950/30 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
                  ⚖️
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">تقديم لائحة الاتهام الرسمية</h3>
                  <p className="text-[10px] text-red-300">إغلاق ملف التحقيق وإحالة القضية للمحاكمة</p>
                </div>
              </div>
              <button
                onClick={() => setIsIndictmentModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitIndictment} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              
              {/* Select Accused Suspect */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  المتهم الموجه إليه الاتهام بالجريمة:
                </label>
                <select
                  value={accusedName}
                  onChange={(e) => setAccusedName(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-lg bg-noir-850 border border-noir-800 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-red-500 min-h-[42px]"
                >
                  <option value="">-- اختر المشتبه به المتهم --</option>
                  {activeCase.dossier?.suspects?.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                  <option value="طرف آخر غير مذكور">طرف آخر غير مذكور في القائمة الأولية</option>
                </select>
              </div>

              {/* Motive */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الدافع الحقيقي وراء الجريمة:
                </label>
                <textarea
                  value={allegedMotive}
                  onChange={(e) => setAllegedMotive(e.target.value)}
                  required
                  rows="2"
                  placeholder="اشرح السبب: انتقام، سرقة، نزاع مالي، ابتزاز..."
                  className="w-full px-3 py-2 rounded-lg bg-noir-850 border border-noir-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Method and Weapon */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  أداة الجريمة أو طريقة التنفيذ:
                </label>
                <input
                  type="text"
                  value={allegedMethod}
                  onChange={(e) => setAllegedMethod(e.target.value)}
                  placeholder="مثال: سم مجهول، خنق، تزييف حادث سقوط..."
                  className="w-full px-3 py-2 rounded-lg bg-noir-850 border border-noir-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500 min-h-[40px]"
                />
              </div>

              {/* Decisive Evidence */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  الدليل القاطع الذي يدحض حجة الغياب ويثبت الإدانة:
                </label>
                <textarea
                  value={decisiveEvidenceText}
                  onChange={(e) => setDecisiveEvidenceText(e.target.value)}
                  rows="2"
                  placeholder="ما هو الدليل المادي أو التناقض الحاسم الذي لا يمكن دحضه؟"
                  className="w-full px-3 py-2 rounded-lg bg-noir-850 border border-noir-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-3 border-t border-noir-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsIndictmentModalOpen(false)}
                  disabled={isSubmittingIndictment}
                  className="px-4 py-2.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white min-h-[42px]"
                >
                  العودة للتحقيق
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingIndictment || !accusedName}
                  className="px-4 sm:px-5 py-2.5 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white shadow-lg transition disabled:opacity-50 flex items-center gap-1.5 min-h-[42px]"
                >
                  {isSubmittingIndictment ? (
                    <>
                      <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>جاري المداولة...</span>
                    </>
                  ) : (
                    <span>تأكيد الإحالة وإصدار الحكم</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
