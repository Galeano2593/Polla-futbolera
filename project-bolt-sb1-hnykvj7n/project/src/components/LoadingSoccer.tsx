import { Goal } from 'lucide-react';

interface LoadingSoccerProps {
  message?: string;
}

export default function LoadingSoccer({ message = 'Procesando jugada...' }: LoadingSoccerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md">
      <div className="relative flex items-center justify-center bg-slate-900/80 p-6 rounded-3xl border border-slate-800 shadow-2xl ring-1 ring-emerald-500/20">
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-3xl blur-xl" />
        
        <div className="relative flex flex-col items-center gap-4">
          {/* Balón girando */}
          <div className="animate-spin [animation-duration:3s] text-emerald-400 p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-lg shadow-emerald-500/10">
            <Goal className="w-10 h-10 animate-pulse" />
          </div>
          
          <p className="text-sm font-medium text-slate-200 tracking-wide px-2">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
