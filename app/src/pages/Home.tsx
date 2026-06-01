import { useNavigate } from 'react-router-dom';
import { Merge, PenLine, Split, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

function ToolCard({ icon, title, description, onClick, color }: ToolCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-left rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 transition-all duration-200',
        'hover:border-zinc-700 hover:bg-zinc-800/80 hover:shadow-lg hover:scale-[1.02]',
        'active:scale-[0.98]'
      )}
    >
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center mb-3', color)}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-1">{title}</h3>
      <p className="text-sm text-zinc-500">{description}</p>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();

  // try to load a program logo from repository desktop/assets
  let logoUrl: string | null = null;
  try {
    logoUrl = new URL('../../../desktop/assets/logo.png', import.meta.url).href;
  } catch {
    try { logoUrl = new URL('../../../desktop/assets/oto.ico', import.meta.url).href; } catch { logoUrl = null; }
  }

  const tools = [
    {
      icon: <PenLine className="w-6 h-6 text-white" />,
      title: 'Editar PDF',
      description: 'Adicione imagens, posicione e salve',
      path: '/editor',
      color: 'bg-emerald-600',
    },
    {
      icon: <Merge className="w-6 h-6 text-white" />,
      title: 'Mesclar PDF',
      description: 'Combine múltiplos PDFs em um único arquivo',
      path: '/merge',
      color: 'bg-indigo-600',
    },
    {
      icon: <Split className="w-6 h-6 text-white" />,
      title: 'Separar PDF',
      description: 'Divida as páginas de um PDF em arquivos individuais',
      path: '/split',
      color: 'bg-amber-600',
    },
  ];

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground font-sans flex flex-col items-center justify-center px-4 py-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-6 sm:mb-8">
          <div className="mb-2 sm:mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-[clamp(8rem,22vh,15rem)] w-[clamp(8rem,22vh,15rem)] mb-1 object-contain" />
            ) : (
              <div className="bg-indigo-600 p-4 rounded-2xl mb-1 shadow-lg shadow-indigo-900/30">
                <FileText className="w-12 h-12 text-white" />
              </div>
            )}
          </div>
        <p className="text-lg text-zinc-500 font-medium">PDF Que Pariu</p>
      </div>

      {/* Tool Cards */}
      <div className="w-full max-w-md space-y-2.5">
        {tools.map((tool) => (
          <ToolCard
            key={tool.path}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            color={tool.color}
            onClick={() => navigate(tool.path)}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="mt-6 sm:mt-8 text-xs text-zinc-600">
        Editor de PDFs simples e direto
      </p>
    </div>
  );
}
