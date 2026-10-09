// src/components/AssistantChat.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useCaseStore } from '../useCaseStore';
import { askLegalAssistant } from '../api';
import { SYSTEM_PROMPTS } from '../prompts';

export default function AssistantChat() {
  const {
    activeCase,
    apiKey,
    selectedModel,
    addAssistantMessage,
  } = useCaseStore();

  const [inputQuestion, setInputQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeCase?.assistantChat, isLoading]);

  if (!activeCase) {
    return (
      <div className="w-80 h-full hidden lg:flex flex-col items-center justify-center p-6 text-center bg-noir-950 border-r border-noir-800 text-slate-500">
        <div className="w-12 h-12 rounded-xl bg-noir-900 border border-noir-800 flex items-center justify-center text-slate-600 mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-xs text-slate-400 font-medium">مستشار التحقيق الجنائي بانتظار فتح ملف القضية.</p>
      </div>
    );
  }

  const legalSystem = activeCase.parameters?.legalSystem || 'السعودي';

  const buildInvestigationSummaryContext = () => {
    if (!activeCase.investigationChat || activeCase.investigationChat.length === 0) {
      return 'لم تبدأ أي استجوابات في مسرح الجريمة بعد.';
    }

    return activeCase.investigationChat
      .map((msg) => {
        const speaker = msg.sender === 'user' ? 'المحقق' : 'إدارة المسرح/المشتبه به';
        return `[${speaker}]: ${msg.text}`;
      })
      .join('\n\n');
  };

  const handleSendQuestion = async (customPrompt = null) => {
    const textToSend = typeof customPrompt === 'string' ? customPrompt.trim() : inputQuestion.trim();
    if (!textToSend || isLoading) return;

    if (!apiKey) {
      setErrorMessage('يجب توفير مفتاح Gemini API لاستشارة المساعد الجنائي.');
      return;
    }

    setErrorMessage('');
    setInputQuestion('');

    addAssistantMessage(activeCase.id, {
      sender: 'user',
      text: textToSend,
    });

    setIsLoading(true);

    try {
      const systemPrompt = SYSTEM_PROMPTS.assistantEngine({
        caseData: activeCase,
        legalSystem,
        depth: activeCase.parameters?.depth || 'متوسط',
      });

      const investigationContext = buildInvestigationSummaryContext();

      const response = await askLegalAssistant({
        apiKey,
        model: selectedModel,
        systemPrompt,
        investigationContext,
        assistantHistory: activeCase.assistantChat || [],
        question: textToSend,
      });

      addAssistantMessage(activeCase.id, {
        sender: 'assistant',
        text: response.reply,
      });
    } catch (err) {
      setErrorMessage(err.message || 'فشل استدعاء المستشار الجنائي.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-80 xl:w-96 h-full flex flex-col bg-noir-950 border-r border-noir-800 flex-shrink-0">
      
      {/* Top Header */}
      <div className="h-14 px-4 border-b border-noir-800 bg-noir-900/70 backdrop-blur flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>مستشار التحقيق الجنائي</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              المرجع: <span className="text-sky-400">النظام {legalSystem}</span>
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-noir-800 text-slate-400 border border-noir-750">
          AI-ADVISOR
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        
        {/* Legal System Notice */}
        <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-500/20 text-[11px] text-sky-200/90 leading-relaxed">
          <span className="font-bold text-sky-300 block mb-0.5">📌 بروتوكول المستشار:</span>
          أراقب ما يدور في مسرح الجريمة دون التدخل في السجل الرسمي، لاقتراح تكتيكات الاستجواب ورصد ثغرات المتهمين وفق النظام {legalSystem}.
        </div>

        {activeCase.assistantChat?.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className={`text-[10px] font-mono font-semibold ${isUser ? 'text-red-400' : 'text-sky-400'}`}>
                  {isUser ? 'المحقق' : 'المستشار القانوني'}
                </span>
                <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
              </div>

              <div
                className={`p-3 rounded-xl text-xs leading-relaxed whitespace-pre-line border max-w-[92%] ${
                  isUser
                    ? 'bg-red-950/30 border-red-500/30 text-slate-200 rounded-tr-none'
                    : 'bg-noir-900 border-noir-800 text-slate-300 rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-noir-900 border border-noir-800 text-xs text-slate-400 w-fit">
            <svg className="animate-spin w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-[11px]">جاري مراجعة الأقوال واستنباط الثغرات...</span>
          </div>
        )}

        {/* Error message if any */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-600/50 text-red-300 text-[11px]">
            {errorMessage}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-2.5 border-t border-noir-850 bg-noir-900/60 flex flex-col gap-1.5">
        <span className="text-[10px] text-slate-500 font-mono px-1">استشارات فورية سريعة:</span>
        <div className="grid grid-cols-1 gap-1.5">
          <button
            onClick={() => handleSendQuestion('حلل أقوال المشتبه بهم في التحقيق حتى الآن، واستخرج أي تناقض مكاني أو زمني بارز.')}
            disabled={isLoading}
            className="text-right text-[11px] p-2 rounded-lg bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 hover:text-white transition truncate disabled:opacity-40"
          >
            ⚖️ استخراج التناقضات بين الأقوال
          </button>
          
          <button
            onClick={() => handleSendQuestion('ما هي استراتيجية السؤال القادم الموصى بها لإرباك المشتبه به الأكثر شبهة؟')}
            disabled={isLoading}
            className="text-right text-[11px] p-2 rounded-lg bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 hover:text-white transition truncate disabled:opacity-40"
          >
            🎯 سؤال استجوابي تكتيكي مقترح
          </button>

          <button
            onClick={() => handleSendQuestion(`ما مدى سلامة الأدلة المجمعة حالياً من الناحية الإجرائية وفق النظام ${legalSystem}؟`)}
            disabled={isLoading}
            className="text-right text-[11px] p-2 rounded-lg bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 hover:text-white transition truncate disabled:opacity-40"
          >
            🛡️ فحص مشروعية الدليل قانونياً
          </button>
        </div>
      </div>

      <div className="p-3 border-t border-noir-800 bg-noir-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuestion();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="اسأل المستشار عن ثغرة أو رأي قانوني..."
            disabled={isLoading}
            className="flex-1 px-3 py-2.5 rounded-lg bg-noir-900 border border-noir-800 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition disabled:opacity-50 min-h-[42px]"
          />
          <button
            type="submit"
            disabled={isLoading || !inputQuestion.trim()}
            className="px-3.5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition disabled:opacity-40 flex items-center justify-center min-h-[42px] min-w-[42px]"
            title="إرسال السؤال"
          >
            <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </form>
      </div>

    </div>
  );
}
