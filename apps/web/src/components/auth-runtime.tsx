"use client";

import { createContext, useContext, type ReactNode } from "react";

const AuthRuntime = createContext(false);

export function AuthRuntimeProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  return <AuthRuntime.Provider value={enabled}>{children}</AuthRuntime.Provider>;
}

export function useAuthRuntime() { return useContext(AuthRuntime); }
