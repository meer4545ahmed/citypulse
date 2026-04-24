export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />
    </div>
  )
}
