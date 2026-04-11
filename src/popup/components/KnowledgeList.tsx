import React from 'react';
import type { KnowledgePoint } from '../../types';
import { KnowledgeCard } from './KnowledgeCard';

interface KnowledgeListProps {
  points: KnowledgePoint[];
  isLoading: boolean;
  onUpdate: (point: KnowledgePoint) => void;
  onDelete: (id: string) => void;
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ points, isLoading, onUpdate, onDelete }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="text-3xl mb-2">📚</div>
        <p className="text-xs font-medium text-gray-500">暂无知识点</p>
        <p className="text-xs text-gray-400 mt-1">在 Gemini 对话页面点击「提取知识点」</p>
      </div>
    );
  }

  return (
    <div>
      {points.map(point => (
        <KnowledgeCard key={point.id} point={point} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </div>
  );
};
