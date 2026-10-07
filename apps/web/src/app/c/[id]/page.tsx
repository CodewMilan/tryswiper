import { Editor } from "@/components/editor";
import { REFERENCE_FALLBACK_NOTICE } from "@/lib/generation-notices";

export default async function CarouselPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reference?: string }>;
}) {
  const { id } = await params;
  const { reference } = await searchParams;
  return (
    <div className="hero-grid min-h-full">
      <Editor carouselId={id} initialNotice={reference === "unavailable" ? REFERENCE_FALLBACK_NOTICE : undefined} />
    </div>
  );
}
