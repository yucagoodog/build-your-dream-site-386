import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { usePet, calcDecayedStats, getMood, getLevelProgress } from "@/hooks/use-pet";
import { PetCreation } from "@/components/pet/PetCreation";
import { PetDashboard } from "@/components/pet/PetDashboard";

const PetPage = () => {
  const petHook = usePet();

  if (petHook.petLoading) {
    return (
      <AppShell title="Pet">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  if (!petHook.pet) {
    return (
      <AppShell title="Pet">
        <PetCreation onCreate={petHook.createPet} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Pet">
      <PetDashboard {...petHook} />
    </AppShell>
  );
};

export default PetPage;
