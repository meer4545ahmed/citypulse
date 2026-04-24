import { useRouteError, Link } from 'react-router-dom'

export default function RouteError() {
  const error = useRouteError()
  const message = error?.message || 'Something went wrong while loading this page.'
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 p-6 text-white">
      <div className="w-full max-w-xl rounded-xl border border-gray-700 bg-gray-900 p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-red-400">Application Error</p>
        <h2 className="mt-2 text-2xl font-bold">Route failed to render</h2>
        <p className="mt-3 rounded-lg bg-gray-800 p-3 text-sm text-gray-300">{message}</p>
        <div className="mt-4 flex gap-2">
          <Link to="/" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold">Go Home</Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg border border-gray-600 px-4 py-2 text-sm"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  )
}
