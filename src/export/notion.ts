import type { KnowledgePoint } from '../types';

declare const chrome: any;

/**
 * 导出为 Notion 可导入的 CSV 文件
 *
 * 使用方法：
 * 1. 在 Notion 中创建一个新 Database（Table 视图）
 * 2. 点击右上角 ··· → Import → CSV → 选择此文件
 * 3. Notion 会自动将每列映射为数据库属性
 */
export async function exportToNotion(points: KnowledgePoint[]): Promise<void> {
  if (points.length === 0) return;

  const headers = ['Question', 'Answer', 'Extension', 'Tags', 'Source', 'Created'];

  const rows = points.map(point => [
    csvCell(point.question),
    csvCell(point.answer),
    csvCell(point.extension),
    csvCell(point.tags.join(', ')),
    csvCell(point.source_url),
    csvCell(point.created_at.slice(0, 10)),
  ]);

  const csv = [
    headers.map(csvCell).join(','),
    ...rows.map(r => r.join(',')),
  ].join('\r\n');

  // UTF-8 BOM 确保 Excel / Notion 正确识别中文
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  (chrome as any).downloads.download(
    { url, filename: `distill-notion-${date}.csv`, saveAs: true },
    () => URL.revokeObjectURL(url)
  );
}

function csvCell(value: string): string {
  // RFC 4180: 包含逗号、换行或双引号的字段需用双引号包裹，内部双引号转义为 ""
  const str = value ?? '';
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
