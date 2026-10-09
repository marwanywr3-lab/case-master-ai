// src/App.jsx
import React, { useState } from 'react';
import { CaseProvider, useCaseStore } from './useCaseStore';
import Sidebar from './components/Sidebar';
import InvestigationChat from './components/InvestigationChat';
import AssistantChat from './components/AssistantChat';
import DossierAndNotes from './components/DossierAndNotes';
import NewCaseModal from './components/NewCaseModal';

function MainInvestigationWorkspace() {
  const {
    activeCase,
    setIsNewCaseModalOpen,
    setIsSettingsModalOpen,
    setIsSidebarOpen,
    apiKey,
  } = useCaseStore();
  
  // Mobile & Tablet screen tab selector
  const [mobileTab, setMobileTab] = useState('investigation'); // 'investigation' | 'assistant' | 'dossier'

  return (
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-noir-950 text-slate-200">
      
      {/* 1. Global Navigation & Previous Cases Sidebar (Drawer on mobile/tablet, pinned on lg+) */}
      <Sidebar />

      {/* Main Investigation Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        
        {/* Responsive Mobile / Tablet Top Navigation Bar */}
        <header className="lg:hidden flex items-center justify-between border-b border-noir-800 bg-noir-900/95 backdrop-blur px-3 py-2 z-30 flex-shrink-0">
          
          <div className="flex items-center gap-2">
            {/* Hamburger Button to Open Sidebar Drawer */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-lg bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 hover:text-white transition active:scale-95 min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="سجل القضايا والإعدادات"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {activeCase ? (
              <div className="truncate max-w-[130px] sm:max-w-[220px]">
                <h2 className="text-xs font-bold text-slate-100 truncate">{activeCase.title}</h2>
                <span className="text-[10px] text-red-400 font-mono">نظام {activeCase.parameters?.legalSystem}</span>
              </div>
            ) : (
              <span className="text-xs font-bold text-slate-200">CaseMaster AI</span>
            )}
          </div>

          {/* Quick API Key status badge or alert */}
          <div className="flex items-center gap-1.5">
            {!apiKey ? (
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-600/50 px-2 py-1 rounded animate-pulse"
              >
                مفتاح API مفقود ⚠️
              </button>
            ) : (
              <button
                onClick={() => setIsNewCaseModalOpen(true)}
                className="text-[11px] font-bold bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded transition"
              >
                + قضية جديدة
              </button>
            )}
          </div>
        </header>

        {/* Workspace Display */}
        {!activeCase ? (
          // Empty State if no case is selected or created
          <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 text-center bg-noir-900/40 relative overflow-y-auto">
            <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-noir-900 border border-noir-800 shadow-2xl space-y-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-red-600/10 border border-red-500/30 flex items-center justify-center text-2xl sm:text-3xl">
                ⚖️
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100">مرحباً بك في CaseMaster AI</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                محاكي التحقيق الجنائي التفاعلي بنماذج Gemini. يمكنك معاينة مسرح الجريمة، استجواب المشتبه بهم، واستشارة المساعد القانوني لفك لغز القضية عبر أي جهاز.
              </p>
              
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <button
                  onClick={() => setIsNewCaseModalOpen(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg transition flex items-center justify-center gap-2 min-h-[44px]"
                >
                  <span>فتح ملف قضية جديدة</span>
                  <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-noir-850 hover:bg-noir-800 border border-noir-800 text-slate-300 text-xs font-medium transition min-h-[44px]"
                >
                  إعدادات الـ API
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* THREE-COLUMN WORKSPACE (Responsive Multi-device Layout)                   */
          /* On Desktop (lg+): Three simultaneous columns (Assistant, Center, Dossier) */
          /* On Mobile & Tablet (< lg): Full-screen active view controlled by tabs    */
          /* ========================================================================= */
          <div className="flex-1 flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
            
            {/* Desktop Three Columns Layout (Visible on lg and larger) */}
            <div className="hidden lg:flex flex-1 h-full min-w-0 overflow-hidden">
              {/* Right Column (in RTL): Legal Assistant Chat */}
              <AssistantChat />

              {/* Center Column: Investigation / Interrogation Main Chat */}
              <InvestigationChat />

              {/* Left Column: Dossier & Auto-saved Notepad */}
              <DossierAndNotes />
            </div>

            {/* Mobile & Tablet Viewport: Single full-width active view with tab bar */}
            <div className="lg:hidden flex-1 h-full min-h-0 overflow-hidden flex flex-col">
              <div className="flex-1 min-h-0 overflow-hidden">
                {mobileTab === 'investigation' && <InvestigationChat />}
                {mobileTab === 'assistant' && <AssistantChat />}
                {mobileTab === 'dossier' && <DossierAndNotes />}
              </div>

              {/* Mobile / Tablet Bottom Navigation Tab Bar */}
              <nav className="border-t border-noir-800 bg-noir-900/95 backdrop-blur px-2 py-1.5 flex items-center justify-around z-20 flex-shrink-0">
                <button
                  onClick={() => setMobileTab('investigation')}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 ${
                    mobileTab === 'investigation'
                      ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">🔍</span>
                  <span className="text-[11px]">مسرح الجريمة</span>
                </button>

                <button
                  onClick={() => setMobileTab('assistant')}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 ${
                    mobileTab === 'assistant'
                      ? 'bg-sky-600/20 text-sky-400 border border-sky-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">⚖️</span>
                  <span className="text-[11px]">المستشار</span>
                </button>

                <button
                  onClick={() => setMobileTab('dossier')}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition flex flex-col items-center gap-1 ${
                    mobileTab === 'dossier'
                      ? 'bg-amber-600/20 text-amber-400 border border-amber-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-sm">📁</span>
                  <span className="text-[11px]">الأدلة والملاحظات</span>
                </button>
              </nav>
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
