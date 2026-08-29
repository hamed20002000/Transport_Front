import { useRef, useState, useCallback } from "react";
import axios from "axios";

export function useSpeechToText(onTranscribed: (text: string) => void) {
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const [isListening, setIsListening] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);

    const start = useCallback(async () => {
        try {
            // دسترسی به میکروفون کاربر
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            // هر تکه‌ی صوتی که ضبط می‌شه رو جمع می‌کنیم
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsListening(true);
        } catch (error) {
            console.error("Mikrofon erişimi reddedildi veya hata oluştu:", error);
        }
    }, []);

    const stop = useCallback(() => {
        const mediaRecorder = mediaRecorderRef.current;
        if (!mediaRecorder) return;

        // وقتی ضبط واقعاً متوقف بشه، این callback اجرا می‌شه
        mediaRecorder.onstop = async () => {
            setIsListening(false);
            setIsTranscribing(true);

            // همه‌ی تکه‌های صوتی رو به یک فایل واحد تبدیل کن
            const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

            try {
                const authToken = localStorage.getItem("authToken");
                const formData = new FormData();
                formData.append("file", audioBlob, "recording.webm");

                const response = await axios.post(
                    "http://localhost:3001/api/agent/speech/transcribe-test",
                    formData,
                    {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            Authorization: `Bearer ${authToken}`,
                        },
                    }
                );

          
                onTranscribed(response.data.data.text);
            } catch (error) {
                console.error("Ses metne dönüştürülürken hata oluştu:", error);
            } finally {
                setIsTranscribing(false);
            }

            // میکروفون رو آزاد کن (چراغ ضبط مرورگر خاموش بشه)
            streamRef.current?.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.stop();
    }, [onTranscribed]);

    const cancel=useCallback(()=>{
     mediaRecorderRef.current?.stop()
     setIsListening(false)
    },[])

    return { start, stop,cancel, isListening, isTranscribing };
}