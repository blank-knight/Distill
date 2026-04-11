import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import type { KnowledgePoint } from '../types';
import { KnowledgeCard } from './components/KnowledgeCard';
import { ExportPanel } from './components/ExportPanel';

declare const chrome: any;

const App: React.FC = () => {
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadKnowledgePoints = async () => {
    try {
      const response = await (chrome as any).runtime.sendMessage({ action: 'GET_KNOWLEDGE_POINTS' });
      if (response.success) setKnowledgePoints(response.data || []);
    } catch {}
  };

  const extractKnowledge = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await (chrome as any).runtime.sendMessage({ action: 'EXTRACT_KNOWLEDGE' });
      if (response.success) {
        setKnowledgePoints(response.data || []);
      } else {
        setError(response.error || '提取失败');
      }
    } catch {
      setError('提取时发生错误');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (updatedPoint: KnowledgePoint) => {
    const updated = knowledgePoints.map(p => p.id === updatedPoint.id ? updatedPoint : p);
    setKnowledgePoints(updated);
    await (chrome as any).runtime.sendMessage({ action: 'SAVE_KNOWLEDGE_POINTS', points: updated });
  };

  const handleDelete = async (id: string) => {
    const updated = knowledgePoints.filter(p => p.id !== id);
    setKnowledgePoints(updated);
    await (chrome as any).runtime.sendMessage({ action: 'SAVE_KNOWLEDGE_POINTS', points: updated });
  };

  useEffect(() => { loadKnowledgePoints(); }, []);

  return (
    <div className="flex flex-col bg-slate-50" style={{ width: 400, height: 560 }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-slate-800">Distill</span>
          {knowledgePoints.length > 0 && (
            <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {knowledgePoints.length}
            </span>
          )}
        </div>
        <button
          onClick={extractKnowledge}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isLoading ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              提取中…
            </>
          ) : '提取知识点'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg leading-relaxed shrink-0">
          {error}
        </div>
      )}

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : knowledgePoints.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-4xl">📚</span>
            <p className="text-sm font-medium text-slate-500">暂无知识点</p>
            <p className="text-xs text-slate-400">在 Gemini 对话页面点击「提取知识点」</p>
          </div>
        ) : (
          <div className="space-y-2">
            {knowledgePoints.map(point => (
              <KnowledgeCard key={point.id} point={point} onUpdate={handleUpdate} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="shrink-0 bg-white border-t border-slate-200 px-3 py-2.5">
        <ExportPanel points={knowledgePoints} />
        <div className="flex justify-end mt-2">
          <button
            onClick={() => (chrome as any).runtime.openOptionsPage()}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            ⚙ 设置
          </button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
);
