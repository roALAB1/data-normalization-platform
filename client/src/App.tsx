import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ResultsProvider } from "./contexts/ResultsContext";
import JobDashboardEnhanced from "./pages/JobDashboardEnhanced";
import IntelligentNormalization from "./pages/IntelligentNormalization";
import TestCredentials from "./pages/TestCredentials";
import MemoryMonitoringDashboard from "./pages/MemoryMonitoringDashboard";
import BatchJobs from "./pages/BatchJobs";
import CRMSyncMapper from "./pages/CRMSyncMapper";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={IntelligentNormalization} />
      <Route path={"/jobs"} component={JobDashboardEnhanced} />
      <Route path={"/batch-jobs"} component={BatchJobs} />
      <Route path={"/crm-sync"} component={CRMSyncMapper} />
      <Route path={"/monitoring"} component={MemoryMonitoringDashboard} />
      <Route path={"/test-credentials"} component={TestCredentials} />
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
        <ResultsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ResultsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
