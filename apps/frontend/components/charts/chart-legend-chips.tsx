'use client';

import { useCallback, useState } from 'react';

interface ChartLegendChipsProps {
  items: { dataKey: string; color: string }[];
  hiddenKeys: Set<string>;
  onToggle: (dataKey: string) => void;
}

export function ChartLegendChips({ items, hiddenKeys, onToggle }: ChartLegendChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
      {items.map((item) => {
        const hidden = hiddenKeys.has(item.dataKey);
        return (
          <button
            key={item.dataKey}
            onClick={() => onToggle(item.dataKey)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 border transition-colors ${
              hidden
                ? 'bg-gray-50 text-gray-400 border-gray-200'
                : 'bg-white text-gray-700 border-gray-300'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: hidden ? '#D1D5DB' : item.color }}
            />
            {item.dataKey}
          </button>
        );
      })}
    </div>
  );
}

export function useChartLegend() {
  const [hiddenKeys, setHiddenKeys] = useState(new Set<string>());

  const toggle = useCallback((key: string) => {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isVisible = useCallback((key: string) => !hiddenKeys.has(key), [hiddenKeys]);

  return { hiddenKeys, toggle, isVisible };
}
