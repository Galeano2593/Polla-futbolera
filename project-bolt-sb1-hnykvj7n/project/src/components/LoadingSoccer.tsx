interface LoadingSoccerProps {
  message?: string;
}

export default function LoadingSoccer({ message = 'Procesando jugada...' }: LoadingSoccerProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md">
      <div className="flex flex-col items-center gap-6">
        {/* Balón Golty personalizado y girando */}
        <div className="animate-spin [animation-duration:3s] w-24 h-24 sm:w-28 sm:h-28 select-none filter drop-shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center">
          <img 
            src="/golty.png" 
            alt="Balón Golty" 
            className="w-full h-full object-contain" 
          />
        </div>
        
        {/* Mensaje de carga */}
        <p className="text-base font-semibold text-slate-200 tracking-wide px-4 text-center">
          {message}
        </p>
      </div>
    </div>
  );
}
