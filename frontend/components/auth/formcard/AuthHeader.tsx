import React from 'react'

interface AuthHeaderProps {
  title: string,
  label: string
}

const AuthHeader = ({ title, label }: AuthHeaderProps) => {
  return (
    <div className='flex flex-col items-center justify-center gap-2'>
      <h4 className='font-bold text-sm text-gray-600'>Xpunt24</h4>
      <div className='grid place-items-center'>
        <h2 className='font-extrabold text-2xl'>{title}</h2>
        <p className='text-sm text-gray-500 mt-1'>{label}</p>
      </div>
    </div>
  )
}

export default AuthHeader