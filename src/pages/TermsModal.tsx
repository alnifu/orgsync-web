import { useEffect } from "react";
import { createPortal } from "react-dom";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TermsModal({ isOpen, onClose }: TermsModalProps) {
  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Render modal into body directly
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6 sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        {/* Header */}
        <h3 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
          Terms and Conditions
        </h3>

        {/* Scrollable content */}
        <div className="text-sm sm:text-base text-gray-700 space-y-4 whitespace-pre-line">
          <p>
            <strong>Effective Date:</strong> November 2025{"\n"}
            <strong>Institution:</strong> De La Salle Lipa{"\n"}
            <strong>Developed by:</strong> Team Link, Batangas, Philippines
          </p>
          <p>
            Welcome to DLSL OrgSync, a mobile and web platform developed as part
            of a thesis project titled “OrgSync: An Organizational Hub for Centralized 
            Event Posting and Inter-Organizational Interaction with Gamification and Feedback 
            Analytics using K-means Clustering and Logistic Regression”
          </p>
          <p>By using this application, you agree to the following terms:</p>

          <p>
            <strong>Purpose of Use</strong>{"\n"}
            OrgSync is a research prototype created for academic purposes...
          </p>

          <p>
            <strong>User Responsibility</strong>{"\n"}
            Users agree to provide accurate information during registration...
          </p>

          <p>
            <strong>Account and Access</strong>{"\n"}
            Accounts are limited to members, officers, and administrators...
          </p>

          <p>
            <strong>Data Ownership</strong>{"\n"}
            All data entered into the system are used only for academic testing...
          </p>

          <p>
            <strong>No Commercial Use</strong>{"\n"}
            OrgSync is not a commercial or production-ready product...
          </p>

          <p>
            <strong>Limitation of Liability</strong>{"\n"}
            The developers and De La Salle Lipa are not liable for any data loss...
          </p>

          <p>
            <strong>Changes to Terms</strong>{"\n"}
            These terms may be updated during the project’s development phase...
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
