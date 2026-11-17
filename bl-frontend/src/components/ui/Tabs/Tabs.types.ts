export interface TabItem {
  id: string
  label: string
  badge?: string | number
  disabled?: boolean
}

export interface TabsProps {
  items: TabItem[]
  activeId: string
  onChange: (id: string) => void
  className?: string
}
