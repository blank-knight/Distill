import type { ConversationMessage } from '../types';

declare const chrome: any;

type Turn = { el: Element; role: 'user' | 'model' };

function getTextContent(el: Element, selectors: string[]): string {
  for (const sel of selectors) {
    const found = el.querySelector(sel);
    const text = found?.textContent?.trim();
    if (text) return text;
  }
  return el.textContent?.trim() || '';
}

export function extractConversation(): ConversationMessage[] {
  const messages: ConversationMessage[] = [];

  // Strategy 1: Gemini custom elements (user-query / model-response)
  const userEls = Array.from(document.querySelectorAll('user-query'));
  const modelEls = Array.from(document.querySelectorAll('model-response'));

  if (userEls.length > 0 || modelEls.length > 0) {
    const turns: Turn[] = [
      ...userEls.map(el => ({ el, role: 'user' as const })),
      ...modelEls.map(el => ({ el, role: 'model' as const })),
    ].sort((a, b) => {
      const pos = a.el.compareDocumentPosition(b.el);
      return (pos & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
    });

    for (const { el, role } of turns) {
      let content = '';
      if (role === 'user') {
        content = getTextContent(el, ['.query-text', 'p', '.query-content']);
      } else {
        content = getTextContent(el, ['.markdown', '.response-content', '.response-container', 'p']);
      }
      if (content) messages.push({ role, content });
    }

    if (messages.length > 0) {
      console.log('Distill: 提取到', messages.length, '条消息（custom elements）');
      return messages;
    }
  }

  // Strategy 2: data-message-author-role attributes
  const byRole = Array.from(document.querySelectorAll('[data-message-author-role]'));
  for (const el of byRole) {
    const roleAttr = el.getAttribute('data-message-author-role');
    if (roleAttr !== 'user' && roleAttr !== 'model') continue;
    const content = el.textContent?.trim();
    if (content) messages.push({ role: roleAttr, content });
  }

  if (messages.length > 0) {
    console.log('Distill: 提取到', messages.length, '条消息（data-role）');
    return messages;
  }

  // Strategy 3: common chat selectors
  const chatMessages = Array.from(document.querySelectorAll('.message-container, .chat-message, [data-message-id]'));
  for (const el of chatMessages) {
    const content = el.textContent?.trim();
    if (content) messages.push({ role: 'model', content });
  }

  console.log('Distill: 提取到', messages.length, '条消息（fallback）');
  return messages;
}

// 监听来自 background 的消息
(chrome as any).runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
  if (message.action === 'EXTRACT_CONVERSATION') {
    const conversation = extractConversation();
    sendResponse({ conversation });
  }
});
