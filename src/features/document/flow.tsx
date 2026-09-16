import type { ReactNode } from 'react';
import type { DocBlock, DocumentModel } from './types';
import type { DocTemplate } from './templates';
import {
  DocHeader,
  KeyValueBlock,
  ListBlock,
  MetaBlock,
  NoteBlock,
  SectionTitle,
  StatsBlock,
  TableEmptyRow,
  TableHead,
  TableRow,
} from './blocks';

export interface FlowItem {
  key: string;
  node: ReactNode;
  /** معرّف الجدول إن كان هذا العنصر صفاً منه. */
  tableId?: string;
  /** لا يُترك وحيداً في نهاية الصفحة. */
  keepWithNext?: boolean;
  /** عمق القسم — يُستخدم للتجميع البصري. */
  inSection?: boolean;
}

export interface DocumentFlow {
  items: FlowItem[];
  /** ترويسة كل جدول كدالة لأننا نضيف كلمة "(تابع)" عند إعادتها. */
  tableHeads: Record<string, (repeated: boolean) => ReactNode>;
}

/**
 * يحوّل نموذج المستند إلى قائمة عناصر مسطّحة قابلة للقياس والتوزيع على صفحات.
 *
 * الجداول وحدها هي القابلة للتقسيم بين الصفحات (صفاً صفاً)، أما بقية الكتل
 * فتُعامل كوحدة واحدة لأنها قصيرة بطبيعتها ولأن تقسيمها يُفسد التجميع البصري.
 */
export function buildFlow(model: DocumentModel, template: DocTemplate): DocumentFlow {
  const items: FlowItem[] = [];
  const tableHeads: DocumentFlow['tableHeads'] = {};
  let tableCounter = 0;
  let sectionCounter = 0;

  items.push({
    key: 'doc-header',
    node: <DocHeader model={model} template={template} />,
    keepWithNext: true,
  });

  if (model.meta.length > 0) {
    items.push({
      key: 'doc-meta',
      node: <MetaBlock items={model.meta} template={template} />,
    });
  }

  const walk = (blocks: DocBlock[], prefix: string, inSection: boolean) => {
    blocks.forEach((block, index) => {
      const key = `${prefix}-${index}`;

      switch (block.kind) {
        case 'section': {
          sectionCounter += 1;
          items.push({
            key: `${key}-title`,
            node: (
              <SectionTitle
                title={block.title}
                subtitle={block.subtitle}
                index={sectionCounter}
                template={template}
              />
            ),
            keepWithNext: true,
            inSection,
          });
          walk(block.blocks, `${key}-c`, true);
          break;
        }

        case 'table': {
          tableCounter += 1;
          const tableId = `table-${tableCounter}`;
          tableHeads[tableId] = (repeated: boolean) => (
            <TableHead
              columns={block.columns}
              title={block.title}
              template={template}
              repeated={repeated}
            />
          );

          if (block.rows.length === 0) {
            items.push({
              key: `${key}-empty`,
              node: <TableEmptyRow text={block.emptyText ?? 'لا توجد بيانات مُدخلة بعد.'} />,
              tableId,
              inSection,
            });
            break;
          }

          block.rows.forEach((row, rowIndex) => {
            items.push({
              key: `${key}-r${rowIndex}`,
              node: (
                <TableRow
                  columns={block.columns}
                  cells={row}
                  index={rowIndex}
                  template={template}
                />
              ),
              tableId,
              inSection,
            });
          });
          break;
        }

        case 'stats':
          items.push({ key, node: <StatsBlock items={block.items} />, inSection });
          break;

        case 'list':
          items.push({
            key,
            node: <ListBlock title={block.title} items={block.items} ordered={block.ordered} />,
            inSection,
          });
          break;

        case 'keyvalue':
          items.push({
            key,
            node: <KeyValueBlock title={block.title} items={block.items} />,
            inSection,
          });
          break;

        case 'note':
          items.push({
            key,
            node: <NoteBlock title={block.title} text={block.text} tone={block.tone} />,
            inSection,
          });
          break;

        case 'meta':
          items.push({ key, node: <MetaBlock items={block.items} template={template} />, inSection });
          break;
      }
    });
  };

  walk(model.blocks, 'b', false);

  return { items, tableHeads };
}
