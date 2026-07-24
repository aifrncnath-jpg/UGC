import { useEffect } from 'react'
import { useStore } from './store'
import Uploader from './components/Uploader'
import Editor from './components/Editor'

function App() {
  const videoUrl = useStore((s) => s.videoUrl)

  // Mirror key state onto <body> data-* attributes (handy for debugging and
  // lightweight automated checks; harmless in production).
  useEffect(
    () =>
      useStore.subscribe((s) => {
        document.body.dataset.status = s.status
        document.body.dataset.chunks = String(s.chunks.length)
      }),
    [],
  )

  return videoUrl ? <Editor /> : <Uploader />
}

export default App
