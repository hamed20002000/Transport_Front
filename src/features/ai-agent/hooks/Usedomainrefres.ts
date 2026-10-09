import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import endpoints from "src/core/config/endpoints.json";
import { decodeJwtToken } from "src/features/ai-agent/helpers/token";

// هر backend یک اتصال مشترک برای کل برنامه -- به‌جای اینکه هر صفحه یک اتصال جدا
// بسازه (که برای ۵۰ صفحه یعنی ۵۰ تا کانکشن جدا، اتلاف منابع)، همه‌ی
// صفحات از همین یک نمونه استفاده می‌کنن
//  - admin: صفحه‌های پنل مدیریت (همان socketurl پنل agent ادمین)
//  - account: پنل شرکت/راننده (transport_backend، همان سرور baseurl). AgentGateway کاربر را
//    فقط از روی JWT می‌شناسد و بدون token اتصال را می‌بندد.
export type DomainRefreshBackend = "admin" | "account";

const sockets: Partial<Record<DomainRefreshBackend, Socket>> = {};

function getSharedSocket(backend: DomainRefreshBackend): Socket {
    const existing = sockets[backend];
    if (existing) return existing;

    const socket = backend === "account"
        ? io(`${new URL(endpoints.baseurl).origin}/agent`, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            // هر بار اتصال (یا اتصال دوباره) token فعلی خوانده می‌شود.
            auth: (cb) => cb({ token: localStorage.getItem("authToken") ?? "" }),
        })
        : io(`${endpoints.socketurl}/agent`, {
            path: "/socket.io",
            transports: ["websocket", "polling"],
            query: {
                userId: decodeJwtToken(localStorage.getItem("authToken") ?? "")?.userid
            }
        });
    sockets[backend] = socket;
    return socket;
}

/**
 * هر صفحه‌ی لیست فقط با یک خط از این hook استفاده می‌کنه -- مثال:
 *
 *   useDomainRefresh("tenders", fetchTendersList);
 *   useDomainRefresh(["company_my_cargo", "company_create_cargo"], reload, "account");
 *
 * دیگه نیازی نیست هر صفحه خودش کد اتصال/subscribe/cleanup رو تکرار کنه.
 */
export function useDomainRefresh(domain: string | string[], onRefresh: () => void, backend: DomainRefreshBackend = "admin") {
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;
    const key = Array.isArray(domain) ? domain.join("|") : domain;

    useEffect(() => {
        const domains = key.split("|");
        const socket = getSharedSocket(backend);

        const subscribe = () => {
            domains.forEach((name) => socket.emit("subscribe-domain", { domain: name }));
        };

        // اتصال مشترک است، پس رویداد domain صفحه‌های دیگر هم به این handler می‌رسد.
        const handleDomainChanged = (data?: { domain?: string }) => {
            if (data?.domain && !domains.includes(data.domain)) return;
            onRefreshRef.current();
        };

        if (!socket.connected) {
            socket.connect();
        } else {
            subscribe();
        }
        socket.on("connect", subscribe);
        socket.on("domain-changed", handleDomainChanged);

        return () => {
            domains.forEach((name) => socket.emit("unsubscribe-domain", { domain: name }));
            socket.off("connect", subscribe);
            socket.off("domain-changed", handleDomainChanged);
        };
    }, [key, backend]);
}
