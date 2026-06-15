import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { Match, GroupStanding, BlogArticle, MatchEvent } from "./src/types";

// Load environment variables
dotenv.config();
const PORT = process.env.PORT || 3000;
// Create Express app
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Initialize GoogleGenAI client lazily to prevent crash on empty key
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    throw new Error(
      "GEMINI_API_KEY environment variable is not configured. Please add it in the Secrets panel."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Global In-Memory tournament state for World Cup 2026
// Match Day 2: June 12, 2026 (assuming tournament started yesterday June 11)
let matches: Match[] = [
  {
    id: "match-1",
    homeTeam: "Mexico",
    awayTeam: "Ecuador",
    homeFlag: "🇲🇽",
    awayFlag: "🇪🇨",
    homeScore: 2,
    awayScore: 1,
    date: "June 11, 2026",
    time: "Finished",
    venue: "Stadio Azteca, Mexico City",
    group: "Group A",
    status: "finished",
    events: [
      { minute: 12, type: "goal", team: "home", player: "Santi Giménez", detail: "Assisted by Alvarez" },
      { minute: 34, type: "yellow_card", team: "away", player: "Piero Hincapié" },
      { minute: 61, type: "goal", team: "away", player: "Enner Valencia", detail: "Penalty kick" },
      { minute: 82, type: "goal", team: "home", player: "Hirving Lozano", detail: "Stunning volley from outside box" },
      { minute: 89, type: "yellow_card", team: "home", player: "Edson Álvarez" }
    ],
    stats: {
      possession: 52,
      shots: [14, 9],
      shotsOnTarget: [6, 4],
      fouls: [12, 15],
      corners: [6, 4],
      offsides: [2, 1]
    },
    lineups: {
      home: {
        goalkeeper: "Luis Malagón",
        defenders: ["Jorge Sánchez", "César Montes", "Johan Vásquez", "Jesús Gallardo"],
        midfielders: ["Edson Álvarez", "Luis Chávez", "Erick Sánchez"],
        forwards: ["Uriel Antuna", "Santiago Giménez", "Hirving Lozano"]
      },
      away: {
        goalkeeper: "Alexander Domínguez",
        defenders: ["Angelo Preciado", "Félix Torres", "Piero Hincapié", "Pervis Estupiñán"],
        midfielders: ["Carlos Gruezo", "Moisés Caicedo", "Kendry Páez"],
        forwards: ["Gonzalo Plata", "Enner Valencia", "Kevin Rodríguez"]
      }
    }
  },
  {
    id: "match-2",
    homeTeam: "Canada",
    awayTeam: "Peru",
    homeFlag: "🇨🇦",
    awayFlag: "🇵🇪",
    homeScore: 1,
    awayScore: 0,
    date: "June 11, 2026",
    time: "Finished",
    venue: "BC Place, Vancouver",
    group: "Group B",
    status: "finished",
    events: [
      { minute: 40, type: "yellow_card", team: "home", player: "Stephen Eustáquio" },
      { minute: 71, type: "goal", team: "home", player: "Jonathan David", detail: "Breakaway, assist by Davies" }
    ],
    stats: {
      possession: 47,
      shots: [11, 8],
      shotsOnTarget: [4, 2],
      fouls: [14, 11],
      corners: [5, 3],
      offsides: [3, 0]
    },
    lineups: {
      home: {
        goalkeeper: "Maxime Crépeau",
        defenders: ["Alistair Johnston", "Kamal Miller", "Moïse Bombito", "Alphonso Davies"],
        midfielders: ["Stephen Eustáquio", "Ismaël Koné", "Jonathan Osorio"],
        forwards: ["Tajon Buchanan", "Cyle Larin", "Jonathan David"]
      },
      away: {
        goalkeeper: "Pedro Gallese",
        defenders: ["Luis Advíncula", "Carlos Zambrano", "Alexander Callens", "Miguel Trauco"],
        midfielders: ["Renato Tapia", "Yoshimar Yotún", "Piero Quispe"],
        forwards: ["Gianluca Lapadula", "Paolo Guerrero", "Bryan Reyna"]
      }
    }
  },
  {
    id: "match-3",
    homeTeam: "USA",
    awayTeam: "Bolivia",
    homeFlag: "🇺🇸",
    awayFlag: "🇧🇴",
    homeScore: 2,
    awayScore: 0,
    date: "June 12, 2026",
    time: "Live",
    venue: "SoFi Stadium, Los Angeles",
    group: "Group C",
    status: "live",
    minute: 68,
    events: [
      { minute: 18, type: "goal", team: "home", player: "Christian Pulisic", detail: "Beautiful curling shot inside far post" },
      { minute: 29, type: "yellow_card", team: "away", player: "Leonel Justiniano" },
      { minute: 55, type: "goal", team: "home", player: "Folarin Balogun", detail: "Drilled low corner after dynamic run" },
      { minute: 61, type: "yellow_card", team: "home", player: "Weston McKennie" }
    ],
    stats: {
      possession: 58,
      shots: [15, 6],
      shotsOnTarget: [7, 2],
      fouls: [8, 12],
      corners: [7, 2],
      offsides: [1, 2]
    },
    lineups: {
      home: {
        goalkeeper: "Matt Turner",
        defenders: ["Sergiño Dest", "Chris Richards", "Tim Ream", "Antonee Robinson"],
        midfielders: ["Tyler Adams", "Weston McKennie", "Yunis Musah"],
        forwards: ["Timothy Weah", "Folarin Balogun", "Christian Pulisic"]
      },
      away: {
        goalkeeper: "Guillermo Viscarra",
        defenders: ["Diego Medina", "Luis Haquín", "José Sagredo", "Roberto Fernández"],
        midfielders: ["Gabriel Villamíl", "Leonel Justiniano", "Ramiro Vaca"],
        forwards: ["Miguel Terceros", "Marcelo Martins", "Carmelo Algarañaz"]
      }
    }
  },
  {
    id: "match-4",
    homeTeam: "Spain",
    awayTeam: "Morocco",
    homeFlag: "🇪🇸",
    awayFlag: "🇲🇦",
    homeScore: 0,
    awayScore: 0,
    date: "June 12, 2026",
    time: "18:00 Local",
    venue: "Hard Rock Stadium, Miami",
    group: "Group D",
    status: "scheduled",
    events: [],
    stats: { possession: 50, shots: [0, 0], shotsOnTarget: [0, 0], fouls: [0, 0], corners: [0, 0], offsides: [0, 0] },
    lineups: {
      home: { goalkeeper: "Unai Simón", defenders: ["Dani Carvajal", "Robin Le Normand", "Aymeric Laporte", "Alejandro Grimaldo"], midfielders: ["Rodri", "Pedri", "Fabián Ruiz"], forwards: ["Lamine Yamal", "Alvaro Morata", "Nico Williams"] },
      away: { goalkeeper: "Yassine Bounou", defenders: ["Achraf Hakimi", "Nayef Aguerd", "Romain Saïss", "Noussair Mazraoui"], midfielders: ["Sofyan Amrabat", "Azzedine Ounahi", "Selim Amallah"], forwards: ["Hakim Ziyech", "Youssef En-Nesyri", "Sofiane Boufal"] }
    }
  },
  {
    id: "match-5",
    homeTeam: "Argentina",
    awayTeam: "South Korea",
    homeFlag: "🇦🇷",
    awayFlag: "🇰🇷",
    homeScore: 0,
    awayScore: 0,
    date: "June 12, 2026",
    time: "21:00 Local",
    venue: "MetLife Stadium, East Rutherford",
    group: "Group D",
    status: "scheduled",
    events: [],
    stats: { possession: 50, shots: [0, 0], shotsOnTarget: [0, 0], fouls: [0, 0], corners: [0, 0], offsides: [0, 0] },
    lineups: {
      home: { goalkeeper: "Emiliano Martínez", defenders: ["Nahuel Molina", "Cristian Romero", "Nicolas Otamendi", "Nicolas Tagliafico"], midfielders: ["Rodrigo De Paul", "Enzo Fernández", "Alexis Mac Allister"], forwards: ["Lionel Messi", "Lautaro Martínez", "Julián Álvarez"] },
      away: { goalkeeper: "Jo Hyeon-woo", defenders: ["Kim Min-jae", "Kim Young-gwon", "Kim Jin-su", "Seol Young-woo"], midfielders: ["Hwang In-beom", "Lee Jae-sung", "Hong Hyun-seok"], forwards: ["Lee Kang-in", "Son Heung-min", "Hwang Hee-chan"] }
    }
  },
  {
    id: "match-6",
    homeTeam: "Brazil",
    awayTeam: "Japan",
    homeFlag: "🇧🇷",
    awayFlag: "🇯🇵",
    homeScore: 0,
    awayScore: 0,
    date: "June 13, 2026",
    time: "14:00 Local",
    venue: "Gillette Stadium, Boston",
    group: "Group F",
    status: "scheduled",
    events: [],
    stats: { possession: 50, shots: [0, 0], shotsOnTarget: [0, 0], fouls: [0, 0], corners: [0, 0], offsides: [0, 0] },
    lineups: {
      home: { goalkeeper: "Ederson", defenders: ["Danilo", "Marquinhos", "Gabriel Magalhães", "Lucas Beraldo"], midfielders: ["Bruno Guimarães", "Douglas Luiz", "Lucas Paquetá"], forwards: ["Rodrygo", "Richarlison", "Vinícius Júnior"] },
      away: { goalkeeper: "Zion Suzuki", defenders: ["Yukinari Sugawara", "Ko Itakura", "Shogo Taniguchi", "Hiroki Ito"], midfielders: ["Wataru Endo", "Hidemasa Morita", "Daichi Kamada"], forwards: ["Takefusa Kubo", "Ayase Ueda", "Kaoru Mitoma"] }
    }
  }
];

let groupStandings: GroupStanding[] = [
  {
    group: "Group A",
    teams: [
      { team: "Mexico", flag: "🇲🇽", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1, goalDifference: 1, points: 3 },
      { team: "Venezuela", flag: "🇻🇪", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Jamaica", flag: "🇯🇲", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Ecuador", flag: "🇪🇨", played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2, goalDifference: -1, points: 0 }
    ]
  },
  {
    group: "Group B",
    teams: [
      { team: "Canada", flag: "🇨🇦", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 1, goalsAgainst: 0, goalDifference: 1, points: 3 },
      { team: "Chile", flag: "🇨🇱", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Poland", flag: "🇵🇱", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Peru", flag: "🇵🇪", played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 0, goalsAgainst: 1, goalDifference: -1, points: 0 }
    ]
  },
  {
    group: "Group C",
    teams: [
      { team: "USA", flag: "🇺🇸", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Senegal", flag: "🇸🇳", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Bolivia", flag: "🇧🇴", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
    ]
  },
  {
    group: "Group D",
    teams: [
      { team: "Argentina", flag: "🇦🇷", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "South Korea", flag: "🇰🇷", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Croatia", flag: "🇭🇷", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 },
      { team: "Morocco", flag: "🇲🇦", played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }
    ]
  }
];

let blogArticles: BlogArticle[] = [
  {
    id: "blog-1",
    title: "Opening Day Magic: Santi Giménez Guides El Tri to Opening Victory at Azteca",
    summary: "In a spectacular game at the iconic Stadio Azteca, Mexico held off a fierce Ecuador rally to claim a crucial 2-1 win on Day 1 of the 2026 World Cup.",
    content: `## A Golden Start in Mexico City

The match day arrived under blinding sunshine and deafening choruses of "Cielito Lindo." Mexico's quest for World Cup 2026 glory started with a monumental clash in the high altitudes of Mexico City at the historic Stadio Azteca. Under immense home nation pressure, El Tri prevailed with a 2-1 victory over Ecuador.

### Santi Giménez Delivers Early
Santiago Giménez sent the Aztec fortress into absolute pandemonium in the 12th minute. Meeting a perfectly weighted header assist from Edson Alvarez, Giménez out-muscled Hincapie to strike a low right-footed driver in the bottom left corner. Ecuador struggled with the pace and altitude early on but found their footing after the water break.

### Valencia's Spot-Kick Stunner
The second half witnessed a surging Ecuadorian response. In the 61st minute, Moises Caicedo's driving run was brought down in the penalty area by César Montes. Enner Valencia calmly stepped up and dispatched the penalty to draw things level.

### Hirving Lozano's Magical Moment
Just as tension began to paralyze the home support, Lozano delivered a masterclass. In the 82nd minute, receiving a cross at the corner of the penalty area, the veteran winger struck a breathtaking first-time volley that curled past Alexander Domínguez and clipped the inside of the post on its way in. 

It was a goal worthy of opening the greatest show on earth. El Tri stands tall at the top of Group A.`,
    author: "Mateo Sánches",
    role: "Lead Editor",
    timestamp: "June 11, 2026",
    likes: 342,
    category: "Match Report",
    tag: "Group A",
    matchId: "match-1",
    comments: [
      { id: "c1", author: "ElTriFan_88", text: "CHUCKY LOZANO! Still got that world class spark! Absolutely brilliant!", timestamp: "June 11, 2026 at 20:15", role: "Fan Voice" },
      { id: "c2", author: "QuitoGoat", text: "Ecuador played well but Azteca altitude is real. We will bounce back against Jamaica.", timestamp: "June 11, 2026 at 21:04", role: "Fan Voice" }
    ]
  },
  {
    id: "blog-2",
    title: "Tactical Insight: Marsch's Canada Overcomes Peru with High-Line Blitz",
    summary: "Canada's high-pressing system under Jesse Marsch secured a vital 1-0 win in Vancouver. We dissect how Les Rouges neutralised Peru's veteran attacking stars.",
    content: `## Tactical masterclass at BC Place

Jesse Marsch's Canada has immediately made their intentions clear at the 2026 tournament. Opting for a hyper-aggressive 4-2-2-2 system, the hosts stifled Peru, suffocating their build-up play and registering a critical 1-0 victory of their own.

### The Alphonso Davies Full-Back Engine
Alphonso Davies displayed standard-setting leadership. Acting as a wide outlet in possession, he covered nearly 11.5 kilometers, single-handedly turning Peru's right flank back. 

### Squeezing Peru's Midfield
Stephen Eustáquio and Ismaël Koné acted as an impenetrable double pivot. They repeatedly turned over possession in Peru's defensive third, eventually initiating the turnover that led to Jonathan David's breakaway goal in the 71st minute.

Canada is proving they aren't just here to host — they are here to dominate!`,
    author: "Leigh Brookes",
    role: "Tactical Analyst",
    timestamp: "June 11, 2026",
    likes: 218,
    category: "Tactical Analysis",
    tag: "Group B",
    matchId: "match-2",
    comments: [
      { id: "c3", author: "MapleLeafFC", text: "Jonathan David is so clinical in big moments. Huge 3 points!", timestamp: "June 11, 2026 at 22:30" }
    ]
  }
];

// In-Memory Live Tracker Clock Simulator
// Starts a clock ticking for active live matches
setInterval(() => {
  let changed = false;
  matches = matches.map((match) => {
    if (match.status === "live" && match.minute !== undefined) {
      changed = true;
      const newMinute = match.minute + 1;
      
      // If match reaches 90-95 minutes, finish it!
      if (newMinute >= 93) {
        // Update standings when match finishes
        if (match.id === "match-3") {
          updateStandingsWithResult("USA", "Bolivia", match.homeScore, match.awayScore);
        }
        return {
          ...match,
          status: "finished",
          minute: undefined,
          time: "Finished",
        };
      }
      
      // Dynamic simulated gameplay events (3% chance per minute tick)
      const r = Math.random();
      const updatedEvents = [...match.events];
      const updatedStats = { ...match.stats };
      let newHomeScore = match.homeScore;
      let newAwayScore = match.awayScore;

      if (r < 0.05) {
        // Dynamic event occurs!
        const isHome = Math.random() < 0.6; // USA more dominant in this live match
        const eventType = Math.random() < 0.4 ? "goal" : Math.random() < 0.7 ? "yellow_card" : "substitution";
        const players = isHome ? match.lineups.home : match.lineups.away;
        const pool = [...players.midfielders, ...players.forwards];
        const selectedPlayer = pool[Math.floor(Math.random() * pool.length)];

        if (eventType === "goal") {
          if (isHome) {
            newHomeScore++;
            updatedEvents.push({
              minute: newMinute,
              type: "goal",
              team: "home",
              player: selectedPlayer,
              detail: "Clinical finish amidst defender chaos!",
            });
          } else {
            newAwayScore++;
            updatedEvents.push({
              minute: newMinute,
              type: "goal",
              team: "away",
              player: selectedPlayer,
              detail: "Counter attack shocker!",
            });
          }
          // Stats boost
          updatedStats.shots[isHome ? 0 : 1]++;
          updatedStats.shotsOnTarget[isHome ? 0 : 1]++;
        } else if (eventType === "yellow_card") {
          updatedEvents.push({
            minute: newMinute,
            type: "yellow_card",
            team: isHome ? "home" : "away",
            player: selectedPlayer,
            detail: "Tactical foul near middle third",
          });
          updatedStats.fouls[isHome ? 0 : 1]++;
        } else {
          updatedEvents.push({
            minute: newMinute,
            type: "substitution",
            team: isHome ? "home" : "away",
            player: selectedPlayer,
            detail: "Fresh legs to close out the half",
          });
        }
      }

      // Slightly alter possession and shots on tick anyway
      updatedStats.possession = Math.max(
        40,
        Math.min(68, match.stats.possession + (Math.random() > 0.5 ? 1 : -1))
      );
      if (Math.random() < 0.1) {
        updatedStats.shots[0] += Math.random() > 0.4 ? 1 : 0;
        updatedStats.shots[1] += Math.random() > 0.7 ? 1 : 0;
      }

      return {
        ...match,
        minute: newMinute,
        homeScore: newHomeScore,
        awayScore: newAwayScore,
        events: updatedEvents,
        stats: updatedStats,
      };
    }
    return match;
  });
}, 20000); // Ticks every 20 seconds, representing accelerated live match time

function updateStandingsWithResult(teamH: string, teamA: string, scoreH: number, scoreA: number) {
  groupStandings = groupStandings.map((g) => {
    let hasH = g.teams.find((t) => t.team === teamH);
    let hasA = g.teams.find((t) => t.team === teamA);
    if (hasH && hasA) {
      const teams = g.teams.map((t) => {
        if (t.team === teamH) {
          const won = scoreH > scoreA ? 1 : 0;
          const drawn = scoreH === scoreA ? 1 : 0;
          const lost = scoreH < scoreA ? 1 : 0;
          return {
            ...t,
            played: t.played + 1,
            won: t.won + won,
            drawn: t.drawn + drawn,
            lost: t.lost + lost,
            goalsFor: t.goalsFor + scoreH,
            goalsAgainst: t.goalsAgainst + scoreA,
            goalDifference: t.goalDifference + (scoreH - scoreA),
            points: t.points + (won * 3 + drawn),
          };
        }
        if (t.team === teamA) {
          const won = scoreA > scoreH ? 1 : 0;
          const drawn = scoreA === scoreH ? 1 : 0;
          const lost = scoreA < scoreH ? 1 : 0;
          return {
            ...t,
            played: t.played + 1,
            won: t.won + won,
            drawn: t.drawn + drawn,
            lost: t.lost + lost,
            goalsFor: t.goalsFor + scoreA,
            goalsAgainst: t.goalsAgainst + scoreH,
            goalDifference: t.goalDifference + (scoreA - scoreH),
            points: t.points + (won * 3 + drawn),
          };
        }
        return t;
      });
      // Sort teams in group by points description, then GD, then GF
      teams.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor);
      return { ...g, teams };
    }
    return g;
  });
}

// REST API Endpoints
app.get("/api/matches", (req, res) => {
  res.json(matches);
});

app.get("/api/standings", (req, res) => {
  res.json(groupStandings);
});

app.get("/api/blog", (req, res) => {
  res.json(blogArticles);
});

// Write customized blog comment
app.post("/api/blog/:id/comment", (req, res) => {
  const { id } = req.params;
  const { author, text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Comment text is required." });
  }

  const article = blogArticles.find((a) => a.id === id);
  if (!article) {
    return res.status(404).json({ error: "Article not found." });
  }

  const newComment = {
    id: "comment-" + Date.now(),
    author: author || "Anoymous Fan",
    text,
    timestamp: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit"
    }),
    role: "Fan Voice"
  };

  article.comments.push(newComment);
  res.json(article);
});

