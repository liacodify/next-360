"use client";

import { Suspense } from "react";
import { LoginForm } from "../components/LoginForm";

export default function LoginPage() {
  return (
    <div
      className="h-screen w-full grid 
                grid-cols-1           
                sm:grid-cols-1        
                lg:grid-cols-4        
                relative overflow-hidden"
    >
      <div
        className="
      relative w-full h-full 
      hidden sm:block                   
      lg:col-span-3               
    "
      >
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-75"
        >
          <source src="/videos/background.mp4" type="video/mp4" />
        </video>
      </div>

      <div
        className="
      relative z-10
      flex items-center justify-center
      p-8 max-w-md mx-auto
      bg-white/80 backdrop-blur-xl border border-gray-100 shadow-2xl
      sm:absolute sm:inset-0       
      lg:static lg:col-span-1"
      >
        <Suspense fallback={<div>Cargando formulario...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
