import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { PATHS } from '@/app/router/paths'
import { Button, FormField, Input, PasswordInput } from '@/components/ui'
import { getErrorMessage } from '@/utils/error'
import { useLogin } from '../hooks/useLogin'
import { loginSchema, type LoginFormValues } from '../schemas/auth.schema'

export function LoginForm() {
  const loginMutation = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values)
  }

  const serverError = loginMutation.isError
    ? getErrorMessage(loginMutation.error, 'Gagal masuk. Periksa kembali kredensial Anda.')
    : null

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {serverError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-danger/30 bg-danger-soft/60 p-3 text-sm text-danger-ink"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden="true" />
          <span>{serverError}</span>
        </div>
      )}

      <FormField label="Email" htmlFor="login-email" error={errors.email?.message} required>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={Boolean(errors.email)}
          {...register('email')}
        />
      </FormField>

      <FormField
        label="Kata Sandi"
        htmlFor="login-password"
        error={errors.password?.message}
        required
      >
        <PasswordInput
          id="login-password"
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          error={Boolean(errors.password)}
          {...register('password')}
        />
      </FormField>

      <Button type="submit" fullWidth loading={loginMutation.isPending}>
        Masuk
      </Button>

      <p className="pt-2 text-center text-sm text-fg-muted">
        Belum punya akun?{' '}
        <Link to={PATHS.REGISTER} className="font-semibold text-primary-700 hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </form>
  )
}
