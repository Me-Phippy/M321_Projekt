import { useEffect, useState } from "react";
import { TeamService } from "@/services/teamService";
import type { TeamInfo, TeamGameInfo } from "@/types/team";

type TeamWithScore = TeamInfo & TeamGameInfo;

interface CompactTeamOverviewProps {
  currentTeamId: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function CompactTeamOverview({ 
  currentTeamId, 
  autoRefresh = true, 
  refreshInterval = 5000 
}: CompactTeamOverviewProps) {
  const [teams, setTeams] = useState<TeamWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = async () => {
    try {
      const teamsData = await TeamService.getAllTeamsWithGameInfo();
      const sorted = teamsData.sort((a, b) => b.score - a.score);
      setTeams(sorted);
    } catch (err) {
      console.error("Error fetching teams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
    if (autoRefresh) {
      const interval = setInterval(fetchTeams, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg p-3 border border-zinc-700">
        <p className="text-xs text-zinc-400">Lädt Teams...</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg border border-zinc-700 overflow-hidden">
      <div className="px-3 py-2 bg-zinc-800/80 border-b border-zinc-700">
        <h3 className="text-sm font-bold text-zinc-100">Live Teams</h3>
      </div>
      
      <div className="divide-y divide-zinc-800">
        {teams.map((team, index) => {
          const isCurrentTeam = team.id === currentTeamId;
          const budgetColor = team.colorBudget > 70 ? "text-green-400" : 
                              team.colorBudget > 30 ? "text-yellow-400" : "text-red-400";
          
          return (
            <div 
              key={team.id}
              className={`px-3 py-2 transition-colors ${
                isCurrentTeam ? "bg-blue-900/30 border-l-2 border-blue-500" : "hover:bg-zinc-800/50"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs font-semibold text-zinc-500">
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                  </span>
                  
                  {team.color && (
                    <div
                      className="w-3 h-3 rounded-sm border border-zinc-600 flex-shrink-0"
                      style={{
                        backgroundColor: `rgb(${team.color.red}, ${team.color.green}, ${team.color.blue})`,
                      }}
                    />
                  )}
                  
                  <span className="text-xs font-medium text-zinc-200 truncate">
                    {team.name}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs font-bold text-zinc-100">
                      {team.score.toLocaleString()}
                    </div>
                    <div className={`text-[10px] font-semibold ${budgetColor}`}>
                      {team.colorBudget}% 🎨
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
