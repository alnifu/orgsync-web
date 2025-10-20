import { Link } from "react-router";

export default function Games() {
  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Decorate your virtual room */}
        <div className="bg-white shadow rounded-2xl p-6 max-w-md mx-auto">
          <div className="w-full aspect-[16/9] mb-4">
            <img
              src="https://media.istockphoto.com/id/1314345164/vector/furniture-pixel-style.jpg?s=612x612&w=0&k=20&c=u1VJN2Vjeupc4Eyejw341I1uWY7PzIjtk6GEbKScysg="
              alt="Decorate Room"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <h2 className="text-lg font-semibold text-center mb-2">
            My Virtual Room
          </h2>
          <p className="text-sm text-gray-600 text-center mb-4">
            A cozy 2D simulation where you can design and personalize your own
            room. Buy, place, arrange furniture, and
            manage your items through an inventory system.
          </p>
          <div className="flex justify-center">
            <Link
              to="../room-game"
              className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition"
            >
              Play
            </Link>
          </div>
        </div>

        {/* Card 2: Mini Games */}
        <div className="bg-white shadow rounded-2xl p-6 max-w-md mx-auto">
          <div className="w-full aspect-[16/9] mb-4">
            <img
              src="https://marketplace.canva.com/EAFT3WPtA0A/1/0/1600w/canva-trivia-game-fun-presentation-in-green-light-blue-retro-pixel-style-CshQ_oTTdTY.jpg"
              alt="Mini Games"
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <h2 className="text-lg font-semibold text-center mb-2">Quiz Games</h2>
          <p className="text-sm text-gray-600 text-center mb-4">
            Fun and interactive challenges to test your knowledge and skills
            while competing with friends.
          </p>
          <div className="flex justify-center">
            <Link
              to="../quiz-selection"
              className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700 transition"
            >
              Play
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
