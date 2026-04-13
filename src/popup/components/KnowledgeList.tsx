import React from 'react';
import type { KnowledgePoint } from '../../types';
import { KnowledgeCard } from './KnowledgeCard';

interface KnowledgeListProps {
  points: KnowledgePoint[];
  isLoading: boolean;
  onUpdate: (point: KnowledgePoint) => void;
  onDelete: (id: string) => void;
}

export const KnowledgeList: React.FC<KnowledgeListProps> = ({ 
  points, 
  isLoading, 
  onUpdate, 
  onDelete 
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="text-center py-10 text-gray-500">
        <p>还没有提取知识点</p>
        <p className="text-sm mt-1">点击上方按钮从 Gemini 对话中提取</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {points.map(point => (
        <KnowledgeCard
          key={point.id}
          point={point}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};