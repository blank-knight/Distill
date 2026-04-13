import { extractKnowledge, getApiKey } from './extractor';
import type { KnowledgePoint, UserSettings } from '../types';
import { DEFAULT_SETTINGS, MODEL_META } from '../types';

declare const chrome: any;

const STORAGE_KEYS = {
  KNOWLEDGE_POINTS: 'knowledge_points',
  USER_SETTINGS: 'user_settings',
};

const SUPPORTED_DOMAINS = [
  'gemini.google.com',
  'chatgpt.com',
  'claude.ai',
  'chat.deepseek.com',
  'kimi.moonshot.cn',
  'doubao.com',
  'tongyi.aliyun.com',
  'qianwen.aliyun.com',
  'yiyan.baidu.com',
  'xinghuo.xfyun.cn',
];

// ─── 消息路由 ────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (r: any) => void) => {
  switch (message.action) {
    case 'EXTRACT_KNOWLEDGE':
      handleExtractKnowledge(sendResponse);
      return true;
    case 'GET_KNOWLEDGE_POINTS':
      handleGetKnowledgePoints(sendResponse);
      return true;
    case 'SAVE_KNOWLEDGE_POINTS':
      handleSaveKnowledgePoints(message.points, sendResponse);
      return true;
    case 'CLEAR_KNOWLEDGE_POINTS':
      handleClearKnowledgePoints(sendResponse);
      return true;
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true;
    case 'SAVE_SETTINGS':
      handleSaveSettings(message.settings, sendResponse);
      return true;
    default:
      sendResponse({ success: false, error: '未知操作' });
      return false;
  }
});

// ─── 键盘快捷键：Ctrl+Shift+E ────────────────────────────────────────────────

chrome.commands.onCommand.addListener((command: string) => {
  if (command === 'extract-knowledge') {
    triggerBackgroundExtraction();
  }
});

// ─── 核心提取逻辑（供 popup 消息 & 快捷键共用） ────────────────────────────

async function getSettings(): Promise<UserSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.USER_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.USER_SETTINGS] || {}) };
}

async function getSupportedTab(): Promise<{ id: number; url: string } | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return null;
  const url = tab.url || '';
  if (!SUPPORTED_DOMAINS.some(d => url.includes(d))) return null;
  return { id: tab.id, url };
}

async function fetchConversation(tabId: number): Promise<any[]> {
  // 先尝试直接发消息（content script 已注入的情况）
  try {
    const res = await chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_CONVERSATION' });
    return res?.conversation || [];
  } catch {
    // content script 未注入（页面在插件加载前已打开），动态注入后重试
    try {
      const manifest = chrome.runtime.getManifest();
      const files: string[] = manifest.content_scripts?.[0]?.js ?? [];
      await chrome.scripting.executeScript({ target: { tabId }, files });
      // 等待脚本初始化
      await new Promise(r => setTimeout(r, 300));
      const res = await chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_CONVERSATION' });
      return res?.conversation || [];
    } catch {
      return [];
    }
  }
}

function showNotification(title: string, message: string) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: '/icon-128.png',
    title,
    message,
  });
}

/**
 * 快捷键触发：纯后台执行，不需要 Popup 在场，完成后发通知。
 */
async function triggerBackgroundExtraction() {
  try {
    const tab = await getSupportedTab();
    if (!tab) {
      showNotification('Distill', '请在支持的 AI 对话页面（ChatGPT、Gemini、Claude、DeepSeek 等）使用快捷键');
      return;
    }

    const conversation = await fetchConversation(tab.id);
    if (conversation.length === 0) {
      showNotification('Distill', '未检测到对话内容，请确认页面上有对话记录');
      return;
    }

    const settings = await getSettings();
    if (!getApiKey(settings)) {
      showNotification('Distill', `请先在设置页面配置 ${MODEL_META[settings.model].label} API Key`);
      return;
    }

    showNotification('Distill', '正在后台提取知识点…');
    await chrome.storage.local.set({ distill_extracting: Date.now() });

    try {
      const result = await extractKnowledge(conversation, settings, tab.url);
      if (!result.success) {
        showNotification('Distill 提取失败', result.error || '未知错误');
        return;
      }

      const existing = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
      const old: KnowledgePoint[] = existing[STORAGE_KEYS.KNOWLEDGE_POINTS] || [];
      const merged = [...old, ...(result.data || [])];
      await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: merged });

      showNotification('Distill 提取完成 ✓', `新增 ${result.data?.length} 个知识点，累计 ${merged.length} 个`);
    } finally {
      await chrome.storage.local.set({ distill_extracting: 0 });
    }
  } catch (err) {
    console.error('后台提取失败:', err);
    await chrome.storage.local.set({ distill_extracting: 0 }).catch(() => {});
    showNotification('Distill 提取失败', '发生未知错误');
  }
}

