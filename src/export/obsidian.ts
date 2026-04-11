import JSZip from 'jszip';
import type { KnowledgePoint } from '../types';

declare const chrome: any;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40);
}

export async function exportToObsidian(points: KnowledgePoint[]): Promise<void> {
  if (points.length === 0) {
    alert('没有可导出的知识点');
    return;
  }

  const zip = new JSZip();

  // 为每个知识点创建 Markdown 文件
  points.forEach(point => {
    const slug = slugify(point.question);
    const filename = `${slug}.md`;

    const content = `---
tags: [${point.tags.map(tag => `"${tag}"`).join(', ')}]
created: ${point.created_at.slice(0, 10)}
source: ${point.source_url}
---

## Question
${point.question}

## Answer
${point.answer}

## Extension
${point.extension}
`;

    zip.file(filename, content);
  });

  // 生成 ZIP 文件
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);

  // 生成文件名
  const date = new Date().toISOString().slice(0, 10);
  const filename = `distill-${date}.zip`;

  // 触发下载
  (chrome as any).downloads.download({
    url,
    filename,
    saveAs: true
  }, () => {
    // 释放 URL 对象
    URL.revokeObjectURL(url);
  });
}