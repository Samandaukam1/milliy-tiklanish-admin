'use client';

import { ContentBlock, BlockType, LangKey } from '@/types/blocks';
import { generateId } from '@/lib/storage';
import { BlockWrapper } from './block-wrapper';
import { AddBlockMenu } from './add-block-menu';
import { ParagraphBlock } from './blocks/paragraph-block';
import { HeadingBlock } from './blocks/heading-block';
import { QuoteBlock } from './blocks/quote-block';
import { ImageBlock } from './blocks/image-block';
import { AudioBlock } from './blocks/audio-block';
import { VideoBlock } from './blocks/video-block';

function createBlock(type: BlockType): ContentBlock {
  return {
    id: generateId(),
    type,
    level: type === 'heading' ? 2 : undefined,
  };
}

interface BlockEditorProps {
  blocks: ContentBlock[];
  activeLang: LangKey;
  onChange: (blocks: ContentBlock[]) => void;
}

export function BlockEditor({ blocks, activeLang, onChange }: BlockEditorProps) {
  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  const deleteBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (id: string, dir: 'up' | 'down') => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === blocks.length - 1) return;

    const next = [...blocks];
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    [next[idx], next[swap]] = [next[swap], next[idx]];
    onChange(next);
  };

  const addBlock = (type: BlockType) => {
    onChange([...blocks, createBlock(type)]);
  };

  const renderBlockContent = (block: ContentBlock) => {
    const sharedProps = {
      block,
      activeLang,
      onChange: (updates: Partial<ContentBlock>) => updateBlock(block.id, updates),
    };

    switch (block.type) {
      case 'paragraph':
        return <ParagraphBlock {...sharedProps} />;
      case 'heading':
        return <HeadingBlock {...sharedProps} />;
      case 'quote':
        return <QuoteBlock {...sharedProps} />;
      case 'image':
        return <ImageBlock {...sharedProps} />;
      case 'audio':
        return <AudioBlock {...sharedProps} />;
      case 'video':
        return <VideoBlock {...sharedProps} />;
      case 'divider':
        return null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
          Hali bloklar yo&apos;q. Pastdagi tugma orqali blok qo&apos;shing.
        </div>
      )}

      {blocks.map((block, idx) => (
        <BlockWrapper
          key={block.id}
          type={block.type}
          onDelete={() => deleteBlock(block.id)}
          onMoveUp={() => moveBlock(block.id, 'up')}
          onMoveDown={() => moveBlock(block.id, 'down')}
          isFirst={idx === 0}
          isLast={idx === blocks.length - 1}
        >
          {renderBlockContent(block)}
        </BlockWrapper>
      ))}

      <AddBlockMenu onAdd={addBlock} />
    </div>
  );
}
