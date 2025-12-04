"use client";

import { PageLayout } from "@/components/PageLayout";
import { GrantSubmissionForm } from "@/components/forms/GrantSubmissionForm";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function SubmitPage() {
  return (
    <ProtectedRoute>
      <PageLayout
        title="Submit Grant Proposal"
        description="Submit your project for evaluation by our AI agents. Fill out all required fields to help our agents better understand and evaluate your proposal."
      >
        <GrantSubmissionForm />
      </PageLayout>
    </ProtectedRoute>
  );
}
