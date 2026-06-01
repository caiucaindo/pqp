import { useNavigate } from 'react-router-dom';
import type React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  icon: React.ReactNode;
  iconClassName: string;
  contentClassName: string;
  contentStyle?: React.CSSProperties;
  actions?: React.ReactNode;
}

function resolvePageWidth(maxWidth: 'standard' | 'wide' | string) {
  if (maxWidth === 'standard') return '48rem';
  if (maxWidth === 'wide') return '72rem';
  return maxWidth;
}

export function pageContentLayout(maxWidth: 'standard' | 'wide' | string = 'standard') {
  const resolvedMaxWidth = resolvePageWidth(maxWidth);

  return {
    className: 'mr-4',
    style: {
      width: `min(${resolvedMaxWidth}, calc(100vw - 8rem))`,
      marginLeft: `max(7rem, calc((100vw - ${resolvedMaxWidth}) / 2))`,
    } as React.CSSProperties,
  };
}

export function PageHeader({
  title,
  icon,
  iconClassName,
  contentClassName,
  contentStyle,
  actions,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-zinc-800 sticky top-0 z-10 backdrop-blur">
      <div className="relative h-14">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-indigo-400 gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Voltar</span>
        </Button>

        <div
          className={cn(contentClassName, 'h-full flex items-center justify-between gap-3')}
          style={contentStyle}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn('p-1.5 rounded-lg shrink-0', iconClassName)}>
              {icon}
            </div>
            <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
