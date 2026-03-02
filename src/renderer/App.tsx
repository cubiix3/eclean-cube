import { HashRouter } from 'react-router-dom'

export default function App() {
  return (
    <HashRouter>
      <div className="flex h-screen w-screen">
        <div className="w-[70px] bg-[#16161f] flex-shrink-0">
          {/* Sidebar placeholder */}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="h-10 bg-[#0a0a0f]">
            {/* Titlebar placeholder */}
          </div>
          <div className="flex-1 overflow-auto p-6">
            <h1 className="text-2xl font-bold text-white">eclean is running!</h1>
          </div>
        </div>
      </div>
    </HashRouter>
  )
}
