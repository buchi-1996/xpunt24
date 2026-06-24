import { LeagueProps } from '@/types'

// Single source of truth for the leagues we surface in the UI (tabs + sidebar).
// IDs are api-sports.io competition IDs.
export const POPULAR_LEAGUES: LeagueProps[] = [
  { league: { id: 1,   name: 'FIFA World Cup',   logo: 'https://media.api-sports.io/football/leagues/1.png'   }, country: { name: 'World',       code: 'XX', flag: 'https://media.api-sports.io/flags/xx.svg' } },
  { league: { id: 2,   name: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png'   }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 3,   name: 'Europa League',    logo: 'https://media.api-sports.io/football/leagues/3.png'   }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 848, name: 'Conference League',logo: 'https://media.api-sports.io/football/leagues/848.png' }, country: { name: 'Europe',      code: 'EU', flag: 'https://media.api-sports.io/flags/eu.svg' } },
  { league: { id: 39,  name: 'Premier League',   logo: 'https://media.api-sports.io/football/leagues/39.png'  }, country: { name: 'England',     code: 'GB', flag: 'https://media.api-sports.io/flags/gb.svg' } },
  { league: { id: 140, name: 'La Liga',          logo: 'https://media.api-sports.io/football/leagues/140.png' }, country: { name: 'Spain',       code: 'ES', flag: 'https://media.api-sports.io/flags/es.svg' } },
  { league: { id: 135, name: 'Serie A',          logo: 'https://media.api-sports.io/football/leagues/135.png' }, country: { name: 'Italy',       code: 'IT', flag: 'https://media.api-sports.io/flags/it.svg' } },
  { league: { id: 78,  name: 'Bundesliga',       logo: 'https://media.api-sports.io/football/leagues/78.png'  }, country: { name: 'Germany',     code: 'DE', flag: 'https://media.api-sports.io/flags/de.svg' } },
  { league: { id: 61,  name: 'Ligue 1',          logo: 'https://media.api-sports.io/football/leagues/61.png'  }, country: { name: 'France',      code: 'FR', flag: 'https://media.api-sports.io/flags/fr.svg' } },
  { league: { id: 88,  name: 'Eredivisie',       logo: 'https://media.api-sports.io/football/leagues/88.png'  }, country: { name: 'Netherlands', code: 'NL', flag: 'https://media.api-sports.io/flags/nl.svg' } },
  { league: { id: 94,  name: 'Primeira Liga',    logo: 'https://media.api-sports.io/football/leagues/94.png'  }, country: { name: 'Portugal',    code: 'PT', flag: 'https://media.api-sports.io/flags/pt.svg' } },
  { league: { id: 203, name: 'Süper Lig',        logo: 'https://media.api-sports.io/football/leagues/203.png' }, country: { name: 'Turkey',      code: 'TR', flag: 'https://media.api-sports.io/flags/tr.svg' } },
  { league: { id: 128, name: 'Liga Profesional', logo: 'https://media.api-sports.io/football/leagues/128.png' }, country: { name: 'Argentina',   code: 'AR', flag: 'https://media.api-sports.io/flags/ar.svg' } },
]
