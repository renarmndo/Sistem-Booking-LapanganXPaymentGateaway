import { AuthLayout } from '../components/AuthLayout'
import { RegisterForm } from '../components/RegisterForm'

export function RegisterPage() {
  return (
    <AuthLayout
      title="Buat Akun Baru"
      subtitle="Daftar sekali untuk mulai memesan lapangan dengan cepat."
    >
      <RegisterForm />
    </AuthLayout>
  )
}

export default RegisterPage
