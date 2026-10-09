import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { SUPPORTED_MODELS, DEFAULT_MODEL } from './api';

const STORAGE_KEYS = {
  API_KEY: 'casemaster_gemini_api_key',
  SELECTED_MODEL: 'casemaster_gemini_model',
  CASES_LIST: 'casemaster_cases_history',
  ACTIVE_CASE_ID: 'casemaster_active_case_id',
  NOTEPAD: 'casemaster_investigator_notepad',
};

// Simple base64-based obfuscator to prevent accidental inspection of secret solutions
const obfuscateSolution = (solutionObj) => {
  try {
    return btoa(encodeURIComponent(JSON.stringify(solutionObj)));
  } catch {
    return JSON.stringify(solutionObj);
  }
};

const deobfuscateSolution = (encodedStr) => {
  try {
    return JSON.parse(decodeURIComponent(atob(encodedStr)));
  } catch {
    try {
      return JSON.parse(encodedStr);
    } catch {
      return null;
    }
  }
};

const CaseContext = createContext(null);

export function CaseProvider({ children }) {
  // 1. API Configurations
  const [apiKey, setApiKeyState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  });

  const [selectedModel, setSelectedModelState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SELECTED_MODEL) || DEFAULT_MODEL;
  });

  // 2. Cases History & Active Case
  const [cases, setCases] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CASES_LIST);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCaseId, setActiveCaseIdState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CASE_ID) || null;
  });

  // 3. Investigator's Free Notepad (per-case or global draft)
  const [notepadContent, setNotepadContentState] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.NOTEPAD) || '';
  });

  // 4. UI Modals
  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Sync state changes with localStorage
  const setApiKey = useCallback((key) => {
    const trimmed = (key || '').trim();
    setApiKeyState(trimmed);
    localStorage.setItem(STORAGE_KEYS.API_KEY, trimmed);
  }, []);

  const setSelectedModel = useCallback((model) => {
    setSelectedModelState(model);
    localStorage.setItem(STORAGE_KEYS.SELECTED_MODEL, model);
  }, []);

  const setActiveCaseId = useCallback((id) => {
    setActiveCaseIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CASE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CASE_ID);
    }
  }, []);

  const setNotepadContent = useCallback((content) => {
    setNotepadContentState(content);
    localStorage.setItem(STORAGE_KEYS.NOTEPAD, content);
  }, []);

  // Save cases array to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CASES_LIST, JSON.stringify(cases));
  }, [cases]);

  // Retrieve current active case object
  const activeCase = cases.find((c) => c.id === activeCaseId) || null;

  /**
   * Registers a newly generated case into store & sets it active
   */
  const createCase = useCallback((generatedData, setupParams) => {
    const newCaseId = `case-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const formattedCase = {
      id: newCaseId,
      createdAt: new Date().toISOString(),
      title: generatedData.title || 'قضية جنائية غير معنونة',
      briefingSummary: generatedData.briefingSummary || '',
      parameters: {
        difficulty: setupParams.difficulty,
        legalSystem: setupParams.legalSystem,
        depth: setupParams.depth,
        language: setupParams.language || 'ar',
      },
      dossier: {
        victimName: generatedData.dossier?.victimName || 'مجهول الهوية',
        victimAge: generatedData.dossier?.victimAge || '-',
        victimOccupation: generatedData.dossier?.victimOccupation || '-',
        crimeSceneLocation: generatedData.dossier?.crimeSceneLocation || 'موقع غير محدد',
        timeOfIncident: generatedData.dossier?.timeOfIncident || '-',
        suspects: generatedData.dossier?.suspects || [],
      },
      evidenceList: Array.isArray(generatedData.dossier?.initialEvidence) 
        ? generatedData.dossier.initialEvidence 
        : [],
      // Encrypted hidden ground truth
      encryptedSecretSolution: obfuscateSolution(generatedData.secretSolution || {}),
      isSolved: false,
      indictmentResult: null, // Stores verdict after accusation is filed
      // Independent chat threads
      investigationChat: [
        {
          id: 'msg-system-initial',
          sender: 'game_master',
          text: `تم استدعاؤك رسميًا لمسرح الجريمة: [${generatedData.dossier?.crimeSceneLocation || 'الموقع'}].\nالضحية: ${generatedData.dossier?.victimName || 'شخص غير معروف'}.\nابدأ بفحص مسرح الجريمة أو اطلب استدعاء أي من المشتبه بهم لاستجوابهم فوراً.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
      assistantChat: [
        {
          id: 'ast-initial',
          sender: 'assistant',
          text: `مرحباً بك أيها المحقق. أنا مستشارك الجنائي والقانوني المعتمد وفق [${setupParams.legalSystem}].\nلقد اطلعت على البلاغ الأولي وسأقوم بمتابعة كل ما يدور في مسرح الجريمة والاستجوابات لتنبيهك لأي تناقض أو ثغرة إجرائية.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };

    setCases((prev) => [formattedCase, ...prev]);
    setActiveCaseId(newCaseId);
    return formattedCase;
  }, [setActiveCaseId]);

  /**
   * Appends messages to the central Investigation Game Master chat
   */
  const addInvestigationMessage = useCallback((caseId, message) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          investigationChat: [
            ...c.investigationChat,
            {
              id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              ...message,
            },
          ],
        };
      })
    );
  }, []);

  /**
   * Appends newly discovered evidence items to the case dossier
   */
  const addDiscoveredEvidence = useCallback((caseId, newEvidenceItems) => {
    if (!newEvidenceItems || !newEvidenceItems.length) return;

    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        const existingIds = new Set(c.evidenceList.map((e) => e.id));
        const filteredNew = newEvidenceItems.filter((e) => !existingIds.has(e.id));
        return {
          ...c,
          evidenceList: [...c.evidenceList, ...filteredNew],
        };
      })
    );
  }, []);

  /**
   * Appends message to the independent Legal Assistant thread
   */
  const addAssistantMessage = useCallback((caseId, message) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          assistantChat: [
            ...c.assistantChat,
            {
              id: `ast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              ...message,
            },
          ],
        };
      })
    );
  }, []);

  /**
   * Closes case with final verdict and reveals secret ground truth
   */
  const closeCaseWithIndictment = useCallback((caseId, verdictData) => {
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== caseId) return c;
        return {
          ...c,
          isSolved: true,
          indictmentResult: verdictData,
        };
      })
    );
  }, []);

  /**
   * Deletes a case from history
   */
  const deleteCase = useCallback((caseId) => {
    setCases((prev) => {
      const filtered = prev.filter((c) => c.id !== caseId);
      if (activeCaseId === caseId) {
        const nextActive = filtered.length > 0 ? filtered[0].id : null;
        setActiveCaseId(nextActive);
      }
      return filtered;
    });
  }, [activeCaseId, setActiveCaseId]);

  /**
   * Decrypts the secret solution for a given case
   */
  const getDecryptedSolution = useCallback((targetCase) => {
    if (!targetCase?.encryptedSecretSolution) return null;
    return deobfuscateSolution(targetCase.encryptedSecretSolution);
  }, []);

  const value = {
    apiKey,
    setApiKey,
    selectedModel,
    setSelectedModel,
    cases,
    activeCase,
    activeCaseId,
    setActiveCaseId,
    createCase,
    deleteCase,
    notepadContent,
    setNotepadContent,
    addInvestigationMessage,
    addDiscoveredEvidence,
    addAssistantMessage,
    closeCaseWithIndictment,
    getDecryptedSolution,
    isNewCaseModalOpen,
    setIsNewCaseModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
  };

  return <CaseContext.Provider value={value}>{children}</CaseContext.Provider>;
}

export function useCaseStore() {
  const context = useContext(CaseContext);
  if (!context) {
    throw new Error('useCaseStore must be used within a CaseProvider');
  }
  return context;
}
