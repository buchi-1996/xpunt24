import { FileLineChart, HomeIcon, Ticket, UserIcon } from "lucide-react"
import Link from "next/link"

export default function BottomNav() {
    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 md:hidden w-full items-center justify-around bg-white shadow-t dark:bg-gray-900 dark:shadow-t-gray-800">
            <Link
                href="/"
                className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
                prefetch={false}
            >
                <HomeIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">Home</span>
            </Link>
            <Link
                href="/challenges"
                className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
                prefetch={false}
            >
                <FileLineChart className="h-4 w-4" />
                <span className="text-xs font-semibold">Challenges</span>
            </Link>
            <Link
                href="/wagers"
                className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
                prefetch={false}
            >
                <Ticket className="h-4 w-4" />
                <span className="text-xs font-semibold">Wagers</span>
            </Link>
            <Link
                href="#"
                className="flex flex-col items-center justify-center gap-1 text-gray-500 transition-colors hover:text-gray-900 focus:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50 dark:focus:text-gray-50"
                prefetch={false}
            >
                <UserIcon className="h-4 w-4" />
                <span className="text-xs font-semibold">Profile</span>
            </Link>
        </nav>
    )
}

