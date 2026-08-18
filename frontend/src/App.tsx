import { BrowserRouter, Routes, Route } from 'react-router-dom'
import EventPage from './pages/EventPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/e/:slug" element={<EventPage />} />
        <Route path="/" element={<div className="p-8 text-center"><h1 className="text-2xl font-bold">Pico</h1><p>Event Photo Sharing Platform</p></div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
