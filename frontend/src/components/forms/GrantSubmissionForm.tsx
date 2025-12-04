"use client";

import { useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAddress } from "@thirdweb-dev/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { FormInput } from "@/components/forms/FormInput";
import { FormTextarea } from "@/components/forms/FormTextarea";
import { FormSelect } from "@/components/forms/FormSelect";
import { FileUpload } from "@/components/forms/FileUpload";

import {
  grantSubmissionSchema,
  defaultFormValues,
  type GrantSubmissionFormData,
} from "@/lib/validations/grant";
import { useSubmitGrant } from "@/hooks/useApi";

const CATEGORY_OPTIONS = [
  { value: "defi", label: "DeFi" },
  { value: "nft", label: "NFT" },
  { value: "dao", label: "DAO" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "developer-tools", label: "Developer Tools" },
  { value: "social", label: "Social" },
  { value: "gaming", label: "Gaming" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
];

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}

function FormSection({
  title,
  description,
  children,
  isOpen = true,
  onToggle,
}: FormSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div
        className="flex items-center justify-between p-6 cursor-pointer"
        onClick={onToggle}
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-gray-600 mt-1">
              {description}
            </p>
          )}
        </div>
        {onToggle && (
          <button type="button" className="text-gray-400 hover:text-gray-600">
            {isOpen ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        )}
      </div>
      {isOpen && <div className="px-6 pb-6 space-y-6">{children}</div>}
    </div>
  );
}

