import { BrowserRouter, Routes, Route } from "react-router-dom";
import DiscoveryPage from "./pages/DiscoveryPage";
import RestaurantStoryPage from "./pages/RestaurantStoryPage";
import OwnerDashboardPage from "./pages/OwnerDashboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DiscoveryPage />} />
        <Route path="/restaurant/:id" element={<RestaurantStoryPage />} />
        <Route path="/owner/:restaurantId" element={<OwnerDashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}
