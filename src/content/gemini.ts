import type { ConversationMessage } from '../types';

declare const chrome: any;

const GEMINI_SELECTORS = {
  userMessage: [
    'user-query .query-text',
    '[data-message-author-role="user"]',
    '.user-message'
  ],
  modelResponse: [
    'model-response .response-content',
    '[data-message-author-role="model"]',
    '.model-response'
  ]
};

function getElementText(selectors: string[]): string | null {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element.textContent?.trim() || null;
    }
  }
  return null;
}

export function extractConversation(): ConversationMessage[] {
  const messages: ConversationMessage[] = [];
  
  // 尝试获取所有消息容器
  const messageContainers = document.querySelectorAll('[data-message-id]') || 
                           document.querySelectorAll('.message-container') || 
                           document.querySelectorAll('.chat-message');
  
  messageContainers.forEach((_container) => {
    // 尝试判断消息类型
    let role: 'user' | 'model' = 'model';
    let content: string | null = null;
    
    // 检查是否为用户消息
    const userSelectors = GEMINI_SELECTORS.userMessage.map(sel => `:scope ${sel}`);
    content = getElementText(userSelectors);
    if (content) {
      role = 'user';
    } else {
      // 检查是否为 AI 回复
      const modelSelectors = GEMINI_SELECTORS.modelResponse.map(sel => `:scope ${sel}`);
      content = getElementText(modelSelectors);
    }
    
    if (content) {
      messages.push({ role, content });
    }
  });
  
  console.log('Distill: 抓取到的对话消息数量:', messages.length);
  return messages;
}

// 监听来自 background 的消息
(chrome as any).runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
  if (message.action === 'EXTRACT_CONVERSATION') {
    const conversation = extractConversation();
    sendResponse({ conversation });
  }
});