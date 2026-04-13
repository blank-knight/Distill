import React from 'react';
import type { KnowledgePoint } from '../../types';
import { exportToAnki } from '../../export/anki';
import { exportToObsidian } from '../../export/obsidian';
import { exportToNotion } from '../../export/notion';

interface ExportPanelProps {
  points: KnowledgePoint[];
}

export const ExportPanel: React.FC<ExportPanelProps> = ({ points }) => {
  const disabled = points.length === 0;

  return (
    <div className="flex gap-1.5">
      <button
        onClick={() => exportToAnki(points)}
        disabled={disabled}
        className="flex-1 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm disabled:shadow-none"
      >
        Anki
      </button>
      <button
        onClick={() => exportToObsidian(points)}
        disabled={disabled}
        className="flex-1 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm disabled:shadow-none"
      >
        Obsidian
      </button>
      <button
        onClick={() => exportToNotion(points)}
        disabled={disabled}
        className="flex-1 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm disabled:shadow-none"
      >
        Notion
      </button>
    </div>
  );
};
