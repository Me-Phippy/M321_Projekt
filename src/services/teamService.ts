import type { TeamInfo, TeamGameInfo } from "@/types/team";

export class TeamService {
  /**
   * Holt Team-Informationen (Name und Farbe) über Next.js API Route
   */
  static async getTeamInfo(teamId: number): Promise<TeamInfo | null> {
    try {
      const response = await fetch(`/api/team/${teamId}`);
      if (!response.ok) {
        console.error(`Failed to fetch team ${teamId} info:`, response.statusText);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching team ${teamId} info:`, error);
      return null;
    }
  }

  /**
   * Holt Spiel-Informationen (Punkte und Budget) über Next.js API Route
   */
  static async getTeamGameInfo(teamId: number): Promise<TeamGameInfo | null> {
    try {
      const response = await fetch(`/api/team/${teamId}/game`);
      if (!response.ok) {
        console.error(`Failed to fetch team ${teamId} game info:`, response.statusText);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching team ${teamId} game info:`, error);
      return null;
    }
  }

  /**
   * Holt alle verfügbaren Teams (versucht Teams 0-9)
   */
  static async getAllTeams(): Promise<TeamInfo[]> {
    const teams: TeamInfo[] = [];
    // Versuche Teams 0 bis 9
    const promises = Array.from({ length: 10 }, (_, i) => this.getTeamInfo(i));
    const results = await Promise.all(promises);
    
    results.forEach((team) => {
      if (team) {
        teams.push(team);
      }
    });

    return teams;
  }

  /**
   * Holt alle Teams mit Spiel-Informationen
   */
  static async getAllTeamsWithGameInfo(): Promise<Array<TeamInfo & TeamGameInfo>> {
    const teams = await this.getAllTeams();
    const teamsWithGameInfo = await Promise.all(
      teams.map(async (team) => {
        const gameInfo = await this.getTeamGameInfo(team.id);
        return {
          ...team,
          score: gameInfo?.score ?? 0,
          colorBudget: gameInfo?.colorBudget ?? 0,
        };
      })
    );
    
    return teamsWithGameInfo;
  }
}
