import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import HomeEnhanced from "./pages/HomeEnhanced";
import PhoneDemoEnhanced from "./pages/PhoneDemoEnhanced";
import JobDashboard from "./pages/JobDashboard";
import EmailDemo from "./pages/EmailDemo";
import AddressDemo from "./pages/AddressDemo";
import IntelligentNormalization from "./pages/IntelligentNormalization";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={HomeEnhanced} />
      <Route path={"/phone"} component={PhoneDemoEnhanced} />
      <Route path={"/jobs"} component={JobDashboard} />
      <Route path={"/email"} component={EmailDemo} />
      <Route path={"/address"} component={AddressDemo} />
      <Route path={"/intelligent"} component={IntelligentNormalization} />
      <Route path={"/demo"} component={Home} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
