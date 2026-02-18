import Link from 'next/link';

export const metadata = {
  title: 'Data Processing Agreement | Caelith',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-accent-950">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-accent-950/70">{children}</div>
    </section>
  );
}

export default function DpaPage() {
  return (
    <div className="min-h-screen bg-[#F5F2EA]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-xs text-accent-950/40 hover:text-accent-950 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-accent-950">Data Processing Agreement</h1>
        <p className="mb-2 text-xs text-accent-950/40">Effective date: February 18, 2026 &middot; Last updated: February 18, 2026</p>
        <p className="mb-10 text-xs text-accent-950/40">Pursuant to Article 28 of the General Data Protection Regulation (EU) 2016/679</p>

        <Section title="1. Subject Matter and Duration">
          <p>This Data Processing Agreement (&ldquo;DPA&rdquo;) governs the processing of personal data by Caelith (&ldquo;Processor&rdquo;) on behalf of the Client (&ldquo;Controller&rdquo;) in connection with the provision of the Caelith compliance support platform.</p>
          <p>Processing shall continue for the duration of the service agreement between the parties, plus any retention period specified herein or required by applicable law.</p>
        </Section>

        <Section title="2. Nature and Purpose of Processing">
          <p><strong>Purpose:</strong> Providing compliance support and documentation services as described in the <Link href="/terms" className="text-[#24364A] underline">Terms of Service</Link>, including investor eligibility evaluation, transfer validation, audit trail generation, regulatory reporting, and AI-assisted compliance querying.</p>
          <p><strong>Nature:</strong> Automated processing including structured data storage, deterministic rule evaluation, hash-chained audit record generation, and AI-powered natural language processing.</p>
        </Section>

        <Section title="3. Types of Personal Data">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Investor identification data (name, email, tax ID, LEI)</li>
            <li>Investor classification data (investor type, KYC status, KYC expiry, accreditation status)</li>
            <li>Financial data (investment amounts, holding positions, transfer history)</li>
            <li>Jurisdiction data (country of residence, applicable regulatory frameworks)</li>
            <li>Compliance decision data (eligibility results, rule evaluations, onboarding status)</li>
            <li>Classification evidence (documents referenced for investor categorisation)</li>
          </ul>
        </Section>

        <Section title="4. Categories of Data Subjects">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Investors in the Controller&rsquo;s funds</li>
            <li>Controller&rsquo;s personnel (Authorised Users of the Platform)</li>
          </ul>
        </Section>

        <Section title="5. Processor Obligations">
          <p>The Processor shall:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>(a)</strong> Process personal data only on documented instructions from the Controller, including with regard to transfers to third countries (unless required by applicable EU or Member State law).</li>
            <li><strong>(b)</strong> Ensure that persons authorised to process personal data have committed to confidentiality or are under an appropriate statutory obligation of confidentiality.</li>
            <li><strong>(c)</strong> Implement appropriate technical and organisational measures pursuant to GDPR Article 32, including: encryption at rest and in transit, database-level tenant isolation via Row-Level Security, role-based access control, rate limiting, audit logging, and PII stripping for AI sub-processor transmissions.</li>
            <li><strong>(d)</strong> Not engage another processor (sub-processor) without prior written authorisation from the Controller. The Processor shall maintain an up-to-date list of sub-processors and provide 30 days&rsquo; advance notice of any intended changes.</li>
            <li><strong>(e)</strong> Assist the Controller in fulfilling its obligation to respond to data subject requests under GDPR Articles 15&ndash;22.</li>
            <li><strong>(f)</strong> Assist the Controller in ensuring compliance with GDPR Articles 32&ndash;36 (security, data protection impact assessment, breach notification, prior consultation).</li>
            <li><strong>(g)</strong> At the choice of the Controller, delete or return all personal data upon termination of the service. The Processor provides a 30-day data export window following termination, after which data is deleted.</li>
            <li><strong>(h)</strong> Make available to the Controller all information necessary to demonstrate compliance with this DPA and allow for and contribute to audits and inspections.</li>
          </ul>
        </Section>

        <Section title="6. Sub-processors">
          <p>The Controller authorises the following sub-processors:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-edge">
              <thead>
                <tr className="bg-accent-950/5">
                  <th className="border border-edge px-3 py-2 text-left font-medium text-accent-950">Sub-processor</th>
                  <th className="border border-edge px-3 py-2 text-left font-medium text-accent-950">Purpose</th>
                  <th className="border border-edge px-3 py-2 text-left font-medium text-accent-950">Location</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-edge px-3 py-2">Database hosting provider</td>
                  <td className="border border-edge px-3 py-2">Structured data storage and retrieval</td>
                  <td className="border border-edge px-3 py-2">EU (Germany)</td>
                </tr>
                <tr>
                  <td className="border border-edge px-3 py-2">Anthropic, Inc.</td>
                  <td className="border border-edge px-3 py-2">AI model processing (Copilot, NL rules). PII stripped before transmission.</td>
                  <td className="border border-edge px-3 py-2">United States</td>
                </tr>
                <tr>
                  <td className="border border-edge px-3 py-2">Application hosting provider</td>
                  <td className="border border-edge px-3 py-2">Application hosting and content delivery</td>
                  <td className="border border-edge px-3 py-2">EU</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>The Controller may object to a new sub-processor within 30 days of notification. If the objection is not resolved, the Controller may terminate the service agreement. The Processor remains fully liable for the acts and omissions of its sub-processors.</p>
        </Section>

        <Section title="7. International Data Transfers">
          <p>Transfers of personal data to Anthropic, Inc. (United States) are conducted under a valid GDPR Chapter V mechanism, which may include the EU-US Data Privacy Framework adequacy decision or Standard Contractual Clauses.</p>
          <p>The Processor implements supplementary measures including PII stripping (removal of investor names, email addresses, tax IDs, LEIs, and other identifiers from AI queries before transmission) to minimise data exposure.</p>
          <p>All other processing occurs within the European Economic Area.</p>
        </Section>

        <Section title="8. Security Measures (Article 32)">
          <p><strong>Technical measures:</strong> Encryption in transit (TLS 1.2+) and at rest, role-based access control with principle of least privilege, database-level Row-Level Security for tenant isolation, rate limiting, input validation and sanitisation, hash-chained audit trail with tamper detection, PII stripping for external API transmissions.</p>
          <p><strong>Organisational measures:</strong> Access limited to personnel who require it, confidentiality obligations for all personnel, security incident response procedures, regular review of security measures.</p>
        </Section>

        <Section title="9. Data Breach Notification">
          <p>The Processor shall notify the Controller without undue delay, and in any event within 72 hours of becoming aware of a personal data breach affecting Controller data (GDPR Article 33).</p>
          <p>Notification shall include: the nature of the breach, categories and approximate number of data subjects affected, likely consequences, and measures taken or proposed to address the breach.</p>
          <p>The Processor shall assist the Controller with notifications to the supervisory authority (Article 33) and data subjects (Article 34) where required.</p>
        </Section>

        <Section title="10. Data Protection Impact Assessment">
          <p>The Processor shall assist the Controller in conducting Data Protection Impact Assessments where required under GDPR Article 35. Processing of investor data through automated eligibility decisions may trigger a DPIA requirement under Article 35(3)(a).</p>
        </Section>

        <Section title="11. Audit Rights">
          <p>The Controller, or an auditor mandated by the Controller, may audit the Processor&rsquo;s compliance with this DPA upon 30 days&rsquo; reasonable notice. The Processor may provide relevant certifications or audit reports in lieu of on-site audits where appropriate.</p>
        </Section>

        <Section title="12. Term and Termination">
          <p>This DPA shall remain in effect for the duration of the service agreement. Upon termination, the Processor shall delete all personal data within 30 days of the expiry of the data export period, unless retention is required by applicable EU or Member State law.</p>
          <p>Obligations relating to confidentiality, liability, and data protection survive termination.</p>
        </Section>

        <div className="mt-12 border-t border-[#c6beb1]/30 pt-6">
          <p className="text-[11px] text-accent-950/25">&copy; {new Date().getFullYear()} Caelith GmbH i.G. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
