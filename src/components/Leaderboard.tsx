import { useEffect, useState } from "react";
import { TeamService } from "@/services/teamService";
import type { TeamInfo, TeamGameInfo } from "@/types/team";

interface LeaderboardProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

type TeamWithScore = TeamInfo & TeamGameInfo;

export default function Leaderboard({ autoRefresh = false, refreshInterval = 10000 }: LeaderboardProps) {
  const [teams, setTeams] = useState<TeamWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    try {
      const teamsData = await TeamService.getAllTeamsWithGameInfo();
      // Sortiere nach Punkten (höchste zuerst)
      const sorted = teamsData.sort((a, b) => b.score - a.score);
      setTeams(sorted);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading && teams.length === 0) {
    return (
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Rangliste</h2>
        <p className="text-zinc-600 dark:text-zinc-400">Lade Rangliste...</p>
      </div>
    );
  }

  if (error && teams.length === 0) {
    return (
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">Rangliste</h2>
        <p className="text-red-600 dark:text-red-400">Fehler beim Laden: {error}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Rangliste</h2>
        <button
          onClick={fetchLeaderboard}
          disabled={loading}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
        >
          {loading ? "Lädt..." : "Aktualisieren"}
        </button>
      </div>

      {lastUpdate && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
          Letztes Update: {lastUpdate.toLocaleTimeString()}
        </p>
      )}

      {teams.length === 0 ? (
        <p className="text-zinc-600 dark:text-zinc-400">Keine Teams gefunden</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-zinc-300 dark:border-zinc-700">
                <th className="text-left py-3 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Rang</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Team</th>
                <th className="text-left py-3 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Farbe</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Punkte</th>
                <th className="text-right py-3 px-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Budget</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, index) => (
                <tr
                  key={team.id}
                  className={`border-b border-zinc-200 dark:border-zinc-800 ${
                    index === 0 ? "bg-yellow-50 dark:bg-yellow-900/20" : ""
                  }`}
                >
                  <td className="py-3 px-2">
                    <span className={`text-lg font-bold ${
                      index === 0 ? "text-yellow-600" :
                      index === 1 ? "text-zinc-400" :
                      index === 2 ? "text-orange-600" :
                      "text-zinc-600 dark:text-zinc-400"
                    }`}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {team.name}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-2">
                      (ID: {team.id})
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      {team.color ? (
                        <>
                          <div
                            className="w-6 h-6 rounded border border-zinc-300 dark:border-zinc-600"
                            style={{
                              backgroundColor: `rgb(${team.color.red}, ${team.color.green}, ${team.color.blue})`,
                            }}
                          />
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">
                            RGB({team.color.red}, {team.color.green}, {team.color.blue})
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                          Keine Farbe
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                      {team.score}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className={`font-semibold ${
                      team.colorBudget > 70 ? "text-green-600" :
                      team.colorBudget > 30 ? "text-yellow-600" :
                      "text-red-600"
                    }`}>
                      {team.colorBudget}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
