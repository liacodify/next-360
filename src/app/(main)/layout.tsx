import SidebarLegend from "../components/SidebarLegend";
import Sidebar from "../components/Sidebar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ya no se obtiene la sesión ni usuario ni se redirige aquí

  return (
    <div className="flex">
      {/* Sidebar sin currentUser o con un prop opcional */}
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
    </div>
  );
}
