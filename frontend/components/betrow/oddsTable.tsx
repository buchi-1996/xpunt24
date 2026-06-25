// OddsTable.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import Challenge from "../negociation/Challenge";
import { useModal } from "@/hooks/useModal";
import BookButton from "./BookButton";
import { Match } from "@/types";
import { formatFixtureDateTime } from "@/lib/utils";

type OddsTableProps = {
  match: Match;
};

const OddsTable = ({ match }: OddsTableProps) => {
  const { openModal } = useModal();
  const { fixture, teams } = match;
  const { home, away } = teams;
  const { id, timestamp } = fixture;




  const handleOptionClick = (option: string) => {
   
    openModal(
      <Challenge match={match} selectedOption={option} />
    );
  };

  return (
    <div
      className="bg-white flex flex-row items-center justify-between border-b gap-4 py-2 px-4 w-full"
    >
      <div className="grid gap-1 flex-1">
        <span className="text-gray-500 text-xs">{formatFixtureDateTime(timestamp)}</span>
        <Link href={`/matches/${id}`}>
          <div className="flex flex-col gap-1">
            <h4 className="font-semibold text-xs md:text-sm">{home.name}</h4>
            <h4 className="font-semibold text-xs md:text-sm">{away.name}</h4>
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex flex-row items-center gap-1 md:gap-2">
          <BookButton onClick={() => handleOptionClick("home")}>1</BookButton>
          <BookButton onClick={() => handleOptionClick("draw")}>X</BookButton>
          <BookButton onClick={() => handleOptionClick("away")}>2</BookButton>

          <div className="hidden xl:flex items-center gap-2">
            <BookButton onClick={() => handleOptionClick("over_25")}>O 2.5</BookButton>
            <BookButton onClick={() => handleOptionClick("under_25")}>U 2.5</BookButton>
          </div>
        </div>

        <Button variant="ghost" size="lg" className="px-2" asChild>
          <Link href={`/matches/${id}`} className="flex items-center gap-2">
            <ChevronRight size={40} />
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default OddsTable;
