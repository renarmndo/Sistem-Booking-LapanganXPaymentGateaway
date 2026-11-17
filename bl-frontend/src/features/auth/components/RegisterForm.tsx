import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button, FormField, Input, PasswordInput } from '@/components/ui'
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
  const registerMutation = useRegister()
  const verifyOtpMutation = useVerifyOtp()
  const resendOtpMutation = useResendOtp()

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

  if (registeredEmail) {
    const otpServerError = verifyOtpMutation.isError
      ? getErrorMessage(verifyOtpMutation.error, 'Kode OTP tidak valid.')
      : resendOtpMutation.isError
        ? getErrorMessage(resendOtpMutation.error, 'Gagal mengirim ulang OTP.')
        : null

    return (
      <form onSubmit={otpForm.handleSubmit(onSubmitOtp)} noValidate className="space-y-4">
        <div className="rounded-md border border-primary-200 bg-primary-50 p-3 text-sm text-primary-900">
          Kode OTP 6 digit telah dikirim ke <strong className="font-semibold">{registeredEmail}</strong>.
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
          hint="Berlaku 15 menit"
          error={otpForm.formState.errors.otp?.message}
          required
        >
          <Input
            id="register-otp"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="font-mono tracking-widest"
            error={Boolean(otpForm.formState.errors.otp)}
            {...otpForm.register('otp')}
          />
        </FormField>

        <Button type="submit" fullWidth loading={verifyOtpMutation.isPending}>
          Verifikasi Akun
        </Button>

        <Button
          type="button"
          variant="ghost"
          fullWidth
          loading={resendOtpMutation.isPending}
          onClick={() => resendOtpMutation.mutate({ email: registeredEmail })}
        >
          Kirim Ulang OTP
        </Button>
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
