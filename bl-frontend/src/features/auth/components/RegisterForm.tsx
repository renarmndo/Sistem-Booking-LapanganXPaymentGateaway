import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, MailCheck } from 'lucide-react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button, FormField, Input, OtpInput, PasswordInput } from '@/components/ui'
import { getErrorMessage, getFieldErrors } from '@/utils/error'
import { useRegister, useResendOtp, useVerifyOtp } from '../hooks/useRegister'
import {
  registerSchema,
  verifyOtpSchema,
  type RegisterFormValues,
  type VerifyOtpFormValues,
} from '../schemas/auth.schema'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

export function RegisterForm() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)
  const registerMutation = useRegister()
  const verifyOtpMutation = useVerifyOtp()
  const resendOtpMutation = useResendOtp()

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = window.setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendCooldown])

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
    },
  })

  const otpForm = useForm<VerifyOtpFormValues>({
    resolver: zodResolver(verifyOtpSchema),
    mode: 'onBlur',
    defaultValues: { otp: '' },
  })

  const passwordValue = useWatch({ control, name: 'password' }) ?? ''

  const onSubmitRegister = (values: RegisterFormValues) => {
    registerMutation.mutate(values, {
      onSuccess: (user) => {
        setRegisteredEmail(user.email || values.email)
      },
      onError: (err) => {
        const fieldErrs = getFieldErrors(err)
        for (const [field, message] of Object.entries(fieldErrs)) {
          if (field === 'name' || field === 'email' || field === 'phone' || field === 'password') {
            setError(field, { message })
          }
        }
      },
    })
  }

  const onSubmitOtp = (values: VerifyOtpFormValues) => {
    if (!registeredEmail) return
    verifyOtpMutation.mutate({ email: registeredEmail, otp: values.otp })
  }

  const handleResendOtp = () => {
    if (!registeredEmail || resendCooldown > 0) return
    resendOtpMutation.mutate(
      { email: registeredEmail },
      {
        onSuccess: () => {
          setResendCooldown(60)
        },
      },
    )
  }

  if (registeredEmail) {
    const otpServerError = verifyOtpMutation.isError
      ? getErrorMessage(verifyOtpMutation.error, 'Kode OTP tidak valid.')
      : resendOtpMutation.isError
        ? getErrorMessage(resendOtpMutation.error, 'Gagal mengirim ulang OTP.')
        : null

    return (
      <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} noValidate className="space-y-6">
        <div className="flex flex-col items-center rounded-xl border border-primary-200/80 bg-primary-50/60 px-4 py-5 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-primary-700 shadow-xs ring-1 ring-primary-200">
            <MailCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-ink">Cek Kotak Masuk Email Anda</p>
          <p className="mt-1 text-sm text-fg-muted">
            Masukkan 6 digit kode verifikasi yang dikirim ke{' '}
            <strong className="font-semibold text-primary-900">{registeredEmail}</strong>
          </p>
        </div>

        {otpServerError && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft/60 p-3 text-sm text-danger-ink"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
            <span>{otpServerError}</span>
          </div>
        )}

        <FormField
          label="Kode OTP"
          htmlFor="register-otp"
          hint="Berlaku 15 menit. Anda dapat mengetik satu per satu atau langsung menempel (paste) 6 digit kode."
          error={otpForm.formState.errors.otp?.message}
          required
        >
          <Controller
            control={otpForm.control}
            name="otp"
            render={({ field }) => (
              <OtpInput
                id="register-otp"
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={Boolean(otpForm.formState.errors.otp)}
                disabled={verifyOtpMutation.isPending}
                autoFocus
              />
            )}
          />
        </FormField>

        <div className="space-y-2.5">
          <Button type="submit" fullWidth loading={verifyOtpMutation.isPending}>
            Verifikasi Akun
          </Button>

          <div className="flex items-center justify-center gap-1.5 pt-1 text-sm text-fg-muted">
            <span>Belum menerima kode?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              loading={resendOtpMutation.isPending}
              disabled={resendCooldown > 0}
              onClick={handleResendOtp}
              className="h-auto px-1.5 py-0.5 font-semibold text-primary-700 hover:bg-primary-50"
            >
              {resendCooldown > 0 ? `Kirim ulang (${resendCooldown} dtk)` : 'Kirim Ulang OTP'}
            </Button>
          </div>
        </div>
      </form>
    )
  }

  const serverError = registerMutation.isError
    ? getErrorMessage(registerMutation.error, 'Gagal mendaftar. Silakan coba lagi.')
    : null

  return (
    <form onSubmit={handleSubmit(onSubmitRegister)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft/60 p-3 text-sm text-danger-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <FormField label="Nama Lengkap" htmlFor="register-name" error={errors.name?.message} required>
        <Input
          id="register-name"
          autoComplete="name"
          placeholder="Budi Santoso"
          error={Boolean(errors.name)}
          {...register('name')}
        />
      </FormField>

      <FormField label="Email" htmlFor="register-email" error={errors.email?.message} required>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={Boolean(errors.email)}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Nomor HP"
        htmlFor="register-phone"
        hint="Contoh: 081234567890"
        error={errors.phone?.message}
        required
      >
        <Input
          id="register-phone"
          type="tel"
          autoComplete="tel"
          placeholder="081234567890"
          error={Boolean(errors.phone)}
          {...register('phone')}
        />
      </FormField>

      <FormField
        label="Kata Sandi"
        htmlFor="register-password"
        hint="Minimal 8 karakter"
        error={errors.password?.message}
        required
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          placeholder="Buat kata sandi"
          error={Boolean(errors.password)}
          {...register('password')}
        />
        <PasswordStrengthIndicator password={passwordValue} />
      </FormField>

      <Button type="submit" fullWidth loading={registerMutation.isPending}>
        Daftar Akun
      </Button>

      <p className="pt-2 text-center text-sm text-fg-muted">
        Sudah punya akun?{' '}
        <Link to={PATHS.LOGIN} className="font-semibold text-primary-700 hover:underline">
          Masuk di sini
        </Link>
      </p>
    </form>
  )
}
