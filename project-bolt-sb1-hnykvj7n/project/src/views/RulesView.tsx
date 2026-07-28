import { Trophy, Clock, CheckCircle2, AlertCircle, Ban, Scale, AlertTriangle } from 'lucide-react';

export default function RulesView() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto mb-12 text-slate-100">
      <div className="text-center sm:text-left mb-2">
        <h2 className="text-2xl font-bold text-white tracking-tight">Reglas del Juego</h2>
        <p className="text-slate-400 text-sm mt-1">Conoce cómo sumar puntos y competir en la polla</p>
      </div>

      {/* Tarjeta Sistema de Puntos */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
          <Trophy className="w-5 h-5" /> Sistema de Puntuación
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-lg text-sm shrink-0">
              +10 Pts
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Marcador Exacto</p>
              <p className="text-xs text-slate-400 mt-0.5">Acertar la cantidad exacta de goles de ambos equipos. (Ej: Predicción: 2-1 | Resultado: 2-1).</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-blue-500/20 text-blue-400 font-bold px-3 py-1 rounded-lg text-sm shrink-0">
              +7 Pts
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Acertar Ganador o Empate</p>
              <p className="text-xs text-slate-400 mt-0.5">Acertar el resultado de la tendencia (quién gana o si empatan). (Ej: Predicción: 2-0 | Resultado: 3-1).</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-yellow-500/20 text-yellow-400 font-bold px-3 py-1 rounded-lg text-sm shrink-0">
              +4 Pts
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Goles de un Equipo</p>
              <p className="text-xs text-slate-400 mt-0.5">Acertar la cantidad de goles de uno de los dos equipos (Local o Visitante). (Ej: Predicción: 1-1 | Resultado: 1-3).</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-purple-500/20 text-purple-400 font-bold px-3 py-1 rounded-lg text-sm shrink-0">
              +2 Pts
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Diferencia de Goles</p>
              <p className="text-xs text-slate-400 mt-0.5">Acertar la diferencia exacta de goles entre los equipos, sin importar quién gane o pierda. (Ej: Predicción: 3-1 (+2) | Resultado: 1-3 (+2) o 2-0 (+2)).</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Casos Especiales y Anulación */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" /> Situaciones Especiales
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-red-500/20 text-red-400 p-2 rounded-lg shrink-0 mt-0.5">
              <Ban className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Partidos Suspendidos o Cancelados</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Si un partido se cancela, suspende o anula definitivamente sin jugarse, <strong className="text-amber-300">otorgará 0 puntos</strong> para todos los participantes independientemente del pronóstico ingresado.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
            <div className="bg-purple-500/20 text-purple-400 p-2 rounded-lg shrink-0 mt-0.5">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Ganado por Escritorio (W.O.)</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Si la autoridad decreta un marcador oficial por sanción o retiro (ej. 3-0 reglamentario), la puntuación <strong className="text-slate-200">se evaluará tomando ese resultado decretado</strong> como el marcador final del partido.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjeta Términos Generales */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-semibold text-yellow-400 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" /> Condiciones Generales
        </h3>

        <ul className="space-y-3 text-sm text-slate-300">
          <li className="flex gap-2.5 items-start">
            <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span><strong>Cierre de Pronósticos:</strong> Los marcadores se bloquean exactamente al inicio oficial de cada partido.</span>
          </li>
          <li className="flex gap-2.5 items-start">
            <CheckCircle2 className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span><strong>Puntos acumulables:</strong> Los puntos de una misma predicción no se acumulan entre sí (se otorga el puntaje más alto alcanzado).</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
