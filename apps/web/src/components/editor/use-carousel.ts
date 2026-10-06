"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyOperations, parseOperations, type Carousel, type CarouselOperation } from "@swiper/schema";

type Batch = { id: string; operations: CarouselOperation[]; version?: number };
type Payload = {
  title?: string; format_id?: string; version: number; undo_count?: number;
  last_mutation_id?: string; carousel: Carousel; message?: string;
};
export type SaveState = "idle" | "saving" | "saved" | "error";

export function useCarousel(carouselId: string) {
  const [doc, setDoc] = useState<Carousel | null>(null);
  const [meta, setMeta] = useState<{ title: string; formatId: string; version: number } | null>(null);
  const [undoCount, setUndoCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const docRef = useRef<Carousel | null>(null);
  const version = useRef(0);
  const batches = useRef<Batch[]>([]);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const historyBusy = useRef(false);
  const blocked = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  const storageKey = `swiper:draft:${carouselId}`;

  const persist = useCallback(() => {
    try {
      if (batches.current.length) localStorage.setItem(storageKey, JSON.stringify(batches.current));
      else localStorage.removeItem(storageKey);
    } catch {
      setSaveError("Browser storage is unavailable. Keep this tab open until your changes finish saving.");
    }
  }, [storageKey]);

  const setDocument = useCallback((next: Carousel) => {
    docRef.current = next;
    setDoc(next);
  }, []);

  const schedule = useCallback((delay = 650) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flushRef.current(); }, delay);
  }, []);

  const flush = useCallback((): Promise<boolean> => {
    if (inFlight.current) return inFlight.current;
    if (blocked.current || historyBusy.current) return Promise.resolve(false);
    const batch = batches.current[0];
    if (!batch) return Promise.resolve(true);
    batch.version ??= version.current;
    persist();
    setSaveState("saving");
    const task = (async () => {
      try {
        const response = await fetch(`/api/v1/carousels/${carouselId}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operations: batch.operations, mutation_id: batch.id, expected_version: batch.version }),
          signal: AbortSignal.timeout(15000),
        });
        const body = await response.json() as Payload;
        if (!response.ok) {
          if (response.status === 409 || response.status === 400 || response.status === 404) {
            blocked.current = true;
            setConflict(true);
          }
          throw new Error(body.message ?? "Could not save. Your edits are kept on this device.");
        }
        batches.current.shift();
        version.current = body.version;
        persist();
        setUndoCount(body.undo_count ?? 0);
        setMeta({ title: body.carousel.metadata.title, formatId: body.carousel.metadata.formatId, version: body.version });
        if (!batches.current.length) setDocument(body.carousel);
        setSaveError(null);
        setSaveState(batches.current.length ? "saving" : "saved");
        return true;
      } catch (error) {
        setSaveState("error");
        setSaveError(error instanceof Error ? error.message : "Could not save. Your edits are kept on this device.");
        return false;
      } finally {
        inFlight.current = null;
        if (batches.current.length && !blocked.current) schedule(3000);
      }
    })();
    inFlight.current = task;
    return task;
  }, [carouselId, persist, schedule, setDocument]);

  useEffect(() => { flushRef.current = flush; }, [flush]);

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/carousels/${carouselId}`);
    const body = await response.json() as Payload;
    if (!response.ok) throw new Error(body.message ?? "Could not open carousel.");
    version.current = body.version;
    let pending: Batch[] = [];
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
      if (Array.isArray(saved)) pending = saved.filter((item): item is Batch =>
        typeof item?.id === "string" && parseOperations(item.operations) !== null &&
        (item.version === undefined || Number.isInteger(item.version)));
    } catch { /* An unavailable storage area does not prevent loading server content. */ }
    if (pending[0]?.id === body.last_mutation_id) pending.shift();
    let restored = body.carousel;
    try {
      for (const batch of pending) restored = applyOperations(restored, batch.operations);
      if (pending[0]?.version !== undefined && pending[0].version !== body.version) {
        throw new Error("version");
      }
    } catch {
      blocked.current = true;
      setConflict(true);
      setSaveState("error");
      setSaveError("This carousel changed elsewhere. Download your local draft before loading the latest version.");
    }
    batches.current = pending;
    persist();
    setDocument(restored);
    setMeta({ title: restored.metadata.title, formatId: restored.metadata.formatId, version: body.version });
    setUndoCount(body.undo_count ?? 0);
    setLoadError(null);
    if (pending.length && !blocked.current) schedule(0);
  }, [carouselId, storageKey, persist, schedule, setDocument]);

  useEffect(() => {
    let active = true;
    // Loading reconciles the server snapshot with the persisted local outbox.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((error: unknown) => {
      if (active) setLoadError(error instanceof Error ? error.message : "Could not open carousel.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; if (timer.current) clearTimeout(timer.current); };
  }, [load]);

  const reload = useCallback(() => {
    setLoading(true);
    load().catch((error: unknown) => setLoadError(String(error))).finally(() => setLoading(false));
  }, [load]);

  const mutate = useCallback((operations: CarouselOperation[], options: { immediate?: boolean } = {}) => {
    if (!docRef.current || historyBusy.current || blocked.current || !operations.length) return;
    try {
      const next = applyOperations(docRef.current, operations);
      setDocument(next);
      setMeta((current) => current ? { ...current, title: next.metadata.title } : current);
      const last = batches.current.at(-1);
      if (last && last.version === undefined) last.operations.push(...operations);
      else batches.current.push({ id: crypto.randomUUID(), operations });
      // Save the expected base version before a refresh can happen.
      if (!inFlight.current && batches.current.length === 1) batches.current[0]!.version = version.current;
      persist();
      setSaveState("saving");
      schedule(options.immediate ? 0 : 650);
    } catch {
      setSaveError("That edit is not valid. A carousel and each slide need at least one element.");
    }
  }, [persist, schedule, setDocument]);

  const settle = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    while (batches.current.length) {
      if (!(await flushRef.current())) return false;
    }
    return !blocked.current && !historyBusy.current;
  }, []);

  const undo = useCallback(async () => {
    if (historyBusy.current || !(await settle())) return;
    historyBusy.current = true;
    setSaveState("saving");
    try {
      const response = await fetch(`/api/v1/carousels/${carouselId}/undo`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expected_version: version.current }),
      });
      const body = await response.json() as Payload;
      if (!response.ok) throw new Error(body.message ?? "Undo failed.");
      version.current = body.version;
      setDocument(body.carousel);
      setMeta({ title: body.carousel.metadata.title, formatId: body.carousel.metadata.formatId, version: body.version });
      setUndoCount(body.undo_count ?? 0);
      setSaveState("saved");
      setSaveError(null);
    } catch (error) {
      setSaveState("error");
      setSaveError(error instanceof Error ? error.message : "Undo failed.");
    } finally { historyBusy.current = false; }
  }, [carouselId, setDocument, settle]);

  const discardLocal = useCallback(() => {
    batches.current = [];
    blocked.current = false;
    setConflict(false);
    persist();
    setSaveError(null);
    reload();
  }, [persist, reload]);

  useEffect(() => {
    const retry = () => { void flushRef.current(); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, []);

  return { doc, meta, undoCount, loading, loadError, saveState, saveError, setSaveError,
    reload, mutate, undo, settle, conflict, discardLocal, retry: flush };
}
