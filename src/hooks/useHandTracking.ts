// src/hooks/useHandTracking.ts
// Tracks the index fingertip (landmark 8) in real time via MediaPipe.

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult
} from '@mediapipe/tasks-vision'

export interface FingerPos {
  // Normalized [0,1], already mirror-flipped for natural interaction
  x: number
  y: number
  visible: boolean
}

export function useHandTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const [fingerPos, setFingerPos] = useState<FingerPos>({ x: 0.5, y: 0.5, visible: false })
  const [ready, setReady] = useState(false)
  const landmarkerRef = useRef<HandLandmarker | null>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    let cancelled = false
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      )
      const landmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 1
      })
      if (!cancelled) {
        landmarkerRef.current = landmarker
        setReady(true)
      }
    }
    init().catch(console.error)
    return () => { cancelled = true }
  }, [])

  const startCamera = useCallback(async () => {
    if (!videoRef.current) return
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 1280, height: 720 }
    })
    videoRef.current.srcObject = stream
    await videoRef.current.play()
  }, [videoRef])

  useEffect(() => {
    if (!ready || !videoRef.current) return
    const video = videoRef.current
    let lastTime = -1

    function detect() {
      if (video.readyState >= 2 && video.currentTime !== lastTime) {
        lastTime = video.currentTime
        const result: HandLandmarkerResult = landmarkerRef.current!.detectForVideo(
          video,
          performance.now()
        )
        if (result.landmarks.length > 0) {
          const tip = result.landmarks[0][8] // index fingertip
          setFingerPos({
            x: 1 - tip.x, // mirror flip
            y: tip.y,
            visible: true
          })
        } else {
          setFingerPos(p => ({ ...p, visible: false }))
        }
      }
      rafRef.current = requestAnimationFrame(detect)
    }

    rafRef.current = requestAnimationFrame(detect)
    return () => cancelAnimationFrame(rafRef.current)
  }, [ready, videoRef])

  return { fingerPos, ready, startCamera }
}
