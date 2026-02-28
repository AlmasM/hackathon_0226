import { useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function DiscoveryPage() {
  useEffect(() => {
    async function checkSupabase() {
      const { data: restaurants, error: restaurantsError } = await supabase
        .from("restaurants")
        .select("*");
      console.log("restaurants:", { data: restaurants ?? [], error: restaurantsError });

      const { data: profiles, error: profilesError } = await supabase
        .from("user_profiles")
        .select("*");
      console.log("user_profiles:", { data: profiles ?? [], error: profilesError });
    }
    checkSupabase();
  }, []);

  return <div>Discovery Page</div>;
}
