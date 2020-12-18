/// <reference types="node" />
import { IncomingMessage, ServerResponse } from 'http';
import { CreateRequestHandlerOptions } from '../../interfaces';
export default function setupServerSentEvents(req: IncomingMessage, res: ServerResponse, options: CreateRequestHandlerOptions): void;
