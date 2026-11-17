import { PageHeader } from '@/components/layout'
import { Card, CardBody } from '@/components/ui'

export interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({
  title,
  description = 'Halaman ini akan dilengkapi pada fase pengembangan berikutnya.',
}: PlaceholderPageProps) {
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHeader title={title} subtitle={description} showBack />
      <Card>
        <CardBody>
          <p className="text-sm text-fg-muted">{description}</p>
        </CardBody>
      </Card>
    </div>
  )
}

export default PlaceholderPage
