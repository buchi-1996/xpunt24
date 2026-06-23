import { redirect } from 'next/navigation'

const Verify = async () => {
  return redirect('/auth/login')
}

export default Verify
