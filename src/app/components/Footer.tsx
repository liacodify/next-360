export default function FooterComponent() {
  return (
    <footer className="w-full py-4 bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-center text-sm select-none">
      <p>
        © {new Date().getFullYear()} <span className="font-semibold">RoadTracker</span> — Tecnología
        para una conducción inteligente
      </p>
    </footer>
  )
}
