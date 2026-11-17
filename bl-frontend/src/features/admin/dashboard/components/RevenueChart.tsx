import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardBody, CardHeader, Skeleton } from '@/components/ui'
import type { DailyTrendPoint } from '../../types/adminOps.types'

export interface RevenueChartProps {
  data: DailyTrendPoint[]
  loading: boolean
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  return (
    <Card>
      <CardHeader>
        <h2 className="font-display text-base font-bold text-ink">
          Tren Pendapatan &amp; Booking Harian
        </h2>
        <p className="text-xs text-fg-muted">
          Ringkasan pendapatan lunas harian pada periode terpilih
        </p>
      </CardHeader>
      <CardBody>
        {loading ? (
          <Skeleton className="h-64 w-full" />
        ) : data.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-fg-muted">
            Belum ada data transaksi pada rentang tanggal ini.
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="noelRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14532d" stopOpacity={0.32} />
                    <stop offset="95%" stopColor="#14532d" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)}rb`}
                />
                <Tooltip
                  formatter={(value) => [
                    `Rp ${Number(value ?? 0).toLocaleString('id-ID')}`,
                    'Pendapatan',
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#14532d"
                  strokeWidth={2.5}
                  fill="url(#noelRevenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