// Like article
app.post("/api/blog/:id/like", (req, res) => {
  const { id } = req.params;
  const article = blogArticles.find((a) => a.id === id);
  if (!article) {
    return res.status(404).json({ error: "Article not found." });
  }
  article.likes += 1;
  res.json({ id: article.id, likes: article.likes });
});

// Publish user custom article
app.post("/api/blog/publish", (req, res) => {
  const { title, summary, content, author, role, category, tag, matchId } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  const newArticle: BlogArticle = {
    id: "blog-" + Date.now(),
    title,
    summary: summary || content.substring(0, 120) + "...",
    content,
    author: author || "Fan Contributor",
    role: role || "Fan Voice",
    timestamp: "Today",
    likes: 0,
    comments: [],
    category: category || "Opinion",
    tag,
    matchId
  };

  blogArticles.unshift(newArticle);
  res.json(newArticle);
});

// Reset simulation (for convenience)
app.post("/api/simulation/reset", (req, res) => {
  // Re-initialize USA live match
  matches = matches.map(m => {
    if (m.id === "match-3") {
      return {
        ...m,
        status: "live",
        minute: 68,
        homeScore: 2,
        awayScore: 0,
        events: [
          { minute: 18, type: "goal", team: "home", player: "Christian Pulisic", detail: "Beautiful curling shot inside far post" },
          { minute: 29, type: "yellow_card", team: "away", player: "Leonel Justiniano" },
          { minute: 55, type: "goal", team: "home", player: "Folarin Balogun", detail: "Drilled low corner after dynamic run" },
          { minute: 61, type: "yellow_card", team: "home", player: "Weston McKennie" }
        ],
        stats: {
          possession: 58,
          shots: [15, 6],
          shotsOnTarget: [7, 2],
          fouls: [8, 12],
          corners: [7, 2],
          offsides: [1, 2]
        }
      };
    }
    return m;
  });
  res.json({ message: "Live simulation reset successfully", matches });
});

