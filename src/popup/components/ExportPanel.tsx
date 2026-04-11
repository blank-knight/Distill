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
        className="flex-1 py-1.5 text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Anki
      </button>
      <button
        onClick={() => exportToObsidian(points)}
        disabled={disabled}
        className="flex-1 py-1.5 text-xs font-semibold text-white bg-teal-500 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Obsidian
      </button>
      <button
        onClick={() => exportToNotion(points)}
        disabled={disabled}
        className="flex-1 py-1.5 text-xs font-semibold text-white bg-purple-500 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
      >
        Notion
      </button>
    </div>
  );
};
