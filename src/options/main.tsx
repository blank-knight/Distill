import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import type { UserSettings, ModelType, ExportFormat, LanguageOption } from '../types';
import { MODEL_META, DEFAULT_SETTINGS } from '../types';
import { t, resolveUILang, type UILang } from '../i18n';

declare const chrome: any;

const MODEL_ORDER: ModelType[] = ['glm', 'deepseek', 'qwen', 'moonshot', 'openai', 'doubao', 'claude'];

const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saved, setSaved] = useState(false);

  // 根据当前设置解析界面语言（实时随 settings.uiLanguage 变化）
  const lang: UILang = resolveUILang(settings.uiLanguage);

  useEffect(() => {
    chrome.storage.sync.get('user_settings', (result: any) => {
      if (result.user_settings) setSettings({ ...DEFAULT_SETTINGS, ...result.user_settings });
    });
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    setSaved(false);
    chrome.storage.sync.set({ user_settings: settings }, () => {
      setIsSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  };

  const testApiKey = async () => {
    const model = settings.model;
    const meta = MODEL_META[model];

    const keyField = `${model}ApiKey` as keyof UserSettings;
    const apiKey = settings[keyField] as string;

    if (!apiKey) {
      setTestResult({ success: false, message: t('optKeyRequired', lang, { model: meta.label }) });
      return;
    }
    if (model === 'doubao' && !settings.doubaoModel) {
      setTestResult({ success: false, message: t('optDoubaoRequired', lang) });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      if (model === 'claude') {
        const { default: Anthropic } = await import('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
        const res = await client.messages.create({
          model: meta.defaultModel,
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hi' }],
        });
        if (res.content.length > 0) {
          setTestResult({ success: true, message: t('optKeyValid', lang, { model: meta.label }) });
        } else {
          setTestResult({ success: false, message: t('optKeyInvalid', lang, { model: meta.label }) });
        }
      } else {
        const modelId = model === 'doubao' ? settings.doubaoModel : meta.defaultModel;
        const res = await fetch(`${meta.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelId,
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 50,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || `HTTP ${res.status}`);
        }
        if (data.choices?.length > 0) {
          setTestResult({ success: true, message: t('optKeyValid', lang, { model: meta.label }) });
        } else {
          setTestResult({ success: false, message: t('optKeyInvalid', lang, { model: meta.label }) });
        }
      }
    } catch (err: any) {
      const msg = err?.message || t('optTestFail', lang);
      setTestResult({
        success: false,
        message: msg.includes('401') ? t('optKeyExpired', lang, { model: meta.label }) : msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const set = (patch: Partial<UserSettings>) => setSettings(s => ({ ...s, ...patch }));

  const currentMeta = MODEL_META[settings.model];

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-sm mt-8 mb-8">
      <h1 className="text-xl font-bold text-gray-800 mb-1">{t('optTitle', lang)}</h1>
      <p className="text-xs text-gray-400 mb-6">{t('optShortcut', lang)}</p>

      <div className="space-y-6">

        {/* 界面语言（置顶，方便切换） */}
        <section>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('optUiLang', lang)}</label>
          <select
            value={settings.uiLanguage}
            onChange={e => set({ uiLanguage: e.target.value as LanguageOption })}
            className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="auto">{t('optAuto', lang)}</option>
            <option value="zh">{t('optChinese', lang)}</option>
            <option value="en">{t('optEnglish', lang)}</option>
          </select>
        </section>

        {/* 模型选择 */}
        <section>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{t('optModel', lang)}</label>
          <div className="grid grid-cols-2 gap-2">
            {MODEL_ORDER.map(m => (
              <button
                key={m}
                onClick={() => set({ model: m })}
                className={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  settings.model === m
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {MODEL_META[m].label}
              </button>
            ))}
          </div>
        </section>

        {/* API Keys */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">{t('optApiKeys', lang)}</h2>
          <div className="space-y-3">
            {MODEL_ORDER.map(m => {
              const meta = MODEL_META[m];
              const keyField = `${m}ApiKey` as keyof UserSettings;
              return (
                <div key={m} className={`p-3 rounded-lg border ${settings.model === m ? 'border-blue-200 bg-blue-50/30' : 'border-gray-100'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-600">{meta.label}</span>
                    <a href={meta.docUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline">{t('optGetKey', lang)}</a>
                  </div>
                  <input
                    type="password"
                    value={settings[keyField] as string}
                    onChange={e => set({ [keyField]: e.target.value } as any)}
                    placeholder={meta.apiKeyLabel}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {m === 'doubao' && (
                    <input
                      type="text"
                      value={settings.doubaoModel}
                      onChange={e => set({ doubaoModel: e.target.value })}
                      placeholder={t('optDoubaoPlaceholder', lang)}
                      className="w-full mt-1.5 px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* 测试当前模型 */}
        <section>
          <button
            onClick={testApiKey}
            disabled={isTesting}
            className="w-full py-2 text-sm font-medium border-2 border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {isTesting ? t('optTesting', lang) : t('optTest', lang, { model: currentMeta.label })}
          </button>
          {testResult && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {testResult.message}
            </div>
          )}
        </section>

        {/* 其他设置 */}
        <section className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('optExtractLang', lang)}</label>
            <select
              value={settings.defaultLanguage}
              onChange={e => set({ defaultLanguage: e.target.value as LanguageOption })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="auto">{t('optFollowConv', lang)}</option>
              <option value="zh">{t('optChinese', lang)}</option>
              <option value="en">{t('optEnglish', lang)}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('optExportFormat', lang)}</label>
            <select
              value={settings.defaultExportFormat}
              onChange={e => set({ defaultExportFormat: e.target.value as ExportFormat })}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="anki">Anki</option>
              <option value="obsidian">Obsidian</option>
              <option value="notion">Notion</option>
            </select>
          </div>
        </section>

        {/* 保存 */}
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className={`w-full py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            saved ? 'bg-green-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
          }`}
        >
          {saved ? t('optSaved', lang) : isSaving ? t('optSaving', lang) : t('optSave', lang)}
        </button>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
