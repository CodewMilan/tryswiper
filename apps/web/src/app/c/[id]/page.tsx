import { Editor } from "@/components/editor";
import {
  LOCAL_GENERATION_NOTICE,
  REFERENCE_FALLBACK_NOTICE,
  THIN_BRAND_NOTICE,
} from "@/lib/generation-notices";

export default async function CarouselPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reference?: string; generation?: string; brand?: string }>;
}) {
  const { id } = await params;
  const { reference, generation, brand } = await searchParams;
  const initialNotice = [
    reference === "unavailable" ? REFERENCE_FALLBACK_NOTICE : null,
    generation === "local" ? LOCAL_GENERATION_NOTICE : null,
    brand === "thin" ? THIN_BRAND_NOTICE : null,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className="hero-grid min-h-full">
      <Editor carouselId={id} initialNotice={initialNotice || undefined} />
    </div>
  );
}