// ─── Popup 消息处理 ──────────────────────────────────────────────────────────

async function handleExtractKnowledge(sendResponse: (r: any) => void) {
  // 确保 sendResponse 只调用一次，且一定会被调用
  let responded = false;
  const respond = (r: any) => {
    if (!responded) { responded = true; sendResponse(r); }
  };

  try {
    const tab = await getSupportedTab();
    if (!tab) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = activeTab?.url || '';
      respond({
        success: false,
        error: url && !SUPPORTED_DOMAINS.some(d => url.includes(d))
          ? '当前页面不支持提取，请在 ChatGPT、Gemini、Claude、DeepSeek、Kimi、豆包、通义千问等页面使用'
          : '无法获取当前标签页',
      });
      return;
    }

    const conversation = await fetchConversation(tab.id);
    if (conversation.length === 0) {
      respond({ success: false, error: '未检测到对话内容，请确认页面上有对话记录' });
      return;
    }

    const settings = await getSettings();
    if (!getApiKey(settings)) {
      respond({ success: false, error: `请在设置页面配置 ${MODEL_META[settings.model].label} API Key` });
      return;
    }

    // 标记正在提取，立即响应 popup，后台继续执行 LLM 调用
    await chrome.storage.local.set({ distill_extracting: Date.now() });
    respond({ success: true, status: 'running' });

    try {
      const result = await extractKnowledge(conversation, settings, tab.url);
      if (!result.success) {
        await chrome.storage.local.set({ distill_extract_done: { success: false, error: result.error } });
        showNotification('Distill 提取失败', result.error || '未知错误');
        return;
      }

      const existing = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
      const old: KnowledgePoint[] = existing[STORAGE_KEYS.KNOWLEDGE_POINTS] || [];
      const merged = [...old, ...(result.data || [])];
      await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: merged });
      await chrome.storage.local.set({ distill_extract_done: { success: true, count: result.data?.length || 0 } });

      showNotification('Distill 提取完成 ✓', `新增 ${result.data?.length} 个知识点，累计 ${merged.length} 个`);
    } finally {
      await chrome.storage.local.set({ distill_extracting: 0 });
    }
  } catch (err) {
    console.error('提取知识失败:', err);
    await chrome.storage.local.set({ distill_extracting: 0, distill_extract_done: { success: false, error: '后台发生错误' } }).catch(() => {});
    respond({ success: false, error: '后台发生错误，请重试' });
    showNotification('Distill 提取失败', '发生未知错误');
  }
}

async function handleGetKnowledgePoints(sendResponse: (r: any) => void) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
    sendResponse({ success: true, data: result[STORAGE_KEYS.KNOWLEDGE_POINTS] || [] });
  } catch {
    sendResponse({ success: false, error: '获取知识点时发生错误' });
  }
}

async function handleSaveKnowledgePoints(points: KnowledgePoint[], sendResponse: (r: any) => void) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: points });
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false, error: '保存知识点时发生错误' });
  }
}

async function handleClearKnowledgePoints(sendResponse: (r: any) => void) {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.KNOWLEDGE_POINTS);
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false, error: '清除知识点时发生错误' });
  }
}

async function handleGetSettings(sendResponse: (r: any) => void) {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, data: settings });
  } catch {
    sendResponse({ success: false, error: '获取设置时发生错误' });
  }
}

async function handleSaveSettings(settings: UserSettings, sendResponse: (r: any) => void) {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEYS.USER_SETTINGS]: settings });
    sendResponse({ success: true });
  } catch {
    sendResponse({ success: false, error: '保存设置时发生错误' });
  }
}
