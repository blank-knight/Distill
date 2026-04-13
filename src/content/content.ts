import type { ConversationMessage } from '../types';

declare const chrome: any;

type Role = 'user' | 'model';

// ── Utilities ──────────────────────────────────────────────────────────────

/** Extract visible text from element, trying sub-selectors first */
function getText(el: Element, ...subs: string[]): string {
  for (const s of subs) {
    const t = el.querySelector(s)?.textContent?.trim();
    if (t) return t;
  }
  return el.textContent?.trim() || '';
}

/** Sort elements by DOM tree order */
function sortByDom(pairs: { el: Element; role: Role }[]) {
  return pairs.sort((a, b) =>
    a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
  );
}

/** Convert element-role pairs to ConversationMessage array */
function toMessages(
  pairs: { el: Element; role: Role }[],
  ...textSels: string[]
): ConversationMessage[] {
  return pairs
    .map(({ el, role }) => ({ role, content: getText(el, ...textSels) }))
    .filter(m => m.content.length > 0);
}

/** Query elements by multiple selectors and add to pairs array */
function collect(
  pairs: { el: Element; role: Role }[],
  role: Role,
  ...selectors: string[]
) {
  for (const sel of selectors) {
    document.querySelectorAll(sel).forEach(el => pairs.push({ el, role }));
  }
}

// ── Platform extractors ────────────────────────────────────────────────────

/** Google Gemini — gemini.google.com */
function fromGemini(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  // Strategy 1: Gemini custom HTML elements
  document.querySelectorAll('user-query').forEach(el => p.push({ el, role: 'user' }));
  document.querySelectorAll('model-response').forEach(el => p.push({ el, role: 'model' }));
  // Strategy 2: role attribute fallback
  if (!p.length) {
    document.querySelectorAll('[data-message-author-role]').forEach(el => {
      const r = el.getAttribute('data-message-author-role');
      if (r === 'user' || r === 'model') p.push({ el, role: r });
    });
  }
  return toMessages(sortByDom(p), '.query-text', '.response-content', '.markdown');
}

/** OpenAI ChatGPT — chatgpt.com */
function fromChatGPT(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  // data-message-author-role is stable across ChatGPT UI versions
  document.querySelectorAll('[data-message-author-role]').forEach(el => {
    const r = el.getAttribute('data-message-author-role');
    if (r === 'user') p.push({ el, role: 'user' });
    else if (r === 'assistant') p.push({ el, role: 'model' });
  });
  return toMessages(p, '.whitespace-pre-wrap', '.markdown', '[class*="prose"]', 'p');
}

/** Anthropic Claude.ai — claude.ai */
function fromClaude(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  // Strategy 1: testid attributes (preferred)
  document.querySelectorAll('[data-testid="user-message"]').forEach(el => p.push({ el, role: 'user' }));
  document.querySelectorAll('[data-testid="assistant-message"]').forEach(el => p.push({ el, role: 'model' }));
  // Strategy 2: class-name heuristics
  if (!p.length) {
    collect(p, 'user',
      '.human-turn',
      '[class*="HumanMessage"]',
      '[class*="human-message"]',
    );
    collect(p, 'model',
      '.ai-turn',
      '[class*="AssistantMessage"]',
      '[class*="ai-message"]',
    );
  }
  return toMessages(sortByDom(p), '.prose', '[class*="prose"]', 'p');
}

/** DeepSeek Chat — chat.deepseek.com */
function fromDeepSeek(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  // Strategy 1: explicit role attributes
  document.querySelectorAll('[data-role="user"]').forEach(el => p.push({ el, role: 'user' }));
  document.querySelectorAll('[data-role="assistant"]').forEach(el => p.push({ el, role: 'model' }));
  if (p.length > 0) {
    return toMessages(sortByDom(p), '.ds-markdown', '[class*="markdown"]', 'p');
  }
  // Strategy 2: .ds-markdown marks every assistant response; find the chat turn wrapper
  // by walking up until we reach a container that holds exactly one .ds-markdown
  const seen = new Set<Element>();
  document.querySelectorAll('.ds-markdown').forEach(mEl => {
    let container: Element | null = mEl.parentElement;
    while (container) {
      if (seen.has(container)) break;
      const markdownCount = container.querySelectorAll('.ds-markdown').length;
      if (markdownCount === 1) {
        seen.add(container);
        p.push({ el: container, role: 'model' });
        // The user message is the previous sibling at the same level
        const prev = container.previousElementSibling;
        if (prev && !seen.has(prev)) {
          seen.add(prev);
          p.push({ el: prev, role: 'user' });
        }
        break;
      }
      container = container.parentElement;
    }
  });
  return toMessages(sortByDom(p), '.ds-markdown', '[class*="markdown"]', 'p');
}

