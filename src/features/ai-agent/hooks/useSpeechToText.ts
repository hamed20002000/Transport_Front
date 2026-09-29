import { useRef, useState, useCallback } from "react";

/**
 * ضبط صدا از میکروفون. فایل ضبط‌شده به onRecorded داده می‌شود و خود پنل تصمیم
 * می‌گیرد کجا بفرستدش (agentApi: تبدیل به متن، یا اجرای مستقیم به‌عنوان دستور).
 */
export function useSpeechToText(onRecorded: (audio: Blob) => void | Promise<void>) {
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
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            cancelledRef.current = false;

            // هر تکه‌ی صوتی که ضبط می‌شه رو جمع می‌کنیم
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (error) {
            console.error("دسترسی به میکروفون رد شد یا خطا رخ داد:", error);
        }
    }, []);

    const stop = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return;

        // وقتی ضبط واقعاً متوقف بشه، این callback اجرا می‌شه
        mediaRecorder.onstop = async () => {
            setIsListening(false);
            releaseMicrophone();
            if (cancelledRef.current || !audioChunksRef.current.length) return;

            // نوع واقعی ضبط (webm در کروم، mp4 در سافاری) تا سرور درست تشخیصش بده
            const audio = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });
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
