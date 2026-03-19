// SessionContext — holds the authenticated user's uid + username.
// Set once in App.tsx after login; consumed by any screen without prop-drilling.

import { createContext, useContext } from 'react';

export interface SessionData {
  uid: string;
  username: string;
  logout: () => void;
}

export const SessionContext = createContext<SessionData>({ uid: '', username: '', logout: () => {} });

export function useSession(): SessionData {
  return useContext(SessionContext);
}
