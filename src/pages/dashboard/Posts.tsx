export default function Posts() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Posts</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Create New Post
          </button>
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900">Example Post Title</h3>
              <p className="text-gray-600 mt-2">Post content will go here</p>
              <div className="mt-4 flex items-center space-x-4">
                <span className="text-sm text-gray-500">Posted by: Admin</span>
                <span className="text-sm text-gray-500">Date: August 27, 2025</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
