import { listFormats } from "@swiper/schema";
import { json } from "@/lib/http";

export async function GET() {
  return json({ formats: listFormats() });
}
