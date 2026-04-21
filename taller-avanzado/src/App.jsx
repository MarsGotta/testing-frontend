import { WeatherApp } from './components/WeatherApp/WeatherApp'
import { FavoritesProvider } from './store/FavoritesContext'
import './App.css'

function App() {
  return (
    <FavoritesProvider>
      <div className="app">
        <WeatherApp />
      </div>
    </FavoritesProvider>
  )
}

export default App
