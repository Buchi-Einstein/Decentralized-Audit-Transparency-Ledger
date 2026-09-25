import Nav from "@/components/Nav";
import DeveloperPortalClient from "./DeveloperPortalClient";

export const metadata = {
  title: "Developer Portal — AuditLedger",
  description: "Interactive documentation, API explorer, code playground, and SDK guides for AuditLedger.",
};

export default function DeveloperPortalPage() {
  return (
    <>
      <Nav />
      <main id="main-content" className="container" style={{ padding: "32px 24px" }}>
        <DeveloperPortalClient />
      </main>
    </>
  );
}
