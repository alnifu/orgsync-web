// admin/pages/dashboard/OfficerLandingPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "../../../lib/supabase";

export default function OfficerLandingPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrg = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("org_managers")
        .select("org_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) console.error(error);

      setOrgId(data?.org_id || null);
      setLoading(false);
    };

    fetchOrg();
  }, []);

  if (loading) return <p className="text-center mt-6">Loading...</p>;
  if (!orgId) return <p className="text-center mt-6">You are not assigned to any organization.</p>;

  const cards = [
    {
      title: "Flappy Config Uploader",
      description: "Upload and configure Flappy minigames for your organization’s challenges.",
      img: "https://cdn.wccftech.com/wp-content/uploads/2024/05/Flappy-Bird.jpg",
      link: `/admin/dashboard/flappy-config/${orgId}`,
    },
    {
      title: "Contest Manager",
      description: "View, edit, and manage contests and submissions for your organization.",
      img: "https://media.istockphoto.com/id/1314345164/vector/furniture-pixel-style.jpg?s=612x612&w=0&k=20&c=u1VJN2Vjeupc4Eyejw341I1uWY7PzIjtk6GEbKScysg=",
      link: `/admin/dashboard/contests/${orgId}`,
    },
    {
      title: "Create Quiz",
      description: "Build and publish new quiz challenges for your members.",
      img: "https://marketplace.canva.com/EAFT3WPtA0A/1/0/1600w/canva-trivia-game-fun-presentation-in-green-light-blue-retro-pixel-style-CshQ_oTTdTY.jpg",
      link: `/admin/dashboard/create-quiz/${orgId}`,
    },
  ];

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-blue-700 mb-4 text-center">Game Creator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((card) => (
          <div key={card.title} className="bg-white shadow rounded-2xl p-6 max-w-md mx-auto">
            <div className="w-full aspect-[16/9] mb-4">
              <img src={card.img} alt={card.title} className="w-full h-full object-cover rounded-lg" />
            </div>
            <h2 className="text-lg font-semibold text-center mb-2">{card.title}</h2>
            <p className="text-sm text-gray-600 text-center mb-4">{card.description}</p>
            <div className="flex justify-center">
              <Link
                to={card.link}
                className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition"
              >
                Go
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
