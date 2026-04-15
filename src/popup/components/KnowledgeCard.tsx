import React, { useState } from 'react';
import type { KnowledgePoint } from '../../types';
import { t, type UILang } from '../../i18n';

interface KnowledgeCardProps {
  point: KnowledgePoint;
  onUpdate: (point: KnowledgePoint) => void;
  onDelete: (id: string) => void;
  lang: UILang;
}

const ChevronIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
  </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
  </svg>
);

export const KnowledgeCard: React.FC<KnowledgeCardProps> = ({ point, onUpdate, onDelete, lang }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPoint, setEditedPoint] = useState<KnowledgePoint>(point);

  const handleSave = () => {
    onUpdate(editedPoint);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedPoint(point);
    setIsEditing(false);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (confirm(t('deleteConfirm', lang))) {
      onDelete(point.id);
    }
  };

  const handleEdit = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditedPoint(point);
    setIsEditing(true);
    setIsExpanded(true);
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-xl border-2 border-indigo-200 p-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-600">{t('editKP', lang)}</span>
          <div className="flex gap-1.5">
            <button onClick={handleCancel} className="px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 rounded-md transition-colors">
              {t('cancel', lang)}
            </button>
            <button onClick={handleSave} className="px-2.5 py-1 text-[11px] font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-md transition-colors">
              {t('save', lang)}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('question', lang)}</label>
            <input
              type="text"
              value={editedPoint.question}
              onChange={e => setEditedPoint({ ...editedPoint, question: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('answer', lang)}</label>
            <textarea
              value={editedPoint.answer}
              onChange={e => setEditedPoint({ ...editedPoint, answer: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('ext', lang)}</label>
            <textarea
              value={editedPoint.extension}
              onChange={e => setEditedPoint({ ...editedPoint, extension: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{t('tagsLabel', lang)}</label>
            <input
              type="text"
              value={editedPoint.tags.join(' ')}
              onChange={e => setEditedPoint({ ...editedPoint, tags: e.target.value.split(/\s+/).filter(Boolean) })}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-sm transition-all overflow-hidden">
      <div
        className="flex items-start gap-2 p-3 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <ChevronIcon className={`w-3.5 h-3.5 mt-0.5 text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-slate-800 leading-snug">{point.question}</p>
          {point.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {point.tags.slice(0, 5).map((tag, i) => (
                <span key={i} className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-600 rounded-md">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleEdit}
            className="p-1 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-md transition-colors"
            title={t('edit', lang)}
          >
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title={t('delete', lang)}
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-2 border-t border-slate-100 space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{t('answer', lang)}</p>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{point.answer}</p>
          </div>
          {point.extension && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 mb-0.5">{t('ext', lang)}</p>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{point.extension}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
