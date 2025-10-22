import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Pencil, Trash2, Plus, Search } from "lucide-react";
import CreateQuiz from "../pages/CreateQuiz";
import toast, { Toaster } from "react-hot-toast";

interface Quiz {
  id: number;
  title: string;
  data: any;
  org_id: string;
  open_at?: string | null;
  close_at?: string | null;
  created_at: string;
}

interface OrganizationQuizzesProps {
  organizationId: string;
}

const OrganizationQuizzes: React.FC<OrganizationQuizzesProps> = ({ organizationId }) => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);

  // Fetch quizzes
  const fetchQuizzes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*")
        .eq("org_id", organizationId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setQuizzes(data || []);
      setFilteredQuizzes(data || []);
    } catch (err: any) {
      console.error("Error fetching quizzes:", err);
      toast.error("Failed to load quizzes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, [organizationId]);

  // Filter quizzes based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredQuizzes(quizzes);
    } else {
      const filtered = quizzes.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredQuizzes(filtered);
    }
  }, [searchTerm, quizzes]);

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("quizzes")
        .delete()
        .eq("id", quizId);

      if (error) throw error;

      toast.success("Quiz deleted successfully");
      fetchQuizzes(); // Refresh the list
    } catch (err: any) {
      console.error("Error deleting quiz:", err);
      toast.error("Failed to delete quiz");
    }
  };

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setEditingQuiz(null);
    fetchQuizzes(); // Refresh after creating/editing
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-center" />

      {/* Header with Create Button and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Organization Quizzes</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Quiz
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Quizzes List */}
      {filteredQuizzes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchTerm ? "No quizzes found matching your search." : "No quizzes created yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900">{quiz.title}</h3>
                  <div className="mt-2 text-sm text-gray-500 space-y-1">
                    <p>Created: {formatDate(quiz.created_at)}</p>
                    {quiz.open_at && (
                      <p>Opens: {new Date(quiz.open_at).toLocaleString()}</p>
                    )}
                    {quiz.close_at && (
                      <p>Closes: {new Date(quiz.close_at).toLocaleString()}</p>
                    )}
                    <p>Questions: {quiz.data?.questions?.length || 0}</p>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleEditQuiz(quiz)}
                    className="inline-flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteQuiz(quiz.id)}
                    className="inline-flex items-center px-3 py-1 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingQuiz) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingQuiz ? "Edit Quiz" : "Create New Quiz"}
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <CreateQuiz
                orgId={organizationId}
                existingQuiz={editingQuiz}
                onClose={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrganizationQuizzes;