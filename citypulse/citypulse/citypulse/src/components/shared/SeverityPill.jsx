const styles = {
  low: 'bg-green-900 text-green-300',
  medium: 'bg-yellow-900 text-yellow-300',
  high: 'bg-orange-900 text-orange-300',
  critical: 'bg-red-900 text-red-300 animate-pulse',
}

export default function SeverityPill({ severity = 'low' }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold uppercase ${styles[severity]}`}>
      {severity}
    </span>
  )
}