// SERVER-SIDE GEMINI AI API GENERATOR (With Google search grounding option!)
app.post("/api/gemini/generate-article", async (req, res) => {
  try {
    const { topic, matchId, useGoogleSearch, wordCount } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "Please enter some instructions or a topic." });
    }

    const ai = getGeminiClient();
    let promptSubject = topic;

    // If a specific match is passed, build an incredibly detailed context prompt for Gemini
    if (matchId) {
      const match = matches.find((m) => m.id === matchId);
      if (match) {
        promptSubject = `FIFA World Cup 2026 Match Context:
Match Details: ${match.homeTeam} (${match.homeFlag}) vs ${match.awayTeam} (${match.awayFlag})
Venue: ${match.venue}
Date: ${match.date}
Match Status: ${match.status} (Score H: ${match.homeScore} - A: ${match.awayScore})
Key Match Events: ${JSON.stringify(match.events)}
Match lineups: 
- ${match.homeTeam} Lineup: Goalkeeper: ${match.lineups.home.goalkeeper}, Defenders: ${match.lineups.home.defenders.join(", ")}, Midfielders: ${match.lineups.home.midfielders.join(", ")}, Forwards: ${match.lineups.home.forwards.join(", ")};
- ${match.awayTeam} Lineup: Goalkeeper: ${match.lineups.away.goalkeeper}, Defenders: ${match.lineups.away.defenders.join(", ")}, Midfielders: ${match.lineups.away.midfielders.join(", ")}, Forwards: ${match.lineups.away.forwards.join(", ")}.

User Guidance for article draft: ${topic}`;
      }
    }

    // Prompt instruction details to guide tone
    const finalPrompt = `You are an elite football journalist and head lead sports compiler for the 2026 FIFA World Cup, held in central North America (USA, Canada, Mexico). 
We are currently in mid-June 2026. Write an engaging, top-tier sports article based on this guidance:
"${promptSubject}"

Output the article strictly in Markdown format, with:
- A compelling main headline (e.g., "# Title")
- An engaging subtitle/summary of 1-2 sentences at the start in bold.
- Clear tactical subheaders ("### Heading")
- Match facts or analytical stats if applicable.

Ensure the writer tone is professional, charismatic, witty, and deeply knowledgeable about football tactics, shapes, player profiles, and World Cup lore. Avoid typical AI introductory platitudes (like 'Sure! Here is your article...'). Jump straight into the headlines. Limit the article to approximately ${wordCount || 400} words.`;

    // Configure tools: If User opted for Google Search Grounding, we pass `{ googleSearch: {} }`!
    const toolsConfig: any[] = [];
    if (useGoogleSearch) {
      toolsConfig.push({ googleSearch: {} });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: finalPrompt,
      config: {
        tools: toolsConfig.length > 0 ? toolsConfig : undefined,
      },
    });

    const markdownText = response.text || "";
    res.json({ article: markdownText });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({
      error: error.message || "An error occurred while generating from Gemini model.",
    });
  }
});

// Vite Middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Inject Vite Dev Server
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.resolve("dist");
    app.use(express.static(distPath));
    // Serve index.html for undefined requests (Single-Page App behavior)
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FIFA World Cup 2026 Hub Server running on http://localhost:${PORT}`);
  });
}

startServer();
