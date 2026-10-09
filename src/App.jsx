import React, { useState } from 'react';
import { CaseProvider, useCaseStore } from './useCaseStore';
import Sidebar from './components/Sidebar';
import InvestigationChat from './components/InvestigationChat';
import AssistantChat from './components/AssistantChat';
import DossierAndNotes from './components/DossierAndNotes';
import NewCaseModal from './components/NewCaseModal';

function MainInvestigationWorkspace() {
  const { activeCase, setIsNewCaseModalOpen, setIsSettingsModalOpen, apiKey } = useCaseStore();
  
  // Mobile / small screen tab selector
  const [mobileTab, setMobileTab] = useState('investigation'); // 'investigation' | 'assistant' | 'dossier'

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-noir-950 text-slate-200">
      
      {/* 1. Global Navigation & Previous Cases Sidebar */}
      <Sidebar />

      {/* Main Investigation Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        
        {/* Mobile Navigation Header Tabs (Visible only on smaller screens < lg) */}
        <div className="lg:hidden flex items-center justify-between border-b border-noir-800 bg-noir-900/90 px-3 py-2">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileTab('investigation')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mobileTab === 'investigation'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              مسرح الجريمة
            </button>
            <button
              onClick={() => setMobileTab('assistant')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mobileTab === 'assistant'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              المستشار
            </button>
            <button
              onClick={() => setMobileTab('dossier')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                mobileTab === 'dossier'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الأدلة والملاحظات
            </button>
          </div>

          {!apiKey && (
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="text-[11px] font-bold text-amber-400 bg-amber-950/40 border border-amber-600/50 px-2 py-1 rounded"
            >
              المفتاح مفقود ⚠️
            </button>
          )}
        </div>

        {/* Workspace Display */}
        {!activeCase ? (
          // Empty State if no case is selected or created
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-noir-900/40 relative">
            <div className="max-w-md p-8 rounded-2xl bg-noir-900 border border-noir-800 shadow-2xl space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-3xl">
                ⚖️
              </div>
              <h2 className="text-lg font-bold text-slate-100">مرحباً بك في CaseMaster AI</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                محاكي التحقيق الجنائي التفاعلي المبني بنماذج Gemini. يمكنك معاينة مسرح الجريمة، استجواب المشتبه بهم، واستشارة المساعد القانوني لفك لغز القضية.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={() => setIsNewCaseModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition flex items-center justify-center gap-2"
                >
                  <span>فتح ملف قضية جديدة</span>
                  <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 text-xs font-medium transition"
                >
                  إعدادات الـ API
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* THREE-COLUMN WORKSPACE (Desktop Layout)                                   */
          /* In RTL (Right-to-Left):                                                   */
          /* 1. Right Column: Legal Assistant Chat (AssistantChat)                     */
          /* 2. Middle Column: Crime Scene & Interrogation (InvestigationChat)          */
          /* 3. Left Column: Investigator's Notepad & Dossier Log (DossierAndNotes)    */
          /* ========================================================================= */
          <div className="flex-1 flex h-full min-h-0 overflow-hidden">
            
            {/* Desktop Three Columns Layout */}
            <div className="hidden lg:contents">
              {/* Right Column: Assistant Chat */}
              <AssistantChat />

              {/* Center Column: Investigation / Interrogation Main Chat */}
              <InvestigationChat />

              {/* Left Column: Dossier & Auto-saved Notepad */}
              <DossierAndNotes />
            </div>

            {/* Mobile Viewport: Single active tab */}
            <div className="lg:hidden flex-1 h-full min-h-0 overflow-hidden flex flex-col">
              {mobileTab === 'investigation' && <InvestigationChat />}
              {mobileTab === 'assistant' && <AssistantChat />}
              {mobileTab === 'dossier' && <DossierAndNotes />}
            </div>

          </div>
        )}

      </div>

      {/* Global Modals */}
      <NewCaseModal />

    </div>
  );
}

export default function App() {
  return (
    <CaseProvider>
      <MainInvestigationWorkspace />
    </CaseProvider>
  );
}
