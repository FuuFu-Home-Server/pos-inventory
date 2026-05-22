export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-8 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded-lg mb-2" />
      <div className="h-4 w-64 bg-gray-100 rounded mb-8" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 h-24" />
        ))}
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 md:p-5 h-24" />
        ))}
      </div>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 h-80" />
    </div>
  )
}
