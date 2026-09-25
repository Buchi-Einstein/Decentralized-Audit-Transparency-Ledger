import Nav from "@/components/Nav";
import ComplianceClient from "./ComplianceClient";

export const metadata = {
  title: "Compliance & Regulatory Reporting — AuditLedger",
  description: "Automated regulatory reporting for SOX, GDPR, MiCA, and data retention policies.",
};

export default function CompliancePage() {
  return (
    <>
      <Nav />
      <main id="main-content" className="container" style={{ padding: "32px 24px" }}>
        <ComplianceClient />
      </main>
    </>
  );
}
