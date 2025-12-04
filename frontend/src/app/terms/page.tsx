import { PageLayout } from "@/components/PageLayout";

export default function TermsPage() {
  return (
    <PageLayout
      title="Terms and Conditions"
      description="Grant submission terms and conditions for Grantify"
    >
      <div className="max-w-4xl mx-auto prose prose-slate">
        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">1. Grant Application</h2>
          <p>
            By submitting a grant proposal to Grantify, you agree to the following terms
            and conditions. These terms govern your participation in the grant evaluation
            and funding process.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">2. Information Accuracy</h2>
          <p>
            You certify that all information provided in your grant proposal is accurate,
            complete, and truthful to the best of your knowledge. Any false or misleading
            information may result in immediate disqualification and potential legal action.
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Team member credentials and experience</li>
            <li>Budget estimates and financial projections</li>
            <li>Technical capabilities and timeline commitments</li>
            <li>Previous work and portfolio claims</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">3. AI Agent Evaluation</h2>
          <p>
            Your grant proposal will be evaluated by multiple AI agents assessing different
            aspects including technical feasibility, ecosystem impact, budget reasonableness,
            team due diligence, and community sentiment.
          </p>
          <p className="mt-2">
            You understand and agree that:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Evaluation is automated and may take 24-48 hours</li>
            <li>AI agents provide recommendations, not final decisions</li>
            <li>Evaluations are transparent and will be shared with you</li>
            <li>The DAO community has final approval authority</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">4. Intellectual Property</h2>
          <p>
            You retain all intellectual property rights to your project. However, by
            submitting a grant proposal, you grant Grantify a non-exclusive license to:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Review and evaluate your proposal</li>
            <li>Share evaluation results with the community (anonymized if rejected)</li>
            <li>Publish approved projects on the Grantify website and materials</li>
            <li>Store proposal data on IPFS and blockchain for transparency</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">5. Funding and Milestones</h2>
          <p>
            If your grant is approved:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Funding will be released based on milestone completion</li>
            <li>You must provide progress updates for each milestone</li>
            <li>Failure to meet milestones may result in funding suspension</li>
            <li>Unused funds must be returned to the DAO treasury</li>
            <li>All code must be open-sourced unless explicitly approved otherwise</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">6. Compliance and Legal</h2>
          <p>
            You represent and warrant that:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>You have the legal authority to enter into this agreement</li>
            <li>Your project complies with all applicable laws and regulations</li>
            <li>You will not use grant funds for illegal activities</li>
            <li>You will comply with KYC/AML requirements if requested</li>
            <li>You understand cryptocurrency is involved and accept associated risks</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">7. Transparency and Reporting</h2>
          <p>
            Grant recipients must:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Provide monthly progress reports to the community</li>
            <li>Make code repositories public (unless approved for private development)</li>
            <li>Acknowledge Grantify funding in project materials</li>
            <li>Participate in community discussions and answer questions</li>
            <li>Submit final project report upon completion</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">8. Liability and Disclaimers</h2>
          <p>
            Grantify, its contributors, and the DAO community are not liable for:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Project success or failure</li>
            <li>Loss of funds due to market volatility</li>
            <li>Technical issues or vulnerabilities in your project</li>
            <li>Third-party claims related to your project</li>
            <li>Changes in regulatory environment</li>
          </ul>
          <p className="mt-2 font-semibold">
            You accept all risks associated with blockchain technology and cryptocurrency.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
          <p>
            Grantify reserves the right to:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Reject any proposal at any stage</li>
            <li>Suspend or terminate funding for breach of terms</li>
            <li>Request return of funds for misuse or non-performance</li>
            <li>Update these terms with notice to active grant recipients</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">10. Dispute Resolution</h2>
          <p>
            Any disputes arising from grant agreements will be:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>First attempted to be resolved through community discussion</li>
            <li>Escalated to DAO governance vote if necessary</li>
            <li>Subject to arbitration in neutral jurisdiction if unresolved</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">11. Privacy and Data</h2>
          <p>
            Your personal information and proposal data will be:
          </p>
          <ul className="list-disc pl-6 mt-2">
            <li>Stored securely on IPFS and blockchain</li>
            <li>Made public if your grant is approved</li>
            <li>Kept confidential if your grant is rejected (except aggregate statistics)</li>
            <li>Not sold or shared with third parties for marketing</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4">12. Acceptance</h2>
          <p className="font-semibold">
            By checking the "I agree" box and submitting your grant proposal, you
            acknowledge that you have read, understood, and agree to be bound by these
            terms and conditions.
          </p>
        </section>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Last Updated:</strong> November 18, 2025
          </p>
          <p className="text-sm text-blue-900 mt-2">
            <strong>Questions?</strong> Contact us at{" "}
            <a
              href="mailto:grants@grantify.org"
              className="text-blue-600 hover:underline"
            >
              grants@grantify.org
            </a>
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
