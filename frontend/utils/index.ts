// // import axiosInstance from "./axiosInstance";

// // export const getLeagues = async () => {
// //   try{
// //     console.log('Yes')
// //     const leagues = await axiosInstance.get('/leagues');
// //     console.log(leagues.data.response)
// //     return leagues

// //   }catch(e){
// //     console.log(e)
// //   }
// // }


// // alert('Hello World')

// // import axiosInstance from "./axiosInstance";

// export const getLeagues = async () => {
//   const popularLeagues = [
//     "Premier League",
//     "La Liga",
//     "Serie A",
//     "Bundesliga", 
//     "Ligue 1",
//     "UEFA Champions League",
//     "UEFA Europa League",
//     "MLS",
//     "Brazil Serie A",
//     "Argentina Liga Profesional",
//   ];

//   // try{
//   //   console.log('Yes')
//   //   const leagues = await axiosInstance.get('/leagues');
//   //   console.log(leagues.data.response)
    
//   //   const filteredLeagues = leagues.data.response.filter((league: any) => popularLeagues.includes(league.name));
//   //   return filteredLeagues;

//   // }catch(e){
//   //   console.log(e)
//   // }


//   try{
//     const leagues = await fetch('https://v3.football.api-sports.io/leagues', {
//       method: 'GET',
//       headers: {
//         "x-rapidapi-host": "v3.football.api-sports.io",
//         'x-apisports-key': process.env.NEXT_PUBLIC_FOOTBALL_API_KEY || '',
//         'Content-Type': 'application/json',
//         'Accept': 'application/json',
//       },

//       // 👇 This must be INSIDE the fetch options object
//       next: {
//         revalidate: 86400, // cache for 24 hours
//       },
//     })

//     const data = await leagues.json();
//     const filteredLeagues = data.response.filter((league: any) => popularLeagues.includes(league.name));
//     console.log(filteredLeagues)
//   return filteredLeagues;

//   }catch(e){
//     console.log(e)
//   }
// }


// // alert('Hello World')



// export default getLeagues;


// scripts/cacheLeagues.ts
import fs from 'fs/promises';

const fetchAndCacheLeagues = async () => {
  const res = await fetch("https://football.sportdevs.com/leagues?limit=1000", {
    headers: {
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_FOOTBALL_API_KEY}`,
      Accept: "application/json",
    },
  });

  const data = await res.json();

  await fs.writeFile("data/leagues.json", JSON.stringify(data, null, 2));
  console.log("Leagues cached to data/leagues.json");
};

fetchAndCacheLeagues();




