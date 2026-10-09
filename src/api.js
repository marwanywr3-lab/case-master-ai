// src/api.js
/**
 * CaseMaster AI - Gemini API Client Engine
 * Direct integration with Google Gemini REST API.
 * Supports configurable models: gemini-3.5-flash-lite (default) and gemini-3.8-flash.
 */

export const SUPPORTED_MODELS = {
  LITE: 'gemini-3.5-flash-lite',
  FLASH: 'gemini-3.8-flash',
};

export const DEFAULT_MODEL = SUPPORTED_MODELS.LITE;

const BASE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Safely extracts and parses JSON payload from AI responses
 * handles markdown fences, preamble text, and rogue whitespace.
 */
function extractAndParseJSON(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('لا توجد استجابة نصية للتحليل.');
  }

  // Check for markdown fenced JSON
  const markdownRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const match = rawText.match(markdownRegex);
  const jsonCandidate = match ? match[1].trim() : rawText.trim();

  // Try direct parse first
  try {
    return JSON.parse(jsonCandidate);
  } catch (initialError) {
    // Locate the first '{' and last '}'
    const startIndex = jsonCandidate.indexOf('{');
    const endIndex = jsonCandidate.lastIndexOf('}');
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      const sliced = jsonCandidate.substring(startIndex, endIndex + 1);
      try {
        return JSON.parse(sliced);
      } catch (innerError) {
        throw new Error('فشل فك تشفير استجابة القضية المهيكلة. يرجى المحاولة مرة أخرى.');
      }
    }
    throw new Error('الاستجابة الواردة من النموذج لا تحتوي على صيغة بيانات صالحة.');
  }
}

/**
 * Core caller for Google Gemini GenerateContent API.
 */
async function callGeminiApi({ apiKey, model = DEFAULT_MODEL, systemInstruction, contents, generationConfig = {} }) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('مفتاح Gemini API غير متوفر. يرجى إدخال مفتاح صالح في الإعدادات أولاً.');
  }

  const endpoint = `${BASE_API_URL}/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

  // Gemini 3.5 & 3.8 models deprecate custom temperature/top_p/top_k in generateContent
  const requestBody = {
    contents,
    generationConfig: {
      maxOutputTokens: 4096,
      ...generationConfig,
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    throw new Error('تعذر الاتصال بخوادم Google AI. يرجى التحقق من اتصالك بالإنترنت.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText;
    if (response.status === 400 && errorMsg.includes('API_KEY_INVALID')) {
      throw new Error('مفتاح API غير صالح. تأكد من نسخه بدقة من Google AI Studio.');
    }
    if (response.status === 429) {
      throw new Error('تم تجاوز حد استهلاك الحصة (Rate Limit). انتظر دقيقة أو استخدم نموذج lite.');
    }
    if (response.status === 404) {
      throw new Error(`النموذج (${model}) غير متاح حالياً لحسابك. تأكد من تفعيله في AI Studio.`);
    }
    throw new Error(`خطأ من Gemini API [${response.status}]: ${errorMsg}`);
  }

  const candidate = data.candidates?.[0];
  const responseText = candidate?.content?.parts?.[0]?.text;

  if (!responseText) {
    if (candidate?.finishReason === 'SAFETY') {
      throw new Error('تم حجب الاستجابة بسبب معايير السلامة التلقائية للمحتوى.');
    }
    throw new Error('لم يتم إرجاع أي محتوى نصي من النموذج.');
  }

  return responseText;
}

/**
 * 1. Generates the full initial case: Dossier, briefing summary, and secret solution.
 */
export async function generateNewCase({ apiKey, model, systemPrompt, customSeed = '' }) {
  const userPrompt = customSeed
    ? `أنشئ قضية جنائية بناءً على الفكرة الإضافية: "${customSeed}". التزم بإخراج الـ JSON حصراً.`
    : 'أنشئ ملف قضية جنائية جديد ومتكامل الآن وفق المعايير المحددة، بصيغة JSON الصالحة حصراً.';

  const rawText = await callGeminiApi({
    apiKey,
    model,
    systemInstruction: systemPrompt,
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
  });

  return extractAndParseJSON(rawText);
}

/**
 * 2. Sends messages to Game Master and extracts newly surfaced evidence logs.
 */
export async function sendInvestigationMessage({ apiKey, model, systemPrompt, history, userMessage }) {
  // Format history to Gemini multi-turn format: { role: 'user' | 'model', parts: [{ text }] }
  const formattedContents = [];
  
  for (const msg of history) {
    const role = msg.sender === 'user' ? 'user' : 'model';
    // Ensure alternating turns: avoid consecutive messages from same role
    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
      formattedContents[formattedContents.length - 1].parts[0].text += `\n\n${msg.text}`;
    } else {
      formattedContents.push({
        role,
        parts: [{ text: msg.text }],
      });
    }
  }

  // Append new user message with alternating guarantee
  if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === 'user') {
    formattedContents[formattedContents.length - 1].parts[0].text += `\n\n${userMessage}`;
  } else {
    formattedContents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });
  }

  const responseText = await callGeminiApi({
    apiKey,
    model,
    systemInstruction: systemPrompt,
    contents: formattedContents,
  });

  // Check if Game Master appended an ```evidence_log block
  let cleanedText = responseText;
  let newEvidenceItems = [];

  const evidenceRegex = /```(?:evidence_log|json)?\s*(\{[\s\S]*?"newEvidence"[\s\S]*?\})\s*```/i;
  const match = responseText.match(evidenceRegex);

  if (match) {
    try {
      const parsedEvidence = JSON.parse(match[1].trim());
      if (Array.isArray(parsedEvidence.newEvidence)) {
        newEvidenceItems = parsedEvidence.newEvidence;
      }
    } catch (e) {
      console.warn('Could not parse discovered evidence JSON block:', e);
    }
    // Remove block from the user-visible narrative text
    cleanedText = responseText.replace(evidenceRegex, '').trim();
  }

  return {
    reply: cleanedText,
    newEvidence: newEvidenceItems,
  };
}

/**
 * 3. Consults the Legal and Investigative Assistant without violating turn sequence.
 */
export async function askLegalAssistant({ apiKey, model, systemPrompt, investigationContext, assistantHistory, question }) {
  const contextualPreamble = `
[سجل أحداث التحقيق حتى الآن]:
${investigationContext || 'لا توجد استجوابات سابقة حتى الآن، المحقق يفتتح القضية.'}
---
[سؤال المحقق للاستشارة]:
${question}
  `.trim();

  // Assistant history without the pending user question to avoid duplicate user turns
  const formattedContents = [];

  for (const msg of assistantHistory) {
    const role = msg.sender === 'user' ? 'user' : 'model';
    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
      formattedContents[formattedContents.length - 1].parts[0].text += `\n\n${msg.text}`;
    } else {
      formattedContents.push({
        role,
        parts: [{ text: msg.text }],
      });
    }
  }

  // Append contextual preamble ensuring user role
  if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === 'user') {
    formattedContents[formattedContents.length - 1].parts[0].text = contextualPreamble;
  } else {
    formattedContents.push({
      role: 'user',
      parts: [{ text: contextualPreamble }],
    });
  }

  const reply = await callGeminiApi({
    apiKey,
    model,
    systemInstruction: systemPrompt,
    contents: formattedContents,
  });

  return { reply: reply.trim() };
}
