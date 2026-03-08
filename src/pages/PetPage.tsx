import { AppShell } from "@/components/AppShell";
import { CompanionHub } from "@/components/companion/CompanionHub";

const PetPage = () => {
  return (
    <AppShell title="Companion" hideNav>
      <CompanionHub />
    </AppShell>
  );
};

export default PetPage;
