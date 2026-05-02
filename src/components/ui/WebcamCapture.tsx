'use client'
import { useRef, useState, useEffect, useCallback } from 'react'
import { Camera, X, RefreshCw } from 'lucide-react'

interface WebcamCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function WebcamCapture({ onCapture, onClose }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string>('')
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const startCamera = useCallback(async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      })
      setStream(newStream)
      if (videoRef.current) {
        videoRef.current.srcObject = newStream
      }
      setError('')
    } catch (err) {
      console.error('Camera access denied:', err)
      setError('Camera access denied or unavailable.')
    }
  }, [facingMode, stream])

  useEffect(() => {
    startCamera()
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode])

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop())
    }
  }, [stream])

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
            onCapture(file)
            if (stream) stream.getTracks().forEach(track => track.stop())
          }
        }, 'image/jpeg', 0.8)
      }
    }
  }

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 w-full z-10">
        <button onClick={onClose} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors">
          <X className="w-6 h-6" />
        </button>
        <button onClick={toggleCamera} className="p-2 bg-black/50 text-white rounded-full hover:bg-black/80 transition-colors">
          <RefreshCw className="w-6 h-6" />
        </button>
      </div>
      
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <p className="text-white bg-red-500/20 px-4 py-2 rounded-lg">{error}</p>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="h-32 bg-black flex items-center justify-center pb-8 flex-shrink-0">
        <button 
          onClick={handleCapture}
          className="w-16 h-16 rounded-full border-4 border-white bg-white/20 hover:bg-white flex items-center justify-center transition-all group"
        >
          <Camera className="w-6 h-6 text-white group-hover:text-black transition-colors" />
        </button>
      </div>
    </div>
  )
}
