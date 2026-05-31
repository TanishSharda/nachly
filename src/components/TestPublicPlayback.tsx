"use client"

import React, { useEffect, useRef, useState } from 'react'

type Props = {
  src?: string
}

export default function TestPublicPlayback({ src }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [currentSrc, setCurrentSrc] = useState(src || '')

  useEffect(() => {
    if (!currentSrc) return
    const v = videoRef.current
    if (!v) return
    v.load()
    // try to autoplay muted
    v.muted = true
    v.playsInline = true
    const tryPlay = async () => {
      try {
        await v.play()
         
        console.log('played', v.currentTime)
      } catch (e) {
         
        console.warn('autoplay failed', e)
      }
    }
    tryPlay()
  }, [currentSrc])

  return (
    <div style={{ padding: 16 }}>
      <h2>Temporary Public Playback Test</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.currentTarget as HTMLFormElement
          const data = new FormData(form)
          const v = (data.get('src') as string) || ''
          setCurrentSrc(v)
        }}
      >
        <input name="src" defaultValue={currentSrc} placeholder="Enter video URL or path" style={{ width: '80%' }} />
        <button type="submit" style={{ marginLeft: 8 }}>Load</button>
      </form>

      {currentSrc ? (
        <div style={{ marginTop: 12 }}>
          <video
            ref={videoRef}
            controls
            muted
            playsInline
            width={640}
            height={360}
            preload="metadata"
            style={{ background: '#000' }}
          >
            <source src={currentSrc} />
            Your browser does not support the video tag.
          </video>
        </div>
      ) : null}
    </div>
  )
}
