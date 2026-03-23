import { Button } from "@/components/ui/button";

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-900 mb-4">
          Welcome to Amelia
        </h1>
        <p className="text-slate-600 mb-6">
          React + Vite + Convex + Tailwind v4 + shadcn/ui
        </p>
        <Button>Get Started</Button>
      </div>
    </div>
  );
}

export default App;
