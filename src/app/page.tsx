import { redirect } from "next/navigation";

// The workflow starts at the SAP order-entry screen.
export default function Home() {
  redirect("/order-entry");
}