/** Moonshot Kimi — kimi.moonshot.cn */
function fromKimi(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  collect(p, 'user',
    '[data-testid="chat-message-human"]',
    '.chat-message--user',
    '[class*="chat-message-item--user"]',
    '[class*="user-query"]',
  );
  collect(p, 'model',
    '[data-testid="chat-message-assistant"]',
    '.chat-message--assistant',
    '[class*="chat-message-item--ai"]',
    '[class*="assistant-message"]',
  );
  if (!p.length) return fromGeneric();
  return toMessages(sortByDom(p), '.mrkd-content', '.markdown-body', '[class*="markdown"]', 'p');
}

/** ByteDance 豆包 — www.doubao.com */
function fromDoubao(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  collect(p, 'user',
    '[data-testid="chat-message-item-user"]',
    '[class*="user-message"]',
    '[class*="human-message"]',
  );
  collect(p, 'model',
    '[data-testid="chat-message-item-bot"]',
    '[class*="bot-message"]',
    '[class*="assistant-message"]',
  );
  if (!p.length) return fromGeneric();
  return toMessages(sortByDom(p), '[class*="markdown"]', '[class*="content"]', 'p');
}

/** Alibaba 通义千问 — tongyi.aliyun.com */
function fromQwen(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  collect(p, 'user',
    '.chat-item-user',
    '[class*="question-item"]',
    '[class*="user-message"]',
    '[data-role="user"]',
  );
  collect(p, 'model',
    '.chat-item-assistant',
    '[class*="answer-item"]',
    '[class*="bot-message"]',
    '[data-role="assistant"]',
  );
  if (!p.length) return fromGeneric();
  return toMessages(sortByDom(p), '.markdown-body', '[class*="markdown"]', '[class*="content"]', 'p');
}

/** Baidu 文心一言 — yiyan.baidu.com */
function fromYiyan(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  collect(p, 'user',
    '.question-content',
    '[class*="user-query"]',
    '[class*="human-message"]',
  );
  collect(p, 'model',
    '.answer-content',
    '[class*="ai-answer"]',
    '[class*="bot-answer"]',
    '[class*="assistant-message"]',
  );
  if (!p.length) return fromGeneric();
  return toMessages(sortByDom(p), '.markdown-container', '.md-content', '[class*="markdown"]', 'p');
}

/** iFlytek 讯飞星火 — xinghuo.xfyun.cn */
function fromXunfei(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  collect(p, 'user',
    '.chat-user-message',
    '[class*="user-message"]',
    '[class*="question"]',
  );
  collect(p, 'model',
    '.chat-ai-message',
    '[class*="ai-message"]',
    '[class*="bot-message"]',
    '[class*="answer"]',
  );
  if (!p.length) return fromGeneric();
  return toMessages(sortByDom(p), '.markdown', '[class*="content"]', 'p');
}

/** Generic fallback — tries common attribute patterns used by AI chat apps */
function fromGeneric(): ConversationMessage[] {
  const p: { el: Element; role: Role }[] = [];
  // Attribute-based role detection (most reliable across platforms)
  document.querySelectorAll('[data-role], [data-author], [data-message-author-role]').forEach(el => {
    const r =
      el.getAttribute('data-role') ||
      el.getAttribute('data-author') ||
      el.getAttribute('data-message-author-role');
    if (!r) return;
    if (/^(user|human)$/i.test(r)) p.push({ el, role: 'user' });
    else if (/^(assistant|model|ai|bot)$/i.test(r)) p.push({ el, role: 'model' });
  });
  if (p.length > 0) {
    return toMessages(sortByDom(p), '[class*="markdown"]', 'p');
  }
  // Last resort: testid-based detection
  document.querySelectorAll('[data-testid]').forEach(el => {
    const id = el.getAttribute('data-testid') || '';
    if (/user.?message|human.?turn/i.test(id)) p.push({ el, role: 'user' });
    else if (/assistant.?message|ai.?turn|bot.?message/i.test(id)) p.push({ el, role: 'model' });
  });
  return toMessages(sortByDom(p), '[class*="markdown"]', 'p');
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

function extractConversation(): ConversationMessage[] {
  const host = window.location.hostname;
  let messages: ConversationMessage[];

  if (host === 'gemini.google.com') messages = fromGemini();
  else if (host === 'chatgpt.com') messages = fromChatGPT();
  else if (host === 'claude.ai') messages = fromClaude();
  else if (host === 'chat.deepseek.com') messages = fromDeepSeek();
  else if (host === 'kimi.moonshot.cn') messages = fromKimi();
  else if (host.includes('doubao.com')) messages = fromDoubao();
  else if (host.includes('tongyi.aliyun.com') || host.includes('qianwen.aliyun.com')) messages = fromQwen();
  else if (host === 'yiyan.baidu.com') messages = fromYiyan();
  else if (host === 'xinghuo.xfyun.cn') messages = fromXunfei();
  else messages = fromGeneric();

  console.log(`Distill [${host}]: 提取到 ${messages.length} 条消息`);
  return messages;
}

// ── Message listener ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (r: any) => void) => {
  if (message.action === 'EXTRACT_CONVERSATION') {
    sendResponse({ conversation: extractConversation() });
  }
});
