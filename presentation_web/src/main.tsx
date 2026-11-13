import { createRoot } from 'react-dom/client'
import './styles.css'
import Screen from './views/Screen'
import Host from './views/Host'
import Player from './views/Player'

const path = location.pathname.replace(/\/+$/, '')
const View = path === '/screen' ? Screen : path === '/host' ? Host : Player

createRoot(document.getElementById('root')!).render(<View />)
