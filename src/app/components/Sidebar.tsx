"use client";

import { useRouter, usePathname } from "next/navigation";
import { Avatar } from "primereact/avatar";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { useRef } from "react";
import { signOut } from "next-auth/react";
const menu = [
  { label: "Inicio", icon: "pi pi-home", path: "/home" },
  { label: "Usuarios", icon: "pi pi-user", path: "/user" },
  { label: "Galería", icon: "pi pi-images", path: "/gallery" },
  { label: "Marcadores", icon: "pi pi-map-marker", path: "/marker" },
  { label: "Proyectos", icon: "pi pi-folder", path: "/project" },
  { label: "Tags", icon: "pi pi-tags", path: "/tag" },
];

export default function Sidebar({ currentUser }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const op = useRef<OverlayPanel>(null);

  const handleLogout = async () => {
    await signOut({ redirect: true });
  };

  return (
    <div
      className="
        w-20 h-screen bg-white border-r border-gray-200 
        shadow-sm flex flex-col items-center py-5 gap-6
      "
    >
      <div
        className="cursor-pointer relative"
        onClick={(e) => op.current?.toggle(e)}
      >
        <Avatar
          label={currentUser?.email?.[0]?.toUpperCase() ?? "?"}
          shape="circle"
          className="bg-blue-600 text-white w-12 h-12 flex items-center justify-center text-lg"
        />
      </div>

      <OverlayPanel ref={op} dismissable className="w-48 ">
        <div className="flex flex-col gap-2 ">
          <span className="text-sm font-medium">{currentUser?.email}</span>
        </div>
      </OverlayPanel>

      <nav className="flex flex-col items-center gap-4 mt-5 ">
        {menu.map((item: any, i) => {
          const active = (pathname as any).startsWith(item.path);

          return (
            <button
              key={i}
              onClick={() => router.push(item.path)}
              className={`
                flex flex-col items-center w-full p-3 rounded-xl
                transition text-gray-600
                ${
                  active
                    ? "bg-blue-100 text-blue-600 shadow-sm"
                    : "hover:bg-blue-50 hover:text-blue-600"
                } 
              `}
            >
              <i
                className={`${item.icon} text-2xl ${active && "text-blue-600"}`}
              />
              <div
                className={`w-1.5 h-1.5 bg-blue-600 rounded-full mt-1 ${active ? "" : "opacity-0"}`}
              ></div>
            </button>
          );
        })}
      </nav>
      <Button
        text
        raised
        rounded
        icon="pi pi-sign-out"
        severity="danger"
        onClick={handleLogout}
      />
    </div>
  );
}