export function GrantSubmissionForm() {
  const { isAuthenticated, user } = useAuth();
  const address = useAddress();
  const submitGrantMutation = useSubmitGrant();
  
  // Use connected wallet or linked wallet from user account
  const walletAddress = address || user?.wallet_address;
  
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    team: true,
    budget: true,
    timeline: true,
    technical: true,
    links: false,
    legal: true,
  });
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<GrantSubmissionFormData>({
    resolver: zodResolver(grantSubmissionSchema),
    defaultValues: {
      ...defaultFormValues,
      applicantAddress: walletAddress || "",
      paymentAddress: walletAddress || "",
    },
  });

  // Field arrays for dynamic sections
  const {
    fields: teamFields,
    append: appendTeam,
    remove: removeTeam,
  } = useFieldArray({
    control,
    name: "team",
  });

  const {
    fields: budgetFields,
    append: appendBudget,
    remove: removeBudget,
  } = useFieldArray({
    control,
    name: "budgetBreakdown",
  });

  const {
    fields: milestoneFields,
    append: appendMilestone,
    remove: removeMilestone,
  } = useFieldArray({
    control,
    name: "milestones",
  });

  const {
    fields: techStackFields,
    append: appendTechStack,
    remove: removeTechStack,
  } = useFieldArray({
    control,
    name: "techStack",
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (data: GrantSubmissionFormData) => {
    try {
      // TODO: Upload supporting files to IPFS
      console.log("Supporting files:", supportingFiles);

      // Extract GitHub profiles from team members for due diligence
      const githubProfiles = data.team
        .map(member => member.github)
        .filter(github => github && github.trim() !== "");

      // Submit grant with team GitHub profiles for due diligence
      // Include milestones in detailed_proposal - they'll be created when grant is approved
      const grantResponse = await submitGrantMutation.mutateAsync({
        title: data.projectName,
        description: data.description,
        requested_amount: data.requestedAmount,
        category: data.category,
        duration_months: parseInt(data.duration),
        team_size: data.team.length,
        github_repo: data.githubRepo,
        website: data.website,
        twitter: data.twitter,
        discord: data.discord,
        detailed_proposal: JSON.stringify({
          ...data,
          githubProfiles, // Include extracted GitHub profiles for due diligence
          walletAddresses: [data.paymentAddress], // Include payment address for due diligence
          milestones: data.milestones, // Include milestones - will be created on approval
        }),
        applicant_address: walletAddress || data.applicantAddress || "", // Include wallet address
      });

      toast.success("Grant submitted successfully!", {
        description: data.milestones?.length > 0 
          ? `Your grant with ${data.milestones.length} milestones is now being evaluated.`
          : "Your grant proposal is now being evaluated by our AI agents.",
      });

      // Redirect to grants page
      window.location.href = "/grants";
    } catch (error) {
      console.error("Error submitting grant:", error);
      toast.error("Failed to submit grant", {
        description: "Please try again or contact support if the issue persists.",
      });
    }
  };

  const saveDraft = () => {
    const formData = watch();
    localStorage.setItem("grant-draft", JSON.stringify(formData));
    toast.success("Draft saved successfully!");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">
            Please log in to submit a grant proposal.
          </p>
        </div>
      </div>
    );
  }

  if (!walletAddress) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">
            Please connect your wallet or link a wallet in your profile to submit a grant proposal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-5xl mx-auto space-y-6">
      {/* Progress Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900">
          Grant Submission Process
        </h3>
        <p className="text-sm text-blue-700 mt-1">
          Fill out all required fields. Your submission will be evaluated by our AI agents
          within 24-48 hours.
        </p>
      </div>

      {/* Basic Information Section */}
      <FormSection
        title="Basic Information"
        description="Tell us about your project"
        isOpen={expandedSections.basic}
        onToggle={() => toggleSection("basic")}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <FormInput
              label="Project Name"
              {...register("projectName")}
              error={errors.projectName?.message}
              required
              placeholder="Enter your project name"
            />
          </div>

          <div className="md:col-span-2">
            <FormInput
              label="Tagline"
              {...register("tagline")}
              error={errors.tagline?.message}
              required
              placeholder="A brief, catchy description of your project"
              helperText="Maximum 200 characters"
            />
          </div>

          <div className="md:col-span-2">
            <FormSelect
              label="Category"
              {...register("category")}
              error={errors.category?.message}
              options={CATEGORY_OPTIONS}
              required
            />
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Project Description"
              {...register("description")}
              error={errors.description?.message}
              required
              rows={6}
              placeholder="Provide a comprehensive description of your project..."
              helperText="100-5000 characters"
            />
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Problem Statement"
              {...register("problemStatement")}
              error={errors.problemStatement?.message}
              required
              rows={4}
              placeholder="What problem are you solving?"
              helperText="Clearly articulate the problem your project addresses"
            />
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Solution"
              {...register("solution")}
              error={errors.solution?.message}
              required
              rows={4}
              placeholder="How does your project solve this problem?"
              helperText="Explain your unique approach and methodology"
            />
          </div>
        </div>
      </FormSection>

      {/* Team Information Section */}
      <FormSection
        title="Team Information"
        description="Information about your team members"
        isOpen={expandedSections.team}
        onToggle={() => toggleSection("team")}
      >
        <div className="space-y-6">
          {teamFields.map((field, index) => (
            <div
              key={field.id}
              className="p-4 border border-gray-200 rounded-lg space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  Team Member {index + 1}
                </h3>
                {teamFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeam(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormInput
                  label="Name"
                  {...register(`team.${index}.name`)}
                  error={errors.team?.[index]?.name?.message}
                  required
                  placeholder="John Doe"
                />

                <FormInput
                  label="Role"
                  {...register(`team.${index}.role`)}
                  error={errors.team?.[index]?.role?.message}
                  required
                  placeholder="Lead Developer"
                />

                <FormInput
                  label="Email"
                  type="email"
                  {...register(`team.${index}.email`)}
                  error={errors.team?.[index]?.email?.message}
                  required={index === 0}
                  placeholder="john@example.com"
                  helperText={index === 0 ? "Required - Grant updates will be sent here" : undefined}
                />

                <FormInput
                  label="GitHub Profile"
                  {...register(`team.${index}.github`)}
                  error={errors.team?.[index]?.github?.message}
                  required
                  placeholder="https://github.com/username"
                  helperText="Required for due diligence verification"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => appendTeam({ name: "", role: "", email: "", github: "" })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Team Member
          </button>
        </div>
      </FormSection>

      {/* Budget Section - Will continue in next part */}
      <FormSection
        title="Budget & Funding"
        description="Breakdown of requested funding"
        isOpen={expandedSections.budget}
        onToggle={() => toggleSection("budget")}
      >
        <div className="space-y-6">
          <FormInput
            label="Total Requested Amount (ETH)"
            {...register("requestedAmount")}
            error={errors.requestedAmount?.message}
            required
            type="number"
            step="0.01"
            placeholder="10.5"
            helperText="Amount in ETH"
          />

          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              Budget Breakdown
            </h3>
            {budgetFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border border-gray-200 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    Budget Item {index + 1}
                  </h4>
                  {budgetFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBudget(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Category"
                    {...register(`budgetBreakdown.${index}.category`)}
                    error={errors.budgetBreakdown?.[index]?.category?.message}
                    required
                    placeholder="Development, Marketing, etc."
                  />

                  <FormInput
                    label="Amount (ETH)"
                    {...register(`budgetBreakdown.${index}.amount`)}
                    error={errors.budgetBreakdown?.[index]?.amount?.message}
                    required
                    type="number"
                    step="0.01"
                    placeholder="2.5"
                  />

                  <div className="md:col-span-2">
                    <FormTextarea
                      label="Description"
                      {...register(`budgetBreakdown.${index}.description`)}
                      error={errors.budgetBreakdown?.[index]?.description?.message}
                      required
                      rows={2}
                      placeholder="Brief description of this budget item"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <FormTextarea
                      label="Justification"
                      {...register(`budgetBreakdown.${index}.justification`)}
                      error={errors.budgetBreakdown?.[index]?.justification?.message}
                      required
                      rows={3}
                      placeholder="Why is this expense necessary?"
                    />
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                appendBudget({
                  category: "",
                  description: "",
                  amount: "",
                  justification: "",
                })
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Budget Item
            </button>
          </div>
        </div>
      </FormSection>

      {/* Continue with remaining sections... */}
      
      {/* Timeline & Milestones Section */}
      <FormSection
        title="Timeline & Milestones"
        description="Project timeline and deliverable milestones"
        isOpen={expandedSections.timeline}
        onToggle={() => toggleSection("timeline")}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Project Duration (months)"
              {...register("duration")}
              error={errors.duration?.message}
              required
              type="number"
              min="1"
              max="24"
              placeholder="6"
            />

            <FormInput
              label="Planned Start Date"
              {...register("startDate")}
              error={errors.startDate?.message}
              type="date"
            />
          </div>

          <div className="md:col-span-2">
            <FormTextarea
              label="Key Deliverables"
              {...register("deliverables")}
              error={errors.deliverables?.message}
              required
              rows={5}
              placeholder="List the main deliverables and outcomes of your project..."
            />
          </div>

          <div className="space-y-4">
            {/* Milestone Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Milestone-Based Payments:</strong> When your grant is approved, only the first milestone payment will be released. After completing each milestone, submit proof of work for review. Upon approval, the next milestone payment will be released.
              </p>
            </div>

            <h3 className="font-medium text-gray-900">
              Milestones
            </h3>
            {milestoneFields.map((field, index) => {
              const requestedAmount = parseFloat(watch("requestedAmount") || "0");
              const fundingPercentage = parseFloat(watch(`milestones.${index}.fundingPercentage`) || "0");
              const milestoneAmount = requestedAmount && fundingPercentage 
                ? (requestedAmount * fundingPercentage / 100).toFixed(4) 
                : "0";

              return (
                <div
                  key={field.id}
                  className="p-4 border border-gray-200 rounded-lg space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700">
                        Milestone {index + 1}
                        {index === 0 && (
                          <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                            Paid on approval
                          </span>
                        )}
                      </h4>
                      {fundingPercentage > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          Payment: {milestoneAmount} ETH ({fundingPercentage}% of total)
                        </p>
                      )}
                    </div>
                    {milestoneFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                <FormInput
                  label="Title"
                  {...register(`milestones.${index}.title`)}
                  error={errors.milestones?.[index]?.title?.message}
                  required
                  placeholder="Milestone title"
                />

                <FormTextarea
                  label="Description"
                  {...register(`milestones.${index}.description`)}
                  error={errors.milestones?.[index]?.description?.message}
                  required
                  rows={3}
                  placeholder="Detailed description of this milestone..."
                />

                <FormTextarea
                  label="Deliverables"
                  {...register(`milestones.${index}.deliverables`)}
                  error={errors.milestones?.[index]?.deliverables?.message}
                  required
                  rows={2}
                  placeholder="What will be delivered at this milestone?"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Duration (weeks)"
                    {...register(`milestones.${index}.duration`)}
                    error={errors.milestones?.[index]?.duration?.message}
                    required
                    type="number"
                    placeholder="4"
                  />

                  <FormInput
                    label="Funding % of Total"
                    {...register(`milestones.${index}.fundingPercentage`)}
                    error={errors.milestones?.[index]?.fundingPercentage?.message}
                    required
                    type="number"
                    min="1"
                    max="100"
                    placeholder="25"
                    helperText="Percentage of total budget"
                  />
                </div>
              </div>
            )})}

            {/* Funding Percentage Total Indicator */}
            {(() => {
              const totalPercentage = milestoneFields.reduce((sum, _, index) => {
                const percentage = parseFloat(watch(`milestones.${index}.fundingPercentage`) || "0");
                return sum + percentage;
              }, 0);
              const isValid = Math.abs(totalPercentage - 100) < 0.01;

              return (
                <div className={`p-3 rounded-lg border ${
                  isValid 
                    ? 'bg-green-50 border-green-200' 
                    : totalPercentage > 0
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Total Funding Allocation:
                    </span>
                    <span className={`text-sm font-bold ${
                      isValid 
                        ? 'text-green-700' 
                        : totalPercentage > 0
                        ? 'text-yellow-700'
                        : 'text-gray-600'
                    }`}>
                      {totalPercentage.toFixed(1)}% / 100%
                      {isValid && " ✓"}
                      {!isValid && totalPercentage > 0 && totalPercentage !== 100 && " ⚠"}
                    </span>
                  </div>
                  {!isValid && totalPercentage > 0 && (
                    <p className="text-xs text-yellow-700 mt-1">
                      Milestone percentages must sum to exactly 100%
                    </p>
                  )}
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() =>
                appendMilestone({
                  title: "",
                  description: "",
                  deliverables: "",
                  duration: "",
                  fundingPercentage: "",
                })
              }
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>
        </div>
      </FormSection>

      {/* Technical Details Section */}
      <FormSection
        title="Technical Details"
        description="Technology stack and implementation details"
        isOpen={expandedSections.technical}
        onToggle={() => toggleSection("technical")}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">
              Tech Stack
            </h3>
            {techStackFields.map((field, index) => (
              <div
                key={field.id}
                className="p-4 border border-gray-200 rounded-lg space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-700">
                    Technology {index + 1}
                  </h4>
                  {techStackFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTechStack(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="Technology Name"
                    {...register(`techStack.${index}.name`)}
                    error={errors.techStack?.[index]?.name?.message}
                    required
                    placeholder="React, Solidity, etc."
                  />

                  <FormTextarea
                    label="Purpose"
                    {...register(`techStack.${index}.purpose`)}
                    error={errors.techStack?.[index]?.purpose?.message}
                    required
                    rows={2}
                    placeholder="Why are you using this technology?"
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => appendTechStack({ name: "", purpose: "" })}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Technology
            </button>
          </div>

          <FileUpload
            label="Supporting Documents"
            onFilesChange={setSupportingFiles}
            helperText="Upload whitepapers, technical diagrams, or other supporting documents"
          />
        </div>
      </FormSection>

      {/* Links & Resources Section */}
      <FormSection
        title="Links & Resources"
        description="Project links and social media"
        isOpen={expandedSections.links}
        onToggle={() => toggleSection("links")}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="GitHub Repository"
              {...register("githubRepo")}
              error={errors.githubRepo?.message}
              placeholder="https://github.com/username/project"
            />

            <FormInput
              label="Website"
              {...register("website")}
              error={errors.website?.message}
              placeholder="https://yourproject.com"
            />

            <FormInput
              label="Documentation"
              {...register("documentation")}
              error={errors.documentation?.message}
              placeholder="https://docs.yourproject.com"
            />

            <FormInput
              label="Demo Link"
              {...register("demoLink")}
              error={errors.demoLink?.message}
              placeholder="https://demo.yourproject.com"
            />

            <FormInput
              label="Twitter"
              {...register("twitter")}
              error={errors.twitter?.message}
              placeholder="@yourproject"
            />

            <FormInput
              label="Discord"
              {...register("discord")}
              error={errors.discord?.message}
              placeholder="https://discord.gg/yourproject"
            />

            <FormInput
              label="Telegram"
              {...register("telegram")}
              error={errors.telegram?.message}
              placeholder="https://t.me/yourproject"
            />
          </div>
        </div>
      </FormSection>

      {/* Legal & Wallet Information */}
      <FormSection
        title="Legal & Payment"
        description="Payment details and legal agreements"
        isOpen={expandedSections.legal}
        onToggle={() => toggleSection("legal")}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput
              label="Applicant Wallet Address"
              {...register("applicantAddress")}
              error={errors.applicantAddress?.message}
              placeholder="0x..."
              helperText="Your connected wallet address"
              disabled
            />

            <FormInput
              label="Payment Wallet Address"
              {...register("paymentAddress")}
              error={errors.paymentAddress?.message}
              required
              placeholder="0x..."
              helperText="Address where funds should be sent"
            />
          </div>

          <FormTextarea
            label="Previous Work (Optional)"
            {...register("previousWork")}
            error={errors.previousWork?.message}
            rows={4}
            placeholder="Describe any relevant previous projects or experience..."
          />

          <FormTextarea
            label="Additional Notes (Optional)"
            {...register("additionalNotes")}
            error={errors.additionalNotes?.message}
            rows={4}
            placeholder="Any additional information you'd like to share..."
          />

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              {...register("agreeToTerms")}
              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm text-gray-700">
              I agree to the{" "}
              <a 
                href="/terms" 
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                terms and conditions
              </a>{" "}
              and confirm that all information provided is accurate to the best of my
              knowledge.
              <span className="text-red-500 ml-1">*</span>
            </label>
          </div>
          {errors.agreeToTerms && (
            <p className="text-sm text-red-600">
              {errors.agreeToTerms.message}
            </p>
          )}
        </div>
      </FormSection>

      {/* Form Actions */}
      <div className="flex items-center justify-between gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <button
          type="button"
          onClick={saveDraft}
          className="flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <Save className="w-5 h-5" />
          Save Draft
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-8 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Submit Grant Proposal
            </>
          )}
        </button>
      </div>

      {/* Debug: Show validation errors */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-medium text-red-800 mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>
                {key}: {error?.message?.toString() || "Invalid value"}
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
