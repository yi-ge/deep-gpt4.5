import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19';
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
