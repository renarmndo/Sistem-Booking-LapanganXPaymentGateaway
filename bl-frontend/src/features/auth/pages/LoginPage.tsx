import { AuthLayout } from '../components/AuthLayout'
import { LoginForm } from '../components/LoginForm'

export function LoginPage() {
  return (
    <AuthLayout
      title="Masuk ke Akun"
      subtitle="Kelola pemesanan lapangan dan jadwal bermain Anda."
    >
      <LoginForm />
    </AuthLayout>
  )
}

export default LoginPage
