export type FunctionCallResultType={
    result:"error"|"success",
    message:string,
    prompt:string;
    list:any[],
    time:string,
    id:string,
    attachments?:File[],
    continuePrompt?:string,
    toolName?:string,
}

export type SelectedFileType={
    file:File,
    path:string,
}


export interface JwtPayload {
  username?: string;
  role?: string | string[];
  userid?: string;
}

export interface SessionsItemType{
    id: string;
    title: string;
    createdAt: Date;
}

export enum SpecialPromptEnum{
    "create_tender"="create_tender",
    "create_network"="create_network"
}


import { Dispatch, SetStateAction } from "react";

export type TenderChoiceProps = {
    onManual?: () => void;
    onDownload?: () => void;
    filename?: string;
    templateData?: Array<Array<string | number>>;
    setVoiceInput: Dispatch<SetStateAction<string>>
};

export type HistoryItemType={
    
}