import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

const Footer = () => {
    return (
        <footer className="bg-footer-bg bg-top-left bg-no-repeat bg-cover py-10">
            <div className="container">
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-10">
                    <div className="col-span-6 lg:col-span-3 grid gap-4 w-full">
                        <h4 className='font-extrabold text-2xl text-white'>Xpunt24</h4>
                        <div className='flex flex-row gap-4 items-center'>
                            <span>
                                <Image src="/assets/age.png" alt="18 symbol" width={50} height={50} className="w-16 h-auto object-contain" />
                            </span>
                            <p className='text-sm text-white'>Age 18 and above only to register or play at Xpunt24. Play Responsibly.</p>
                        </div>
                    </div>
                    <div className='col-span-3 sm:col-span-2 w-full'>
                        <ul className='grid gap-3'>
                            <Link href="/about">
                                <li className='text-gray-50 text-xs hover:text-white'>About</li>
                            </Link>
                            <Link href="/how-to-play">
                                <li className='text-gray-50 text-xs hover:text-white'>How to play</li>
                            </Link>
                            <Link href="/matches">
                                <li className='text-gray-50 text-xs hover:text-white'>Matches</li>
                            </Link>
                            <Link href="/challenges">
                                <li className='text-gray-50 text-xs hover:text-white'>Challenges</li>
                            </Link>
                        </ul>
                    </div>
                    <div className='col-span-3 sm:col-span-2 w-full'>
                        <ul className='grid gap-4'>
                            <Link href="/terms">
                                <li className='text-gray-50 text-xs hover:text-white'>Terms and Condition</li>
                            </Link>
                            <Link href="/privacy">
                                <li className='text-gray-50 text-xs hover:text-white'>Privacy policy</li>
                            </Link>

                        </ul>
                    </div>
                    <div className='col-span-3 sm:col-span-2 flex flex-col gap-2 w-full'>
                        <h4 className='text-white text-sm'>Connect with Us</h4>
                        <ul className='flex items-center gap-4'>
                            <li className="text-white">
                                <svg className='w-8 h-8' width="64" height="64" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g clipPath="url(#clip0_152_720)">
                                        <path d="M40.3334 21.9998C40.3334 11.8798 32.1201 3.6665 22.0001 3.6665C11.8801 3.6665 3.66675 11.8798 3.66675 21.9998C3.66675 30.8732 9.97341 38.2615 18.3334 39.9665V27.4998H14.6667V21.9998H18.3334V17.4165C18.3334 13.8782 21.2117 10.9998 24.7501 10.9998H29.3334V16.4998H25.6667C24.6584 16.4998 23.8334 17.3248 23.8334 18.3332V21.9998H29.3334V27.4998H23.8334V40.2415C33.0917 39.3248 40.3334 31.5148 40.3334 21.9998Z" fill="white"></path>
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_152_720">
                                            <rect width="44" height="44" fill="white"></rect>
                                        </clipPath>
                                    </defs>
                                </svg>
                            </li>
                            <li>
                                <svg className='w-8 h-8' width="64" height="64" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M14.6667 5.5C9.61217 5.5 5.5 9.61217 5.5 14.6667V29.3333C5.5 34.3878 9.61217 38.5 14.6667 38.5H29.3333C34.3878 38.5 38.5 34.3878 38.5 29.3333V14.6667C38.5 9.61217 34.3878 5.5 29.3333 5.5H14.6667ZM14.6667 9.16667H29.3333C32.3657 9.16667 34.8333 11.6343 34.8333 14.6667V29.3333C34.8333 32.3657 32.3657 34.8333 29.3333 34.8333H14.6667C11.6343 34.8333 9.16667 32.3657 9.16667 29.3333V14.6667C9.16667 11.6343 11.6343 9.16667 14.6667 9.16667ZM31.1667 11C30.6804 11 30.2141 11.1932 29.8703 11.537C29.5265 11.8808 29.3333 12.3471 29.3333 12.8333C29.3333 13.3196 29.5265 13.7859 29.8703 14.1297C30.2141 14.4735 30.6804 14.6667 31.1667 14.6667C31.6529 14.6667 32.1192 14.4735 32.463 14.1297C32.8068 13.7859 33 13.3196 33 12.8333C33 12.3471 32.8068 11.8808 32.463 11.537C32.1192 11.1932 31.6529 11 31.1667 11ZM22 12.8333C16.9455 12.8333 12.8333 16.9455 12.8333 22C12.8333 27.0545 16.9455 31.1667 22 31.1667C27.0545 31.1667 31.1667 27.0545 31.1667 22C31.1667 16.9455 27.0545 12.8333 22 12.8333ZM22 16.5C25.0323 16.5 27.5 18.9677 27.5 22C27.5 25.0323 25.0323 27.5 22 27.5C18.9677 27.5 16.5 25.0323 16.5 22C16.5 18.9677 18.9677 16.5 22 16.5Z" fill="white"></path>
                                </svg>
                            </li>
                            <li>
                                <svg className='w-8 h-8' width="64" height="64" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4.33984 5.5L17.3486 24.0911L5.02376 38.5H9.86491L19.515 27.1885L27.4284 38.5H40.097L26.4902 19.0208L38.0238 5.5H33.2578L24.3311 15.9271L17.0479 5.5H4.33984ZM11.3796 9.16667H15.1357L33.0609 34.8333H29.3369L11.3796 9.16667Z" fill="white"></path>
                                </svg>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    )
}

export default Footer