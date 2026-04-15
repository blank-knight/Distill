import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import type { KnowledgePoint } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { KnowledgeCard } from './components/KnowledgeCard';
import { ExportPanel } from './components/ExportPanel';
import { t, resolveUILang, type UILang } from '../i18n';

declare const chrome: any;

const STORAGE_KEY = 'knowledge_points';

const DropIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 128 128" fill="none">
    <path d="M64 24C53 39 38 58 38 78C38 92.36 49.64 104 64 104C78.36 104 90 92.36 90 78C90 58 75 39 64 24Z" fill="currentColor" />
  </svg>
);

const App: React.FC = () => {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [lang, setLang] = useState<UILang>(() => resolveUILang(undefined));
  const extractingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 加载语言设置
  useEffect(() => {
    chrome.storage.sync.get('user_settings', (result: any) => {
      const s = { ...DEFAULT_SETTINGS, ...(result.user_settings || {}) };
      setLang(resolveUILang(s.uiLanguage));
    });
  }, []);

  useEffect(() => {
    chrome.storage.local.get([STORAGE_KEY, 'distill_extracting'], (result: any) => {
      setKnowledgePoints(result[STORAGE_KEY] || []);
      // 恢复提取状态（防止关闭再打开后丢失）
      const startTime = result.distill_extracting;
      if (startTime && typeof startTime === 'number') {
        const elapsed = Date.now() - startTime;
        if (elapsed < 120000) {
          setExtracting(true);
          extractingRef.current = true;
          timeoutRef.current = setTimeout(() => {
            if (extractingRef.current) {
              extractingRef.current = false;
              setExtracting(false);
              setError(t('extractTimeout', lang));
              chrome.storage.local.set({ distill_extracting: 0 });
            }
          }, 120000 - elapsed);
        } else {
          // 超过 2 分钟的旧状态，清除
          chrome.storage.local.set({ distill_extracting: 0 });
        }
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    const listener = (changes: any, area: string) => {
      if (area === 'sync' && 'user_settings' in changes) {
        const s = { ...DEFAULT_SETTINGS, ...(changes.user_settings.newValue || {}) };
        setLang(resolveUILang(s.uiLanguage));
        return;
      }
      if (area !== 'local') return;
      if (STORAGE_KEY in changes) {
        setKnowledgePoints(changes[STORAGE_KEY].newValue || []);
      }
      if ('distill_extract_done' in changes && extractingRef.current) {
        extractingRef.current = false;
        setExtracting(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        chrome.storage.local.set({ distill_extracting: 0 });
        const done = changes.distill_extract_done.newValue;
        if (done?.success) {
          setSuccessMsg(t('extractDone', lang, { count: done.count }));
          setTimeout(() => setSuccessMsg(null), 3000);
        } else if (done && !done.success) {
          setError(done.error || t('extractFail', lang));
        }
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [lang]);

  const extractKnowledge = () => {
    if (extractingRef.current) return; // 防止重复提取
    setError(null);
    setSuccessMsg(null);
    setExtracting(true);
    extractingRef.current = true;
    chrome.storage.local.set({ distill_extracting: Date.now() });

    timeoutRef.current = setTimeout(() => {
      if (extractingRef.current) {
        extractingRef.current = false;
        setExtracting(false);
        setError(t('extractTimeout', lang));
        chrome.storage.local.set({ distill_extracting: 0 });
      }
    }, 120000);

    chrome.runtime.sendMessage({ action: 'EXTRACT_KNOWLEDGE' }, (res: any) => {
      if (chrome.runtime.lastError || !res) {
        extractingRef.current = false;
        setExtracting(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        chrome.storage.local.set({ distill_extracting: 0 });
        setError(t('extractNoConn', lang));
        return;
      }
      if (!res.success) {
        extractingRef.current = false;
        setExtracting(false);
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        chrome.storage.local.set({ distill_extracting: 0 });
        setError(res.error || t('extractFail', lang));
        return;
      }
    });
  };

  const clearAll = () => {
    if (!confirm(t('clearConfirm', lang, { count: knowledgePoints.length }))) return;
    setKnowledgePoints([]);
    chrome.storage.local.remove(STORAGE_KEY);
  };

  const handleUpdate = (updated: KnowledgePoint) => {
    const next = knowledgePoints.map(p => p.id === updated.id ? updated : p);
    setKnowledgePoints(next);
    chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  const handleDelete = (id: string) => {
    const next = knowledgePoints.filter(p => p.id !== id);
    setKnowledgePoints(next);
    chrome.storage.local.set({ [STORAGE_KEY]: next });
  };

  return (
    <div className="flex flex-col bg-slate-50" style={{ width: 400, height: 560 }}>

      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <DropIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white tracking-tight">Distill</span>
            {knowledgePoints.length > 0 && (
              <span className="text-[11px] font-bold bg-white/25 text-white px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {knowledgePoints.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {knowledgePoints.length > 0 && (
              <button
                onClick={clearAll}
                className="px-2 py-1 text-[11px] font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title={t('clear', lang)}
              >
                {t('clear', lang)}
              </button>
            )}
            <button
              onClick={extractKnowledge}
              disabled={extracting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 disabled:opacity-60 shadow-sm transition-all"
            >
              {extracting ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  {t('extracting', lang)}
                </>
              ) : t('extract', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* ── Banners ── */}
      {extracting && (
        <div className="mx-3 mt-2 px-3 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs rounded-lg shrink-0 flex items-center gap-2">
          <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin shrink-0" />
          {t('extractBg', lang)}
        </div>
      )}

      {successMsg && (
        <div className="mx-3 mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg shrink-0 flex items-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg leading-relaxed shrink-0">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : knowledgePoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <DropIcon className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">{t('emptyTitle', lang)}</p>
              <p className="text-xs text-slate-400 mt-1">{t('emptySubtitle', lang)}</p>
            </div>
            <div className="text-[10px] text-slate-400 space-y-0.5">
              <p>{t('platforms1', lang)}</p>
              <p>{t('platforms2', lang)}</p>
            </div>
            <p className="text-[10px] text-indigo-400 font-medium">{t('shortcut', lang)}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgePoints.map(point => (
              <KnowledgeCard key={point.id} point={point} onUpdate={handleUpdate} onDelete={handleDelete} lang={lang} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-3 pt-2.5 pb-2.5">
        <ExportPanel points={knowledgePoints} />
        <div className="flex justify-end mt-1.5">
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-[11px] text-slate-400 hover:text-indigo-500 transition-colors"
          >
            {t('settings', lang)}
          </button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
