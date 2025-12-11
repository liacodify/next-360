import { useRef } from "react"
import { Button } from "primereact/button"

export default function SmallFileButton({ onSelect }: { onSelect: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleClick = () => fileRef.current?.click()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      onSelect(e.target.files[0])
    }
  }

  return (
    <div>
      {/* Input invisible */}
      <input type="file" ref={fileRef} className="hidden" onChange={handleChange} />

      {/* Botón pequeño con ícono */}
      <Button icon="pi pi-paperclip" className="p-button-sm p-button-text" onClick={handleClick} />
    </div>
  )
}
