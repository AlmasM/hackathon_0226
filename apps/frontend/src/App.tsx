import { APIProvider } from "@vis.gl/react-google-maps";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProfileProvider } from "./contexts/UserProfileContext";
import PersonaSwitcher from "./components/PersonaSwitcher";
import DiscoveryPage from "./pages/DiscoveryPage";
import RestaurantStoryPage from "./pages/RestaurantStoryPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

export default function App() {
  return (
    <APIProvider apiKey={googleMapsApiKey}>
      <UserProfileProvider>
        <BrowserRouter>
          <>
            <Routes>
              <Route path="/" element={<DiscoveryPage />} />
              <Route path="/restaurant/:id" element={<RestaurantStoryPage />} />
              <Route
                path="/owner/:restaurantId"
                element={<OwnerDashboardPage />}
              />
            </Routes>
            <PersonaSwitcher />
          </>
        </BrowserRouter>
      </UserProfileProvider>
    </APIProvider>
  );
}
