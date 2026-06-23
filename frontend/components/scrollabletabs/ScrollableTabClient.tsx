"use client";

import React from "react";
import { LeagueProps } from "@/types";
import ScrollableTabs from ".";

type Props = {
  leagues: LeagueProps[];
};

const ScrollableTabClient = ({ leagues }: Props) => {
  return <ScrollableTabs leagues={leagues} />;
};

export default ScrollableTabClient;
