import type { KnowledgePoint } from '../types';

declare const chrome: any;

/**
 * 导出为 Anki 导入格式（.txt tab分隔）
 *
 * 使用方法：在 Anki 中 File → Import → 选择此文件
 * 字段映射：正面=问题，背面=答案+延伸，标签=第3列
 */
export function exportToAnki(points: KnowledgePoint[]): void {
  if (points.length === 0) return;

  // Anki txt 导入格式
  // #tags column:N 指定第 N 列为标签（从1开始）
  const header = [
    '#separator:tab',
    '#html:true',
    '#deck:Distill',
    '#notetype:Basic',
    '#tags column:3',
  ].join('\n');

  const rows = points.map(point => {
    const front = escapeField(point.question);

    // 背面：答案 + 延伸（用 HTML 格式排版）
    const backParts = [`<b>答案</b><br>${escapeField(point.answer)}`];
    if (point.extension) {
      backParts.push(`<br><b>延伸</b><br><i>${escapeField(point.extension)}</i>`);
    }
    if (point.source_url) {
      backParts.push(`<br><small><a href="${point.source_url}">${point.source_url}</a></small>`);
    }
    const back = backParts.join('');

    const tags = point.tags.join(' ');
    return [front, back, tags].join('\t');
  });

  const text = header + '\n' + rows.join('\n');

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);

  (chrome as any).downloads.download(
    { url, filename: `distill-anki-${date}.txt`, saveAs: true },
    () => URL.revokeObjectURL(url)
  );
}

function escapeField(text: string): string {
  // 转义 tab、换行，保留其余内容
  return text.replace(/\t/g, ' ').replace(/\n/g, '<br>');
}
