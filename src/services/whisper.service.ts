import { pipeline } from '@huggingface/transformers';

let transcriber: any = null;
let loadingPromise: Promise<any> | null = null;

