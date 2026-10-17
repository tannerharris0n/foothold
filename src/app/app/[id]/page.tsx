import { Dashboard } from "@/components/Dashboard";

export const dynamic = "force-dynamic";

export default async function AppPage({ params }: PageProps<"/app/[id]">) {
  const { id } = await params;
  return <Dashboard productId={id} />;
}
