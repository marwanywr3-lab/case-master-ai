// src/prompts.js
import rawSystemPrompt from '../SYSTEM_PROMPT.md?raw';

/**
 * Parses markdown sections demarcated by ## SECTION_NAME headers.
 */
function extractSection(markdownText, sectionName) {
  if (!markdownText) return '';
  const regex = new RegExp(`##\\s+${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  const match = markdownText.match(regex);
  return match ? match[1].trim() : '';
}

/**
 * Replaces mustache style template tags {{key}} with runtime values.
 */
function interpolate(template, variables = {}) {
  let output = template;
  for (const [key, value] of Object.entries(variables)) {
    const val = value !== undefined && value !== null ? String(value) : '';
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), val);
  }
  return output;
}

export const SYSTEM_PROMPTS = {
  /**
   * 1. CASE GENERATOR
   * Reads ## CASE_GENERATOR from SYSTEM_PROMPT.md
   */
  caseGenerator: (params) => {
    const template = extractSection(rawSystemPrompt, 'CASE_GENERATOR');
    return interpolate(template, {
      difficulty: params.difficulty || 'متوسط',
      legalSystem: params.legalSystem || 'السعودي',
      depth: params.depth || 'متوسط',
      language: params.language === 'ar' ? 'العربية الفصحى الدقيقة' : 'الإنجليزية',
    });
  },

  /**
   * 2. INVESTIGATION MASTER ENGINE
   * Reads ## INVESTIGATION_MASTER from SYSTEM_PROMPT.md
   */
  investigationMaster: ({ caseData, secretSolution = {}, legalSystem }) => {
    const template = extractSection(rawSystemPrompt, 'INVESTIGATION_MASTER');
    return interpolate(template, {
      caseTitle: caseData?.title || 'قضية جنائية',
      crimeSceneLocation: caseData?.dossier?.crimeSceneLocation || 'موقع غير محدد',
      legalSystem: legalSystem || caseData?.parameters?.legalSystem || 'السعودي',
      culpritName: secretSolution?.culpritName || 'غير محدد',
      motive: secretSolution?.motive || 'غير محدد',
      weaponOrMethod: secretSolution?.weaponOrMethod || 'غير محدد',
      keyEvidence: secretSolution?.keyEvidence || 'غير محدد',
      flawInAlibi: secretSolution?.flawInAlibi || 'غير محدد',
    });
  },

  /**
   * 3. LEGAL & INVESTIGATION ASSISTANT ENGINE
   * Reads ## ASSISTANT_ENGINE from SYSTEM_PROMPT.md
   */
  assistantEngine: ({ caseData, legalSystem, depth }) => {
    const template = extractSection(rawSystemPrompt, 'ASSISTANT_ENGINE');
    const isSaudi = legalSystem === 'السعودي';
    const legalSystemGuidelines = isSaudi
      ? '(ركز على: نظام الإجراءات الجزائية السعودي، حظر الإكراه، مشروعية الحصول على الدليل، شروط التلبس، وشهادات الشهود وقوة القرائن.)'
      : '(ركز على: القانون الجنائي الأمريكي، حقوق ميراندا (Miranda Rights)، التعديل الرابع (مشروعية التفتيش)، وسلسلة حيازة الدليل (Chain of Custody).)';

    return interpolate(template, {
      legalSystem: legalSystem || 'السعودي',
      depth: depth || 'متوسط',
      legalSystemGuidelines,
    });
  },
};
