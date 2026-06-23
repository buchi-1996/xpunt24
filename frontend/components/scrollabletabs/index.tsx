"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { LeagueProps } from "@/types";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';


 type setLeagueProps = {
    leagueId: number | null;
    league: {
        country: string;
        league: string;
    }
}   



const ScrollableTabs = ({ leagues }: { leagues: LeagueProps[] }) => {

    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeTab, setActiveTab] = useState({country: "All", league: "🔥All"});

    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedLeagueId = searchParams.get("league");
    const pathname = usePathname();


    const setLeague = ({leagueId, league}: setLeagueProps) => {
        setActiveTab({ country: league.country, league: league.league });
        const params = new URLSearchParams(searchParams.toString());
        if (leagueId) {
          params.set("league", String(leagueId));
        } else {
          params.delete("league");
        }
        router.push(`${pathname}?${params.toString()}`, { scroll: false });

      };
    


    // console.log('My Leagues:', leagues)
    useEffect(() => {
        if (selectedLeagueId && leagues.length > 0) {
          const leagueId = parseInt(selectedLeagueId, 10);
          const foundLeague = leagues.find(
            ({ league }) => league.id === leagueId
          );
      
          if (foundLeague) {
            setActiveTab({
              country: foundLeague.country.name,
              league: foundLeague.league.name,
            });
          }
        }
      }, [selectedLeagueId, leagues]);
      
    

    const scroll = (direction: "left" | "right") => {
        if (scrollRef.current) {
            const scrollAmount = 150; // Adjust as needed
            if (direction === "left") {
                scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
            } else {
                scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
            }
        }
    };

    return (
        <div className="relative w-full pl-4  flex items-center">
            {/* Left Scroll Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute -left-10 z-10 bg-white shadow-lg rounded-full hidden md:flex"
                onClick={() => scroll("left")}
            >
                <ChevronLeft size={20} />
            </Button>

            {/* Scrollable Tab Container */}
            <div
                ref={scrollRef}
                className="flex overflow-x-auto no-scrollbar gap-2 pr-4  w-full scroll-smooth"
            >
                <Button
                    variant={activeTab.league === "🔥All" ? "default" : "outline"}
                    className={`rounded-full flex-shrink-0 flex iteems-center whitespace-nowrap pl-2 pr-4 py-6 border-2 border-transparent focus:bg-white  ${activeTab.league === "🔥All" && "bg-white hover:bg-white text-black border-indigo-700"} `}
                    onClick={() => setLeague({leagueId: null, league: { country: 'All', league: '🔥All'}})}
                >🔥All</Button>

                {leagues.map(({ country, league }: LeagueProps) => (
                    <Button
                        key={league.id}
                        variant={activeTab.league === league.name && activeTab.country === country.name ? "default" : "outline"}
                        className={`rounded-full flex-shrink-0 flex iteems-center whitespace-nowrap pl-2 pr-4 py-6 border-2 border-transparent focus:bg-white  ${activeTab.league === league.name && activeTab.country === country.name && "bg-white hover:bg-white text-black border-indigo-700"} `}
                        onClick={() => setLeague({leagueId: league.id, league: { country: country.name, league: league.name}})}
                    >
                        <Image
                            src={league.logo}
                            alt={league.name}
                            width={30}
                            height={30}
                            className="rounded-full w-6 h-6 object-contain m-0  flex-0" />

                        <div className="flex flex-col items-start">
                            <span className="text-[0.7rem] text-gray-400">{country.name}</span>
                            <span className="-mt-1">{league.name}</span>
                        </div>
                    </Button>
                ))}
            </div>

            {/* Right Scroll Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute -right-10 z-10 bg-white shadow-lg rounded-full hidden md:flex"
                onClick={() => scroll("right")}
            >
                <ChevronRight size={20} />
            </Button>
        </div>
    );
};

export default ScrollableTabs;
