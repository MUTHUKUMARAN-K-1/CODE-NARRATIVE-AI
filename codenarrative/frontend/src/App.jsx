import React from "react";
import { Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext.jsx";
import { Layout } from "./components/Layout.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import Landing from "./components/Landing.jsx";
import Dashboard from "./components/Dashboard.jsx";
import RepoAnalysis from "./components/RepoAnalysis.jsx";
import Archaeology from "./components/Archaeology.jsx";
import Therapy from "./components/Therapy.jsx";
import Reality from "./components/Reality.jsx";
import Pokemon from "./components/Pokemon.jsx";
import Videos from "./components/Videos.jsx";
import LearningPath from "./components/LearningPath.jsx";
import SmartQA from "./components/SmartQA.jsx";
import Explanations from "./components/Explanations.jsx";
import ArchitectureMap from "./components/ArchitectureMap.jsx";
import ProgressTracking from "./components/ProgressTracking.jsx";
import LegacyTests from "./components/LegacyTests.jsx";
import Tools from "./components/Tools.jsx";
import NotFound from "./components/NotFound.jsx";
import PRReview from "./components/PRReview.jsx";

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<Layout />} errorElement={<ErrorBoundary />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analysis" element={<RepoAnalysis />} />
          <Route path="/archaeology" element={<Archaeology />} />
          <Route path="/therapy" element={<Therapy />} />
          <Route path="/reality" element={<Reality />} />
          <Route path="/pokemon" element={<Pokemon />} />
          <Route path="/videos" element={<Videos />} />
          <Route path="/learning-path" element={<LearningPath />} />
          <Route path="/qa" element={<SmartQA />} />
          <Route path="/explanations" element={<Explanations />} />
          <Route path="/architecture" element={<ArchitectureMap />} />
          <Route path="/tests" element={<LegacyTests />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/progress" element={<ProgressTracking />} />
          <Route path="/pr-review" element={<PRReview />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AppProvider>
  );
}

export default App;
