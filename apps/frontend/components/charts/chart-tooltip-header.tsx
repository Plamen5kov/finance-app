'use client';

import { formatCurrency } from '@/lib/utils';

export interface TooltipEntry {
  label: string;
  value: number;
  color: string;
}

interface ChartTooltipHeaderProps {
  month: string | null;
  entries: TooltipEntry[];
  formatValue?: (v: number) => string;
}

export function ChartTooltipHeader({ month, entries, formatValue = formatCurrency }: ChartTooltipHeaderProps) {
  if (!month || entries.length === 0) return null;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 shadow-sm">
      <p className="text-[10px] text-gray-500 font-medium mb-1">{month}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {entries.map((entry) => (
          <span key={entry.label} className="flex items-center gap-1 text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-500 truncate max-w-[80px]">{entry.label}</span>
            <span className="font-semibold text-gray-800">{formatValue(entry.value)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
