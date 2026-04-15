import { extractKnowledge, getApiKey } from './extractor';
import type { KnowledgePoint, UserSettings } from '../types';
import { DEFAULT_SETTINGS, MODEL_META } from '../types';
import { t, resolveUILang, type UILang } from '../i18n';

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
      sendResponse({ success: false, error: 'Unknown action' });
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

async function getLang(settings?: UserSettings): Promise<UILang> {
  const s = settings || await getSettings();
  return resolveUILang(s.uiLanguage);
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
  const settings = await getSettings();
  const lang = resolveUILang(settings.uiLanguage);
  try {
    const tab = await getSupportedTab();
    if (!tab) {
      showNotification('Distill', t('notifUnsupported', lang));
      return;
    }

    const conversation = await fetchConversation(tab.id);
    if (conversation.length === 0) {
      showNotification('Distill', t('notifNoConv', lang));
      return;
    }

    if (!getApiKey(settings)) {
      showNotification('Distill', t('notifNoKey', lang, { model: MODEL_META[settings.model].label }));
      return;
    }

    showNotification('Distill', t('notifExtracting', lang));
    await chrome.storage.local.set({ distill_extracting: Date.now() });

    try {
      const result = await extractKnowledge(conversation, settings, tab.url);
      if (!result.success) {
        showNotification(t('errExtractFail', lang), result.error || t('errUnknownShort', lang));
        return;
      }

      const existing = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
      const old: KnowledgePoint[] = existing[STORAGE_KEYS.KNOWLEDGE_POINTS] || [];
      const merged = [...old, ...(result.data || [])];
      await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: merged });

      showNotification('Distill ✓', t('notifDone', lang, { count: result.data?.length ?? 0, total: merged.length }));
    } finally {
      await chrome.storage.local.set({ distill_extracting: 0 });
    }
  } catch (err) {
    console.error('Background extraction failed:', err);
    await chrome.storage.local.set({ distill_extracting: 0 }).catch(() => {});
    showNotification(t('errExtractFail', lang), t('errUnknownShort', lang));
  }
}

// ─── Popup 消息处理 ──────────────────────────────────────────────────────────

async function handleExtractKnowledge(sendResponse: (r: any) => void) {
  // 确保 sendResponse 只调用一次，且一定会被调用
  let responded = false;
  const respond = (r: any) => {
    if (!responded) { responded = true; sendResponse(r); }
  };

  const settings = await getSettings();
  const lang = resolveUILang(settings.uiLanguage);

  try {
    const tab = await getSupportedTab();
    if (!tab) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = activeTab?.url || '';
      respond({
        success: false,
        error: url && !SUPPORTED_DOMAINS.some(d => url.includes(d))
          ? t('errUnsupported', lang)
          : t('errNoTab', lang),
      });
      return;
    }

    const conversation = await fetchConversation(tab.id);
    if (conversation.length === 0) {
      respond({ success: false, error: t('errNoConv', lang) });
      return;
    }

    if (!getApiKey(settings)) {
      respond({ success: false, error: t('errNoKey', lang, { model: MODEL_META[settings.model].label }) });
      return;
    }

    // 标记正在提取，立即响应 popup，后台继续执行 LLM 调用
    await chrome.storage.local.set({ distill_extracting: Date.now() });
    respond({ success: true, status: 'running' });

    try {
      const result = await extractKnowledge(conversation, settings, tab.url);
      if (!result.success) {
        await chrome.storage.local.set({ distill_extract_done: { success: false, error: result.error } });
        showNotification(t('errExtractFail', lang), result.error || t('errUnknownShort', lang));
        return;
      }

      const existing = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
      const old: KnowledgePoint[] = existing[STORAGE_KEYS.KNOWLEDGE_POINTS] || [];
      const merged = [...old, ...(result.data || [])];
      await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: merged });
      await chrome.storage.local.set({ distill_extract_done: { success: true, count: result.data?.length || 0 } });

      showNotification('Distill ✓', t('notifDone', lang, { count: result.data?.length ?? 0, total: merged.length }));
    } finally {
      await chrome.storage.local.set({ distill_extracting: 0 });
    }
  } catch (err) {
    console.error('Extraction failed:', err);
    await chrome.storage.local.set({
      distill_extracting: 0,
      distill_extract_done: { success: false, error: t('errBackendShort', lang) },
    }).catch(() => {});
    respond({ success: false, error: t('errBackend', lang) });
    showNotification(t('errExtractFail', lang), t('errUnknownShort', lang));
  }
}

async function handleGetKnowledgePoints(sendResponse: (r: any) => void) {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
    sendResponse({ success: true, data: result[STORAGE_KEYS.KNOWLEDGE_POINTS] || [] });
  } catch {
    const lang = await getLang();
    sendResponse({ success: false, error: t('storageGetError', lang) });
  }
}

async function handleSaveKnowledgePoints(points: KnowledgePoint[], sendResponse: (r: any) => void) {
  try {
    await chrome.storage.local.set({ [STORAGE_KEYS.KNOWLEDGE_POINTS]: points });
    sendResponse({ success: true });
  } catch {
    const lang = await getLang();
    sendResponse({ success: false, error: t('storageSaveError', lang) });
  }
}

async function handleClearKnowledgePoints(sendResponse: (r: any) => void) {
  try {
    await chrome.storage.local.remove(STORAGE_KEYS.KNOWLEDGE_POINTS);
    sendResponse({ success: true });
  } catch {
    const lang = await getLang();
    sendResponse({ success: false, error: t('storageClearError', lang) });
  }
}

async function handleGetSettings(sendResponse: (r: any) => void) {
  try {
    const settings = await getSettings();
    sendResponse({ success: true, data: settings });
  } catch {
    sendResponse({ success: false, error: t('settingsGetError', resolveUILang(undefined)) });
  }
}

async function handleSaveSettings(settings: UserSettings, sendResponse: (r: any) => void) {
  try {
    await chrome.storage.sync.set({ [STORAGE_KEYS.USER_SETTINGS]: settings });
    sendResponse({ success: true });
  } catch {
    const lang = resolveUILang(settings?.uiLanguage);
    sendResponse({ success: false, error: t('settingsSaveError', lang) });
  }
}
