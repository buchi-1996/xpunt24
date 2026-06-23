'use client'

import React from 'react'
import { Button } from '../ui/button'
import Link from 'next/link'

const Header = () => {
  return (
    <header className='z-50 sticky top-0 w-full bg-hero-bg bg-cover bg-center'>
      <div className="container">
        <div className='flex flex-row items-center py-4 justify-between'>
          <Link href="/"><h4 className='font-bold text-xl text-white'>Xpunt24</h4></Link>
          <div className='flex flex-row items-center gap-2'>
            <Button variant="secondary" size='sm' asChild>
              <Link href="/auth/login">Login</Link>
            </Button>
            <Button variant="primary" size='sm' asChild>
              <Link href="/auth/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </div>
      <nav className='py-3 bg-white'>
        <div className="container">
          <div className='flex items-center justify-between'>
            <ul className='flex flex-row items-center text-xs sm:text-sm gap-8 sm:gap-10'>
              <Link href="/"><li>Home</li></Link>
              <Link href="/matches"><li>Matches</li></Link>
              <Link href="/challenges"><li>Challenges</li></Link>
              <Link href="/app"><li>App</li></Link>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Header
