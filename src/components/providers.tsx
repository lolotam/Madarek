"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { MotionConfig } from "framer-motion";
export type User = {
  id: string;
  name: string;
  role: "parent" | "student" | "admin";
  username?: string;
  parentId?: string | null;
  grade?: number | null;
  gender?: "male" | "female" | null;
};
export async function api(path: string, data?: unknown) {
  const res = await fetch("/api/" + path, {
    method: data === undefined ? "GET" : "POST",
    headers:
      data === undefined ? undefined : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "تعذّر الاتصال. حاولي مجددًا.");
  return body;
}
const Session = createContext<{
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
}>({ user: null, loading: true, refresh: async () => {} });
export const useSession = () => useContext(Session);
export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const refresh = async () => {
    try {
      const data = await api("session");
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, []);
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.25 }}>
      <Session.Provider value={{ user, loading, refresh }}>
        {children}
      </Session.Provider>
    </MotionConfig>
  );
}
