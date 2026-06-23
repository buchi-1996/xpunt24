'use client'

import { DropdownMenuGroup, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/auth/AuthContext'

const LogoutMenu = () => {
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch {
      window.location.href = '/'
    }
  }

  return (
    <DropdownMenuGroup>
      <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
    </DropdownMenuGroup>
  )
}

export default LogoutMenu
