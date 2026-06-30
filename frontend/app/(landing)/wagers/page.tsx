import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Wagers',
  description: 'Track and manage all your active, open, and settled peer-to-peer sports challenges on Xpunt24.',
}

import { BetListWrapper } from '@/components/betlist'
import LeagueTabs from '@/components/leagueTabs'
import { Suspense } from 'react'


const Wager = async () => {


  return (
    <section className='py-10'>
      <div className="container">
        <div className="grid gap-4">
          <h4 className='text-[2rem] mb-2 md:text-[2.5rem] font-bold'>My Wagers</h4>
          <div className="grid grid-cols-1  lg:grid-cols-8 gap-10">
            <div className="hidden lg:block col-span-2">
              <LeagueTabs />
            </div>
            <div className="col-span-6">
              <Suspense fallback={<p>Loading...</p>}>
                <BetListWrapper />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Wager


// import BetListTabs from '@/components/betlist'
// import LeagueTabs from '@/components/leagueTabs'
// import { Suspense } from 'react'
// import { Card, CardContent } from '@/components/ui/card'

// const LoadingFallback = () => (
//   <div className="space-y-4">
//     {[1, 2, 3].map((i) => (
//       <Card key={i} className="animate-pulse">
//         <CardContent className="p-6">
//           <div className="flex justify-between items-start mb-4">
//             <div className="space-y-2">
//               <div className="h-4 bg-gray-200 rounded w-48"></div>
//               <div className="h-3 bg-gray-200 rounded w-32"></div>
//             </div>
//             <div className="h-6 bg-gray-200 rounded w-20"></div>
//           </div>
//           <div className="grid grid-cols-3 gap-4">
//             <div className="space-y-2">
//               <div className="h-3 bg-gray-200 rounded w-16"></div>
//               <div className="h-4 bg-gray-200 rounded w-20"></div>
//             </div>
//             <div className="space-y-2">
//               <div className="h-3 bg-gray-200 rounded w-16"></div>
//               <div className="h-4 bg-gray-200 rounded w-24"></div>
//             </div>
//             <div className="space-y-2">
//               <div className="h-3 bg-gray-200 rounded w-16"></div>
//               <div className="h-4 bg-gray-200 rounded w-28"></div>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     ))}
//   </div>
// )

// const BetList = async () => {
  

//   return (
//     <section className='py-10'>
//       <div className="container max-w-7xl mx-auto px-4">
//         <div className="grid gap-6">
//           {/* Header */}
//           <div className="space-y-2">
//             <h1 className='text-3xl md:text-4xl font-bold text-gray-900'>
//               My Wagers
//             </h1>
//             <p className="text-gray-600">
//               Track and manage all your betting challenges
//             </p>
//           </div>

//           {/* Main Content Grid */}
//           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
//             {/* Sidebar - League Tabs */}
//             <div className="lg:col-span-3">
//               <div className="sticky top-6">
//                 <Card className="p-4">
//                   <h3 className="font-semibold mb-4">Filter by League</h3>
//                   <Suspense fallback={
//                     <div className="space-y-2">
//                       {[1, 2, 3, 4].map(i => (
//                         <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
//                       ))}
//                     </div>
//                   }>
//                     <LeagueTabs />
//                   </Suspense>
//                 </Card>
//               </div>
//             </div>

//             {/* Main Content - Bet List */}
//             <div className="lg:col-span-9">
//               <Suspense fallback={<LoadingFallback />}>
//                 <BetListTabs />
//               </Suspense>
//             </div>
//           </div>

//           {/* Quick Stats Card */}
//           <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
//               <div>
//                 <h3 className="text-2xl font-bold text-blue-600">₦0</h3>
//                 <p className="text-sm text-gray-600">Total Wagered</p>
//               </div>
//               <div>
//                 <h3 className="text-2xl font-bold text-green-600">₦0</h3>
//                 <p className="text-sm text-gray-600">Total Won</p>
//               </div>
//               <div>
//                 <h3 className="text-2xl font-bold text-purple-600">0%</h3>
//                 <p className="text-sm text-gray-600">Win Rate</p>
//               </div>
//             </div>
//           </Card>
//         </div>
//       </div>
//     </section>
//   )
// }

// export default BetList