'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  BellIcon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  LogOutIcon,
  MailIcon,
  MonitorOffIcon,
  SaveIcon,
  ShieldIcon,
  UserIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api, UserSettingsDoc } from '@/lib/apiClient'
import { useAuth } from '@/context/auth/AuthContext'
import { cn } from '@/lib/utils'

type NotificationKey = keyof UserSettingsDoc['notifications']
type PrivacyKey = keyof UserSettingsDoc['privacy']

const NOTIFICATION_FIELDS: Array<{ key: NotificationKey; label: string; description: string }> = [
  { key: 'challengeMatched',    label: 'Challenge matched',     description: 'When someone accepts your challenge or you auto-match' },
  { key: 'challengeSettled',    label: 'Challenge settled',     description: 'Wins, losses, and refunds' },
  { key: 'depositConfirmed',    label: 'Deposit confirmed',     description: 'Your USDT lands on-chain and credits your wallet' },
  { key: 'withdrawalProcessed', label: 'Withdrawal processed',  description: 'Your withdrawal is sent on-chain' },
  { key: 'newFollower',         label: 'New follower',          description: 'Someone follows your profile' },
]

const PRIVACY_FIELDS: Array<{ key: PrivacyKey; label: string; description: string }> = [
  { key: 'showWagerHistory', label: 'Show wager history',   description: 'Public profile shows your past bets' },
  { key: 'showStats',        label: 'Show performance stats', description: 'Show win rate and P&L on your public profile' },
  { key: 'showBalance',      label: 'Show wallet balance',  description: 'Display your current balance publicly' },
]

