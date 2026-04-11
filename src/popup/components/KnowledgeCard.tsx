import React, { useState } from 'react';
import type { KnowledgePoint } from '../../types';

interface KnowledgeCardProps {
  point: KnowledgePoint;
  onUpdate: (point: KnowledgePoint) => void;
  onDelete: (id: string) => void;
}

export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ point, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [edited, setEdited] = useState<KnowledgePoint>(point);

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">编辑</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => { onUpdate(edited); setIsEditing(false); }}
              className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
            <button
              onClick={() => { setEdited(point); setIsEditing(false); }}
              className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <input
            value={edited.question}
            onChange={e => setEdited({ ...edited, question: e.target.value })}
            placeholder="问题"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <textarea
            value={edited.answer}
            onChange={e => setEdited({ ...edited, answer: e.target.value })}
            placeholder="答案"
            rows={3}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <textarea
            value={edited.extension}
            onChange={e => setEdited({ ...edited, extension: e.target.value })}
            placeholder="延伸阅读"
            rows={2}
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
          <input
            value={edited.tags.join(' ')}
            onChange={e => setEdited({ ...edited, tags: e.target.value.split(/\s+/).filter(Boolean) })}
            placeholder="标签（空格分隔）"
            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-3.5 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
      {/* Question */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug flex-1">{point.question}</p>
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsEditing(true)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors text-xs"
            title="编辑"
          >
            ✎
          </button>
          <button
            onClick={() => { if (confirm('确定删除？')) onDelete(point.id); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors text-xs"
            title="删除"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Answer */}
      <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{point.answer}</p>

      {/* Extension */}
      {point.extension && (
        <p className="text-xs text-slate-400 leading-relaxed mt-1.5 line-clamp-2 border-l-2 border-slate-200 pl-2">
          {point.extension}
        </p>
      )}

      {/* Tags */}
      {point.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {point.tags.map((tag, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-md font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
