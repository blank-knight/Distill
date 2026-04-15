export type UILang = 'zh' | 'en';

export function resolveUILang(setting: string | undefined): UILang {
  if (setting === 'zh' || setting === 'en') return setting;
  try {
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

const zh: Record<string, string> = {
  // ── Popup ──
  'extract': '提取知识点',
  'extracting': '提取中…',
  'extractBg': '正在后台提取，完成后会自动显示，可关闭此窗口',
  'extractTimeout': '提取超时，请检查网络和 API Key 后重试',
  'extractNoConn': '无法连接后台服务，请重新加载插件',
  'extractDone': '提取完成，新增 {count} 个知识点',
  'extractFail': '提取失败',
  'clear': '清空',
  'clearConfirm': '确定要删除全部 {count} 个知识点吗？',
  'settings': '设置',
  'emptyTitle': '暂无知识点',
  'emptySubtitle': '从 AI 对话中提取结构化知识',
  'platforms1': 'ChatGPT / Gemini / Claude / DeepSeek',
  'platforms2': 'Kimi / 豆包 / 通义千问 / 文心一言 / 星火',
  'shortcut': '快捷键 Ctrl+Shift+E',

  // ── Knowledge Card ──
  'answer': '答案',
  'ext': '延伸',
  'editKP': '编辑知识点',
  'edit': '编辑',
  'delete': '删除',
  'deleteConfirm': '确定要删除这个知识点吗？',
  'save': '保存',
  'cancel': '取消',
  'question': '问题',
  'tagsLabel': '标签（空格分隔）',

  // ── Options ──
  'optTitle': 'Distill — 设置',
  'optShortcut': '快捷键：Ctrl+Shift+E（Mac: ⌘+Shift+E）在 AI 对话页面后台提取',
  'optModel': '当前使用模型',
  'optApiKeys': 'API Key 配置',
  'optGetKey': '获取 Key →',
  'optTest': '测试 {model} API Key',
  'optTesting': '测试中…',
  'optKeyValid': '{model} API Key 有效 ✓',
  'optKeyInvalid': '{model} API Key 无效',
  'optKeyExpired': '{model} API Key 无效或已过期',
  'optKeyRequired': '请先输入 {model} API Key',
  'optDoubaoRequired': '请先输入豆包 Model ID',
  'optTestFail': '测试失败',
  'optUiLang': '界面语言',
  'optExtractLang': '提取语言',
  'optExportFormat': '默认导出格式',
  'optFollowConv': '跟随对话',
  'optChinese': '中文',
  'optEnglish': 'English',
  'optAuto': '跟随系统',
  'optSave': '保存设置',
  'optSaving': '保存中…',
  'optSaved': '已保存 ✓',
  'optDoubaoPlaceholder': 'Model ID / Endpoint ID（必填）',

  // ── Background / Notifications ──
  'notifExtracting': '正在后台提取知识点…',
  'notifDone': '新增 {count} 个知识点，累计 {total} 个',
  'notifUnsupported': '请在支持的 AI 对话页面（ChatGPT、Gemini、Claude、DeepSeek 等）使用快捷键',
  'notifNoConv': '未检测到对话内容，请确认页面上有对话记录',
  'notifNoKey': '请先在设置页面配置 {model} API Key',

  // ── Error messages ──
  'errUnsupported': '当前页面不支持提取，请在 ChatGPT、Gemini、Claude、DeepSeek、Kimi、豆包、通义千问等页面使用',
  'errNoTab': '无法获取当前标签页',
  'errNoConv': '未检测到对话内容，请确认页面上有对话记录',
  'errNoKey': '请在设置页面配置 {model} API Key',
  'errBackend': '后台发生错误，请重试',
  'errBackendShort': '后台发生错误',
  'errUnknownShort': '未知错误',
  'errExtractFail': '提取失败',

  // ── Extractor ──
  'extNoKey': '请在设置页面配置 {model} API Key',
  'extDoubaoMissing': '请在设置页面配置豆包 Model ID（Endpoint ID）',
  'extEmpty': 'API 返回内容为空，请检查模型配置或稍后重试',
  'extParse': 'API 返回格式错误，无法解析知识点',
  'extError': '提取知识点时发生错误',
  'extKeyInvalid': '{model} API Key 无效或已过期',
  'extRateLimit': 'API 请求频率过高，请稍后再试',

  // ── Storage errors ──
  'storageGetError': '获取知识点时发生错误',
  'storageSaveError': '保存知识点时发生错误',
  'storageClearError': '清除知识点时发生错误',
  'settingsGetError': '获取设置时发生错误',
  'settingsSaveError': '保存设置时发生错误',
};

const en: Record<string, string> = {
  // ── Popup ──
  'extract': 'Extract',
  'extracting': 'Extracting…',
  'extractBg': 'Extracting in background. Results will appear automatically.',
  'extractTimeout': 'Timed out. Check your network and API Key.',
  'extractNoConn': 'Cannot connect to background service. Please reload extension.',
  'extractDone': 'Done! {count} new knowledge points extracted.',
  'extractFail': 'Extraction failed',
  'clear': 'Clear',
  'clearConfirm': 'Delete all {count} knowledge points?',
  'settings': 'Settings',
  'emptyTitle': 'No Knowledge Points',
  'emptySubtitle': 'Extract structured knowledge from AI conversations',
  'platforms1': 'ChatGPT / Gemini / Claude / DeepSeek',
  'platforms2': 'Kimi / Doubao / Qwen / Wenxin / Spark',
  'shortcut': 'Shortcut: Ctrl+Shift+E',

  // ── Knowledge Card ──
  'answer': 'Answer',
  'ext': 'Extension',
  'editKP': 'Edit Knowledge Point',
  'edit': 'Edit',
  'delete': 'Delete',
  'deleteConfirm': 'Delete this knowledge point?',
  'save': 'Save',
  'cancel': 'Cancel',
  'question': 'Question',
  'tagsLabel': 'Tags (space-separated)',

  // ── Options ──
  'optTitle': 'Distill — Settings',
  'optShortcut': 'Shortcut: Ctrl+Shift+E (Mac: ⌘+Shift+E) to extract from AI chat pages',
  'optModel': 'Active Model',
  'optApiKeys': 'API Key Configuration',
  'optGetKey': 'Get Key →',
  'optTest': 'Test {model} API Key',
  'optTesting': 'Testing…',
  'optKeyValid': '{model} API Key valid ✓',
  'optKeyInvalid': '{model} API Key invalid',
  'optKeyExpired': '{model} API Key invalid or expired',
  'optKeyRequired': 'Please enter {model} API Key first',
  'optDoubaoRequired': 'Please enter Doubao Model ID first',
  'optTestFail': 'Test failed',
  'optUiLang': 'UI Language',
  'optExtractLang': 'Extract Language',
  'optExportFormat': 'Export Format',
  'optFollowConv': 'Auto-detect',
  'optChinese': '中文',
  'optEnglish': 'English',
  'optAuto': 'System Default',
  'optSave': 'Save Settings',
  'optSaving': 'Saving…',
  'optSaved': 'Saved ✓',
  'optDoubaoPlaceholder': 'Model ID / Endpoint ID (required)',

  // ── Background / Notifications ──
  'notifExtracting': 'Extracting knowledge points…',
  'notifDone': '{count} new points, {total} total.',
  'notifUnsupported': 'Please use on a supported AI chat page (ChatGPT, Gemini, Claude, etc.)',
  'notifNoConv': 'No conversation detected on this page.',
  'notifNoKey': 'Please configure {model} API Key in settings.',

  // ── Error messages ──
  'errUnsupported': 'Page not supported. Use on ChatGPT, Gemini, Claude, DeepSeek, Kimi, Doubao, Qwen, etc.',
  'errNoTab': 'Cannot access current tab',
  'errNoConv': 'No conversation detected on this page.',
  'errNoKey': 'Please configure {model} API Key in settings.',
  'errBackend': 'Background error. Please try again.',
  'errBackendShort': 'Background error',
  'errUnknownShort': 'Unknown error',
  'errExtractFail': 'Extraction failed',

  // ── Extractor ──
  'extNoKey': 'Please configure {model} API Key in settings.',
  'extDoubaoMissing': 'Please configure Doubao Model ID (Endpoint ID) in settings.',
  'extEmpty': 'API returned empty response. Check model config or try again.',
  'extParse': 'Failed to parse knowledge points from API response.',
  'extError': 'Error during knowledge extraction.',
  'extKeyInvalid': '{model} API Key invalid or expired.',
  'extRateLimit': 'API rate limit exceeded. Please try again later.',

  // ── Storage errors ──
  'storageGetError': 'Failed to get knowledge points',
  'storageSaveError': 'Failed to save knowledge points',
  'storageClearError': 'Failed to clear knowledge points',
  'settingsGetError': 'Failed to get settings',
  'settingsSaveError': 'Failed to save settings',
};

const messages: Record<UILang, Record<string, string>> = { zh, en };

export function t(key: string, lang: UILang, params?: Record<string, string | number>): string {
  let text = messages[lang]?.[key] ?? messages.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
