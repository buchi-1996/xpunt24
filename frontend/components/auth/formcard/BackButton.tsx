import Link from 'next/link'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Url } from 'next/dist/shared/lib/router/router'

interface BackButtonProps{
    label: string,
    href: Url
}

const BackButton = ({label, href}: BackButtonProps) => {
  return (
    <Button variant="link" asChild>
      <Link href={href}>{label}</Link>
    </Button>
  )
}

export default BackButton