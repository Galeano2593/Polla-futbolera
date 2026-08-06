interface LoadingSoccerProps {
  message?: string;
}

export default function LoadingSoccer({ message = 'Procesando jugada...' }: LoadingSoccerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        {/* Balón gigante girando sin ningún cuadro alrededor */}
        <div className="animate-spin [animation-duration:3s] text-6xl sm:text-7xl select-none filter drop-shadow-[0_0_15px_rgba(16,185,129,0.4)]">
          ⚽
        </div>
        
        {/* Mensaje de carga */}
        <p className="text-base font-semibold text-slate-200 tracking-wide px-4 text-center">
          {message}
        </p>
      </div>
    </div>
  );
}
