"use client";

import { createContext, useContext, type ReactNode } from "react";

const AuthRuntime = createContext(false);
const FixtureAccount = createContext<string | null>(null);

export function AuthRuntimeProvider({ enabled, fixtureAccount = null, children }: { enabled: boolean; fixtureAccount?: string | null; children: ReactNode }) {
  return <AuthRuntime.Provider value={enabled}><FixtureAccount.Provider value={fixtureAccount}>{children}</FixtureAccount.Provider></AuthRuntime.Provider>;
}

export function useAuthRuntime() { return useContext(AuthRuntime); }
export function useFixtureAccount() { return useContext(FixtureAccount); }
