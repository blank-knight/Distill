import type { ConversationMessage, KnowledgePoint, LanguageOption, UserSettings } from '../types';
import { MODEL_META } from '../types';
import { t, resolveUILang } from '../i18n';

/** 根据语言设置生成 system prompt */
function buildSystemPrompt(language: LanguageOption): string {
  // auto = 跟随对话语言，zh/en = 强制输出对应语言
  const langInstruction =
    language === 'zh' ? '\n\nIMPORTANT: All output (question, answer, extension, tags) MUST be in Chinese (中文), regardless of the conversation language.'
    : language === 'en' ? '\n\nIMPORTANT: All output (question, answer, extension, tags) MUST be in English, regardless of the conversation language.'
    : '\n\nIMPORTANT: Output in the SAME language as the conversation. If the conversation is in English, output in English. If in Chinese, output in Chinese.';

  return `You are a professional knowledge extraction assistant. Your task is to extract structured knowledge points from conversations.

Follow these rules strictly:
1. Analyze the conversation and identify key knowledge points
2. Each knowledge point must include:
   - question: A clear question describing the knowledge point
   - answer: The core answer
   - extension: Related extensions (related concepts, recommended reading, etc.)
   - tags: Related tags (3-5)
3. Output must be strict JSON format with an array named "knowledge_points"
4. Do not output any extra text or explanation
5. Ensure extracted knowledge points are accurate, clear, and valuable${langInstruction}

Example output format:
{
  "knowledge_points": [
    {
      "question": "What is RAG (Retrieval-Augmented Generation)?",
      "answer": "RAG is an architecture that combines external knowledge retrieval with language model generation to reduce hallucinations and improve answer accuracy.",
      "extension": "Related concepts: vector databases, embeddings, fine-tuning vs RAG. Recommended: LangChain RAG documentation.",
      "tags": ["AI", "RAG", "NLP", "Knowledge Base"]
    }
  ]
}`;
}

export interface ExtractorResult {
  success: boolean;
  data?: KnowledgePoint[];
  error?: string;
}

/** 获取当前模型对应的 API Key */
export function getApiKey(settings: UserSettings): string {
  switch (settings.model) {
    case 'claude':   return settings.claudeApiKey;
    case 'openai':   return settings.openaiApiKey;
    case 'deepseek': return settings.deepseekApiKey;
    case 'qwen':     return settings.qwenApiKey;
    case 'moonshot': return settings.moonshotApiKey;
    case 'doubao':   return settings.doubaoApiKey;
    case 'glm':      return settings.glmApiKey;
    default:         return '';
  }
}

/** 通用 OpenAI-compatible API 调用（适用于 OpenAI/DeepSeek/Qwen/Moonshot/Doubao/GLM） */
async function callOpenAICompatible(
  baseUrl: string,
  model: string,
  apiKey: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: 4096,
      temperature: 0.7,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    const msg = data.error?.message || `HTTP ${response.status}`;
    throw new Error(msg);
  }

  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回内容为空');
  return content;
}

export async function extractKnowledge(
  conversation: ConversationMessage[],
  settings: UserSettings,
  sourceUrl: string,
): Promise<ExtractorResult> {
  const apiKey = getApiKey(settings);
  const lang = resolveUILang(settings.uiLanguage);

  if (!apiKey) {
    return { success: false, error: t('extNoKey', lang, { model: MODEL_META[settings.model].label }) };
  }

  const systemPrompt = buildSystemPrompt(settings.defaultLanguage);

  const conversationText = conversation
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  try {
    let responseText = '';
    const { model } = settings;
    const meta = MODEL_META[model];

    if (model === 'claude') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const response = await anthropic.messages.create({
        model: meta.defaultModel,
        max_tokens: 4096,
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: conversationText }],
      });
      responseText = (response.content[0] as any)?.text || '';
    } else {
      // 所有其他模型使用 OpenAI-compatible 接口
      const modelId = model === 'doubao' ? settings.doubaoModel : meta.defaultModel;
      if (model === 'doubao' && !modelId) {
        return { success: false, error: t('extDoubaoMissing', lang) };
      }
      responseText = await callOpenAICompatible(
        meta.baseUrl,
        modelId,
        apiKey,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: conversationText },
        ]
      );
    }

    if (!responseText) {
      return { success: false, error: t('extEmpty', lang) };
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { success: false, error: t('extParse', lang) };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const now = new Date().toISOString();
    const processedPoints: KnowledgePoint[] = (parsed.knowledge_points || []).map((p: any) => ({
      id: crypto.randomUUID(),
      question: p.question || '',
      answer: p.answer || '',
      extension: p.extension || '',
      tags: p.tags || [],
      source_url: sourceUrl,
      created_at: now,
    }));

    return { success: true, data: processedPoints };

  } catch (error) {
    console.error('Extraction failed:', error);
    let msg = t('extError', lang);
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.toLowerCase().includes('unauthorized')) {
        msg = t('extKeyInvalid', lang, { model: MODEL_META[settings.model].label });
      } else if (error.message.includes('429')) {
        msg = t('extRateLimit', lang);
      } else {
        msg = error.message;
      }
    }
    return { success: false, error: msg };
  }
}
