import { useEffect, useState } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MapsKeyContext } from "./contexts/MapsKeyContext";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import { logMapsConfig } from "./lib/mapsLogger";
import PersonaSwitcher from "./components/PersonaSwitcher";
import DiscoveryPage from "./pages/DiscoveryPage";
import RestaurantDetailPage from "./pages/RestaurantDetailPage";
import RestaurantStoryPage from "./pages/RestaurantStoryPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";

const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "").trim();
const hasMapsKey = googleMapsApiKey.length > 0;

const appContent = (
  <UserProfileProvider>
    <BrowserRouter>
      <>
        <Routes>
          <Route path="/" element={<DiscoveryPage />} />
          <Route path="/restaurant/:id" element={<RestaurantDetailPage />} />
          <Route path="/restaurant/:id/story" element={<RestaurantStoryPage />} />
          <Route
            path="/owner/:restaurantId"
            element={<OwnerDashboardPage />}
          />
        </Routes>
        <PersonaSwitcher />
      </>
    </BrowserRouter>
  </UserProfileProvider>
);

export default function App() {
  const [mapAuthFailed, setMapAuthFailed] = useState(false);

  useEffect(() => {
    logMapsConfig(googleMapsApiKey);
  }, []);

  useEffect(() => {
    function onAuthFailure() {
      setMapAuthFailed(true);
    }
    window.addEventListener("maps-auth-failure", onAuthFailure);
    return () => window.removeEventListener("maps-auth-failure", onAuthFailure);
  }, []);

  return (
    <MapsKeyContext.Provider value={{ hasMapsKey, mapAuthFailed }}>
      {hasMapsKey && !mapAuthFailed ? (
        <APIProvider apiKey={googleMapsApiKey}>{appContent}</APIProvider>
      ) : (
        appContent
      )}
    </MapsKeyContext.Provider>
  );
}
