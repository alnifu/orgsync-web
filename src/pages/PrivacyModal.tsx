import { useEffect } from "react";
import { createPortal } from "react-dom";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white max-w-2xl w-full p-6 rounded-xl overflow-y-auto max-h-[85vh] relative sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          ✖
        </button>

        {/* Header */}
        <h3 className="text-xl sm:text-2xl font-semibold mb-6 text-center">
          Privacy Policy
        </h3>

        {/* Scrollable content */}
        <div className="text-sm sm:text-base text-gray-700 space-y-4 whitespace-pre-line">
          <p>
            <strong>Effective Date:</strong> November 2025{"\n"}
            <strong>Institution:</strong> De La Salle Lipa, Batangas, Philippines
          </p>

          <p>
            This Privacy Policy describes how the DLSL OrgSync system collects,
            uses, and protects user data in compliance with the Data Privacy Act
            of 2012 (Republic Act 10173) of the Philippines.
          </p>

          <p>
            <strong>Information We Collect</strong>{"\n"}
            • Personal details (name, student number, email, department, program, year level){"\n"}
            • Organization membership and officer information{"\n"}
            • Post interactions (likes, RSVPs, evaluations, quiz results){"\n"}
            • Optional uploaded media (profile images, organization logos, event banners)
          </p>

          <p>
            <strong>Purpose of Data Collection</strong>{"\n"}
            • To test organizational management features within the prototype{"\n"}
            • To evaluate system usability, engagement analytics, and gamified interactions{"\n"}
            • To generate anonymized results for academic reporting
          </p>

          <p>
            <strong>Data Storage and Retention</strong>{"\n"}
            • Data is stored securely in Supabase and accessed only by the thesis researchers{"\n"}
            • All test data will be retained only for the duration of the study and deleted after completion
          </p>

          <p>
            <strong>Data Sharing</strong>{"\n"}
            • No user data will be shared publicly or used for commercial purposes{"\n"}
            • Research outputs may include anonymized summaries or statistics
          </p>

          <p>
            <strong>User Rights</strong>{"\n"}
            • Users have the right to request correction or deletion of their data{"\n"}
            • Users may withdraw participation in the research system at any time
          </p>

          <p>
            <strong>Security Measures</strong>{"\n"}
            • Access is limited to authorized researchers and users with institutional accounts{"\n"}
            • Standard encryption and authentication methods are applied
          </p>

          <p>
            <strong>Contact Information</strong>{"\n"}
            For any concerns regarding data privacy, please contact the research team or the De La Salle Lipa Data Protection Office.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
