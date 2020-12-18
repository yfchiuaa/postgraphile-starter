/// <reference types="node" />
import { AddFlagFn } from './cli';
import { Server, IncomingMessage } from 'http';
import { HttpRequestHandler, PostGraphileOptions } from '../interfaces';
import { WithPostGraphileContextFn } from './withPostGraphileContext';
import * as graphql from 'graphql';
import { ExecutionParams } from 'subscriptions-transport-ws';
export declare type HookFn<TArg, TContext = any> = (arg: TArg, context: TContext) => TArg;
export declare type PluginHookFn = <TArgument, TContext = Record<string, any>>(hookName: string, argument: TArgument, context?: TContext) => TArgument;
export interface PostGraphileHTTPResult {
    statusCode?: number;
    result?: Record<string, any>;
    errors?: Array<Record<string, any>>;
    meta?: Record<string, any>;
}
export interface PostGraphileHTTPEnd {
    statusCode?: number;
    result: Record<string, any> | Array<Record<string, any>>;
}
export interface PostGraphilePlugin {
    init?: HookFn<null>;
    pluginHook?: HookFn<PluginHookFn>;
    'cli:flags:add:standard'?: HookFn<AddFlagFn>;
    'cli:flags:add:schema'?: HookFn<AddFlagFn>;
    'cli:flags:add:errorHandling'?: HookFn<AddFlagFn>;
    'cli:flags:add:plugins'?: HookFn<AddFlagFn>;
    'cli:flags:add:noServer'?: HookFn<AddFlagFn>;
    'cli:flags:add:webserver'?: HookFn<AddFlagFn>;
    'cli:flags:add:jwt'?: HookFn<AddFlagFn>;
    'cli:flags:add'?: HookFn<AddFlagFn>;
    'cli:flags:add:deprecated'?: HookFn<AddFlagFn>;
    'cli:flags:add:workarounds'?: HookFn<AddFlagFn>;
    'cli:library:options'?: HookFn<PostGraphileOptions, {
        config: any;
        cliOptions: any;
    }>;
    'cli:server:middleware'?: HookFn<HttpRequestHandler>;
    'cli:server:created'?: HookFn<Server>;
    'cli:greeting'?: HookFn<Array<string | null | void>>;
    'postgraphile:options'?: HookFn<PostGraphileOptions>;
    'postgraphile:validationRules:static'?: HookFn<typeof graphql.specifiedRules>;
    'postgraphile:graphiql:html'?: HookFn<string>;
    'postgraphile:http:handler'?: HookFn<IncomingMessage>;
    'postgraphile:http:result'?: HookFn<PostGraphileHTTPResult>;
    'postgraphile:http:end'?: HookFn<PostGraphileHTTPEnd>;
    'postgraphile:httpParamsList'?: HookFn<Array<Record<string, any>>>;
    'postgraphile:validationRules'?: HookFn<typeof graphql.specifiedRules>;
    'postgraphile:middleware'?: HookFn<HttpRequestHandler>;
    'postgraphile:ws:onOperation'?: HookFn<ExecutionParams>;
    withPostGraphileContext?: HookFn<WithPostGraphileContextFn>;
}
export declare function makePluginHook(plugins: Array<PostGraphilePlugin>): PluginHookFn;
export declare function pluginHookFromOptions(options: PostGraphileOptions): PluginHookFn;
