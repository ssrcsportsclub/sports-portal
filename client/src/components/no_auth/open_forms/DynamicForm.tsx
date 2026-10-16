import React, { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import { useParams, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  getFormById,
  submitForm,
  clearSuccess,
} from "../../../store/slices/formSlice";
import img from "../../../assets/logo_main.png";
import Cropper from "react-easy-crop";
import { FormSkeleton } from "../../ui/Skeleton";

interface FormData {
  [key: string]: any;
}

interface MemberData {
  name: string;
  email: string;
  phone: string;
  [key: string]: string;
}

const DynamicForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const {
    currentForm: formSchema,
    loading,
    success,
    error: reduxError,
  } = useAppSelector((state) => state.form);

  const [formData, setFormData] = useState<FormData>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // OTP Verification State
  const [emailVerified, setEmailVerified] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState("");

  // File Upload State
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState<Record<string, boolean>>({});

  // Cropper State
  const [croppingField, setCroppingField] = useState<string | null>(null);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Fetch form schema when formId changes
  useEffect(() => {
    if (formId) {
      dispatch(getFormById(formId));
    }
  }, [formId, dispatch]);

  // Initialize form state when formSchema is fetched
  useEffect(() => {
    if (formSchema) {
      const initialState: FormData = {};
      formSchema.fields.forEach((f: any) => {
        if (f.type === "members") {
          const minMembers = f.min || 1;
          const memberInitialState: any = {};
          if (f.fields) {
            f.fields.forEach((subField: any) => {
              memberInitialState[subField.name] = "";
            });
          } else {
            memberInitialState.name = "";
            memberInitialState.email = "";
            memberInitialState.phone = "";
          }

          initialState[f.name] = Array(minMembers)
            .fill(null)
            .map(() => ({ ...memberInitialState }));
        } else {
          initialState[f.name] = f.default || "";
        }
      });

      setFormData(initialState);
      setErrors({});
      setEmailVerified(false);
      setShowOtpInput(false);
      setOtp("");
      setOtpError("");
      setFilePreviews({});
      setDragActive({});
    }
  }, [formSchema]);

  // Handle success and error from Redux
  useEffect(() => {
    if (success) {
      setSubmitted(true);
      dispatch(clearSuccess());
      setTimeout(() => {
        setSubmitted(false);
        navigate("/");
      }, 5000);
    }
  }, [success, dispatch, navigate]);

  useEffect(() => {
    if (reduxError) {
      alert(reduxError);
    }
  }, [reduxError]);

  // Clean up object URLs on unmount. Read through a ref: the cleanup would
  // otherwise only see the empty initial previews and leak every blob URL.
  const filePreviewsRef = useRef(filePreviews);
  useEffect(() => {
    filePreviewsRef.current = filePreviews;
  }, [filePreviews]);
  useEffect(() => {
    return () => {
      Object.values(filePreviewsRef.current).forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, []);

  // Calculate progress based on filled fields
  useEffect(() => {
    if (!formSchema) return;

    const totalFields = formSchema.fields.filter(
      (f: any) => f.type !== "members",
    ).length;
    const memberField = formSchema.fields.find(
      (f: any) => f.type === "members",
    );

    // Count main fields
    let filledFields = 0;
    formSchema.fields.forEach((field: any) => {
      if (
        field.type !== "members" &&
        formData[field.name] &&
        String(formData[field.name]).trim() !== ""
      ) {
        filledFields++;
      }
    });

    // Count member fields
    let totalMemberSubFields = 0;
    let filledMemberSubFields = 0;

    if (memberField) {
      const members = formData[memberField.name] || [];
      const subFields = memberField.fields || [];

      totalMemberSubFields = members.length * subFields.length;

      members.forEach((member: MemberData) => {
        subFields.forEach((subField: any) => {
          if (member[subField.name] && member[subField.name].trim() !== "") {
            filledMemberSubFields++;
          }
        });
      });
    }

    const total = totalFields + totalMemberSubFields;
    const current = filledFields + filledMemberSubFields;
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    setProgress(percentage);
  }, [formData, formSchema]);

  const validateEmail = (email: string, forceSunway: boolean = false) => {
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) return false;
    if (forceSunway) {
      return email.toLowerCase().endsWith("@sunway.edu.np");
    }
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formSchema) return;
    const { name, value } = e.target;

    // Find the field in schema to check type
    const currentField = formSchema.fields.find((f: any) => f.name === name);

    // Validate email if the field is an email field
    if (currentField?.type === "email") {
      // Reset verification if email changes
      setEmailVerified(false);
      setShowOtpInput(false);
      setOtp("");
      setOtpError("");

      if (value && !validateEmail(value, formSchema.requireSunwayEmail)) {
        setErrors((prev) => ({
          ...prev,
          [name]: formSchema.requireSunwayEmail
            ? "Email must end with @sunway.edu.np"
            : "Please enter a valid email address",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }

    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Sync with Player 1 if applicable
      const memberField = formSchema.fields.find(
        (f: any) => f.type === "members",
      );
      if (memberField) {
        const updatedMembers = [...(prev[memberField.name] || [])];
        if (updatedMembers.length > 0) {
          let shouldUpdate = false;
          const player1 = { ...updatedMembers[0] };

          if (name === "full_name" || name === "name") {
            player1.name = value;
            shouldUpdate = true;
          } else if (name === "email") {
            player1.email = value;
            shouldUpdate = true;
          } else if (name === "number" || name === "phone") {
            player1.phone = value;
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            updatedMembers[0] = player1;
            newData[memberField.name] = updatedMembers;
          }
        }
      }

      return newData;
    });
  };

  const handleFileChange = (name: string, file: File | null) => {
    if (!file) {
      setFormData((prev) => {
        const newData = { ...prev };
        delete newData[name];
        return newData;
      });

      if (filePreviews[name]) {
        URL.revokeObjectURL(filePreviews[name]);
        setFilePreviews((prev) => {
          const newPreviews = { ...prev };
          delete newPreviews[name];
          return newPreviews;
        });
      }
      return;
    }

    // Check if it's an image
    if (!file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, [name]: "Please upload an image file" }));
      return;
    }

    // Clear previous error
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });

    // Start cropping flow
    const objectUrl = URL.createObjectURL(file);
    setTempImage(objectUrl);
    setCroppingField(name);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const onCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: any,
  ): Promise<Blob | null> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) return null;

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropSave = async () => {
    if (!croppingField || !tempImage || !croppedAreaPixels) return;

    try {
      const croppedBlob = await getCroppedImg(tempImage, croppedAreaPixels);
      if (!croppedBlob) return;

      const croppedFile = new File([croppedBlob], "cropped-image.jpg", {
        type: "image/jpeg",
      });
      const objectUrl = URL.createObjectURL(croppedFile);

      // Revoke old object URL if exists
      if (filePreviews[croppingField]) {
        URL.revokeObjectURL(filePreviews[croppingField]);
      }

      setFilePreviews((prev) => ({ ...prev, [croppingField]: objectUrl }));
      setFormData((prev) => ({ ...prev, [croppingField]: croppedFile }));

      // Cleanup
      URL.revokeObjectURL(tempImage);
      setTempImage(null);
      setCroppingField(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCropCancel = () => {
    if (tempImage) {
      URL.revokeObjectURL(tempImage);
    }
    setTempImage(null);
    setCroppingField(null);
  };

  const handleDrag = (e: React.DragEvent, name: string, active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [name]: active }));
  };

  const handleDrop = (e: React.DragEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive((prev) => ({ ...prev, [name]: false }));

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(name, e.dataTransfer.files[0]);
    }
  };

  const handleMemberChange = (
    index: number,
    fieldName: string,
    value: string,
  ) => {
    if (!formSchema) return;
    // Prevent editing Player 1 directly from the members list if it's synced
    if (index === 0 && ["name", "email", "phone"].includes(fieldName)) return;

    // Validate email for members
    if (fieldName === "email") {
      const errorKey = `member_${index}_email`;
      if (value && !validateEmail(value, formSchema.requireSunwayEmail)) {
        setErrors((prev) => ({
          ...prev,
          [errorKey]: formSchema.requireSunwayEmail
            ? "Email must end with @sunway.edu.np"
            : "Please enter a valid email address",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[errorKey];
          return newErrors;
        });
      }
    }

    const memberField = formSchema.fields.find(
      (f: any) => f.type === "members",
    );
    if (!memberField) return;

    const updatedMembers = [...formData[memberField.name]];
    updatedMembers[index] = {
      ...updatedMembers[index],
      [fieldName]: value,
    };

    setFormData((prev) => ({ ...prev, [memberField.name]: updatedMembers }));
  };

  const addMember = () => {
    if (!formSchema) return;
    const memberField = formSchema.fields.find(
      (f: any) => f.type === "members",
    );
    if (!memberField) return;

    const currentMembers = formData[memberField.name] || [];
    const maxMembers = memberField.max || 100; // Default high limit if not specified

    if (currentMembers.length < maxMembers) {
      setFormData((prev) => ({
        ...prev,
        [memberField.name]: [
          ...prev[memberField.name],
          { name: "", email: "", phone: "" },
        ],
      }));
    }
  };

  const removeMember = (index: number) => {
    if (!formSchema) return;
    const memberField = formSchema.fields.find(
      (f: any) => f.type === "members",
    );
    if (!memberField) return;

    const updatedMembers = [...formData[memberField.name]];
    const minMembers = memberField.min || 1;

    // Only allow removal if we have more than min members
    if (updatedMembers.length > minMembers) {
      updatedMembers.splice(index, 1);

      // Clear errors for the removed member
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`member_${index}_email`];
        return newErrors;
      });

      setFormData((prev) => ({ ...prev, [memberField.name]: updatedMembers }));
    }
  };

  const handleVerifyEmail = async () => {
    // Find the first email field in the schema
    const emailField = formSchema?.fields.find((f: any) => f.type === "email");
    if (!emailField) return;

    const emailValue = formData[emailField.name];
    if (!emailValue || errors[emailField.name]) return;

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      await api.post("/forms/otp/send", {
        email: emailValue,
        formId: formId,
      });
      setShowOtpInput(true);
      alert("OTP sent to your email! Please check.");
    } catch (error: any) {
      console.error("Error sending OTP:", error);
      alert(
        error.response?.data?.message ||
          "Failed to send OTP. Please try again.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;

    // Find the first email field in the schema
    const emailField = formSchema?.fields.find((f: any) => f.type === "email");
    if (!emailField) return;

    const emailValue = formData[emailField.name];

    setIsVerifyingOtp(true);
    setOtpError("");
    try {
      await api.post("/forms/otp/verify", {
        email: emailValue,
        otp,
      });
      setEmailVerified(true);
      setShowOtpInput(false);
      setOtpError("");
      alert("Email verified successfully!");
    } catch (error: any) {
      console.error("Error verifying OTP:", error);
      setOtpError(
        error.response?.data?.message || "Invalid OTP. Please try again.",
      );
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check for any existing errors
    if (Object.keys(errors).length > 0) {
      alert("Please fix the errors in the form before submitting.");
      return;
    }

    // Check if email is verified (only if required)
    if (formSchema?.requireSunwayEmail && !emailVerified) {
      alert(
        "Please verify your @sunway.edu.np email address before submitting.",
      );
      return;
    }

    // Final validation check before submission
    const newErrors: { [key: string]: string } = {};
    let hasError = false;

    // Validate all email fields in the form
    formSchema?.fields.forEach((f: any) => {
      if (f.type === "email" && formData[f.name]) {
        if (!validateEmail(formData[f.name], formSchema.requireSunwayEmail)) {
          newErrors[f.name] = formSchema.requireSunwayEmail
            ? "Email must end with @sunway.edu.np"
            : "Please enter a valid email address";
          hasError = true;
        }
      }
    });

    // Validate members emails
    const memberField = formSchema?.fields?.find(
      (f: any) => f.type === "members",
    );
    if (memberField && formData[memberField.name]) {
      formData[memberField.name].forEach(
        (member: MemberData, index: number) => {
          if (
            member.email &&
            !validateEmail(member.email, formSchema?.requireSunwayEmail)
          ) {
            newErrors[`member_${index}_email`] = formSchema?.requireSunwayEmail
              ? "Email must end with @sunway.edu.np"
              : "Please enter a valid email address";
            hasError = true;
          }
        },
      );
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);
    setErrors({});

    if (formId) {
      dispatch(submitForm({ formId, data: formData }));
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 px-4 py-10">
        <div className="max-w-2xl mx-auto">
          <FormSkeleton />
        </div>
      </div>
    );
  }

  if (!formSchema || !formSchema.isActive) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Form Not Found</h1>
          <p className="text-neutral-400">
            The requested form does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 py-8">
      <div className="w-full max-w-3xl">
        {/* Header Card */}
        <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg overflow-hidden">
          {/* Top colored bar like Google Forms */}
          <div
            className="h-2 w-full"
            style={{ backgroundColor: "#B61C23" }}
          ></div>

          {/* Logo Section */}
          <div className="flex flex-col items-center justify-center pt-8 pb-6 px-6">
            <a
              href="https://ssrc.sunway.edu.np"
              target="_blank"
              rel="noopener noreferrer"
              className="transition hover:opacity-80"
            >
              <img src={img} alt="SSRC Logo" className="h-20 w-auto" />
            </a>
          </div>

          {/* Title and Description */}
          <div className="px-8 pb-8 space-y-4">
            <h1 className="text-3xl font-bold tracking-tight text-white text-center">
              {formSchema.formTitle}
            </h1>
            <p
              className="text-sm text-neutral-400 leading-relaxed max-w-2xl mx-auto"
              style={{ whiteSpace: "pre-line" }}
            >
              {formSchema.formDescription}
            </p>

            {/* Confidentiality Notice */}
            <div className="mt-6 rounded-lg bg-neutral-950/50 border border-neutral-800 p-4 text-xs text-neutral-500">
              <p className="font-semibold text-neutral-400 mb-1">
                Confidentiality Notice:
              </p>
              <p>
                The information collected in this form is for the purpose of the
                SSRC event registration only. Your personal details (email and
                phone number) will be kept confidential and used solely for
                event coordination. We do not share your data with third
                parties.
              </p>
              <p className="mt-2 text-red-400/80">
                * Indicates required question
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-neutral-400 font-medium">
                Registration Progress
              </span>
              <span className="text-xs text-neutral-400 font-medium">
                {progress}% Completed
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, backgroundColor: "#B61C23" }}
              />
            </div>
          </div>
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Info Section */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-white border-b border-neutral-800 pb-4">
              Details
            </h2>

            {formSchema.fields.map((field: any, idx: number) => {
              if (field.type === "members") return null;

              return (
                <div key={idx} className="space-y-2 group">
                  <label className="text-sm font-medium text-neutral-200 group-focus-within:text-[#B61C23] transition-colors">
                    {field.label}
                    {field.required && (
                      <span className="text-red-400 ml-1">*</span>
                    )}
                  </label>
                  {field.description && (
                    <p className="text-xs text-neutral-500">
                      {field.description}
                    </p>
                  )}

                  <div className="relative">
                    {field.type === "file" ? (
                      <div className="space-y-3">
                        {!filePreviews[field.name] ? (
                          <div
                            onDragEnter={(e) => handleDrag(e, field.name, true)}
                            onDragOver={(e) => handleDrag(e, field.name, true)}
                            onDragLeave={(e) =>
                              handleDrag(e, field.name, false)
                            }
                            onDrop={(e) => handleDrop(e, field.name)}
                            onClick={() =>
                              document.getElementById(field.name)?.click()
                            }
                            className={`relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed transition-all cursor-pointer bg-neutral-950/50 hover:bg-neutral-900/50 ${
                              dragActive[field.name]
                                ? "border-[#B61C23] scale-[0.99]"
                                : "border-neutral-800 hover:border-neutral-700"
                            }`}
                          >
                            <input
                              id={field.name}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange(
                                  field.name,
                                  e.target.files ? e.target.files[0] : null,
                                )
                              }
                              required={field.required && !formData[field.name]}
                            />
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <div className="mb-3 p-3 rounded-full bg-neutral-900 group-hover:bg-[#B61C23]/10 transition-colors">
                                <svg
                                  className="w-8 h-8 text-neutral-500 group-hover:text-[#B61C23] transition-colors"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              </div>
                              <p className="mb-2 text-sm text-neutral-400">
                                <span className="font-semibold text-white">
                                  Click to upload
                                </span>{" "}
                                or drag and drop
                              </p>
                              <p className="text-xs text-neutral-500">
                                PNG, JPG or WEBP (MAX. 800x400px)
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="relative w-full rounded-xl border border-neutral-800 bg-neutral-950/50 overflow-hidden group flex items-center justify-center min-h-48">
                            <img
                              src={filePreviews[field.name]}
                              alt="Preview"
                              className="max-w-full h-auto max-h-[200px] object-contain block"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                              <button
                                type="button"
                                onClick={() =>
                                  document.getElementById(field.name)?.click()
                                }
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white transition-all hover:scale-110"
                                title="Change Photo"
                              >
                                <svg
                                  className="w-6 h-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                  />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleFileChange(field.name, null)
                                }
                                className="p-2 rounded-full bg-red-500/20 hover:bg-red-500/40 backdrop-blur-sm text-red-500 transition-all hover:scale-110"
                                title="Remove Photo"
                              >
                                <svg
                                  className="w-6 h-6"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                              </button>
                            </div>
                            <input
                              id={field.name}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) =>
                                handleFileChange(
                                  field.name,
                                  e.target.files ? e.target.files[0] : null,
                                )
                              }
                            />
                          </div>
                        )}
                      </div>
                    ) : field.type === "textarea" ? (
                      <>
                        <textarea
                          name={field.name}
                          value={formData[field.name] || ""}
                          placeholder={field.placeholder}
                          required={field.required}
                          onChange={(e: any) => handleChange(e)}
                          rows={5}
                          className={`w-full rounded-md border ${
                            errors[field.name]
                              ? "border-red-500"
                              : "border-neutral-800"
                          } bg-neutral-950 px-4 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#B61C23] focus:ring-1 focus:ring-[#B61C23] transition-all resize-y min-h-[120px]`}
                        />
                      </>
                    ) : (
                      <>
                        <input
                          type={field.type}
                          name={field.name}
                          value={formData[field.name] || ""}
                          placeholder={field.placeholder}
                          min={field.min}
                          max={field.max}
                          step={field.step}
                          required={field.required}
                          onChange={handleChange}
                          disabled={field.name === "email" && emailVerified}
                          className={`h-11 w-full rounded-md border ${
                            errors[field.name]
                              ? "border-red-500"
                              : "border-neutral-800"
                          } bg-neutral-950 px-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#B61C23] focus:ring-1 focus:ring-[#B61C23] transition-all ${
                            field.name === "email" && emailVerified
                              ? "pr-10 border-green-500/50 bg-green-900/10"
                              : ""
                          }`}
                        />

                        {/* Verification Checkmark */}
                        {field.type === "email" &&
                          formSchema?.requireSunwayEmail &&
                          emailVerified && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                      </>
                    )}
                  </div>

                  {errors[field.name] && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors[field.name]}
                    </p>
                  )}

                  {/* Verify Button for Email */}
                  {field.type === "email" &&
                    formSchema?.requireSunwayEmail &&
                    !emailVerified &&
                    formData[field.name] &&
                    validateEmail(
                      formData[field.name],
                      formSchema.requireSunwayEmail,
                    ) &&
                    !showOtpInput && (
                      <button
                        type="button"
                        onClick={handleVerifyEmail}
                        disabled={isVerifyingOtp}
                        className="mt-2 px-4 py-2 rounded-md bg-[#B61C23] text-white text-xs font-medium hover:bg-[#B61C23]/90 transition-colors flex items-center gap-2"
                      >
                        {isVerifyingOtp ? (
                          <>
                            <svg
                              className="animate-spin h-3 w-3"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            Sending OTP...
                          </>
                        ) : (
                          "Verify Email"
                        )}
                      </button>
                    )}

                  {/* OTP Input Section */}
                  {field.type === "email" &&
                    formSchema?.requireSunwayEmail &&
                    showOtpInput && (
                      <div className="mt-3 p-4 rounded-lg bg-neutral-900/50 border border-neutral-800 animate-fade-in">
                        <label className="text-xs font-medium text-neutral-400 mb-2 block">
                          Enter OTP sent to your email
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            className="h-10 flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#B61C23] focus:ring-1 focus:ring-[#B61C23]"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOtp}
                            className="px-4 h-10 rounded-md bg-[#B61C23] text-white text-sm font-medium hover:bg-[#B61C23]/90 transition-colors"
                          >
                            Verify
                          </button>
                        </div>
                        {otpError && (
                          <p className="text-xs text-red-500 mt-2">
                            {otpError}
                          </p>
                        )}
                        <div className="mt-2 text-[10px] text-neutral-500">
                          Please check your inbox for the code.
                        </div>
                      </div>
                    )}
                </div>
              );
            })}
          </div>

          {/* Members Section */}
          {formSchema.fields.map((field: any, idx: number) => {
            if (field.type !== "members") return null;

            const members = formData[field.name] || [];
            const subFields = field.fields || [];

            return (
              <div key={idx} className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-xl font-semibold text-white">
                    Player Information
                  </h2>
                  <span className="text-sm text-neutral-400">
                    {members.length} Players
                  </span>
                </div>

                {members.map((member: MemberData, i: number) => (
                  <div
                    key={i}
                    className="rounded-xl border border-neutral-800 bg-neutral-900 shadow-lg overflow-hidden transition-all hover:border-neutral-700 relative group"
                  >
                    <div className="bg-neutral-950/50 px-6 py-3 border-b border-neutral-800 flex justify-between items-center">
                      <h3 className="text-md font-medium text-neutral-200">
                        Player {i + 1}
                      </h3>
                      <div className="flex items-center gap-3">
                        {i === 0 && (
                          <span className="text-xs bg-[#B61C23]/20 text-[#B61C23] px-2 py-1 rounded border border-[#B61C23]/30">
                            Captain
                          </span>
                        )}
                        {/* Only show remove button for players beyond the minimum required */}
                        {i >= (field.min || 1) && (
                          <button
                            type="button"
                            onClick={() => removeMember(i)}
                            className="text-neutral-500 hover:text-red-400 transition-colors"
                            title="Remove Player"
                          >
                            <svg
                              className="w-5 h-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              ></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {subFields.map((subField: any, subIdx: number) => (
                        <div
                          key={subIdx}
                          className={`space-y-2 ${
                            subField.name === "name" ? "md:col-span-2" : ""
                          }`}
                        >
                          <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
                            {subField.label}
                            {subField.required && (
                              <span className="text-red-400 ml-1">*</span>
                            )}
                          </label>
                          <input
                            type={subField.type}
                            placeholder={subField.placeholder}
                            value={member[subField.name] || ""}
                            onChange={(e) =>
                              handleMemberChange(
                                i,
                                subField.name,
                                e.target.value,
                              )
                            }
                            required={subField.required}
                            readOnly={i === 0}
                            className={`h-10 w-full rounded-md border ${
                              subField.name === "email" &&
                              errors[`member_${i}_email`]
                                ? "border-red-500"
                                : "border-neutral-800"
                            } bg-neutral-950 px-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#B61C23] focus:ring-1 focus:ring-[#B61C23] transition-all ${
                              i === 0
                                ? "opacity-50 cursor-not-allowed bg-neutral-900"
                                : ""
                            }`}
                          />
                          {subField.name === "email" &&
                            errors[`member_${i}_email`] && (
                              <p className="text-xs text-red-500 mt-1">
                                {errors[`member_${i}_email`]}
                              </p>
                            )}
                          {i === 0 && (
                            <p className="text-[10px] text-neutral-500">
                              * Auto-filled from Team Details
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Add Player Button - Only show if below max limit */}
                {members.length < (field.max || 100) && (
                  <button
                    type="button"
                    onClick={addMember}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl border-2 border-dashed border-neutral-800 text-neutral-400 hover:border-[#B61C23] hover:text-[#B61C23] hover:bg-[#B61C23]/5 transition-all group"
                  >
                    <div className="h-8 w-8 rounded-full bg-neutral-800 group-hover:bg-[#B61C23] flex items-center justify-center transition-colors">
                      <svg
                        className="w-5 h-5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 4v16m8-8H4"
                        ></path>
                      </svg>
                    </div>
                    <span className="font-medium">Add Another Player</span>
                  </button>
                )}
              </div>
            );
          })}

          {/* Success Message */}
          {submitted && (
            <div className="rounded-xl bg-green-900/20 border border-green-800 p-6 animate-fade-in text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-900/50 text-green-400 mb-3">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium text-green-400 mb-1">
                Registration Successful!
              </h3>
              <p className="text-sm text-green-400/80">
                You have been registered. See you soon !!
              </p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-center pt-4 pb-12">
            <button
              type="submit"
              disabled={
                loading ||
                submitting ||
                submitted ||
                (formSchema?.requireSunwayEmail && !emailVerified)
              }
              className="h-12 w-full max-w-xs rounded-lg text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                backgroundColor: "#B61C23",
                boxShadow: "0 10px 15px -3px rgba(182, 28, 35, 0.2)",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting Application...
                </span>
              ) : submitted ? (
                "Registered ✓"
              ) : (
                "Submit Registration"
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center text-xs text-neutral-600 pb-8">
          <p>SSRC Event Registration Form</p>
          <p className="mt-1">
            &copy; {new Date().getFullYear()} Sunway Student Representatives
            Council
          </p>
        </div>

        {/* Image Cropper Modal */}
        {tempImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-2xl bg-neutral-900 rounded-2xl border border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Crop Image</h3>
                <button
                  type="button"
                  onClick={handleCropCancel}
                  className="p-2 text-neutral-400 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="relative flex-1 bg-neutral-950 min-h-[400px]">
                <Cropper
                  image={tempImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1 / 1}
                  onCropChange={setCrop}
                  onCropComplete={onCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="p-6 space-y-6 bg-neutral-900 border-t border-neutral-800">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-neutral-400">
                    <span>ZOOM</span>
                    <span>{Math.round(zoom * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e: any) => setZoom(Number(e.target.value))}
                    className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#B61C23]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCropCancel}
                    className="flex-1 h-11 rounded-xl border border-neutral-800 text-sm font-medium text-neutral-200 hover:bg-neutral-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCropSave}
                    className="flex-1 h-11 rounded-xl bg-[#B61C23] text-sm font-medium text-white hover:bg-[#B61C23]/90 transition-all shadow-lg shadow-[#B61C23]/20"
                  >
                    Apply Crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DynamicForm;
