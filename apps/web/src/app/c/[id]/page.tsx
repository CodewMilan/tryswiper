import { Editor } from "@/components/editor";

export default async function CarouselPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Editor carouselId={id} />;
}
