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
        // eslint-disable-next-line no-console
        console.log('played', v.currentTime)
      } catch (e) {
        // eslint-disable-next-line no-console
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
            preload="auto"
            style={{ background: '#000' }}
          >
            <source src={currentSrc} />
            Your browser does not support the video tag.
          </video>
        </div>
      ) : (
        <p style={{ marginTop: 12 }}>Pass a `src` query param or enter a URL above.</p>
      )}
    </div>
  )
}
