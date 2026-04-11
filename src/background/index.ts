import { extractKnowledge } from './extractor';
import type { KnowledgePoint, UserSettings } from '../types';

declare const chrome: any;

// 存储键名
const STORAGE_KEYS = {
  KNOWLEDGE_POINTS: 'knowledge_points',
  USER_SETTINGS: 'user_settings'
};

// 监听来自 Popup 的消息
(chrome as any).runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response: any) => void) => {
  switch (message.action) {
    case 'EXTRACT_KNOWLEDGE':
      handleExtractKnowledge(message, _sender, sendResponse);
      return true; // 异步响应
    case 'GET_KNOWLEDGE_POINTS':
      handleGetKnowledgePoints(sendResponse);
      return true; // 异步响应
    case 'SAVE_KNOWLEDGE_POINTS':
      handleSaveKnowledgePoints(message.points, sendResponse);
      return true; // 异步响应
    case 'CLEAR_KNOWLEDGE_POINTS':
      handleClearKnowledgePoints(sendResponse);
      return true; // 异步响应
    case 'GET_SETTINGS':
      handleGetSettings(sendResponse);
      return true; // 异步响应
    case 'SAVE_SETTINGS':
      handleSaveSettings(message.settings, sendResponse);
      return true; // 异步响应
    default:
      sendResponse({ success: false, error: '未知操作' });
      return false;
  }
});

async function handleExtractKnowledge(_message: any, _sender: any, sendResponse: (response: any) => void) {
  try {
    // 获取当前标签页
    const [tab] = await (chrome as any).tabs.query({ active: true, currentWindow: true });
    if (!tab.id) {
      sendResponse({ success: false, error: '无法获取当前标签页' });
      return;
    }

    // 检查当前页面是否是支持的 AI 对话页面
    const tabUrl = tab.url || '';
    const supportedDomains = ['gemini.google.com'];
    const isSupported = supportedDomains.some(domain => tabUrl.includes(domain));
    if (!isSupported) {
      sendResponse({ success: false, error: `当前页面不支持提取，请在以下页面使用：${supportedDomains.join('、')}` });
      return;
    }

    // 向 Content Script 发送消息，获取对话内容
    let contentResponse: any;
    try {
      contentResponse = await (chrome as any).tabs.sendMessage(tab.id, { action: 'EXTRACT_CONVERSATION' });
    } catch {
      sendResponse({ success: false, error: '无法连接页面，请刷新页面后重试' });
      return;
    }
    const conversation = contentResponse?.conversation || [];

    if (conversation.length === 0) {
      sendResponse({ success: false, error: '未检测到对话内容，请确保页面上有对话记录' });
      return;
    }

    // 获取用户设置
    const settings = await (chrome as any).storage.sync.get(STORAGE_KEYS.USER_SETTINGS);
    const userSettings = settings[STORAGE_KEYS.USER_SETTINGS] as UserSettings;

    const apiKey = userSettings.model === 'claude' ? userSettings.claudeApiKey : userSettings.glmApiKey;
    if (!apiKey) {
      const modelName = userSettings.model === 'claude' ? 'Claude' : 'GLM';
      sendResponse({ success: false, error: `请在设置页面配置 ${modelName} API Key` });
      return;
    }

    // 调用知识提取器
    const extractorResult = await extractKnowledge(
      conversation,
      apiKey,
      tab.url || '',
      userSettings.model,
      userSettings.defaultLanguage
    );

    if (!extractorResult.success) {
      sendResponse({ success: false, error: extractorResult.error });
      return;
    }

    // 存储知识点
    const knowledgePoints = extractorResult.data || [];
    await (chrome as any).storage.local.set({
      [STORAGE_KEYS.KNOWLEDGE_POINTS]: knowledgePoints
    });

    sendResponse({ success: true, data: knowledgePoints });
  } catch (error) {
    console.error('提取知识失败:', error);
    sendResponse({ success: false, error: '提取知识时发生错误' });
  }
}

async function handleGetKnowledgePoints(sendResponse: (response: any) => void) {
  try {
    const result = await (chrome as any).storage.local.get(STORAGE_KEYS.KNOWLEDGE_POINTS);
    const knowledgePoints = result[STORAGE_KEYS.KNOWLEDGE_POINTS] || [];
    sendResponse({ success: true, data: knowledgePoints });
  } catch (error) {
    console.error('获取知识点失败:', error);
    sendResponse({ success: false, error: '获取知识点时发生错误' });
  }
}

async function handleSaveKnowledgePoints(points: KnowledgePoint[], sendResponse: (response: any) => void) {
  try {
    await (chrome as any).storage.local.set({
      [STORAGE_KEYS.KNOWLEDGE_POINTS]: points
    });
    sendResponse({ success: true });
  } catch (error) {
    console.error('保存知识点失败:', error);
    sendResponse({ success: false, error: '保存知识点时发生错误' });
  }
}

async function handleClearKnowledgePoints(sendResponse: (response: any) => void) {
  try {
    await (chrome as any).storage.local.remove(STORAGE_KEYS.KNOWLEDGE_POINTS);
    sendResponse({ success: true });
  } catch (error) {
    console.error('清除知识点失败:', error);
    sendResponse({ success: false, error: '清除知识点时发生错误' });
  }
}

async function handleGetSettings(sendResponse: (response: any) => void) {
  try {
    const result = await (chrome as any).storage.sync.get(STORAGE_KEYS.USER_SETTINGS);
    const settings = result[STORAGE_KEYS.USER_SETTINGS] || {
      model: 'claude',
      claudeApiKey: '',
      glmApiKey: '',
      defaultExportFormat: 'anki',
      defaultLanguage: 'auto'
    };
    sendResponse({ success: true, data: settings });
  } catch (error) {
    console.error('获取设置失败:', error);
    sendResponse({ success: false, error: '获取设置时发生错误' });
  }
}

async function handleSaveSettings(settings: UserSettings, sendResponse: (response: any) => void) {
  try {
    await (chrome as any).storage.sync.set({
      [STORAGE_KEYS.USER_SETTINGS]: settings
    });
    sendResponse({ success: true });
  } catch (error) {
    console.error('保存设置失败:', error);
    sendResponse({ success: false, error: '保存设置时发生错误' });
  }
}