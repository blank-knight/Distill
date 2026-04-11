import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import type { UserSettings, ExportFormat, LanguageOption } from '../types';
import Anthropic from '@anthropic-ai/sdk';

declare const chrome: any;

const App: React.FC = () => {
  const [settings, setSettings] = useState<UserSettings>({
    model: 'claude',
    claudeApiKey: '',
    glmApiKey: '',
    defaultExportFormat: 'anki',
    defaultLanguage: 'auto'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载设置
  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const response = await (chrome as any).runtime.sendMessage({ action: 'GET_SETTINGS' });
      if (response.success) {
        setSettings(response.data);
      } else {
        setError(response.error || '加载设置失败');
      }
    } catch (err) {
      setError('加载设置时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存设置
  const saveSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await (chrome as any).runtime.sendMessage({
        action: 'SAVE_SETTINGS',
        settings
      });
      if (response.success) {
        alert('设置保存成功');
      } else {
        setError(response.error || '保存设置失败');
      }
    } catch (err) {
      setError('保存设置时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  // 测试 API Key
  const testApiKey = async () => {
    const apiKey = settings.model === 'claude' ? settings.claudeApiKey : settings.glmApiKey;
    if (!apiKey) {
      setTestResult({ success: false, message: `请输入 ${settings.model === 'claude' ? 'Claude' : 'GLM'} API Key` });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      
      if (settings.model === 'claude') {
        // 初始化 Anthropic 客户端
        const anthropic = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true
        });

        // 发送一个最小请求测试 API Key
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 10,
          messages: [{ role: "user", content: "Hello" }]
        });

        if (response.content.length > 0) {
          setTestResult({ success: true, message: 'Claude API Key 有效' });
        } else {
          setTestResult({ success: false, message: 'Claude API Key 无效' });
        }
      } else if (settings.model === 'glm') {
        const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "glm-4-flash",
            messages: [{ role: "user", content: "Hello" }],
            max_tokens: 50
          })
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error.message || 'GLM API 调用失败');
        }

        if (data.choices && data.choices.length > 0) {
          setTestResult({ success: true, message: 'GLM API Key 有效' });
        } else {
          setTestResult({ success: false, message: 'GLM API Key 无效' });
        }
      }
    } catch (error) {
      let errorMessage = `测试 ${settings.model === 'claude' ? 'Claude' : 'GLM'} API Key 时发生错误`;
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          errorMessage = `${settings.model === 'claude' ? 'Claude' : 'GLM'} API Key 无效或已过期`;
        } else {
          errorMessage = error.message;
        }
      }
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsTesting(false);
    }
  };

  // 初始化时加载设置
  useEffect(() => {
    loadSettings();
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-sm mt-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Distill - 设置</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* 模型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">模型选择</label>
          <select
            value={settings.model}
            onChange={(e) => setSettings({ ...settings, model: e.target.value as 'claude' | 'glm' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="claude">Claude</option>
            <option value="glm">GLM</option>
          </select>
        </div>

        {/* Claude API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Claude API Key</label>
          <div className="flex">
            <input
              type="password"
              value={settings.claudeApiKey}
              onChange={(e) => setSettings({ ...settings, claudeApiKey: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-ant-..."
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            获取 API Key: <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://console.anthropic.com/</a>
          </p>
        </div>

        {/* GLM API Key */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">GLM API Key</label>
          <div className="flex">
            <input
              type="password"
              value={settings.glmApiKey}
              onChange={(e) => setSettings({ ...settings, glmApiKey: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="your-glm-api-key"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            获取 API Key: <a href="https://docs.bigmodel.cn/cn/guide/start/quick-start" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">https://docs.bigmodel.cn/</a>
          </p>
        </div>

        {/* 测试 API Key */}
        <div>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={testApiKey}
            disabled={isTesting}
          >
            {isTesting ? '测试中...' : `测试 ${settings.model === 'claude' ? 'Claude' : 'GLM'} API Key`}
          </button>
          {testResult && (
            <div className={`mt-2 px-3 py-2 rounded ${testResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {testResult.message}
            </div>
          )}
        </div>

        {/* 默认语言 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">默认语言</label>
          <select
            value={settings.defaultLanguage}
            onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value as LanguageOption })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="auto">跟随对话</option>
            <option value="zh">中文</option>
            <option value="en">英文</option>
          </select>
        </div>

        {/* 默认导出格式 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">默认导出格式</label>
          <select
            value={settings.defaultExportFormat}
            onChange={(e) => setSettings({ ...settings, defaultExportFormat: e.target.value as ExportFormat })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="anki">Anki</option>
            <option value="obsidian">Obsidian</option>
            <option value="notion">Notion（后续实现）</option>
          </select>
        </div>

        {/* 保存按钮 */}
        <div>
          <button
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={saveSettings}
            disabled={isLoading}
          >
            {isLoading ? '保存中...' : '保存设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);