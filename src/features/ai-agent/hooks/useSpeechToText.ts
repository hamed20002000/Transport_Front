import { useRef, useState, useCallback } from "react";

/**
 * ضبط صدا از میکروفون. فایل ضبط‌شده به onRecorded داده می‌شود و خود پنل تصمیم
 * می‌گیرد کجا بفرستدش (agentApi: تبدیل به متن، یا اجرای مستقیم به‌عنوان دستور).
 */
// اولین فرمتی که مرورگر پشتیبانی می‌کند؛ سافاری iOS فقط mp4 می‌دهد و گاهی mimeType را خالی برمی‌گرداند
const RECORDING_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
const pickRecordingType = () =>
    RECORDING_TYPES.find((type) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type));

export function useSpeechToText(
    onRecorded: (audio: Blob) => void | Promise<void>,
    onError?: (message: string) => void,
) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const cancelledRef = useRef(false);

    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const releaseMicrophone = () => {
        // میکروفون رو آزاد کن (چراغ ضبط مرورگر خاموش بشه)
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
    };

    const start = useCallback(async () => {
        // روی HTTP (مثلاً باز کردن با IP شبکه روی گوشی) مرورگر اصلاً mediaDevices را نمی‌دهد
        if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
            onError?.("ضبط صدا فقط روی اتصال امن (HTTPS) کار می‌کند.");
            return;
        }
        if (typeof MediaRecorder === "undefined") {
            onError?.("مرورگر شما از ضبط صدا پشتیبانی نمی‌کند.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = pickRecordingType();
            const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            cancelledRef.current = false;

            // هر تکه‌ی صوتی که ضبط می‌شه رو جمع می‌کنیم
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            // با timeslice تکه‌ها مرتب می‌رسند؛ بعضی مرورگرهای موبایل بدون آن در stop داده‌ی خالی می‌دهند
            mediaRecorder.start(1000);
            setIsListening(true);
        } catch (error) {
            console.error("دسترسی به میکروفون رد شد یا خطا رخ داد:", error);
            releaseMicrophone();
            const denied = (error as DOMException)?.name === "NotAllowedError";
            onError?.(denied
                ? "دسترسی به میکروفون داده نشده است؛ از تنظیمات مرورگر اجازه دهید."
                : "شروع ضبط صدا با خطا روبه‌رو شد.");
        }
    }, [onError]);

    const stop = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return;

        // وقتی ضبط واقعاً متوقف بشه، این callback اجرا می‌شه
        mediaRecorder.onstop = async () => {
            setIsListening(false);
            releaseMicrophone();
            if (cancelledRef.current || !audioChunksRef.current.length) return;

            // نوع واقعی ضبط (webm در کروم، mp4 در سافاری) تا سرور درست تشخیصش بده
            const type = mediaRecorder.mimeType || audioChunksRef.current[0]?.type || pickRecordingType() || "audio/webm";
            const audio = new Blob(audioChunksRef.current, { type });
            setIsTranscribing(true);
            try {
                await onRecorded(audio);
            } finally {
                setIsTranscribing(false);
            }
        };

        mediaRecorder.stop();
    }, [onRecorded]);

    const cancel = useCallback(() => {
        cancelledRef.current = true;
        mediaRecorderRef.current?.stop();
        setIsListening(false);
        releaseMicrophone();
    }, []);

    return { start, stop, cancel, isListening, isTranscribing };
}
