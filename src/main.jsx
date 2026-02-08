import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { persistenceAdapter, loadLayoutState } from './persistence/index.js'

const rootElement = document.getElementById('root')
const root = ReactDOM.createRoot(rootElement)

async function bootstrap() {
  const [storedState, storedLayout] = await Promise.all([
    persistenceAdapter.loadState(),
    loadLayoutState(),
  ])

  root.render(
    <React.StrictMode>
      <App
        initialState={storedState ?? undefined}
        initialLayoutState={storedLayout ?? undefined}
      />
    </React.StrictMode>
  )
}

bootstrap()
