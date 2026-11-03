import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App /> {/* O Router deve estar dentro do App, não aqui fora */}
  </React.StrictMode>,
)