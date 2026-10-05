"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyOperations, type Carousel, type CarouselOperation } from "@swiper/schema";

export type SaveState = "idle" | "saving" | "saved" | "error";

type Meta = { title: string; formatId: string; version: number };

type Payload = {
  title: string;
  format_id: string;
  version: number;
  undo_count?: number;
  carousel: Carousel;
  message?: string;
};

const DEBOUNCE_MS = 700;
const RETRY_MS = 3000;

export function useCarousel(carouselId: string) {
  const [doc, setDoc] = useState<Carousel | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const docRef = useRef<Carousel | null>(null);
  const queue = useRef<CarouselOperation[]>([]);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<(keepalive?: boolean) => Promise<void>>(async () => {});

  const setDocument = useCallback((next: Carousel) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const schedule = useCallback((delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flushRef.current();
    }, delay);
  }, []);

  const flush = useCallback(
    async (keepalive = false) => {
      if (inFlight.current || queue.current.length === 0) return;
      const batch = queue.current;
      queue.current = [];
      inFlight.current = true;
      setSaveState("saving");
      try {
        const response = await fetch(`/api/v1/carousels/${carouselId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: batch }),
          keepalive,
        });
        const body = (await response.json()) as Payload;
        if (!response.ok) throw new Error(body.message ?? "Save failed.");
        setUndoCount(body.undo_count ?? 0);
        setMeta((current) => (current ? { ...current, version: body.version } : current));
        // Only trust the server copy when no newer local edit is waiting.
        if (queue.current.length === 0 && body.carousel) setDocument(body.carousel);
        setSaveState("saved");
        setSaveError(null);
      } catch (error) {
        queue.current = [...batch, ...queue.current];
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Save failed.");
      } finally {
        inFlight.current = false;
        if (queue.current.length > 0) schedule(RETRY_MS);
      }
    },
    [carouselId, schedule, setDocument],
  );

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const fetchCarousel = useCallback(async () => {
    const response = await fetch(`/api/v1/carousels/${carouselId}`);
    const body = (await response.json()) as Payload;
    if (!response.ok) throw new Error(body.message ?? "Could not open carousel.");
    return body;
  }, [carouselId]);

  const applyPayload = useCallback(
    (body: Payload) => {
      setDocument(body.carousel);
      setMeta({ title: body.title, formatId: body.format_id, version: body.version });
      setUndoCount(body.undo_count ?? 0);
      setLoadError(null);
    },
    [setDocument],
  );

  useEffect(() => {
    let active = true;
    fetchCarousel()
      .then((body) => {
        if (active) applyPayload(body);
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(error instanceof Error ? error.message : "Could not open carousel.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchCarousel, applyPayload]);

  const reload = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchCarousel()
      .then(applyPayload)
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Could not open carousel.");
      })
      .finally(() => setLoading(false));
  }, [applyPayload, fetchCarousel]);

  /** Applies operations to the local document, then saves them as one batch. */
  const mutate = useCallback(
    (operations: CarouselOperation[], options: { immediate?: boolean } = {}) => {
      const current = docRef.current;
      if (!current || operations.length === 0) return;
      try {
        setDocument(applyOperations(current, operations));
      } catch {
        setSaveState("error");
        setSaveError("That edit would leave the slide empty.");
        return;
      }
      queue.current.push(...operations);
      schedule(options.immediate ? 0 : DEBOUNCE_MS);
    },
    [schedule, setDocument],
  );

  const settle = useCallback(async () => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (!inFlight.current && queue.current.length === 0) return true;
      if (inFlight.current) await new Promise((resolve) => setTimeout(resolve, 50));
      else await flushRef.current();
    }
    return false;
  }, []);

  const undo = useCallback(async () => {
    if (!(await settle())) return;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/v1/carousels/${carouselId}/undo`, { method: "POST" });
      const body = (await response.json()) as Payload;
      if (!response.ok) throw new Error(body.message ?? "Undo failed.");
      setDocument(body.carousel);
      setUndoCount(body.undo_count ?? 0);
      setMeta((current) => (current ? { ...current, version: body.version } : current));
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Undo failed.");
    }
  }, [carouselId, setDocument, settle]);

  // Nothing in the queue may die with the tab.
  useEffect(() => {
    function onHide() {
      if (queue.current.length > 0) void flushRef.current(true);
    }
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (queue.current.length === 0 && !inFlight.current) return;
      void flushRef.current(true);
      event.preventDefault();
    }
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timer.current) clearTimeout(timer.current);
      if (queue.current.length > 0) void flushRef.current(true);
    };
  }, []);

  return {
    doc,
    meta,
    undoCount,
    loading,
    loadError,
    saveState,
    saveError,
    setSaveError,
    reload,
    mutate,
    undo,
  };
}
