import { useParams } from "react-router-dom";

export default function OwnerDashboardPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  return <div>Owner Dashboard: {restaurantId}</div>;
}