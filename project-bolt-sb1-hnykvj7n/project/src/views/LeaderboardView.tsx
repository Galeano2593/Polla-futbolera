import { useEffect, useState } from 'react';
import { api } from '@/api';
import type { LeaderboardRow } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Trophy, Medal, Crown } from 'lucide-react';

export default function LeaderboardView() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getLeaderboard()
      .then(({ leaderboard }) => setRows(leaderboard))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tabla de Posiciones</h1>
          <p className="text-slate-500 text-sm">Ranking global de participantes</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          Aún no hay puntos asignados.
        </div>
      ) : (
        <>
          {/* Podium */}
          {rows.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 mb-6 items-end">
              <PodiumCard row={rows[1]} place={2} height="h-24" />
              <PodiumCard row={rows[0]} place={1} height="h-32" />
              <PodiumCard row={rows[2]} place={3} height="h-20" />
            </div>
          )}

          {/* Full table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="divide-y divide-slate-100">
              {rows.map((row, i) => {
                const isMe = row.userId === user?.id;
                return (
                  <div
                    key={row.userId}
                    className={`flex items-center gap-4 px-5 py-3.5 transition ${
                      isMe ? 'bg-emerald-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-8 text-center font-bold ${
                        i === 0
                          ? 'text-amber-500'
                          : i === 1
                            ? 'text-slate-400'
                            : i === 2
                              ? 'text-orange-400'
                              : 'text-slate-300'
                      }`}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">
                        {row.username}
                        {isMe && (
                          <span className="ml-2 text-xs text-emerald-600 font-medium">
                            (tú)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">
                        {row.points}
                      </span>
                      <span className="text-xs text-slate-400 ml-1">pts</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PodiumCard({
  row,
  place,
  height,
}: {
  row: LeaderboardRow;
  place: 1 | 2 | 3;
  height: string;
}) {
  const config = {
    1: { color: 'bg-amber-100 border-amber-300', icon: <Crown className="w-5 h-5 text-amber-500" />, ring: 'ring-amber-200' },
    2: { color: 'bg-slate-100 border-slate-300', icon: <Medal className="w-5 h-5 text-slate-400" />, ring: 'ring-slate-200' },
    3: { color: 'bg-orange-50 border-orange-200', icon: <Medal className="w-5 h-5 text-orange-400" />, ring: 'ring-orange-200' },
  }[place];

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2 text-center">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full bg-white ring-2 ${config.ring} mb-1.5`}>
          {config.icon}
        </div>
        <p className="font-semibold text-sm text-slate-900 truncate max-w-full">
          {row.username}
        </p>
        <p className="text-xs text-slate-500">{row.points} pts</p>
      </div>
      <div className={`w-full ${height} ${config.color} border rounded-t-xl flex items-start justify-center pt-2`}>
        <span className="text-2xl font-bold text-slate-700">{place}</span>
      </div>
    </div>
  );
}
