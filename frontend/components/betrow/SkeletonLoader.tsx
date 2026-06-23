import { Skeleton } from "../ui/skeleton"

const SkeletonLoader = ({ homepage }: {homepage: boolean}) => {
    return (
        <div className="rounded-2xl mt-6 bg-gray-50 w-full  place-self-start">
            {homepage ? (
                <div className="flex flex-row items-center mb-4 pt-6 px-4 justify-between">
                    <div className="flex flex-col gap-2 md:gap-4  md:flex-row md:items-center">
                        <Skeleton className="h-4 w-20 md:w-44 rounded-md" />
                        <Skeleton className='h-2 w-14 md:w-24 rounded-md' />
                    </div>
                    <Skeleton className="h-2 w-20 rounded-md" />
                </div>
            ) : ''}
            <div className="flex flex-row items-start gap-4 md:gap-6 mb-4 pt-6 px-4">
                <Skeleton className="h-8 md:h-10 w-24 rounded-full" />
                <Skeleton className="h-8 md:h-10 w-24 rounded-full" />
                <Skeleton className="h-8 md:h-10 w-24 rounded-full" />
                <Skeleton className="h-8 md:h-10 w-24 rounded-full" />
            </div>

            <div className="border-b my-2" />
            <div className='mt-10 overflow-hidden rounded-br-2xl rounded-bl-2xl'>
                {[...Array(10)].map((_, index) => (<div key={index} className="bg-white  flex flex-row items-center justify-between border-b gap-4 py-4 px-4 w-full">
                    <div className="grid gap-1 flex-1">
                        <Skeleton className='h-2 w-20 md:w-24 rounded-md' />
                        <Skeleton className='h-2 w-14 md:w-20 rounded-md' />
                        <Skeleton className='h-2 w-6 md:w-8 rounded-md' />
                    </div>
                    <div className="flex items-center gap-2 ">
                        <div className="flex flex-row items-center gap-1 md:gap-2 ">
                            <Skeleton className='h-6 w-12 md:w-24 rounded-md' />
                            <Skeleton className='h-6 w-12 md:w-24 rounded-md' />
                            <Skeleton className='h-6 w-12 md:w-24 rounded-md' />
                            <Skeleton className=" h-6 w-12 md:w-24 rounded-md hidden xl:flex text-xs px-6 md:text-sm" />
                            <Skeleton className=" h-6 w-12 md:w-24 rounded-md hidden xl:flex text-xs px-6 md:text-sm" />
                        </div>
                        <Skeleton className='h-2 w-4 md:w-8 rounded-md' />
                    </div>
                </div>
                ))}

            </div>
        </div>
    )
}

export default SkeletonLoader