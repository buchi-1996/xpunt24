import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://v3.football.api-sports.io", // Set your API base URL
  headers: {
    "x-apisports-key": process.env.NEXT_PUBLIC_FOOTBALL_API_KEY, // API key from env
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
});

export default axiosInstance;
