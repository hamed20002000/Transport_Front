import { useEffect, type ReactNode } from 'react';

export default function RTL({ children, direction }: { children: ReactNode; direction: string }) {
  useEffect(() => { document.documentElement.dir = direction; }, [direction]);
  return <>{children}</>;
}
