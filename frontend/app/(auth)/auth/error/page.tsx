import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auth Error',
  description: 'Something went wrong during authentication.',
}

const  Error = () => {
    return(
        <h4>Error page</h4>
    )
}

export default Error