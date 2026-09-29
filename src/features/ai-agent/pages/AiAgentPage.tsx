import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "src/features/ai-agent/pages/AiAgentPage.css";
import { AlertType } from "src/shared/components/Alert/alert.type.ts";
import { useNavigate } from "react-router";
import { Dialog, LinearProgress } from 'src/shared/components/compat';
import { StopCircleSharp as BoltIcon } from 'src/shared/components/compat/icons';
import { Mic } from 'src/shared/components/compat/icons';
import { Stop as StopIcon } from 'src/shared/components/compat/icons';
import { Cancel as CancelIcon } from 'src/shared/components/compat/icons';
import { GraphicEq as EmptyIcon } from 'src/shared/components/compat/icons';
import { TrendingFlat as ArrowRight } from 'src/shared/components/compat/icons';
import { ArrowUpwardOutlined as Arrow } from 'src/shared/components/compat/icons';
import { uniqueId } from "lodash";
import { ArrowRight as BackGlyph, ChevronUp as RestoreGlyph, Maximize2 as MaximizeGlyph, Minimize2 as UnmaximizeGlyph, Minus as MinimizeGlyph, X as CloseGlyph } from "lucide-react";
import { FunctionCallResultType, JwtPayload, SelectedFileType, SessionsItemType, SpecialPromptEnum } from "src/features/ai-agent/types/index.ts";
import { agentApi, type AgentBackend } from "src/features/ai-agent/services/agentApi";
import { useSpeechToText } from "src/features/ai-agent/hooks/useSpeechToText";
import { io, Socket } from "socket.io-client";
import resultViewLink from 'src/features/ai-agent/localfiles/resultViewLink.json'
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
    } = useSpeechToText((audio: Blob) => handleVoiceRef.current(audio));
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
    const [isDragging, setIsDragging] = useState(false);
    const [minimizedPosition, setMinimizedPosition] = useState(() => ({
        top: 20,
        left: typeof window !== 'undefined'
            ? Math.max(window.innerWidth - MINIMIZED_PANEL_WIDTH - 20, 20)
            : 20,
    }));
    const debounceRef = useRef<number | null>(null);
    const shellRef = useRef<HTMLDivElement | null>(null);
    const dragStateRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
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

    const handleSubmit = useCallback(async () => {

        if (loadingButton) {
            if (!abortingref.current) {
                handleCancel();
                abortingref.current = true;
            }
            return;
        }
        if (!voiceInput.trim()) {
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
    }, [alert, api, currentSessionId, ensureSession, navigate, resetProgress, selectedFile, startProgressRun, voiceInput]);

    // Voice: the admin backend returns text for the input box; the account backend runs it as a
    // command straight away, so the panel shows progress like after pressing send.
    handleVoiceRef.current = async (audio: Blob) => {
        const showError = (error: unknown) => {
            const response = (error as { response?: { status?: number; data?: { message?: unknown } } })?.response;
            const serverMessage = typeof response?.data?.message === "string" ? response.data.message : "";
            setAlert({
                alertMessage: response?.status === 400 && /speech/i.test(serverMessage)
                    ? "صدایی تشخیص داده نشد؛ دوباره و واضح‌تر بگویید."
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
    const handleCancel = useCallback(() => {
        userefSocket.current?.emit('cancel-execution');
    }, []);

    const handleDialogDragStart = (event: React.MouseEvent<HTMLDivElement>) => {
        if ((event.target as HTMLElement).closest('button')) {
            return;
        }

        if (isMaximized) {
            return;
        }

        event.preventDefault();
        setIsDragging(true);

        if (isMinimized) {
            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                originX: minimizedPosition.left,
                originY: minimizedPosition.top,
            };

            const handleMove = (moveEvent: MouseEvent) => {
                const dragState = dragStateRef.current;
                if (!dragState) return;

                setMinimizedPosition({
                    left: dragState.originX + (moveEvent.clientX - dragState.startX),
                    top: dragState.originY + (moveEvent.clientY - dragState.startY),
                });
            };

            const handleUp = () => {
                dragStateRef.current = null;
                setIsDragging(false);
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        } else {
            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                originX: dialogPosition.x,
                originY: dialogPosition.y,
            };

            const handleMove = (moveEvent: MouseEvent) => {
                const dragState = dragStateRef.current;
                if (!dragState) return;

                setDialogPosition({
                    x: dragState.originX + (moveEvent.clientX - dragState.startX),
                    y: dragState.originY + (moveEvent.clientY - dragState.startY),
                });
            };

            const handleUp = () => {
                dragStateRef.current = null;
                setIsDragging(false);
                window.removeEventListener('mousemove', handleMove);
                window.removeEventListener('mouseup', handleUp);
            };

            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
        }
    };
    const handleToggleMinimize = () => {
        setIsMinimized((prev) => !prev);
        if (isMaximized) {
            setIsMaximized(false);
        }
    };

    const handleToggleMaximize = () => {
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
                                    {item.message}
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
                style={
                    isMinimized
                        ? {
                            position: "fixed" as const,
                            top: `${minimizedPosition.top}px`,
                            left: `${minimizedPosition.left}px`,
                            right: "auto",
                            bottom: "auto",
                            transform: "none",
                            transition: isDragging ? "none" : undefined,
                        }
                        : {
                            top: "50%",
                            left: "50%",
                            right: "auto",
                            bottom: "auto",
                            transform: `translate3d(calc(-50% + ${dialogPosition.x}px), calc(-50% + ${dialogPosition.y}px), 0)`,
                            transformOrigin: "center center",
                            transition: isDragging ? "none" : undefined,
                        }
                }
            >
                <div className="agent-dialog-header" onMouseDown={handleDialogDragStart}>
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
                        {
                            generatePreviousItems(history[0] ? [history[0]] : [])
                        }
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
                                <textarea
                                    ref={textareaRef}
                                    dir="auto"
                                    value={isListening ? `` : voiceInput}
                                    style={{ width: "100%" }}
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

                                <div style={{ display: "flex", width: "100%" }}>
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

                                    <div style={{ display: "flex", width: "100%", justifyContent: "end" }}>
                                        <button
                                            className={`composer-button ${isListening ? "recording-button" : ""
                                                }`}
                                            onClick={() => { isListening ? stop() : start() }}
                                            title={isListening ? "توقف ضبط" : "ورودی صوتی"}
                                        >
                                            {isListening ? (
                                                <StopIcon style={{ fill: "#ff4d4f" }} />
                                            ) : (
                                                <Mic style={{ fill: "gray" }} />
                                            )}
                                        </button>

                                        {
                                            isListening && <button
                                                className={`composer-button`}
                                            >
                                                <CancelIcon style={{ fill: "#ff4d4f" }} onClick={(e) => { e.stopPropagation(); cancel() }} />
                                            </button>
                                        }

                                        <button
                                            className={`send-button ${!voiceInput.trim() ? "inactive" : ""}`}
                                            onClick={handleSubmit}
                                        >
                                            {loadingButton ? <BoltIcon className="waiting-request-response" color="inherit" sx={{ mr: 1, fontSize: 20 }} /> : voiceInput.trim() ? <Arrow style={{ width: "19px", height: "19px" }} /> : <EmptyIcon />}
                                        </button>
                                    </div>
                                </div>
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


                                            <textarea
                                                ref={textareaRef}
                                                dir="auto"
                                                value={isListening ? `` : voiceInput}
                                                style={{ width: "100%" }}
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

                                            <div style={{ display: "flex", width: "100%" }}>
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


                                                <div style={{ display: "flex", width: "100%", justifyContent: "end" }}>

                                                    <button
                                                        className={`composer-button ${isListening ? "recording-button" : ""
                                                            }`}
                                                        onClick={() => { isListening ? stop() : start() }}
                                                        title={isListening ? "توقف ضبط" : "ورودی صوتی"}
                                                    >
                                                        {isListening ? (
                                                            <StopIcon style={{ fill: "#ff4d4f" }} />
                                                        ) : (
                                                            <Mic style={{ fill: "gray" }} />
                                                        )

                                                        }

                                                    </button>

                                                    {
                                                        isListening && <button
                                                            className={`composer-button`}
                                                        >
                                                            <CancelIcon style={{ fill: "#ff4d4f" }} onClick={(e) => { e.stopPropagation(); cancel() }} />
                                                        </button>
                                                    }
                                                    <button
                                                        className={`send-button ${!voiceInput.trim() ? "inactive" : ""}`}
                                                        onClick={handleSubmit}
                                                    >
                                                        {loadingButton ? <BoltIcon className="waiting-request-response" color="inherit" sx={{ mr: 1, fontSize: 20 }} /> : voiceInput.trim() ? <Arrow style={{ width: "19px", height: "19px" }} /> : <EmptyIcon />}
                                                    </button>
                                                </div>



                                            </div>


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
                )}
            </div>
        </div>
    );
}



export default AiAgentPage;
