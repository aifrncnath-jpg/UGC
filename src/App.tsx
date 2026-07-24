import { useStore } from './store'
import Uploader from './components/Uploader'
import Editor from './components/Editor'

function App() {
  const videoUrl = useStore((s) => s.videoUrl)
  return videoUrl ? <Editor /> : <Uploader />
}

export default App
