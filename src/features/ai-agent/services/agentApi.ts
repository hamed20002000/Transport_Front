import axios from 'axios';
import server from 'src/core/config/endpoints.json';
import type { FunctionCallResultType, SelectedFileType, SessionsItemType } from 'src/features/ai-agent/types/index.ts';

/**
 * Where the assistant panel talks to.
 * - `admin`: the admin workspace on tarabari_backend (tools for roles, users, tenders…).
 * - `account`: drivers/companies/brokers on transport_backend's `api/agent/chat`; the result
 *   of every command still arrives on that backend's `/agent` socket.
 */
export type AgentBackend = 'admin' | 'account';

export interface AgentApi {
  socketUrl: string;
  newSession(): Promise<string>;
  listSessions(): Promise<SessionsItemType[]>;
  searchSessions(query: string): Promise<SessionsItemType[]>;
  executions(sessionId: string): Promise<FunctionCallResultType[]>;
  send(prompt: string, sessionId: string | null, files: SelectedFileType[]): Promise<void>;
  /** Uploads an attachment; returns what `send` needs to reference it, or null. */
  uploadFile(file: File): Promise<string | null>;
  confirmAction(confirmed: boolean): Promise<void>;
  /**
   * `admin` transcribes and returns the text for the input box; `account` sends the recording as a
   * command (the server transcribes and runs it) and returns the recognised text.
   */
  voice(audio: Blob, sessionId: string | null, onUploaded?: () => void): Promise<string>;
  /** Whether `voice` already runs the command (so the panel shows progress instead of filling the input). */
  voiceRunsCommand: boolean;
  /** Missing where the backend cannot rename a chat. */
  renameSession?: (sessionId: string, name: string) => Promise<void>;
}

const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('authToken')}` });
const json = () => ({ headers: { ...auth(), Accept: 'application/json', 'Content-Type': 'application/json' } });
const multipart = () => ({ headers: { ...auth(), 'Content-Type': 'multipart/form-data' } });

// Fires once the recording has left the browser, i.e. when the server starts transcribing it.
const uploadDone = (onUploaded?: () => void) => ({
  onUploadProgress: (event: { loaded: number; total?: number }) => {
    if (onUploaded && event.total && event.loaded >= event.total) onUploaded();
  },
});

// MediaRecorder picks the container (webm in Chrome, mp4 in Safari); the server checks the type.
// Fields go before the file so the server has them before the upload is streamed.
const audioForm = (audio: Blob, fields: Record<string, string> = {}) => {
  const extension = audio.type.includes('mp4') ? 'm4a' : audio.type.includes('ogg') ? 'ogg' : 'webm';
  const form = new FormData();
  Object.entries(fields).forEach(([name, value]) => form.append(name, value));
  form.append('file', audio, `recording.${extension}`);
  return form;
};

// "http://localhost:3006/api/" → "http://localhost:3006"
const origin = (apiUrl: string) => new URL(apiUrl, window.location.origin).origin;

function adminApi(): AgentApi {
  const base = `${server.tarabariurl}agent/`;
  return {
    socketUrl: `${server.socketurl}/agent`,
    newSession: async () => (await axios.post(`${base}sessions/new`, {}, json())).data.data.sessionId,
    listSessions: async () => (await axios.get(`${base}sessions`, json())).data.data ?? [],
    searchSessions: async (query) => (await axios.get(`${base}sessions/search?q=${encodeURIComponent(query)}`, json())).data.data ?? [],
    executions: async (sessionId) => (await axios.get(`${base}sessions/${sessionId}/executions`, json())).data.data ?? [],
    send: async (prompt, sessionId, files) => {
      await axios.post(`${server.tarabariurl}baseinfo/agent`, { prompt, files: files.map((file) => file.path), sessionId }, json());
    },
    uploadFile: async (file) => {
      const form = new FormData();
      form.append('file', file);
      const response = await axios.post(`${server.baseurl}${server.baseinfo}upload-files`, form, multipart());
      return response.data.httpStatusCode === 201 ? response.data.data.files : null;
    },
    confirmAction: async (confirmed) => {
      await axios.put(`${base}sessions/confirm-action`, { confirmed }, json());
    },
    voice: async (audio, _sessionId, onUploaded) =>
      (await axios.post(`${base}speech/transcribe-test`, audioForm(audio), { ...multipart(), ...uploadDone(onUploaded) })).data.data.text,
    voiceRunsCommand: false,
    renameSession: async (sessionId, name) => {
      await axios.put(`${base}sessions/changename`, { sessionId, name }, json());
    },
  };
}

function accountApi(): AgentApi {
  const base = `${server.baseurl}agent/chat/`;
  const listSessions = async (): Promise<SessionsItemType[]> => (await axios.get(`${base}sessions`, json())).data.data ?? [];
  return {
    socketUrl: `${origin(server.baseurl)}/agent`,
    newSession: async () => (await axios.post(`${base}sessions`, {}, json())).data.data.sessionId,
    listSessions,
    // No search endpoint here; the user's own chat list is short enough to filter by title.
    searchSessions: async (query) => {
      const needle = query.trim().toLowerCase();
      return (await listSessions()).filter((session) => session.title?.toLowerCase().includes(needle));
    },
    executions: async (sessionId) => (await axios.get(`${base}sessions/${sessionId}/executions`, json())).data.data ?? [],
    send: async (prompt, sessionId, files) => {
      await axios.post(`${base}message`, { sessionId, prompt, fileIds: files.length ? files.map((file) => file.path) : undefined }, json());
    },
    uploadFile: async (file) => {
      const form = new FormData();
      form.append('file', file);
      return (await axios.post(`${base}files`, form, multipart())).data.data?.fileId ?? null;
    },
    confirmAction: async (confirmed) => {
      await axios.put(`${base}confirm-action`, { confirmed }, json());
    },
    voice: async (audio, sessionId, onUploaded) =>
      (await axios.post(`${base}voice`, audioForm(audio, { sessionId: sessionId ?? '' }), { ...multipart(), ...uploadDone(onUploaded) })).data.data
        ?.text ?? '',
    voiceRunsCommand: true,
  };
}

export const agentApi = (backend: AgentBackend): AgentApi => (backend === 'account' ? accountApi() : adminApi());
