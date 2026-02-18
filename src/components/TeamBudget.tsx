import { useEffect, useState } from "react";
import { TeamService } from "@/services/teamService";
import type { TeamGameInfo } from "@/types/team";

interface TeamBudgetProps {
  teamId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function TeamBudget({ teamId, autoRefresh = true, refreshInterval = 5000 }: TeamBudgetProps) {
  const [gameInfo, setGameInfo] = useState<TeamGameInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameInfo = async () => {
    try {
      const info = await TeamService.getTeamGameInfo(teamId);
      if (info) {
        setGameInfo(info);
        setError(null);
      } else {
        setError("Team nicht gefunden");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGameInfo();

    if (autoRefresh) {
      const interval = setInterval(fetchGameInfo, refreshInterval);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Lade Budget...</p>
      </div>
    );
  }

  if (error || !gameInfo) {
    return (
      <div className="px-4 py-3 bg-red-100 dark:bg-red-900 rounded-lg">
        <p className="text-sm text-red-800 dark:text-red-200">Budget nicht verfügbar</p>
      </div>
    );
  }

  const budgetPercentage = Math.min(100, gameInfo.colorBudget);
  const budgetColor = budgetPercentage > 70 ? "bg-green-600" : budgetPercentage > 30 ? "bg-yellow-600" : "bg-red-600";

  return (
    <div className="px-4 py-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
          Team {teamId} - Farbenbudget
        </span>
        <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          {gameInfo.colorBudget}%
        </span>
      </div>
      
      {/* Budget-Balken */}
      <div className="w-full h-3 bg-zinc-300 dark:bg-zinc-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${budgetColor} transition-all duration-500`}
          style={{ width: `${budgetPercentage}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
        Punkte: <span className="font-semibold">{gameInfo.score}</span>
      </div>
    </div>
  );
}
