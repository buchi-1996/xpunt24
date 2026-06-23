"use client"

import React, { useRef } from 'react'
import Autoplay from "embla-carousel-autoplay"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Image from 'next/image'

const Hero = () => {
    const plugin = useRef(
        Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })
      )

      const sliderImages = [
            '/assets/sliderImages/5d826682-e952-4be9-b5be-31ce542ea414.webp',
            '/assets/sliderImages/63377397-1a5e-4ced-af50-98acc11dccb6.webp',
            '/assets/sliderImages/5a685da7-5e84-4a6e-aef1-5ef58dcb3b9e.webp',
            
        
      ]

    return (
        
        <section className='mt-6 md:mt-10'>
            <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div className='hidden md:block col-span-1 overflow-hidden rounded-2xl'>
                        <Image src="/assets/395fa7ba8ce46613be6fe40218389d41.png" width={500} height={500} alt="" className='w-full h-full object-cover' />
                    </div>
                    <div className="col-span-3 bg-gray-50 rounded-2xl place-self-start w-full">
                        <Carousel
                            plugins={[plugin.current]}
                            className="w-full group"
                            onMouseEnter={plugin.current.stop}
                            onMouseLeave={plugin.current.reset}
                        >
                            <CarouselContent>
                              { sliderImages.map((item, index) => (
                                    <CarouselItem key={index} className='flex-none w-full '>
                                        <Image src={item} alt={`Slide ${index + 1}`} width={500} height={50} className='w-full h-auto object-contain rounded-2xl'/>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className='hidden group-hover:flex' />
                            <CarouselNext className='hidden group-hover:flex'/>
                        </Carousel>
                    </div>
                    <div className='hidden md:block col-span-1 overflow-hidden rounded-2xl'>
                        <Image src="/assets/5bab3c76-18d0-4ac8-97d6-cdf7b3e59d59.webp" width={500} height={500} alt="" className='w-full h-full object-cover' />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Hero