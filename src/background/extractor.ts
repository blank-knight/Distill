import Anthropic from '@anthropic-ai/sdk';

declare const chrome: any;
import type { ConversationMessage, KnowledgePoint, LanguageOption, ModelType } from '../types';

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

export async function extractKnowledge(
  conversation: ConversationMessage[],
  apiKey: string,
  sourceUrl: string,
  model: ModelType = 'claude',
  _language: LanguageOption = 'auto'
): Promise<ExtractorResult> {
  try {
    // 验证 API Key
    if (!apiKey) {
      return {
        success: false,
        error: '请配置 Claude API Key'
      };
    }

    // 构建对话文本
    const conversationText = conversation
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    let responseText = '';

    if (model === 'claude') {
      // 初始化 Anthropic 客户端
      const anthropic = new Anthropic({
        apiKey,
        dangerouslyAllowBrowser: true
      });

      // 调用 Claude API
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" }
          }
        ],
        messages: [{ role: "user", content: conversationText }]
      });

      // 解析响应
      responseText = (response.content[0] as any)?.text || '';
    } else if (model === 'glm') {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "glm-4-flash",
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT
            },
            {
              role: "user",
              content: conversationText
            }
          ],
          max_tokens: 4096,
          temperature: 0.7
        })
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error.message || 'GLM API 调用失败');
      }
      const content = data.choices?.[0]?.message?.content;
      const reasoningContent = data.choices?.[0]?.message?.reasoning_content;
      responseText = content || reasoningContent || '';
    }
    
    // 提取 JSON 部分
    if (!responseText) {
      return {
        success: false,
        error: 'API 返回内容为空，请检查模型配置或稍后重试'
      };
    }
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        success: false,
        error: 'API 返回格式错误，无法解析知识点'
      };
    }

    const parsedResponse = JSON.parse(jsonMatch[0]);
    const knowledgePoints = parsedResponse.knowledge_points || [];

    // 为每个知识点添加 id 和 created_at
    const now = new Date().toISOString();
    const processedPoints: KnowledgePoint[] = knowledgePoints.map((point: any) => ({
      id: crypto.randomUUID(),
      question: point.question || '',
      answer: point.answer || '',
      extension: point.extension || '',
      tags: point.tags || [],
      source_url: sourceUrl,
      created_at: now
    }));

    return {
      success: true,
      data: processedPoints
    };

  } catch (error) {
    console.error('提取知识点失败:', error);
    
    let errorMessage = '提取知识点时发生错误';
    if (error instanceof Error) {
      if (error.message.includes('401')) {
        errorMessage = 'Claude API Key 无效或已过期';
      } else if (error.message.includes('429')) {
        errorMessage = 'API 请求频率过高，请稍后再试';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}