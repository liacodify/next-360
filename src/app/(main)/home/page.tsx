"use client"

import { Card } from "primereact/card"
import { useRouter } from "next/navigation"

const menu = [
  {
    label: "Usuarios",
    path: "/user",
    description: "Gestiona usuarios, roles y permisos del sistema.",
  },
  {
    label: "Galería",
    path: "/gallery",
    description: "Visualiza y administra videos y archivos multimedia.",
  },
  {
    label: "Marcadores",
    path: "/marker",
    description: "Gestiona puntos de interés y marcadores en el mapa.",
  },
  {
    label: "Proyectos",
    path: "/project",
    description: "Crea y administra proyectos relacionados con tus rutas.",
  },
]

export default function HomePage() {
  const router = useRouter()

  return (
    <>
      <div
        className={`
          w-full h-full relative flex flex-col items-center justify-center
          bg-gradient-to-r 
        `}
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover brightness-75"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>

        {/* Contenedor de título */}
        <div className="mb-12 z-20 text-center px-6 max-w-4xl">
          <h1 className="text-6xl font-extrabold text-white tracking-tight mb-3 drop-shadow-lg animate-fadeInUp">
            Visor360
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto drop-shadow-md animate-fadeInUp animate-delay-200">
            Monitorea rutas, analiza carreteras y sigue tus trayectos en tiempo real con precisión
            GPS y visualización moderna.
          </p>
        </div>

        {/* Grid cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 px-6 max-w-7xl w-full z-20">
          {menu.map(({ label, path, description }) => (
            <Card
              key={label}
              onClick={() => router.push(path as any)}
              className="cursor-pointer bg-white/20 backdrop-blur-md rounded-3xl shadow-xl
                hover:bg-white/40 hover:shadow-2xl transition duration-300 transform
                hover:-translate-y-2 hover:scale-105 p-8 flex flex-col justify-between"
              style={{ minHeight: "200px" }}
              title={<h3 className="text-3xl font-semibold text-white drop-shadow-md">{label}</h3>}
            >
              <p className="text-md text-white/90 drop-shadow-md">{description}</p>
            </Card>
          ))}
        </div>

        {/* Animaciones Tailwind personalizadas */}
        <style jsx>{`
          @keyframes fadeInUp {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeInUp {
            animation: fadeInUp 0.7s ease forwards;
          }
          .animate-delay-200 {
            animation-delay: 0.2s;
          }
        `}</style>
      </div>
    </>
  )
}
