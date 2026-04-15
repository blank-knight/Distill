import type { ConversationMessage, KnowledgePoint, LanguageOption, UserSettings } from '../types';
import { MODEL_META } from '../types';
import { t, resolveUILang } from '../i18n';

const SYSTEM_PROMPT = `你是一个专业的知识提取助手，任务是从对话中提取结构化的知识点。

请严格按照以下要求执行：
1. 分析对话内容，识别出其中的关键知识点
2. 每个知识点必须包含：
   - question: 知识点的问题描述
   - answer: 知识点的核心答案
   - extension: 相关延伸内容（如相关概念、推荐阅读等）
   - tags: 相关标签（3-5个）
3. 输出必须是严格的 JSON 格式，包含一个名为 "knowledge_points" 的数组
4. 不要输出任何额外的文字或解释
5. 确保提取的知识点准确、清晰、有价值

示例输出格式：
{
  "knowledge_points": [
    {
      "question": "什么是 RAG（检索增强生成）？",
      "answer": "RAG 是一种将外部知识库检索与语言模型生成结合的架构，用于减少幻觉、提升答案准确性。",
      "extension": "相关概念：向量数据库、Embedding、Fine-tuning vs RAG 的区别。推荐阅读：LangChain 文档中的 RAG 章节。",
      "tags": ["AI", "RAG", "NLP", "知识库"]
    }
  ]
}`;

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
  _language: LanguageOption = 'auto'
): Promise<ExtractorResult> {
  const apiKey = getApiKey(settings);
  const lang = resolveUILang(settings.uiLanguage);

  if (!apiKey) {
    return { success: false, error: t('extNoKey', lang, { model: MODEL_META[settings.model].label }) };
  }

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
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
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
          { role: 'system', content: SYSTEM_PROMPT },
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
