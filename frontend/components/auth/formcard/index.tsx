"use client"

import React from 'react'
import { FormCardProps } from '@/types'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import BackButton from './BackButton'
import AuthHeader from './AuthHeader'
import Link from 'next/link'



const FormCard = ({label, title, backButtonHref, backButtonLabel, className, children, isLogin}: FormCardProps) => {
  return (
    <Card className={`${className}`}>
        <CardHeader>
            <AuthHeader label={label} title={title} />
        </CardHeader>
        <CardContent className='w-full'>
            {children}
        </CardContent>
        <CardFooter>
            <div className='grid place-items-center justify-center w-full'>
                <BackButton href={backButtonHref} label={backButtonLabel} />
                {isLogin && <Link href="/"><small className='text-gray-500 bg-gray-50 py-2 px-4 rounded-full'>Forgot password?</small></Link>}
                <small className='max-w-sm text-xs mt-6 text-gray-500 text-center'>By clicking continue, you agree to our Terms of Service and Privacy Policy.</small>
            </div>
        </CardFooter>
    </Card>
  )
}

export default FormCard