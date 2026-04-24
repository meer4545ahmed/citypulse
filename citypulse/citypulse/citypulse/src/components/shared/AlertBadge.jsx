export default function AlertBadge({ count = 0 }) {
  return (
    <span className="rounded-full bg-red-900 px-2 py-1 text-xs font-bold text-red-200">
      {count} alerts
    </span>
  )
}