export default function SettingsPage() {
  const { user, loading: authLoading, refresh: refreshUser, logout } = useAuth()
  const [settings, setSettings] = useState<UserSettingsDoc | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingSettings, setSavingSettings] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const res = await api.users.settings()
      setSettings(res.data)
    } catch {
      // silent — defaults will show
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])

  useEffect(() => {
    load()
  }, [load])

  const handleSaveProfile = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Name cannot be empty')
      return
    }
    if (trimmed === user?.name) return
    setSavingProfile(true)
    try {
      await api.users.updateMe({ name: trimmed })
      toast.success('Profile updated')
      await refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingProfile(false)
    }
  }

  const toggleNotification = async (key: NotificationKey) => {
    if (!settings) return
    const next = !settings.notifications[key]
    const previous = settings
    setSettings({ ...settings, notifications: { ...settings.notifications, [key]: next } })
    setSavingSettings(`notif:${key}`)
    try {
      await api.users.updateSettings({
        notifications: { ...settings.notifications, [key]: next },
      })
    } catch (err) {
      setSettings(previous)
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingSettings(null)
    }
  }

  const togglePrivacy = async (key: PrivacyKey) => {
    if (!settings) return
    const next = !settings.privacy[key]
    const previous = settings
    setSettings({ ...settings, privacy: { ...settings.privacy, [key]: next } })
    setSavingSettings(`privacy:${key}`)
    try {
      await api.users.updateSettings({
        privacy: { ...settings.privacy, [key]: next },
      })
    } catch (err) {
      setSettings(previous)
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSavingSettings(null)
    }
  }

  if (authLoading) {
    return (
      <section className="py-6 md:py-10 pb-20 md:pb-10">
        <div className="container max-w-2xl mx-auto grid gap-4">
          <div className="h-32 bg-white rounded-2xl animate-pulse" />
          <div className="h-64 bg-white rounded-2xl animate-pulse" />
        </div>
      </section>
    )
  }

  if (!user) {
    return (
      <section className="py-10">
        <div className="container max-w-md mx-auto text-center">
          <p className="text-sm text-gray-500 mb-4">Sign in to manage settings.</p>
          <Button asChild>
            <Link href="/auth/login?redirect=/settings">Sign In</Link>
          </Button>
        </div>
      </section>
    )
  }

  return (
    <section className="py-6 md:py-10 pb-20 md:pb-10">
      <div className="container max-w-2xl mx-auto grid gap-4">
        <header>
          <h1 className="text-2xl font-bold mb-1">Settings</h1>
          <p className="text-sm text-gray-500">Manage your profile, notifications, and privacy.</p>
        </header>

        {/* Profile */}
        <SectionCard
          Icon={UserIcon}
          title="Profile"
          subtitle="Public information shown to other users"
        >
          <div className="grid gap-3">
            <Field label="Display name">
              <div className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 py-5 rounded-lg shadow-none"
                  maxLength={50}
                />
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile || name.trim() === user.name}
                  size="sm"
                  className="h-10"
                >
                  {savingProfile ? 'Saving…' : <><SaveIcon className="h-3 w-3 mr-1" /> Save</>}
                </Button>
              </div>
            </Field>
            <Field label="Email" hint="Verified through Google. Contact support to change.">
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2.5">
                <MailIcon className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 truncate flex-1">{user.email}</span>
                <CheckCircle2Icon className="h-4 w-4 text-green-500" />
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          Icon={BellIcon}
          title="Notifications"
          subtitle="Choose which events trigger in-app alerts"
        >
          {loading ? (
            <SkeletonToggles count={NOTIFICATION_FIELDS.length} />
          ) : (
            <div className="grid divide-y divide-gray-100 -mx-5">
              {NOTIFICATION_FIELDS.map((f) => (
                <ToggleRow
                  key={f.key}
                  label={f.label}
                  description={f.description}
                  checked={settings?.notifications[f.key] ?? true}
                  onChange={() => toggleNotification(f.key)}
                  saving={savingSettings === `notif:${f.key}`}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Privacy */}
        <SectionCard
          Icon={ShieldIcon}
          title="Privacy"
          subtitle="Control what other users see on your profile"
        >
          {loading ? (
            <SkeletonToggles count={PRIVACY_FIELDS.length} />
          ) : (
            <div className="grid divide-y divide-gray-100 -mx-5">
              {PRIVACY_FIELDS.map((f) => (
                <ToggleRow
                  key={f.key}
                  label={f.label}
                  description={f.description}
                  checked={settings?.privacy[f.key] ?? false}
                  onChange={() => togglePrivacy(f.key)}
                  saving={savingSettings === `privacy:${f.key}`}
                />
              ))}
            </div>
          )}
        </SectionCard>

        {/* Account actions */}
        <SectionCard Icon={LogOutIcon} title="Account" subtitle="Sign out or destructive actions">
          <div className="grid gap-1">
            <Button
              variant="ghost"
              className="justify-start text-gray-700 hover:bg-gray-50"
              onClick={async () => {
                await logout()
                window.location.href = '/'
              }}
            >
              <LogOutIcon className="h-4 w-4 mr-2" />
              Sign out (this device only)
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={async () => {
                if (
                  !confirm(
                    'Sign out everywhere will invalidate every active session — your phone, ' +
                    'tablet, and any browser you’re signed in on. Continue?',
                  )
                ) {
                  return
                }
                try {
                  await api.auth.logoutEverywhere()
                } catch {
                  // ignore — we'll force-clear locally regardless
                }
                window.location.href = '/'
              }}
            >
              <MonitorOffIcon className="h-4 w-4 mr-2" />
              Sign out everywhere
            </Button>
          </div>
        </SectionCard>
      </div>
    </section>
  )
}

function SectionCard({
  Icon,
  title,
  subtitle,
  children,
}: {
  Icon: typeof UserIcon
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="h-4 w-4 text-gray-500" />
        <div>
          <h3 className="font-bold text-sm">{title}</h3>
          {subtitle && <p className="text-[11px] text-gray-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-1">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  saving,
}: {
  label: string
  description: string
  checked: boolean
  onChange: () => void
  saving: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 py-3.5">
      <div className="flex items-start gap-3 min-w-0">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-600 flex-shrink-0 mt-0.5">
          {checked ? <EyeIcon className="h-3.5 w-3.5" /> : <EyeOffIcon className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={saving} />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      aria-pressed={checked}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0',
        checked ? 'bg-blue-600' : 'bg-gray-300',
        disabled && 'opacity-60',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  )
}

function SkeletonToggles({ count }: { count: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-7 w-7 bg-gray-100 rounded-full flex-shrink-0" />
            <div className="flex-1 grid gap-1.5">
              <div className="h-3.5 w-32 bg-gray-100 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="h-6 w-11 bg-gray-100 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
