import { PageHeader } from '@/components/layout'
import { Card, CardBody } from '@/components/ui'
import { PATHS } from '@/app/router/paths'

export interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({
  title,
  description = 'Halaman ini akan dilengkapi pada fase pengembangan berikutnya.',
}: PlaceholderPageProps) {
  return (
    <div className="w-full space-y-6 px-4 py-8 sm:px-6 lg:px-10 xl:px-14 2xl:px-16">
      <PageHeader
        title={title}
        subtitle={description}
        breadcrumbs={[{ label: 'Beranda', to: PATHS.HOME }, { label: title }]}
      />
      <Card>
        <CardBody>
          <p className="text-sm text-fg-muted">{description}</p>
        </CardBody>
      </Card>
    </div>
  )
}

export default PlaceholderPage
