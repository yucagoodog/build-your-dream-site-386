import { AppShell } from "@/components/AppShell";
import { PlayCircle } from "lucide-react";

const ReviewPage = () => {
  return (
    <AppShell title="Review">
      <div className="flex flex-col items-center justify-center pt-32 text-center px-4">
        <PlayCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground text-sm">No completed videos</p>
        <p className="text-muted-foreground/70 text-xs mt-1">Finished generations will appear here for review</p>
      </div>
    </AppShell>
  );
};

export default ReviewPage;
