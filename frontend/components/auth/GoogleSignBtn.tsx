'use client'

import Image from 'next/image'

const GoogleSignBtn = ({ text }: { text: string }) => {
  const handleClick = () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
    window.location.href = `${apiUrl}/auth/google`
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-between border rounded-lg w-full py-2"
    >
      <p className="pl-4 text-gray-500 text-sm">{text} with Google</p>
      <Image src="/google.svg" width={100} height={100} alt="google-logo" className="w-16 h-6" />
    </button>
  )
}

export default GoogleSignBtn
