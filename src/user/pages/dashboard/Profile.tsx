export default function Profile() {
  return (
    <div className="p-6 max-w-md mx-auto">
      {/* Profile Section */}
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 rounded-full bg-green-600 flex items-center justify-center text-white text-3xl font-bold">
          S
        </div>
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Sample Admin
        </h2>
        <p className="text-gray-600">sampleadmin@dlsl.edu.ph</p>

        {/* Forgot Password Button */}
        <button className="mt-6 text-green-600 hover:text-green-800 font-medium text-sm">
          Forgot Password
        </button>
      </div>
    </div>
  );
}
