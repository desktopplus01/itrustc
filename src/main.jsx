import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
// the real iTrustCapital compiled stylesheets — imported outside index.css
// so the Tailwind optimizer never reprocesses them (see index.css note)
import './replica/site.css'
import './replica/swiper.css'
import './replica/inline.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
