import { useState, type FormEvent } from 'react'
import { PATHS } from '@/app/router/paths'
import { PageHeader } from '@/components/layout'
import { Badge, Button, Card, CardBody, CardHeader, FormField, Input, PasswordInput } from '@/components/ui'
import { useChangePassword, useMe, useUpdateProfile } from '../hooks/useProfile'
import { useAuthStore } from '../store/auth.store'

export function AccountPage() {
  const storeUser = useAuthStore((s) => s.user)
  const meQuery = useMe()
  const user = meQuery.data ?? storeUser

  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()

  const [draftName, setDraftName] = useState<string | null>(null)
  const [draftPhone, setDraftPhone] = useState<string | null>(null)
  const name = draftName ?? user?.name ?? ''
  const phone = draftPhone ?? user?.phone ?? ''

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const handleProfileSubmit = (e: FormEvent) => {
    e.preventDefault()
    updateProfile.mutate(
      { name: name.trim(), phone: phone.trim() },
      {
        onSuccess: () => {
          setDraftName(null)
          setDraftPhone(null)
        },
      },
    )
  }

  const handlePasswordSubmit = (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.')
      return
    }

    changePassword.mutate(
      { current_password: currentPassword, new_password: newPassword },
      {
        onSuccess: () => {
          setCurrentPassword('')
          setNewPassword('')
          setConfirmPassword('')
        },
      },
    )
  }

  return (
    <div className="w-full space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title="Profil Akun"
        subtitle="Kelola informasi pribadi dan keamanan akun Anda."
        breadcrumbs={[{ label: 'Beranda', to: PATHS.HOME }, { label: 'Profil Akun' }]}
        actions={
          user && (
            <Badge variant={user.verification_status === 'VERIFIED' ? 'success' : 'warning'}>
              {user.verification_status === 'VERIFIED' ? 'Terverifikasi' : 'Belum Verifikasi'}
            </Badge>
          )
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-bold text-ink">Informasi Profil</h2>
            <p className="text-xs text-fg-muted">Perbarui nama lengkap dan nomor WhatsApp aktif.</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <FormField label="Email" htmlFor="account-email">
                <Input id="account-email" value={user?.email ?? ''} disabled />
              </FormField>

              <FormField label="Nama Lengkap" htmlFor="account-name" required>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(e) => setDraftName(e.target.value)}
                  minLength={2}
                  maxLength={100}
                  required
                />
              </FormField>

              <FormField label="Nomor Telepon" htmlFor="account-phone" required>
                <Input
                  id="account-phone"
                  value={phone}
                  onChange={(e) => setDraftPhone(e.target.value)}
                  minLength={8}
                  maxLength={20}
                  required
                />
              </FormField>

              <Button type="submit" loading={updateProfile.isPending} fullWidth>
                Simpan Profil
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-display text-lg font-bold text-ink">Ubah Password</h2>
            <p className="text-xs text-fg-muted">Gunakan minimal 8 karakter untuk keamanan akun.</p>
          </CardHeader>
          <CardBody>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormField label="Password Saat Ini" htmlFor="current-password" required>
                <PasswordInput
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </FormField>

              <FormField
                label="Password Baru"
                htmlFor="new-password"
                error={passwordError ?? undefined}
                required
              >
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </FormField>

              <FormField label="Konfirmasi Password Baru" htmlFor="confirm-password" required>
                <PasswordInput
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                />
              </FormField>

              <Button type="submit" variant="secondary" loading={changePassword.isPending} fullWidth>
                Perbarui Password
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

export default AccountPage
