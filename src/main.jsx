import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { persistenceAdapter } from './persistence/index.js'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)

async function bootstrap() {
  const storedState = await persistenceAdapter.loadState()

  root.render(
    <React.StrictMode>
      <App initialState={storedState ?? undefined} />
    </React.StrictMode>
  )
}

bootstrap()
