import { useEffect, useState } from "react"

const loadingMessages = [
  "Cargando...",
  "Procesando datos...",
  "Casi listo...",
  "Preparando la información...",
  "Un momento por favor...",
]

export function FullPageLoading() {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((idx) => (idx + 1) % loadingMessages.length)
    }, 2000) // cambia mensaje cada 2 segundos
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500 border-solid"></div>
      <p className="mt-6 text-white text-lg font-semibold">{loadingMessages[messageIndex]}</p>
    </div>
  )
}
