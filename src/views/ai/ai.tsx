import { useCallback, useEffect, useRef, useState } from "react";
import "./AiAgentPage.css";
import { AlertType } from "src/components/shared/Alert/alert.type";
import { useNavigate } from "react-router";
import axios from 'axios';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import BoltIcon from '@mui/icons-material/StopCircleSharp';
import Mic from '@mui/icons-material/Mic';
import EmptyIcon from '@mui/icons-material/GraphicEq';
import ArrowRight from '@mui/icons-material/TrendingFlat'
import Arrow from '@mui/icons-material/ArrowUpwardOutlined';
import { uniqueId } from "lodash";
import { FunctionCallResultType, JwtPayload, SelectedFileType, SessionsItemType, SpecialPromptEnum } from "./ai.types";
import server from "../../assets/address.json"
import { useSpeechToText } from "./hooks/useSpeechToText";
import { io, Socket } from "socket.io-client";
import resultViewLink from './localfiles/resultViewLink.json'
import TenderChoice from "./components/tenderChoice";
import HistoryItem from "./components/historyItem";



const conversations = [
    "Role management",
    "User management",
    "Permissions",
];

function AiAgentPage() {

    //#region-------------------- Constants---------------
    const navigate = useNavigate();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const {
        start,
        stop,
        isListening,
    } = useSpeechToText();
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const userefSocket = useRef<Socket>();
    const abortingref = useRef(false);
    //#endregion----------------- Constants---------------


    //#region-------------------- States---------------

    const [selectedFile, setSelectedFile] = useState<SelectedFileType[]>([]);
    const [showWorkspace, setShowWorkspace] = useState(false);
    const [loadingButton, setLoadingButton] = useState<boolean>(false);
    const [voiceInput, setVoiceInput] = useState('');
    const [alert, setAlert] = useState<AlertType>({
        alertMessage: "",
        severity: "info",
        onClose: () => { }
    })
    const [history, setHistory] = useState<FunctionCallResultType[]>([])
    const [progress, setProgress] = useState({
        currentOp: undefined
    })
    const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
    const [sessionHasPrompts, setSessionHasPrompts] = useState(false);
    const [sessionList, setSessionList] = useState<SessionsItemType[]>([])
    const [specialPrompt, setSpecialPrompt] = useState<SpecialPromptEnum | null>(null)
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [pendingConfirmation, setPendingConfirmation] = useState<any>(null);

    //#endregion----------------- States ---------------


    //#region-------------------- Handlers ---------------

    const handleFileChange = async (event: any) => {
        const file = event.target.files?.[0];
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {

            setAlert({
                alertMessage: "Lütfen önce giriş yapın.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        if (file) {
            const formData = new FormData();
            formData.append('file', file);

            try {
                const uploadResponse = await axios.post(
                    server.baseurl + server.baseinfo + "upload-files",
                    formData,
                    { headers: { 'Content-Type': 'multipart/form-data', 'Authorization': `Bearer ${authToken}` } }
                );

                if (uploadResponse.data.httpStatusCode === 201) {
                    setSelectedFile([...selectedFile, { file, path: uploadResponse.data.data.files }]);
                } else {
                    return null;
                }
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
                alertMessage: "Lütfen önce giriş yapın.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
            navigate('/');
            return;
        }

        try {
            setLoadingButton(true);

            const response = await axios.post(
                'http://localhost:3001/api/baseinfo/agent',
                {
                    prompt: voiceInput,
                    files: selectedFile.map((file) => file.path),
                    sessionId: currentSessionId
                },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );

            if (response.data.httpStatusCode === 200 || response.status === 201) {



            }
        } catch (error: any) {
            if (error.response?.status === 401) {
                localStorage.removeItem('authToken');
                navigate('/');
                setAlert({
                    alertMessage: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            } else {
                setAlert({
                    alertMessage: error.response?.data?.message || "Mesaj gönderiminde hata oluştu.",
                    severity: "error",
                    onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
                })
            }
        } finally {

        }
    }, [voiceInput, alert, navigate, selectedFile]);


    const generateResultViewLink = (toolName: string) => {

        if (!toolName) return "";
        const key = toolName.trim();
        return resultViewLink[key as keyof typeof resultViewLink] ?? "";
    }
    const handleCancel = useCallback(() => {
        userefSocket.current?.emit('cancel-execution');
    }, []);
    // تابع جدید (کنار handleSubmit)

    const handleNewChat = useCallback(async () => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            const response = await axios.post(
                'http://localhost:3001/api/agent/sessions/new',
                {},
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
            setCurrentSessionId(response.data.data.sessionId);
            setHistory([]);
            setVoiceInput('');
        } catch (error) {
            setAlert({
                alertMessage: "Yeni sohbet başlatılırken hata oluştu.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }, [alert, navigate]);

    const getToolExecution = async (sessionId: string) => {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            const response = await axios.get(
                `http://localhost:3001/api/agent/sessions/${sessionId}/executions`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
            setHistory(response.data.data)
            setCurrentSessionId(sessionId)
            console.clear();
            console.log(response.data.data);

        } catch (error) {
            setAlert({
                alertMessage: "Yeni sohbet başlatılırken hata oluştu.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }

    const onClickSuccesItem = (item: FunctionCallResultType) => {
        setVoiceInput(item.prompt)
    }

    const handleConfirmAction = async(confirmed: boolean) => {
    

             const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            navigate('/');
            return;
        }
        try {
            const response = await axios.put(
                `http://localhost:3001/api/agent/sessions/confirm-action`,
            {
               confirmed
            },
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );


        } catch (error) {
            setAlert({
                alertMessage: "Yeni sohbet başlatılırken hata oluştu.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }

        
 
    };

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
            const response = await axios.get(
                'http://localhost:3001/api/agent/sessions',
                {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    }
                }
            );
            setSessionList(response.data.data);

        } catch (error) {
            setAlert({
                alertMessage: "Yeni sohbet başlatılırken hata oluştu.",
                severity: "error",
                onClose: () => { setAlert({ ...alert, alertMessage: "" }) }
            })
        }
    }

    const handleSpecialPrompt = () => {


        switch (specialPrompt) {
            case SpecialPromptEnum.create_tender:
                return handleTender();

            // no break needed because we return
            default:
                return null;
        }
    }

    const handleTender = () => {

        return <TenderChoice setVoiceInput={setVoiceInput} />

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
            }


            setProgress({ currentOp: undefined })


        }
        const handleToolCurrent = (data: any) => {
            setProgress({ currentOp: data.currentOp })
        }
        userefSocket.current = io('http://localhost:3001/agent', {
            path: '/socket.io',
            transports: ['websocket', 'polling'] as string[],

            query: {
                userId: userId
            }
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
            userefSocket.current?.off('agent-tool-result', handleToolResult);
            userefSocket.current?.off('agent-current-tool', handleToolCurrent);
            userefSocket.current?.disconnect();
        };
    }, [])

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
        <div className="agent-page">
            {/* Sidebar */}


            <aside className="agent-sidebar">
                <div className="sidebar-header">
                    <div className="brand">
                        <div className="brand-icon">AI</div>

                        <div>
                            <strong>AI Agent</strong>
                            <span>Workspace</span>
                        </div>
                    </div>

                    <button className="new-chat-button">
                        <span>+</span>
                        New Chat
                    </button>
                </div>

                <div className="conversation-section">
                    <div className="section-label">TODAY</div>

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
                            <strong>Agent online</strong>
                            <span>Ready to execute</span>
                        </div>
                    </div>
                </div>
            </aside>

            <main className="agent-main">



                {/* Workspace */}
                <div className="workspace">

                    <div className="history-sidebar">
                        <div className="history-sidebar__header">Kayıtlar</div>
                        <div className="history-sidebar__list">
                            {
                                sessionList.map((item, index) => (
                                    <HistoryItem
                                        key={item.id}
                                        getToolExecution={getToolExecution}
                                        id={item.id}
                                        title={item.title}
                                        createdAt={item.createdAt}
                                        status={index % 2 === 0 ? 'success' : 'error'}
                                    />
                                ))
                            }
                        </div>
                    </div>


                    {/* Result Workspace */}
                    <section
                        className={`result-panel ${showWorkspace ? "show-mobile" : ""
                            }`}
                    >
                        <div className="result-header">
                            <div>
                                <span className="eyebrow">
                                    ÇALIŞMA ALANI
                                </span>

                                <h2>İşlem sonucu</h2>
                            </div>
                            <div className={`newchat ${currentSessionId == null || !sessionHasPrompts ? "inactive" : "active"}`} onClick={handleNewChat}>
                                <span>New Chat</span>
                            </div>
                        </div>


                        <div className="result-content">
                            {
                                progress.currentOp != undefined && (
                                    <div className="progress-current" style={{ padding: "8px", paddingLeft: "35px", color: "#22222" }}>

                                        <span className="progress-text">{progress.currentOp}</span>
                                        <span className="progress-dots">...</span>
                                    </div>
                                )
                            }

                            {history.map((item, index) => {
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
                                                <div><ArrowRight style={{ fill: isSuccess ? "#28ab2a" : "red" }} /></div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    <strong style={{ overflow: "hidden", textWrap: "nowrap", textOverflow: "ellipsis", display: "flex", alignItems: "center" }}>
                                                        {item.message}
                                                    </strong>
                                                    {item.toolName && (
                                                        <a
                                                            href={generateResultViewLink(item.toolName)}
                                                            style={{ color: "blue", textDecoration: "underline", textWrap: "nowrap" }}
                                                            target="_blank"
                                                            onClick={(event) => event.stopPropagation()}
                                                        >
                                                            Sonucu Görüntüle
                                                        </a>
                                                    )}
                                                    <span style={{ fontWeight: "bold", color: "black" }}>
                                                        {item.time}
                                                    </span>
                                                </div>
                                            </div>

                                            <span className={`${isSuccess ? "success-pill" : "error-pill"}`}>
                                                {isSuccess ? "Başarı" : "Hata"}
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
                            })}
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
                                    placeholder="Temsilcinize sorun..."
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
                                        title="Attach file"
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
                                            title="Voice input"
                                        >
                                            <Mic style={{ fill: isListening ? "greenyellow" : "gray" }} />
                                        </button>

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
                                    Göndermek için Enter'a basın
                                </span>

                                <span>
                                    Yeni satır için Shift + Enter
                                </span>
                            </div>
                        </div>
                    </section>
                    <div style={{ left: "5px", top: "10px", display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>

                    </div>
                </div>
            </main>

            <Dialog
                open={confirmDialogOpen}
                onClose={() => handleConfirmAction(false)}
                aria-labelledby="confirm-delete-dialog-title"
                style={{minWidth:"20vw",minHeight:"20vh"}}
            >
                <DialogTitle id="confirm-delete-dialog-title">Onay gerekli</DialogTitle>
                <DialogContent>
                    <DialogContentText style={{textAlign:"center"}}>
                        {pendingConfirmation?.message || 'Bu işlem silme işlemi yapacaktır. Devam etmek istediğinize emin misiniz?'}
                    </DialogContentText>
                </DialogContent>
                <DialogActions style={{justifyContent:"center",display:"flex"}}>
                    <Button onClick={() => handleConfirmAction(false)} color="inherit">
                        Hayır
                    </Button>
                    <Button onClick={() => handleConfirmAction(true)} color="error" variant="contained" autoFocus>
                        Evet, devam et
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}



export default AiAgentPage;