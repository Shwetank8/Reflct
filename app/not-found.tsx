import { Button } from '@/components/ui/button'
import Link from 'next/link'
import React from 'react'

const NotFound = () => {
  return (
    <div className='flex flex-col items-center justify-center min-h-[60vh] px-4 text-center'>
      <h1 className='text-6xl font-bold gradient-title mb-4'>404</h1>
      <h2 className='text-2xl font-semibold mb-4'>Page not found</h2>
      <p className='text-gray-600 mb-8'>Oops the page you are looking for does  not exist</p>
      <Link href='/'>
            <Button variant='journal'>Return Home</Button>
      </Link>
    </div>
  )
}
export default NotFound
