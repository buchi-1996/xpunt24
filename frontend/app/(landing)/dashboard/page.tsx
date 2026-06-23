"use client"

import LeagueTabs from '@/components/leagueTabs'
import { updateProfileSchema } from '@/lib/formSchema'
import { useForm } from "react-hook-form"
import { zodResolver } from '@hookform/resolvers/zod'


import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from '@/components/ui/input'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'


const Dashboard = () => {


    const form = useForm({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            username: 'Buchi22',
            email: 'me@gmail.com',
            gender: "Male" as "Male" | "Female",
            bio: 'Hi, I am a user',
            avatar: ''
        }
    })

    return (
        <section className='py-10'>
            <div className="container">
                <div>
                    <div className='flex flex-col lg:flex-row lg:items-center gap-4'>
                        <h4 className='text-[2rem] mb-2 md:text-[2.5rem] font-bold'>Hi, User</h4>
                    </div>
                    <div className="grid lg:grid-cols-8 gap-10 pt-10">
                        <div className="hidden lg:block col-span-2">
                            <div className="hidden lg:block">
                                <LeagueTabs />
                            </div>
                        </div>
                        <div className="col-span-6 w-full bg-white p-8 rounded-lg">
                            <Form {...form}>
                                <form className="space-y-8">


                                    <FormField
                                        control={form.control}
                                        name="avatar"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-4">
                                                <Avatar className='border-2 border-black w-24 h-24'>
                                                    <AvatarImage src="https://github.com/shadcn.png" />
                                                    <AvatarFallback>CN</AvatarFallback>
                                                </Avatar>
                                                <FormLabel htmlFor="avatar" className='cursor-pointer'>
                                                    <Button variant="ghost" size="icon" className='p-1' asChild>
                                                        <Camera size={30} className='text-gray-500' />
                                                    </Button>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="file" id="avatar" placeholder="Upload" className="sr-only py-6 rounded-lg shadow-none" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Username</FormLabel>
                                                <FormControl>
                                                    <Input {...field} type="text" id="username" placeholder="Username" className="py-6 rounded-lg shadow-none" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </form>
                            </Form>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Dashboard