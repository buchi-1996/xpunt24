"use client"

import React from 'react'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import BetList from './BetList'
import { ScrollArea, ScrollBar } from '../ui/scroll-area'
import { useAuth } from '@/context/auth/AuthContext'
import { WagerProps } from '@/types'

const BetListTabs = ({wagers}: {wagers: WagerProps[]}) => {
    const { user } = useAuth()
    const userId = user?.id ?? '';
    
    const getGameOutcome = (wager: WagerProps, userId: string): 'open' | 'won' | 'lost' | 'running' => {
        if (wager.status === 'ACCEPTED') return 'running';
        if (!wager.winnerId) return 'open';
        if (wager.winnerId === userId) return 'won';
        if (wager.challengerId === userId || wager.opposerId === userId) return 'lost';
        return 'open';
    };

    const renderWagers = (filteredWagers: WagerProps[], emptyMessage: string) => (
        <div className='grid gap-4 mt-10'>
            {filteredWagers.length === 0 ? (
                <div className='text-gray-500 h-24 font-semibold text-center text-sm mb-4'>{emptyMessage}</div>
            ) : (
                filteredWagers.map((wager) => (
                    <BetList 
                        key={wager.id} 
                        status={getGameOutcome(wager, userId)} 
                        wager={wager} 
                        userId={userId} 
                    />
                ))
            )}
        </div>
    );

    const openWagers = wagers.filter(w => w.status === 'PENDING');
    const activeWagers = wagers.filter(w => w.status === 'ACCEPTED');
    const closedWagers = wagers.filter(w => w.status === 'COMPLETED');

    return (
        <Tabs defaultValue="all" className="w-full">
            <ScrollArea className='whitespace-nowrap'>
                <TabsList className="flex items-center justify-start py-10 gap-4 before:content-[''] before:absolute before:border-b before:w-full before:left-0 before:bottom-[22px] bg-transparent rounded-none">
                    <TabsTrigger value="all" className="text-[0.85rem] font-semibold relative bg-transparent data-[state=active]:before:content-[''] data-[state=active]:before:absolute before:-bottom-[6px] before:h-[6px] before:w-full before:rounded-2xl data-[state=active]:before:bg-btn-bg">
                        All
                    </TabsTrigger>
                    <TabsTrigger value="open" className="text-[0.85rem] font-semibold relative bg-transparent data-[state=active]:before:content-[''] data-[state=active]:before:absolute before:-bottom-[6px] before:h-[6px] before:w-full before:rounded-2xl data-[state=active]:before:bg-btn-bg">
                        Open
                    </TabsTrigger>
                    <TabsTrigger value="active" className="text-[0.85rem] font-semibold relative bg-transparent data-[state=active]:before:content-[''] data-[state=active]:before:absolute before:-bottom-[6px] before:h-[6px] before:w-full before:rounded-2xl data-[state=active]:before:bg-btn-bg">
                        Active
                    </TabsTrigger>
                    <TabsTrigger value="closed" className="text-[0.85rem] font-semibold relative bg-transparent data-[state=active]:before:content-[''] data-[state=active]:before:absolute before:-bottom-[6px] before:h-[6px] before:w-full before:rounded-2xl data-[state=active]:before:bg-btn-bg">
                        Closed
                    </TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="all">
                {renderWagers(wagers, "No available wagers")}
            </TabsContent>

            <TabsContent value="open">
                {renderWagers(openWagers, "No open wagers")}
            </TabsContent>

            <TabsContent value="active">
                {renderWagers(activeWagers, "No active wagers")}
            </TabsContent>

            <TabsContent value="closed">
                {renderWagers(closedWagers, "No closed wagers")}
            </TabsContent>
        </Tabs>
    )
}

export default BetListTabs