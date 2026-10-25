import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "src/features/ai-agent/pages/AiAgentPage.css";
import { AlertType } from "src/shared/components/Alert/alert.type.ts";
import { useNavigate } from "react-router";
import { Dialog, LinearProgress } from 'src/shared/components/compat';
import { StopCircleSharp as BoltIcon } from 'src/shared/components/compat/icons';
import { Mic } from 'src/shared/components/compat/icons';
import { Stop as StopIcon } from 'src/shared/components/compat/icons';
import { Cancel as CancelIcon } from 'src/shared/components/compat/icons';
import { TrendingFlat as ArrowRight } from 'src/shared/components/compat/icons';
import { ArrowUpwardOutlined as Arrow } from 'src/shared/components/compat/icons';
import { uniqueId } from "lodash";
import { ArrowRight as BackGlyph, ChevronUp as RestoreGlyph, Maximize2 as MaximizeGlyph, Minimize2 as UnmaximizeGlyph, Minus as MinimizeGlyph, X as CloseGlyph } from "lucide-react";
import { FunctionCallResultType, JwtPayload, SelectedFileType, SessionsItemType, SpecialPromptEnum } from "src/features/ai-agent/types/index.ts";
import { agentApi, type AgentBackend } from "src/features/ai-agent/services/agentApi";
import { useSpeechToText } from "src/features/ai-agent/hooks/useSpeechToText";
import { io, Socket } from "socket.io-client";
import resultViewLink from 'src/features/ai-agent/localfiles/resultViewLink.json'
import AgentCargoList from 'src/features/ai-agent/components/AgentCargoList';
import AgentChannelList from 'src/features/ai-agent/components/AgentChannelList';
import AgentDriverLoadList from 'src/features/ai-agent/components/AgentDriverLoadList';
import { hasAgentCards, isChannel, isDriverLoad } from 'src/features/ai-agent/helpers/agentCards';
import TenderChoice from "src/features/ai-agent/components/tenderChoice";
import HistoryItem from "src/features/ai-agent/components/historyItem";
import DeleteConfirm from "src/features/ai-agent/components/deleteConfirm";
import SelectionConfirm from "src/features/ai-agent/components/selectionConfirm";
import NetworkChoice from "src/features/ai-agent/components/networkChoice";



const conversations = [
    "مدیریت نقش‌ها",
    "مدیریت کاربران",
    "دسترسی‌ها",
];

const MINIMIZED_PANEL_WIDTH = 380;
// the normal panel: a comfortable chat size (history column + workspace)
const NORMAL_PANEL_MAX_WIDTH = 840;
const NORMAL_PANEL_MAX_HEIGHT = 640;
// the maximized panel is never larger than this, even on a big screen
const MAXIMIZED_PANEL_MAX_WIDTH = 1040;
const MAXIMIZED_PANEL_MAX_HEIGHT = 760;
// on a small screen either panel keeps this gap to the window edges
const SCREEN_MARGIN = 24;
// how far the maximized panel's bar must be dragged before it lets go of the full screen
const RESTORE_DRAG_THRESHOLD = 6;
// the window bar's height (CSS .agent-dialog-header) and the gap the dragged panel keeps from the screen edge
const HEADER_HEIGHT = 52;
const DRAG_MARGIN = 8;
// below this width the panel is docked by CSS (AiAgentPage.css "MOBILE PANEL") and is not dragged
const MOBILE_PANEL_QUERY = '(max-width: 800px)';

type PanelState = 'normal' | 'minimized' | 'maximized';

/**
 * Where the desktop panel sits in a state: its top-left corner and size in pixels (height null = fits its
 * content). Every state is placed the same way (one translate + width/height), so switching between them moves
 * the corner in a straight line while the size changes; nothing pulls the other way and the panel never bounces.
 * offset: the normal panel's distance from the centre, or the minimized panel's own corner.
 */
function panelBox(state: PanelState, offset: { x: number; y: number }) {
    const { innerWidth: vw, innerHeight: vh } = window;
    if (state === 'minimized') return { x: offset.x, y: offset.y, width: MINIMIZED_PANEL_WIDTH, height: null as number | null };
    const maximized = state === 'maximized';
    const width = Math.min(vw - 2 * SCREEN_MARGIN, maximized ? MAXIMIZED_PANEL_MAX_WIDTH : NORMAL_PANEL_MAX_WIDTH);
    const height = Math.min(vh - 2 * SCREEN_MARGIN, maximized ? MAXIMIZED_PANEL_MAX_HEIGHT : NORMAL_PANEL_MAX_HEIGHT);
    // the maximized panel is centred; the normal one sits where it was dragged
    const shift = maximized ? { x: 0, y: 0 } : offset;
    return { x: (vw - width) / 2 + shift.x, y: (vh - height) / 2 + shift.y, width, height };
}

type AiAgentPageProps = {
    onClose?: () => void;
    /** Which backend the panel uses; see agentApi. The admin layout keeps the default. */
    backend?: AgentBackend;
};

