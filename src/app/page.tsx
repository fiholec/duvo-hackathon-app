import { StoreProvider } from "@/lib/store";
import { SapShell } from "@/components/SapShell";

export default function Home() {
  return (
    <StoreProvider>
      <SapShell />
    </StoreProvider>
  );
}
