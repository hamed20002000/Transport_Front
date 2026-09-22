import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { decodeJwtToken } from "src/features/ai-agent/helpers/token";

// یک اتصال مشترک برای کل برنامه -- به‌جای اینکه هر صفحه یک اتصال جدا
// بسازه (که برای ۵۰ صفحه یعنی ۵۰ تا کانکشن جدا، اتلاف منابع)، همه‌ی
// صفحات از همین یک نمونه استفاده می‌کنن
let sharedSocket: Socket | null = null;

function getSharedSocket(): Socket {
     const authToken = localStorage.getItem('authToken');
        const decoded = authToken ? decodeJwtToken(authToken) : null;
        const userId = decoded?.userid;
    if (!sharedSocket) {
        sharedSocket = io("http://localhost:3001/agent", {
            path: "/socket.io",
            transports: ["websocket", "polling"],
              query: {
                userId: userId
            }
        });
    }
    return sharedSocket;
}

/**
 * هر صفحه‌ی لیست (از ۵۰+ صفحه‌ای که داری) فقط با یک خط از این hook
 * استفاده می‌کنه -- مثال:
 *
 *   useDomainRefresh("tenders", fetchTendersList);
 *
 * دیگه نیازی نیست هر صفحه خودش کد اتصال/subscribe/cleanup رو تکرار کنه.
 */
export function useDomainRefresh(domain: string, onRefresh: () => void) {
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    useEffect(() => {
        const socket = getSharedSocket();

        const subscribe = () => {
            socket.emit("subscribe-domain", { domain });
        };

        const handleDomainChanged = () => {
            onRefreshRef.current();
        };

        if (!socket.connected) {
            socket.connect();
        } else {
            subscribe();
        }
        socket.on("connect", subscribe);
        // نکته: چون Socket.io خودش پیام رو فقط به اعضای همون room
        // می‌فرسته (که سمت سرور مدیریت می‌شه)، حتی با یک اتصال مشترک،
        // این handler فقط برای domain هایی که این صفحه‌ی خاص عضوشه فایر می‌شه
        socket.on("domain-changed", handleDomainChanged);

        return () => {
            socket.emit("unsubscribe-domain", { domain });
            socket.off("connect", subscribe);
            socket.off("domain-changed", handleDomainChanged);
        };
    }, [domain]);
}