function AiAgentPage({ onClose, backend = 'admin' }: AiAgentPageProps) {

    //#region-------------------- Constants---------------
    const navigate = useNavigate();
    const api = useMemo(() => agentApi(backend), [backend]);
    // The recorder calls the latest handleVoice (defined below with the progress helpers).
    const handleVoiceRef = useRef<(audio: Blob) => Promise<void>>(async () => undefined);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        start,
        stop,
        cancel,
        isListening,
    } = useSpeechToText(
        (audio: Blob) => handleVoiceRef.current(audio),
        (message: string) => setAlert({ alertMessage: message, severity: "error", onClose: () => setAlert((current) => ({ ...current, alertMessage: "" })) }),
    );
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const userefSocket = useRef<Socket>();
    const abortingref = useRef(false);
    //#endregion----------------- Constants---------------


    //#region-------------------- States---------------

    const [selectedFile, setSelectedFile] = useState<SelectedFileType[]>([]);
    const [showWorkspace, setShowWorkspace] = useState(false);
    // Mobile only: the history list opens over the chat instead of sitting beside it.
    const [showHistory, setShowHistory] = useState(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [voiceInput, setVoiceInput] = useState('');
    const [alert, setAlert] = useState<AlertType>({
        alertMessage: "",
        severity: "info",
        onClose: () => { }
    })
    const [history, setHistory] = useState<FunctionCallResultType[]>([])
    const [progress, setProgress] = useState<{
        currentOp?: string;
        percent: number;
    }>({
        currentOp: undefined,
        percent: 0,
    })
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [sessionHasPrompts, setSessionHasPrompts] = useState(false);
    const [sessionList, setSessionList] = useState<SessionsItemType[]>([])
    const [searchText, setSearchText] = useState('');
    const [specialPrompt, setSpecialPrompt] = useState<SpecialPromptEnum | null>(null)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);
    const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [minimizedPosition, setMinimizedPosition] = useState(() => ({
        top: 20,
        left: typeof window !== 'undefined'
            ? Math.max(window.innerWidth - MINIMIZED_PANEL_WIDTH - 20, 20)
            : 20,
    }));
    const debounceRef = useRef<number | null>(null);
    const shellRef = useRef<HTMLDivElement | null>(null);
    // phones get the docked panel from CSS; the desktop panel is placed by panelBox
    const [isDesktop, setIsDesktop] = useState(() => typeof window === 'undefined' || !window.matchMedia(MOBILE_PANEL_QUERY).matches);
    useEffect(() => {
        const query = window.matchMedia(MOBILE_PANEL_QUERY);
        const onChange = () => setIsDesktop(!query.matches);
        query.addEventListener('change', onChange);
        return () => query.removeEventListener('change', onChange);
    }, []);
    // Measure the compact content so the panel can animate to a numeric height, including new answers.
    useLayoutEffect(() => {
        if (!isMinimized) return;
        const shell = shellRef.current;
        const content = shell?.querySelector<HTMLElement>('.minimized-view');
        if (!shell || !content) return;
        const measure = () => {
            // offsetHeight: the laid-out height, not shrunk by an animation's scale. The content's height is its own
            // (CSS height: auto), never the panel's, or a measurement would feed itself and only ever shrink.
            const header = shell.querySelector<HTMLElement>('.agent-dialog-header')?.offsetHeight ?? HEADER_HEIGHT;
            shell.style.setProperty('--compact-panel-height', `${content.offsetHeight + header}px`);
        };
        measure();
        const observer = new ResizeObserver(measure);
        observer.observe(content);
        return () => observer.disconnect();
    }, [isMinimized]);

    // Scrolls inside the panel never reach the page: when nothing under the pointer can scroll further
    // that way (or it starts on the header), the event is cancelled instead of scrolling the page behind.
    useEffect(() => {
        const shell = shellRef.current;
        if (!shell) return;
        const canScroll = (target: EventTarget | null, deltaY: number) => {
            for (let el = target as HTMLElement | null; el && el !== shell; el = el.parentElement) {
                if (!/(auto|scroll)/.test(getComputedStyle(el).overflowY) || el.scrollHeight <= el.clientHeight) continue;
                if (deltaY < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
            }
            return false;
        };
        const onWheel = (event: WheelEvent) => {
            // Sideways scrolls (wide tables) are left to the browser.
            if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            if (!canScroll(event.target, event.deltaY)) event.preventDefault();
        };
        let lastTouch = { x: 0, y: 0 };
        const onTouchStart = (event: TouchEvent) => {
            lastTouch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
        };
        const onTouchMove = (event: TouchEvent) => {
            const touch = event.touches[0];
            const deltaX = lastTouch.x - touch.clientX;
            const deltaY = lastTouch.y - touch.clientY;
            lastTouch = { x: touch.clientX, y: touch.clientY };
            if (event.touches.length > 1 || Math.abs(deltaX) > Math.abs(deltaY)) return;
            if (event.cancelable && !canScroll(event.target, deltaY)) event.preventDefault();
        };
        shell.addEventListener('wheel', onWheel, { passive: false });
        shell.addEventListener('touchstart', onTouchStart, { passive: true });
        shell.addEventListener('touchmove', onTouchMove, { passive: false });
        return () => {
            shell.removeEventListener('wheel', onWheel);
            shell.removeEventListener('touchstart', onTouchStart);
            shell.removeEventListener('touchmove', onTouchMove);
        };
    }, []);

    const progressStagesRef = useRef<string[]>([]);
    const progressResetTimerRef = useRef<number | null>(null);
    const pendingSessionRef = useRef<Promise<string> | null>(null);

    // گفتگو هنگام باز شدن پنل ساخته می‌شود؛ اگر هنوز آماده نشده یا ساختنش خطا داده بود،
    // ارسال متن/صدا همین‌جا منتظر آن می‌ماند یا دوباره می‌سازدش (سرور گفتگوی خالی را دوباره می‌دهد).
    const ensureSession = useCallback(async (current: string | null): Promise<string> => {
        if (current) return current;
        pendingSessionRef.current ??= api.newSession().finally(() => { pendingSessionRef.current = null; });
        const sessionId = await pendingSessionRef.current;
        setCurrentSessionId(sessionId);
        return sessionId;
    }, [api]);

    const clearProgressResetTimer = useCallback(() => {
        if (progressResetTimerRef.current !== null) {
            window.clearTimeout(progressResetTimerRef.current);
            progressResetTimerRef.current = null;
        }
    }, []);

    const resetProgress = useCallback(() => {
        clearProgressResetTimer();
        progressStagesRef.current = [];
        setProgress({
            currentOp: undefined,
            percent: 0,
        });
    }, [clearProgressResetTimer]);

    const startProgressRun = useCallback(() => {
        clearProgressResetTimer();
        progressStagesRef.current = [];
        setProgress({
            currentOp: undefined,
            percent: 8,
        });
    }, [clearProgressResetTimer]);

    const updateProgressStage = useCallback((currentOp?: string) => {
        if (!currentOp || !currentOp.trim()) {
            return;
        }

        clearProgressResetTimer();

        const normalizedStage = currentOp.trim().toLowerCase();
        let stageIndex = progressStagesRef.current.indexOf(normalizedStage);

        if (stageIndex === -1) {
            progressStagesRef.current.push(normalizedStage);
            stageIndex = progressStagesRef.current.length - 1;
        }

        const nextPercent = Math.min(90, 12 + (stageIndex * 16));

        setProgress((prev) => ({
            currentOp,
            percent: Math.max(prev.percent, nextPercent),
        }));
    }, [clearProgressResetTimer]);

    const finishProgressRun = useCallback((label?: string) => {
        clearProgressResetTimer();
        setProgress((prev) => ({
            currentOp: label ?? prev.currentOp,
            percent: 100,
        }));

        progressResetTimerRef.current = window.setTimeout(() => {
            resetProgress();
        }, 450);
    }, [clearProgressResetTimer, resetProgress]);

    //#endregion----------------- States ---------------


    //#region-------------------- Handlers ---------------

    const handleFileChange = async (event: any) => {
        const file = event.target.files?.[0];
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {

            setAlert({
                alertMessage: "لطفاً ابتدا وارد شوید.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        if (file) {
            try {
                const path = await api.uploadFile(file);
                if (!path) return null;
                setSelectedFile([...selectedFile, { file, path }]);
            } catch (e: any) {
                return null;
            }
        }









    };

    // Stops the running command. The server answers with a "cancelled" result when it was still
    // running; the panel is freed right away so it never stays stuck waiting for that answer.
    const handleCancel = useCallback(() => {
        if (abortingref.current) return;
        abortingref.current = true;
        userefSocket.current?.emit('cancel-execution');
        setLoadingButton(false);
        resetProgress();
    }, [resetProgress]);

    const handleSubmit = useCallback(async () => {

        if (loadingButton || !voiceInput.trim()) {
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            setAlert({
                alertMessage: "لطفاً ابتدا وارد شوید.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        try {
            abortingref.current = false;
            startProgressRun();
            setLoadingButton(true);

            // The result arrives on the /agent socket (handleToolResult).
            await api.send(voiceInput, await ensureSession(currentSessionId), selectedFile);
        } catch (error: any) {
            setLoadingButton(false);
            abortingref.current = false;
            resetProgress();
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/');
                setAlert({
                    alertMessage: "نشست شما منقضی شده است. لطفاً دوباره وارد شوید.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            } else {
                setAlert({
                    alertMessage: error.response?.data?.message || "ارسال پیام با خطا روبه‌رو شد.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            }
        } finally {

        }
    }, [alert, api, currentSessionId, ensureSession, loadingButton, navigate, resetProgress, selectedFile, startProgressRun, voiceInput]);

    // Voice: the admin backend returns text for the input box; the account backend runs it as a
    // command straight away, so the panel shows progress like after pressing send.
    handleVoiceRef.current = async (audio: Blob) => {
        const showError = (error: unknown) => {
            const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
            const serverMessage = typeof response?.data?.message === "string" ? response.data.message : "";
            setAlert({
                alertMessage: response?.status === 400 && /speech/i.test(serverMessage)
                    ? "صدایی تشخیص داده نشد؛ دوباره و واضح‌تر بگویید."
                    // 503: مدل تبدیل صدا فعلاً در دسترس نیست؛ پیام فارسی سرور همان است که ربات‌ها هم می‌فرستند
                    : response?.status === 503 && serverMessage
                    ? serverMessage
                    : "پردازش صدا با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            });
        };

        if (!api.voiceRunsCommand) {
            try {
                setVoiceInput(await api.voice(audio, currentSessionId));
            } catch (error) {
                showError(error);
            }
            return;
        }

        if (loadingButton) return;
        abortingref.current = false;
        startProgressRun();
        setLoadingButton(true);
        // Local stages until the server's own ones arrive on the socket (same wording, so they merge).
        updateProgressStage("در حال ارسال صدا");
        try {
            await api.voice(audio, await ensureSession(currentSessionId), () => updateProgressStage("در حال تبدیل صدا به متن"));
        } catch (error) {
            setLoadingButton(false);
            abortingref.current = false;
            resetProgress();
            showError(error);
        }
    };


    const generateResultViewLink = (toolName: string) => {

        if (!toolName) return "";
        const key = toolName.trim();
        return resultViewLink[key as keyof typeof resultViewLink] ?? "";
    }

    /**
     * Moves the panel by its header with mouse, pen or touch. While dragging, the position is written straight
     * to the element once per frame (no re-render of this large component) and kept inside the screen, so the
     * header can always be grabbed again; React state gets the final position on release.
     * Dragging the maximized panel restores it to its normal size under the pointer first, like a desktop window.
     * On phones (≤800px) the panel is docked by CSS, so there is nothing to drag.
     */
    const handleDialogDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
        const shell = shellRef.current;
        if (!shell || !event.isPrimary || event.button !== 0) return;
        if ((event.target as HTMLElement).closest('button, a, input, textarea')) return;
        if (!isDesktop) return;

        event.preventDefault();
        const header = event.currentTarget;
        const pointerId = event.pointerId;
        header.setPointerCapture(pointerId);

        const minimized = isMinimized;
        let restoring = isMaximized;
        let start = { x: event.clientX, y: event.clientY };
        let origin = minimized ? { x: minimizedPosition.left, y: minimizedPosition.top } : { ...dialogPosition };
        let rect = { left: 0, top: 0, right: 0, bottom: 0 };
        let next = origin;
        let frame = 0;

        // a data attribute, not a class: React rewrites className when the panel leaves the maximized state
        const begin = () => {
            shell.dataset.dragging = '';
            const box = shell.getBoundingClientRect();
            rect = { left: box.left, top: box.top, right: box.right, bottom: box.bottom };
        };
        const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

        const paint = () => {
            frame = 0;
            const box = panelBox(minimized ? 'minimized' : 'normal', next);
            shell.style.transform = `translate3d(${box.x}px, ${box.y}px, 0)`;
        };

        /** Leaves the maximized state with the normal-size panel's header under the pointer. */
        const restore = (pointerX: number, pointerY: number) => {
            const box = shell.getBoundingClientRect();
            const centred = panelBox('normal', { x: 0, y: 0 });
            const width = centred.width;
            const height = centred.height as number;
            // the pointer keeps its place along the bar (grabbed near the close button, it stays near it)
            const left = pointerX - ((pointerX - box.left) / box.width) * width;
            const top = pointerY - HEADER_HEIGHT / 2;
            origin = { x: left - centred.x, y: top - centred.y };
            rect = { left, top, right: left + width, bottom: top + height };
            start = { x: pointerX, y: pointerY };
            next = origin;
            shell.dataset.dragging = '';
            setIsMaximized(false);
            setDialogPosition(origin);
        };

        const handleMove = (moveEvent: PointerEvent) => {
            if (moveEvent.pointerId !== pointerId) return;
            if (restoring) {
                // a click (or a tiny wobble) on the bar of the maximized panel leaves it as it is
                if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < RESTORE_DRAG_THRESHOLD) return;
                restoring = false;
                restore(moveEvent.clientX, moveEvent.clientY);
            }
            next = {
                x: origin.x + clamp(moveEvent.clientX - start.x, DRAG_MARGIN - rect.left, window.innerWidth - DRAG_MARGIN - rect.right),
                y: origin.y + clamp(moveEvent.clientY - start.y, DRAG_MARGIN - rect.top, window.innerHeight - DRAG_MARGIN - rect.bottom),
            };
            if (!frame) frame = requestAnimationFrame(paint);
        };

        const handleEnd = () => {
            if (frame) cancelAnimationFrame(frame);
            header.removeEventListener('pointermove', handleMove);
            header.removeEventListener('pointerup', handleEnd);
            header.removeEventListener('pointercancel', handleEnd);
            delete shell.dataset.dragging;
            if (restoring) return; // never moved far enough: still maximized, nothing to save
            paint();
            if (minimized) setMinimizedPosition({ left: next.x, top: next.y });
            else setDialogPosition(next);
        };

        if (!restoring) begin();
        header.addEventListener('pointermove', handleMove);
        header.addEventListener('pointerup', handleEnd);
        header.addEventListener('pointercancel', handleEnd);
    };

    // a smaller window (or a rotated tablet) must not leave the panel stranded off-screen
    useEffect(() => {
        const onResize = () => {
            setMinimizedPosition((current) => ({
                left: Math.min(Math.max(current.left, DRAG_MARGIN), Math.max(DRAG_MARGIN, window.innerWidth - MINIMIZED_PANEL_WIDTH - DRAG_MARGIN)),
                top: Math.min(Math.max(current.top, DRAG_MARGIN), Math.max(DRAG_MARGIN, window.innerHeight - HEADER_HEIGHT - DRAG_MARGIN)),
            }));
            setDialogPosition({ x: 0, y: 0 });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);
    const desktopPanelStyle = (): React.CSSProperties => {
        const state: PanelState = isMaximized ? 'maximized' : isMinimized ? 'minimized' : 'normal';
        const box = panelBox(state, isMinimized ? { x: minimizedPosition.left, y: minimizedPosition.top } : dialogPosition);
        return {
            top: 0,
            left: 0,
            right: 'auto',
            bottom: 'auto',
            transform: `translate3d(${box.x}px, ${box.y}px, 0)`,
            transformOrigin: '0 0',
            width: box.width,
            height: box.height ?? 'var(--compact-panel-height, 180px)',
            maxHeight: 'none',
        };
    };

    // The panel's box just before a minimize/maximize, so the layout effect below can animate from it.
    const stateChangeRef = useRef<{ from: DOMRect; kind: 'resize' | 'swap' } | null>(null);
    const rememberBox = (kind: 'resize' | 'swap') => {
        const shell = shellRef.current;
        stateChangeRef.current = shell && isDesktop ? { from: shell.getBoundingClientRect(), kind } : null;
    };

    /**
     * Desktop state changes never animate width/height (a big panel slowly shrinking while its content reflows):
     *  - maximize / back: the same content grows or shrinks; played with transform only (FLIP), no relayout per frame.
     *  - opening from the compact panel: the full panel, already laid out, is revealed from where the compact one
     *    was (its top-right corner, where the title is) by a growing clip, so it opens without stretching anything.
     *  - going compact: the small panel glides from the big one's corner to its own place.
     */
    useLayoutEffect(() => {
        const change = stateChangeRef.current;
        const shell = shellRef.current;
        stateChangeRef.current = null;
        if (!change || !shell || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const { from } = change;
        const to = shell.getBoundingClientRect();
        const at = (x: number, y: number) => `translate3d(${x}px, ${y}px, 0)`;
        const timing = { easing: 'cubic-bezier(0.22, 1, 0.36, 1)' };
        if (change.kind === 'resize') {
            shell.animate(
                [
                    { transform: `${at(from.left, from.top)} scale(${from.width / to.width}, ${from.height / to.height})` },
                    { transform: `${at(to.left, to.top)} scale(1, 1)` },
                ],
                { ...timing, duration: 280 },
            );
        } else if (to.width > from.width) {
            const radius = getComputedStyle(shell).borderTopRightRadius;
            const hidden = `inset(0px 0px ${Math.max(0, to.height - from.height)}px ${Math.max(0, to.width - from.width)}px round ${radius})`;
            shell.animate(
                [
                    { transform: at(from.right - to.width, from.top), clipPath: hidden },
                    { transform: at(to.left, to.top), clipPath: `inset(0px 0px 0px 0px round ${radius})` },
                ],
                { ...timing, duration: 360 },
            );
        } else {
            shell.animate(
                [
                    { transform: at(from.right - to.width, from.top), opacity: 0.5 },
                    { transform: at(to.left, to.top), opacity: 1 },
                ],
                { ...timing, duration: 280 },
            );
        }
    }, [isMinimized, isMaximized]);

    const handleToggleMinimize = () => {
        rememberBox('swap');
        setIsMinimized((prev) => !prev);
        if (isMaximized) {
            setIsMaximized(false);
        }
    };

    const handleToggleMaximize = () => {
        rememberBox(isMinimized ? 'swap' : 'resize');
        setIsMaximized((prev) => !prev);
        if (isMinimized) {
            setIsMinimized(false);
        }
    };

    const handleNewChat = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            resetProgress();
            setCurrentSessionId(await api.newSession());
            setHistory([]);
            setVoiceInput('');
        } catch (error) {
            setAlert({
                alertMessage: "شروع گفتگوی جدید با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }, [alert, api, navigate, resetProgress]);

    const getToolExecution = async (sessionId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            setHistory(await api.executions(sessionId))
            setCurrentSessionId(sessionId)

        } catch (error) {
            setAlert({
                alertMessage: "شروع گفتگوی جدید با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }

    const onClickSuccesItem = (item: FunctionCallResultType) => {
        setVoiceInput(item.prompt)
    }

    const handleConfirmAction = async (confirmed: boolean) => {


        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        setConfirmDialogOpen(false)
        try {
            await api.confirmAction(confirmed);
        } catch (error) {
            setAlert({
                alertMessage: "شروع گفتگوی جدید با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }



    };

    const searchHistory = async (searchValue: string) => {
        const trimmed = searchValue.trim();

        if (trimmed.length < 3) {
            setSessionList([]);
            return;
        }

        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }

        try {
            setSessionList(await api.searchSessions(trimmed));
        } catch (error) {
            setAlert({
                alertMessage: "جست‌وجو با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    };

    const confirmSelectionPending = (id: string) => {
        setConfirmDialogOpen(false)
        userefSocket.current?.emit('respond-to-pending-action', { value: id, cancel: false });

    }
    const handleCancelAction = () => {
        setConfirmDialogOpen(false)
        userefSocket.current?.emit('respond-to-pending-action', { cancel: true, value: null });

    }


    //#endregion----------------- Handlers---------------

    //#region-------------------- Functions ---------------
    const removeFile = (index: number) => {
        setSelectedFile((prev) => prev.filter((_, i) => i !== index));

    };
    const decodeJwtToken = (token: string): JwtPayload | null => {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(function (c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join(''),
            );

            return JSON.parse(jsonPayload);
        } catch (e) {
            return null;
        }
    };

    const getSession = async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            setSessionList(await api.listSessions());

        } catch (error) {
            setAlert({
                alertMessage: "شروع گفتگوی جدید با خطا روبه‌رو شد.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }

    const handleSpecialPrompt = () => {


        switch (specialPrompt) {
            case SpecialPromptEnum.create_tender:
                return handleTender();
            case SpecialPromptEnum.create_network:
                return handleNetwork();

            // no break needed because we return
            default:
                return null;
        }
    }

    const handleTender = () => {

        return <TenderChoice setVoiceInput={setVoiceInput} />

    }

    const handleNetwork = () => {

        return <NetworkChoice setVoiceInput={setVoiceInput} />

    }

    const generatePreviousItems = (history: FunctionCallResultType[]) => {

        return history.map((item, index) => {
            const isSuccess = item.result === "success";
            const isClickable = isSuccess && !!currentSessionId;
            // With cards the full text list is redundant: only its first line (e.g. «۳ بار از بجنورد:») stays.
            const cards = hasAgentCards(item.list) ? item.list : null;
            const message = cards ? item.message?.split("\n")[0] : item.message;

            return (
                <div
                    className={`operation-card ${isSuccess ? "success" : "error"}`}
                    key={item.id}
                    onClick={
                        isClickable
                            ? () => onClickSuccesItem(item)
                            : undefined
                    }
                    role={isClickable ? "button" : undefined}
                    tabIndex={isClickable ? 0 : undefined}
                    onKeyDown={
                        isClickable
                            ? (event) => {
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onClickSuccesItem(item!);
                                }
                            }
                            : undefined
                    }
                >
                    <div className="operation-top">
                        <div className={`${isSuccess ? "operation-success" : "operation-error"}`}>
                            <span>{isSuccess ? "✓" : "x"}</span>
                        </div>

                        <div style={{ flex: "1", minWidth: 0, overflow: "hidden", overflowWrap: "break-word", display: "flex" }}>
                            <div style={{ display: "flex", alignItems: "center" }}><strong style={{ overflow: "hidden", textWrap: "nowrap", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>{item.prompt}</strong></div>
                            <div className="operation-arrow"><ArrowRight style={{ fill: isSuccess ? "#28ab2a" : "red" }} /></div>
                            <div style={{ display: "flex", gap: "8px", minWidth: "0" }}>
                                <strong style={{ overflow: "hidden", textWrap: "nowrap", textOverflow: "ellipsis", display: "block", minWidth: "0" }}>
                                    {message}
                                </strong>
                                {item.toolName && (
                                    <a
                                        href={generateResultViewLink(item.toolName)}
                                        style={{ color: "blue", textDecoration: "underline", textWrap: "nowrap" }}
                                        target="_blank"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        مشاهده نتیجه
                                    </a>
                                )}
                                <span style={{ fontWeight: "bold", color: "black" }}>
                                    {item.time}
                                </span>
                            </div>
                        </div>

                        <span className={`${isSuccess ? "success-pill" : "error-pill"}`}>
                            {isSuccess ? "موفق" : "خطا"}
                        </span>
                    </div>
                    {item.continuePrompt && (
                        <h5 style={{ margin: "0", color: "#977200" }}>{item.continuePrompt}</h5>
                    )}
                    {cards && (cards.some(isChannel)
                        ? <AgentChannelList items={cards.filter(isChannel)} />
                        : cards.some(isDriverLoad)
                            ? <AgentDriverLoadList items={cards.filter(isDriverLoad)} />
                            : <AgentCargoList items={cards} />)}
                    {
                        specialPrompt && index == 0 && handleSpecialPrompt()
                    }
                </div>
            );
        })

    }

    const ConfirmRequiredContent = (data: any) => {
        if (!data) return;

        switch (data.data?.type ?? "") {

            case "selection":
                return <SelectionConfirm handleConfirmAction={confirmSelectionPending} handleCancelAction={handleCancelAction} pendingConfirmation={pendingConfirmation} />;
            default:
                return <DeleteConfirm handleConfirmAction={handleConfirmAction} pendingConfirmation={data} />


        }


    }

    //#endregion----------------- Functions---------------


    //#region-------------------- UseEffects -------------
    useEffect(() => {
        setShowWorkspace(false);
    }, []);

    useEffect(() => {
        const authToken = localStorage.getItem('authToken');
        const decoded = authToken ? decodeJwtToken(authToken) : null;
        const userId = decoded?.userid;

        handleNewChat();

        const handleToolResult = (data: any) => {
            if (data.result === "success") {
                setHistory((prev) => [{
                    id: uniqueId(),
                    list: data.list,
                    message: data.message,
                    result: data.result,
                    prompt: data.prompt,
                    continuePrompt: data.continuePrompt,
                    toolName: data.toolName,
                    time: `${new Date().getHours().toString()}:${new Date().getMinutes().toString()}`
                }, ...prev])
                setVoiceInput('');
                setSelectedFile([]);
                setSessionHasPrompts(true)
                if (data.lastsegment) {
                    setLoadingButton(false)
                    abortingref.current = false;
                    finishProgressRun(data.currentOp || undefined);
                }

                if (data.isSpecial) {
                    setSpecialPrompt(SpecialPromptEnum[data.toolName as unknown as keyof typeof SpecialPromptEnum])
                }
                else {
                    setSpecialPrompt(null)
                }

            }
            else if (data.result === "confirm_required") {
                setPendingConfirmation(data);
                setConfirmDialogOpen(true);
            }
            else {
                setHistory((prev) => [{
                    id: uniqueId(),
                    list: data.list,
                    message: data.message,
                    result: data.result,
                    prompt: data.prompt,
                    continuePrompt: data.continuePrompt,
                    toolName: data.toolName,
                    time: `${new Date().getHours().toString()}:${new Date().getMinutes().toString().padStart(2, "0")}`
                }, ...prev])

                setLoadingButton(false)
                abortingref.current = false;
                finishProgressRun(data.currentOp || undefined);
            }
            if (data.result === "success" && !data.lastsegment) {
                setProgress((prev) => ({
                    currentOp: undefined,
                    percent: prev.percent,
                }));
            }

        }
        const handleToolCurrent = (data: any) => {
            updateProgressStage(data.currentOp);
        }
        userefSocket.current = io(api.socketUrl, {
            path: '/socket.io',
            transports: ['websocket', 'polling'] as string[],

            query: {
                userId: userId
            },
            auth: { token: authToken }
        })
        userefSocket.current.on("agent-current-tool", handleToolCurrent)
        userefSocket.current.on("agent-tool-result", handleToolResult)
        userefSocket.current.on("connect", () => {
        })

        const timer = setTimeout(() => {
            console.log('connecting...');
            userefSocket.current?.connect();
        }, 100);


        return () => {
            clearTimeout(timer);
            clearProgressResetTimer();
            userefSocket.current?.off('agent-tool-result', handleToolResult);
            userefSocket.current?.off('agent-current-tool', handleToolCurrent);
            userefSocket.current?.disconnect();
        };
    }, [api, clearProgressResetTimer, finishProgressRun, updateProgressStage])

    useEffect(() => {
        getSession()
    }, [sessionHasPrompts])

    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = "auto";
            const computed = window.getComputedStyle(ta);
            const lineHeight = parseInt(computed.lineHeight || "20", 10) || 20;
            const maxHeight = lineHeight * 4;
            const scrollH = ta.scrollHeight;
            const desiredHeight = Math.min(maxHeight, Math.max(lineHeight, scrollH));
            ta.style.height = `${desiredHeight}px`;
            ta.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
        }
    }, [voiceInput, isListening]);

    //#endregion----------------- UseEffects -------------

    return (
        <div className="agent-panel-overlay">
            <div
                ref={shellRef}
                dir="rtl"
                className={`agent-modal-shell ${isMinimized ? "is-minimized" : ""} ${isMaximized ? "is-maximized" : ""}`}
                style={isDesktop ? desktopPanelStyle() : undefined}
            >
                <div className="agent-dialog-header" onPointerDown={handleDialogDragStart}>
                    <div className="agent-window-bar">
                        <div className="agent-window-title">دستیار هوشمند</div>

                        <div className="agent-window-controls">
                            <button
                                type="button"
                                className="agent-window-button agent-window-button--minimize"
                                onClick={handleToggleMinimize}
                                aria-label={isMinimized ? "باز کردن پنل دستیار" : "کوچک کردن پنل دستیار"}
                                title={isMinimized ? "باز کردن" : "کوچک کردن"}
                            >
                                {isMinimized ? <RestoreGlyph aria-hidden /> : <MinimizeGlyph aria-hidden />}
                            </button>

                            <button
                                type="button"
                                className="agent-window-button agent-window-button--maximize"
                                onClick={handleToggleMaximize}
                                aria-label={isMaximized ? "اندازه عادی پنل دستیار" : "تمام‌صفحه کردن پنل دستیار"}
                                title={isMaximized ? "اندازه عادی" : "تمام‌صفحه"}
                            >
                                {isMaximized ? <UnmaximizeGlyph aria-hidden /> : <MaximizeGlyph aria-hidden />}
                            </button>

                            <button
                                type="button"
                                className="agent-window-button agent-window-button--close"
                                onClick={() => {
                                    if (onClose) {
                                        onClose();
                                        return;
                                    }
                                    navigate(-1);
                                }}
                                aria-label="بستن پنل دستیار"
                                title="بستن"
                            >
                                <CloseGlyph aria-hidden />
                            </button>
                        </div>
                        {isMinimized && (progress.currentOp != undefined || loadingButton) ? (
                            <div className="agent-window-progress" aria-live="polite">
                                <LinearProgress
                                    variant="determinate"
                                    value={progress.percent}
                                    sx={{
                                        height: 4,
                                        borderRadius: 999,
                                        backgroundColor: 'rgba(255,255,255,0.14)',
                                        '& .UiLinearProgress-bar': {
                                            borderRadius: 999,
                                            background: 'linear-gradient(90deg, #60a5fa 0%, #8b5cf6 50%, #22c55e 100%)',
                                        },
                                    }}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>

                {isMinimized ? (
                    <div className="agent-page minimized-view">
                        {/* The last answer can be a long card list; it scrolls and the composer stays in view. */}
                        <div className="minimized-result">
                            {generatePreviousItems(history[0] ? [history[0]] : [])}
                        </div>
                        <div className="composer-container">
                            <div className="file-container">
                                {selectedFile.map((item, index) =>
                                    <div className="attachment">
                                        <div className="attachment-icon">
                                            📎
                                        </div>

                                        <div className="attachment-info">
                                            <strong>{item?.file.name}</strong>

                                            <span>
                                                {(item?.file.size / 1024).toFixed(1)} KB
                                            </span>
                                        </div>

                                        <button onClick={() => removeFile(index)}>
                                            ×
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="composer">
                                <button
                                    className="composer-button"
                                    onClick={() => fileInputRef.current?.click()}
                                    title="پیوست فایل"
                                >
                                    📎
                                </button>

                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    hidden
                                    onChange={handleFileChange}
                                />

                                <textarea
                                    ref={textareaRef}
                                    dir="auto"
                                    value={isListening ? `` : voiceInput}
                                    onChange={(event) => {
                                        setVoiceInput(event.target.value)
                                        const ta = textareaRef.current;
                                        if (ta) {
                                            ta.style.height = "auto";
                                            const computed = window.getComputedStyle(ta);
                                            const lineHeight = parseInt(computed.lineHeight || "20", 10) || 20;
                                            const maxHeight = lineHeight * 4;
                                            const scrollH = ta.scrollHeight;
                                            const desiredHeight = Math.min(maxHeight, Math.max(lineHeight, scrollH));
                                            ta.style.height = `${desiredHeight}px`;
                                            ta.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
                                        }
                                    }}
                                    placeholder="از دستیار بپرسید…"
                                    rows={1}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === "Enter" &&
                                            !event.shiftKey
                                        ) {
                                            event.preventDefault();
                                            handleSubmit();
                                        }
                                    }}
                                />

                                <button
                                type="button"
                                className={`composer-button ${isListening ? "recording-button" : ""}`}
                                onClick={() => { isListening ? stop() : start() }}
                                disabled={loadingButton && !isListening}
                                title={isListening ? "توقف ضبط و ارسال" : "ورودی صوتی"}
                                aria-label={isListening ? "توقف ضبط و ارسال" : "ورودی صوتی"}
                            >
                                {isListening ? <StopIcon size={16} color="#ff4d4f" /> : <Mic size={18} color="#b5b8c0" />}
                            </button>

                            {isListening && (
                                <button
                                    type="button"
                                    className="composer-button"
                                    onClick={cancel}
                                    title="لغو ضبط"
                                    aria-label="لغو ضبط"
                                >
                                    <CancelIcon size={18} color="#ff4d4f" />
                                </button>
                            )}

                            {loadingButton ? (
                                <button
                                    type="button"
                                    className="send-button"
                                    onClick={handleCancel}
                                    title="لغو اجرا"
                                    aria-label="لغو اجرا"
                                >
                                    <BoltIcon className="waiting-request-response" size={20} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={`send-button ${!voiceInput.trim() ? "inactive" : ""}`}
                                    onClick={handleSubmit}
                                    disabled={!voiceInput.trim() || isListening}
                                    title="ارسال"
                                    aria-label="ارسال"
                                >
                                    <Arrow size={19} />
                                </button>
                            )}

                            </div>

                            <div className="composer-hint">
                                <span>
                                    برای ارسال Enter بزنید
                                </span>

                                <span>
                                    برای خط جدید Shift + Enter
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="agent-page">
                        {/* Sidebar */}


                        <aside className="agent-sidebar">
                            <div className="sidebar-header">
                                <div className="brand">
                                    <div className="brand-icon">AI</div>

                                    <div>
                                        <strong>دستیار هوشمند</strong>
                                        <span>فضای کار</span>
                                    </div>
                                </div>

                                <button className="new-chat-button">
                                    <span>+</span>
                                    گفتگوی جدید
                                </button>
                            </div>

                            <div className="conversation-section">
                                <div className="section-label">امروز</div>

                                {conversations.map((conversation, index) => (
                                    <button
                                        key={conversation}
                                        className={`conversation-item ${index === 0 ? "active" : ""
                                            }`}
                                    >
                                        <span className="conversation-icon">◈</span>

                                        <span>{conversation}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="sidebar-footer">
                                <div className="agent-status">
                                    <span className="status-dot" />

                                    <div>
                                        <strong>دستیار آنلاین</strong>
                                        <span>آماده اجرا</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        <main className="agent-main">



                            {/* Workspace */}
                            <div className="workspace">

                                <div className={`history-sidebar ${showHistory ? "show-mobile" : ""}`}>
                                    <div className="history-sidebar__header">
                                        سوابق
                                        <button type="button" className="history-close" onClick={() => setShowHistory(false)} aria-label="بازگشت به گفتگو" title="بازگشت">
                                            <BackGlyph aria-hidden />
                                        </button>
                                    </div>

                                    <div className="history-sidebar__search">
                                        <input
                                            type="text"
                                            value={searchText}
                                            onChange={(event) => {
                                                const value = event.target.value;
                                                setSearchText(value);

                                                if (debounceRef.current) {
                                                    window.clearTimeout(debounceRef.current);
                                                }

                                                debounceRef.current = window.setTimeout(() => {
                                                    if (value.trim().length >= 3) {
                                                        searchHistory(value);
                                                    } else {
                                                        getSession();
                                                    }
                                                }, 500);
                                            }}
                                            placeholder="جست‌وجو…"
                                            aria-label="جست‌وجو در سوابق"
                                        />
                                    </div>

                                    <div className="history-sidebar__list">
                                        {sessionList.map((item, index) => (
                                            <HistoryItem
                                                key={item.id}
                                                onRename={api.renameSession}
                                                getToolExecution={(sessionId) => {
                                                    setShowHistory(false);
                                                    getToolExecution(sessionId);
                                                }}
                                                id={item.id}
                                                title={item.title}
                                                createdAt={item.createdAt}
                                                status={index % 2 === 0 ? 'success' : 'error'}
                                            />
                                        ))}
                                    </div>
                                </div>


                                {/* Result Workspace */}
                                <section
                                    className={`result-panel ${showWorkspace ? "show-mobile" : ""
                                        }`}
                                >
                                    <div className="result-header">
                                        <div style={{ width: "100%", display: "flex", justifyContent: "space-between" }}>
                                            <div className="result-header__title">
                                                <span className="eyebrow">
                                                    فضای کار
                                                </span>

                                                <h2>نتیجه عملیات</h2>
                                            </div>
                                            <div className="result-header__actions">
                                                <button
                                                    type="button"
                                                    className="mobile-history-toggle"
                                                    onClick={() => setShowHistory((value) => !value)}
                                                    aria-expanded={showHistory}
                                                >
                                                    سوابق
                                                </button>
                                                <div className={`newchat ${currentSessionId == null || !sessionHasPrompts ? "inactive" : "active"}`} onClick={handleNewChat}>
                                                    <span>گفتگوی جدید</span>
                                                </div>
                                            </div>

                                        </div>


                                        <div style={{ width: "100%" }}>
                                            {
                                                progress.currentOp != undefined && (
                                                    <div className="progress-current" style={{ padding: "8px", paddingLeft: "35px", color: "#22222" }}>

                                                        <span className="progress-text">{progress.currentOp}</span>
                                                        <span className="progress-dots">...</span>
                                                    </div>
                                                )
                                            }
                                        </div>
                                    </div>


                                    <div className="result-content">


                                        {history.length ? (
                                            generatePreviousItems(history)
                                        ) : (
                                            <div className="agent-empty">
                                                <span className="agent-empty__icon" aria-hidden>✦</span>
                                                <strong>چه کاری برایتان انجام دهم؟</strong>
                                                <span>درخواستتان را بنویسید یا با میکروفون بگویید.</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="composer-container">

                                        <div className="file-container">
                                            {selectedFile.map((item, index) =>
                                                <div className="attachment">
                                                    <div className="attachment-icon">
                                                        📎
                                                    </div>

                                                    <div className="attachment-info">
                                                        <strong>{item?.file.name}</strong>

                                                        <span>
                                                            {(item?.file.size / 1024).toFixed(1)} KB
                                                        </span>
                                                    </div>

                                                    <button onClick={() => removeFile(index)}>
                                                        ×
                                                    </button>
                                                </div>
                                            )}

                                        </div>

                                        <div className="composer">
                                            <button
                                                className="composer-button"
                                                onClick={() => fileInputRef.current?.click()}
                                                title="پیوست فایل"
                                            >
                                                📎
                                            </button>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                hidden
                                                onChange={handleFileChange}
                                            />

                                            <textarea
                                                ref={textareaRef}
                                                dir="auto"
                                                value={isListening ? `` : voiceInput}
                                                onChange={(event) => {
                                                    setVoiceInput(event.target.value)
                                                    const ta = textareaRef.current;
                                                    if (ta) {
                                                        ta.style.height = "auto";
                                                        const computed = window.getComputedStyle(ta);
                                                        const lineHeight = parseInt(computed.lineHeight || "20", 10) || 20;
                                                        const maxHeight = lineHeight * 4;
                                                        const scrollH = ta.scrollHeight;
                                                        const desiredHeight = Math.min(maxHeight, Math.max(lineHeight, scrollH));
                                                        ta.style.height = `${desiredHeight}px`;
                                                        ta.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
                                                    }
                                                }}
                                                placeholder="از دستیار بپرسید…"
                                                rows={1}
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === "Enter" &&
                                                        !event.shiftKey
                                                    ) {
                                                        event.preventDefault();
                                                        handleSubmit();
                                                    }
                                                }}
                                            />

                                            <button
                                            type="button"
                                            className={`composer-button ${isListening ? "recording-button" : ""}`}
                                            onClick={() => { isListening ? stop() : start() }}
                                            disabled={loadingButton && !isListening}
                                            title={isListening ? "توقف ضبط و ارسال" : "ورودی صوتی"}
                                            aria-label={isListening ? "توقف ضبط و ارسال" : "ورودی صوتی"}
                                        >
                                            {isListening ? <StopIcon size={16} color="#ff4d4f" /> : <Mic size={18} color="#b5b8c0" />}
                                        </button>

                                        {isListening && (
                                            <button
                                                type="button"
                                                className="composer-button"
                                                onClick={cancel}
                                                title="لغو ضبط"
                                                aria-label="لغو ضبط"
                                            >
                                                <CancelIcon size={18} color="#ff4d4f" />
                                            </button>
                                        )}

                                        {loadingButton ? (
                                            <button
                                                type="button"
                                                className="send-button"
                                                onClick={handleCancel}
                                                title="لغو اجرا"
                                                aria-label="لغو اجرا"
                                            >
                                                <BoltIcon className="waiting-request-response" size={20} />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className={`send-button ${!voiceInput.trim() ? "inactive" : ""}`}
                                                onClick={handleSubmit}
                                                disabled={!voiceInput.trim() || isListening}
                                                title="ارسال"
                                                aria-label="ارسال"
                                            >
                                                <Arrow size={19} />
                                            </button>
                                        )}



                                        </div>

                                        <div className="composer-hint">
                                            <span>
                                                برای ارسال Enter بزنید
                                            </span>

                                            <span>
                                                برای خط جدید Shift + Enter
                                            </span>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </main>

                    </div>
                )}
            </div>
            {/* Outside the minimized/full branches: a tool can ask (confirm, pick one) in either mode. */}
            <Dialog
                open={confirmDialogOpen}
                onClose={() => handleConfirmAction(false)}
                aria-labelledby="confirm-delete-dialog-title"
                PaperProps={{
                    className: "confirm-dialog-paper",
                    sx: {
                        minWidth: "30vw",
                        minHeight: "15vh"
                    }
                }}
            >
                {
                    ConfirmRequiredContent(pendingConfirmation)
                }
            </Dialog>
        </div>
    );
}



export default AiAgentPage;
