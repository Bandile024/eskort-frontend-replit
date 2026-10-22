import React from 'react';
import { TornEdge } from '../ui/TornEdge';

interface StickerMarqueeProps {
  items: Array<{ id: string; imageUrl: string; altText: string }>;
  topColor?: string;
  bottomColor?: string;
  bgColor?: string;
}

export const StickerMarquee: React.FC<StickerMarqueeProps> = ({
  items,
  topColor = '#1A1A1A',
  bottomColor = '#D6EEFF',
  bgColor = '#F5EFE0',
}) => {
  if (items.length === 0) return null;

  return (
    <div className="relative overflow-hidden select-none" style={{ backgroundColor: bgColor }}>
      {/* Torn Paper Top Divider */}
      {topColor && <TornEdge color={topColor} position="top" />}

      {/* Scrolling Content Track */}
      <div className="py-2.5 sm:py-3.5 flex overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-8 sm:gap-14 animate-[marquee_26s_linear_infinite] shrink-0 px-4">
          {[...items, ...items, ...items, ...items].map((item, idx) => (
            <div key={`${item.id}-${idx}`} className="shrink-0 flex items-center">
              <img src={item.imageUrl} alt={item.altText} className="h-10 sm:h-12 w-auto object-contain" />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-8 sm:gap-14 animate-[marquee_26s_linear_infinite] shrink-0 px-4" aria-hidden="true">
          {[...items, ...items, ...items, ...items].map((item, idx) => (
            <div key={`dup-${item.id}-${idx}`} className="shrink-0 flex items-center">
              <img src={item.imageUrl} alt="" className="h-10 sm:h-12 w-auto object-contain" />
            </div>
          ))}
        </div>
      </div>

      {/* Torn Paper Bottom Divider */}
      {bottomColor && <TornEdge color={bottomColor} position="bottom" />}
    </div>
  );
};
