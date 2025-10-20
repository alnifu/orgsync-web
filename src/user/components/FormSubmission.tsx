import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface FormField {
  type: string;
  question: string;
  required: boolean;
}

interface FormSubmissionProps {
  description: string;
  fields: FormField[];
  onSubmit: (data: any) => void;
}

export default function FormSubmission({ description, fields, onSubmit }: FormSubmissionProps) {
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const newErrors: {[key: string]: string} = {};
    fields.forEach(field => {
      if (field.required && (!formData[field.question] || formData[field.question].trim() === '')) {
        newErrors[field.question] = 'This field is required';
      }
      // Email validation
      if (field.type === 'email' && formData[field.question]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[field.question])) {
          newErrors[field.question] = 'Please enter a valid email address';
        }
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Mark all fields as touched to show errors
      const allTouched: {[key: string]: boolean} = {};
      fields.forEach(field => {
        allTouched[field.question] = true;
      });
      setTouched(allTouched);
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (question: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [question]: value
    }));

    // Clear error when user starts typing
    if (errors[question]) {
      setErrors(prev => ({
        ...prev,
        [question]: ''
      }));
    }
  };

  const handleBlur = (question: string) => {
    setTouched(prev => ({
      ...prev,
      [question]: true
    }));

    // Validate on blur
    const field = fields.find(f => f.question === question);
    if (field) {
      const newErrors: {[key: string]: string} = { ...errors };

      if (field.required && (!formData[question] || formData[question].trim() === '')) {
        newErrors[question] = 'This field is required';
      } else if (field.type === 'email' && formData[question]) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData[question])) {
          newErrors[question] = 'Please enter a valid email address';
        } else {
          delete newErrors[question];
        }
      } else {
        delete newErrors[question];
      }

      setErrors(newErrors);
    }
  };

  return (
    <div>
      <p className="text-gray-700 mb-6">{description}</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {fields.map((field, index) => {
          const hasError = touched[field.question] && errors[field.question];
          const isValid = touched[field.question] && !errors[field.question] && formData[field.question];

          return (
            <div key={index} className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {field.question}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>

              <div className="relative">
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.question] || ''}
                    onChange={(e) => handleInputChange(field.question, e.target.value)}
                    onBlur={() => handleBlur(field.question)}
                    required={field.required}
                    className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none ${
                      hasError
                        ? 'border-red-300 bg-red-50'
                        : isValid
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    rows={4}
                    placeholder="Enter your response..."
                  />
                ) : (
                  <input
                    type={field.type}
                    value={formData[field.question] || ''}
                    onChange={(e) => handleInputChange(field.question, e.target.value)}
                    onBlur={() => handleBlur(field.question)}
                    required={field.required}
                    className={`w-full border rounded-lg p-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all ${
                      hasError
                        ? 'border-red-300 bg-red-50'
                        : isValid
                        ? 'border-green-300 bg-green-50'
                        : 'border-gray-300'
                    }`}
                    placeholder={`Enter ${field.type === 'email' ? 'your email' : field.type === 'number' ? 'a number' : 'your response'}`}
                  />
                )}

                {/* Validation icons */}
                <div className="absolute right-3 top-3">
                  {hasError && <AlertCircle size={20} className="text-red-500" />}
                  {isValid && <CheckCircle2 size={20} className="text-green-500" />}
                </div>
              </div>

              {/* Error message */}
              {hasError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {errors[field.question]}
                </p>
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg hover:bg-orange-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </button>
      </form>
    </div>
  );
}