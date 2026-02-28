import { useParams } from "react-router-dom";

export default function RestaurantStoryPage() {
  const { id } = useParams<{ id: string }>();
  return <div>Restaurant Story: {id}</div>;
}