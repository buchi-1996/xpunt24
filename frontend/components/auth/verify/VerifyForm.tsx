'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const VerifyForm = () => {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth/login')
  }, [router])

  return null
}

export default VerifyForm
