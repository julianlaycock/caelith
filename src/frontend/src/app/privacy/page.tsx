import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy | Caelith',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold text-accent-950">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-accent-950/70">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F5F2EA]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/login" className="mb-8 inline-flex items-center gap-1.5 text-xs text-accent-950/40 hover:text-accent-950 transition-colors">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Back
        </Link>

        <h1 className="mb-2 text-2xl font-bold text-accent-950">Privacy Policy</h1>
        <p className="mb-10 text-xs text-accent-950/40">Effective date: February 18, 2026 &middot; Last updated: February 18, 2026</p>

        <Section title="1. Controller Identity">
          <p>Caelith (Julian Laycock, Einzelunternehmer), Berlin, Germany is the data controller for account data and usage data processed through the Platform.</p>
          <p>For investor data uploaded by Clients, the Client is the data controller and Caelith acts as a data processor under GDPR Article 28. Processing is governed by the <Link href="/dpa" className="text-[#24364A] underline">Data Processing Agreement</Link>.</p>
          <p>Contact: <a href="mailto:privacy@caelith.tech" className="text-[#24364A] underline">privacy@caelith.tech</a></p>
        </Section>

        <Section title="2. Categories of Personal Data">
          <p><strong>Client account data:</strong> Name, email address, company name, role, hashed login credentials, IP addresses, and session data.</p>
          <p><strong>Investor data (uploaded by Clients):</strong> Investor name, jurisdiction, investor type and classification, KYC status, KYC expiry date, tax ID, LEI, email address, investment amounts, holding positions, and classification evidence documents.</p>
          <p><strong>Usage data:</strong> Pages visited, features used, Compliance Copilot queries and responses, timestamps, and browser/device information.</p>
          <p><strong>Audit trail data:</strong> All actions performed in the Platform, linked to user accounts, including compliance decisions and rule evaluations.</p>
        </Section>

        <Section title="3. Purposes and Legal Bases">
          <p><strong>Providing the Platform</strong> (GDPR Art. 6(1)(b) &mdash; contractual necessity): Processing account data and Client Data to deliver the compliance support service.</p>
          <p><strong>Processing investor data</strong> (GDPR Art. 6(1)(b) &mdash; contractual necessity as processor): Processing investor data on behalf of Clients under the Data Processing Agreement. The legal basis for the underlying processing is the Client&rsquo;s responsibility.</p>
          <p><strong>Platform security</strong> (GDPR Art. 6(1)(f) &mdash; legitimate interest): Processing login attempts, IP addresses, and session data for fraud prevention and security monitoring.</p>
          <p><strong>AI feature delivery</strong> (GDPR Art. 6(1)(b) &mdash; contractual necessity): Processing Compliance Copilot queries through third-party AI providers to deliver AI-powered features. Personal identifiers are stripped from queries before transmission.</p>
          <p><strong>Legal obligations</strong> (GDPR Art. 6(1)(c)): Processing required by applicable tax, accounting, or anti-money laundering law.</p>
        </Section>

        <Section title="4. Data Retention">
          <p><strong>Client account data:</strong> Duration of the contractual relationship plus 30 days for data export, then deletion.</p>
          <p><strong>Investor data:</strong> Duration of the Client&rsquo;s subscription plus 30 days, then deletion. Clients may request earlier deletion.</p>
          <p><strong>Audit trail data:</strong> 5 years minimum per AIFMD record-keeping requirements (Art. 66, Commission Delegated Regulation 231/2013), unless the Client requests deletion and confirms alternative records exist.</p>
          <p><strong>Usage data:</strong> 12 months from collection, then anonymised.</p>
          <p><strong>Copilot query logs:</strong> 12 months, then anonymised.</p>
        </Section>

        <Section title="5. Data Recipients and Sub-processors">
          <p>Caelith uses the following sub-processors:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Database hosting provider</strong> (EU region) &mdash; Structured data storage</li>
            <li><strong>Anthropic, Inc.</strong> (United States) &mdash; AI model processing for Compliance Copilot and natural language rule features. Personal identifiers are stripped before transmission.</li>
            <li><strong>Hosting provider</strong> (EU region) &mdash; Application hosting and delivery</li>
          </ul>
          <p>A complete sub-processor list is maintained and available upon request. No Client Data is shared with other Caelith clients. Multi-tenant isolation is enforced at the database level.</p>
        </Section>

        <Section title="6. International Data Transfers">
          <p>Compliance Copilot queries are processed by Anthropic, Inc., a US-based AI service provider. Personal identifiers are stripped from queries before transmission to minimise data exposure.</p>
          <p>Transfers to the United States are conducted under a valid GDPR Chapter V mechanism, which may include the EU-US Data Privacy Framework adequacy decision or Standard Contractual Clauses (Commission Implementing Decision 2021/914).</p>
          <p>All other data processing occurs within the European Economic Area.</p>
        </Section>

        <Section title="7. Data Subject Rights">
          <p>Under GDPR, you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Access</strong> (Art. 15) &mdash; Request a copy of your personal data</li>
            <li><strong>Rectification</strong> (Art. 16) &mdash; Correct inaccurate personal data</li>
            <li><strong>Erasure</strong> (Art. 17) &mdash; Request deletion of your personal data</li>
            <li><strong>Restriction</strong> (Art. 18) &mdash; Restrict processing of your personal data</li>
            <li><strong>Data portability</strong> (Art. 20) &mdash; Receive your data in a structured, machine-readable format</li>
            <li><strong>Object</strong> (Art. 21) &mdash; Object to processing based on legitimate interests</li>
          </ul>
          <p>For investor data: Caelith processes this as a data processor. Data subjects should direct requests to the relevant Client (the data controller). Caelith will assist the Client in fulfilling such requests.</p>
          <p>To exercise your rights, contact <a href="mailto:privacy@caelith.tech" className="text-[#24364A] underline">privacy@caelith.tech</a>. We will respond within 30 days.</p>
          <p>You have the right to lodge a complaint with your supervisory authority (BfDI for Germany, CNPD for Luxembourg).</p>
        </Section>

        <Section title="8. Cookies and Local Storage">
          <p>Caelith uses browser localStorage for session preferences (remember-me, UI settings, Copilot acknowledgment). These are strictly necessary for Platform functionality and exempt from consent requirements under the ePrivacy Directive.</p>
          <p>No third-party tracking cookies are used. If analytics tools are introduced in the future, consent will be obtained before deployment.</p>
        </Section>

        <Section title="9. Security Measures">
          <p>Caelith implements technical and organisational measures including: encryption at rest and in transit (TLS 1.2+), role-based access control, database-level tenant isolation via Row-Level Security, rate limiting, input validation, and audit logging of all data access.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>Material changes will be communicated via email and in-platform notification with 30 days&rsquo; advance notice. Non-material changes take effect upon publication.</p>
        </Section>

        <div className="mt-12 border-t border-[#c6beb1]/30 pt-6">
          <p className="text-[11px] text-accent-950/25">&copy; {new Date().getFullYear()} Caelith GmbH i.G. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
