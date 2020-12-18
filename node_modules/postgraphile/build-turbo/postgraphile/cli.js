#!/usr/bin/env node
"use strict";
// tslint:disable no-console
Object.defineProperty(exports, "__esModule", { value: true });
/*
 * IMPORTANT: the './postgraphilerc' import MUST come first!
 *
 * Reason: enables user to apply modifications to their Node.js environment
 * (e.g. sourcing modules that affect global state, like dotenv) before any of
 * our other require()s occur.
 */
const postgraphilerc_1 = require("./postgraphilerc");
const http_1 = require("http");
const chalk_1 = require("chalk");
const program = require("commander");
const pg_connection_string_1 = require("pg-connection-string");
const postgraphile_1 = require("./postgraphile");
const plugins_1 = require("../plugins");
const pg_1 = require("pg");
const cluster = require("cluster");
const pluginHook_1 = require("./pluginHook");
const debugFactory = require("debug");
const manifest = require("../../package.json");
const sponsors = require("../../sponsors.json");
const subscriptions_1 = require("./http/subscriptions");
const fs_1 = require("fs");
const tagsFile = process.cwd() + '/postgraphile.tags.json5';
/*
 * Watch mode on the tags file is non-trivial, so only load the plugin if the
 * file exists when PostGraphile starts.
 */
const smartTagsPlugin = fs_1.existsSync(tagsFile) ? plugins_1.makePgSmartTagsFromFilePlugin() : null;
const isDev = process.env.POSTGRAPHILE_ENV === 'development';
function isString(str) {
    return typeof str === 'string';
}
const sponsor = sponsors[Math.floor(sponsors.length * Math.random())];
const debugCli = debugFactory('postgraphile:cli');
// TODO: Demo Postgres database
const DEMO_PG_URL = null;
function extractPlugins(rawArgv) {
    let argv;
    let pluginStrings = [];
    if (rawArgv[2] === '--plugins') {
        pluginStrings = rawArgv[3].split(',');
        argv = [...rawArgv.slice(0, 2), ...rawArgv.slice(4)];
    }
    else {
        pluginStrings = (postgraphilerc_1.default && postgraphilerc_1.default['options'] && postgraphilerc_1.default['options']['plugins']) || [];
        argv = rawArgv;
    }
    const plugins = pluginStrings.map((pluginString) => {
        debugCli('Loading plugin %s', pluginString);
        const rawPlugin = require(pluginString); // tslint:disable-lin no-var-requires
        if (rawPlugin['default'] && typeof rawPlugin['default'] === 'object') {
            return rawPlugin['default'];
        }
        else {
            return rawPlugin;
        }
    });
    return { argv, plugins };
}
const { argv: argvSansPlugins, plugins: extractedPlugins } = extractPlugins(process.argv);
const pluginHook = pluginHook_1.makePluginHook(extractedPlugins);
program.version(manifest.version).usage('[options...]').description(manifest.description);
function addFlag(optionString, description, parse) {
    program.option(optionString, description, parse);
    return addFlag;
}
// Standard options
program
    .option('--plugins <string>', 'a list of PostGraphile server plugins (not Graphile Engine schema plugins) to load; if present, must be the _first_ option')
    .option('-c, --connection <string>', "the PostgreSQL database name or connection string. If omitted, inferred from environmental variables (see https://www.postgresql.org/docs/current/static/libpq-envars.html). Examples: 'db', 'postgres:///db', 'postgres://user:password@domain:port/db?ssl=true'")
    .option('-C, --owner-connection <string>', 'as `--connection`, but for a privileged user (e.g. for setting up watch fixtures, logical decoding, etc); defaults to the value from `--connection`')
    .option('-s, --schema <string>', 'a Postgres schema to be introspected. Use commas to define multiple schemas', (option) => option.split(','))
    .option('-S, --subscriptions', 'Enable GraphQL websocket transport support for subscriptions (you still need a subscriptions plugin currently)')
    .option('-L, --live', '[EXPERIMENTAL] Enables live-query support via GraphQL subscriptions (sends updated payload any time nested collections/records change). Implies --subscriptions')
    .option('-w, --watch', 'automatically updates your GraphQL schema when your database schema changes (NOTE: requires DB superuser to install `postgraphile_watch` schema)')
    .option('-n, --host <string>', 'the hostname to be used. Defaults to `localhost`')
    .option('-p, --port <number>', 'the port to be used. Defaults to 5000', parseFloat)
    .option('-m, --max-pool-size <number>', 'the maximum number of clients to keep in the Postgres pool. defaults to 10', parseFloat)
    .option('-r, --default-role <string>', 'the default Postgres role to use when a request is made. supercedes the role used to connect to the database')
    .option('--retry-on-init-fail', 'if an error occurs building the initial schema, this flag will cause PostGraphile to keep trying to build the schema with exponential backoff rather than exiting');
pluginHook('cli:flags:add:standard', addFlag);
// Schema configuration
program
    .option('-j, --dynamic-json', '[RECOMMENDED] enable dynamic JSON in GraphQL inputs and outputs. PostGraphile uses stringified JSON by default')
    .option('-N, --no-setof-functions-contain-nulls', '[RECOMMENDED] if none of your `RETURNS SETOF compound_type` functions mix NULLs with the results then you may enable this to reduce the nullables in the GraphQL schema')
    .option('-a, --classic-ids', 'use classic global id field name. required to support Relay 1')
    .option('-M, --disable-default-mutations', 'disable default mutations, mutation will only be possible through Postgres functions')
    .option('--simple-collections <omit|both|only>', '"omit" (default) - relay connections only, "only" - simple collections only (no Relay connections), "both" - both')
    .option('--no-ignore-rbac', '[RECOMMENDED] set this to exclude fields, queries and mutations that are not available to any possible user (determined from the user in connection string and any role they can become); this will be enabled by default in v5')
    .option('--no-ignore-indexes', '[RECOMMENDED] set this to exclude filters, orderBy, and relations that would be expensive to access due to missing indexes')
    .option('--include-extension-resources', 'by default, tables and functions that come from extensions are excluded; use this flag to include them (not recommended)');
pluginHook('cli:flags:add:schema', addFlag);
// Error enhancements
program
    .option('--show-error-stack [json|string]', 'show JavaScript error stacks in the GraphQL result errors (recommended in development)')
    .option('--extended-errors <string>', "a comma separated list of extended Postgres error fields to display in the GraphQL result. Recommended in development: 'hint,detail,errcode'. Default: none", (option) => option.split(',').filter(_ => _));
pluginHook('cli:flags:add:errorHandling', addFlag);
// Plugin-related options
program
    .option('--append-plugins <string>', 'a comma-separated list of plugins to append to the list of Graphile Engine schema plugins')
    .option('--prepend-plugins <string>', 'a comma-separated list of plugins to prepend to the list of Graphile Engine schema plugins')
    .option('--skip-plugins <string>', 'a comma-separated list of Graphile Engine schema plugins to skip');
pluginHook('cli:flags:add:plugins', addFlag);
// Things that relate to -X
program
    .option('--read-cache <path>', '[experimental] reads cached values from local cache file to improve startup time (you may want to do this in production)')
    .option('--write-cache <path>', '[experimental] writes computed values to local cache file so startup can be faster (do this during the build phase)')
    .option('--export-schema-json <path>', 'enables exporting the detected schema, in JSON format, to the given location. The directories must exist already, if the file exists it will be overwritten.')
    .option('--export-schema-graphql <path>', 'enables exporting the detected schema, in GraphQL schema format, to the given location. The directories must exist already, if the file exists it will be overwritten.')
    .option('--sort-export', 'lexicographically (alphabetically) sort exported schema for more stable diffing.')
    .option('-X, --no-server', '[experimental] for when you just want to use --write-cache or --export-schema-* and not actually run a server (e.g. CI)');
pluginHook('cli:flags:add:noServer', addFlag);
// Webserver configuration
program
    .option('-q, --graphql <path>', 'the route to mount the GraphQL server on. defaults to `/graphql`')
    .option('-i, --graphiql <path>', 'the route to mount the GraphiQL interface on. defaults to `/graphiql`')
    .option('--enhance-graphiql', '[DEVELOPMENT] opt in to additional GraphiQL functionality (this may change over time - only intended for use in development; automatically enables with `subscriptions` and `live`)')
    .option('-b, --disable-graphiql', 'disables the GraphiQL interface. overrides the GraphiQL route option')
    .option('-o, --cors', 'enable generous CORS settings; disabled by default, if possible use a proxy instead')
    .option('-l, --body-size-limit <string>', "set the maximum size of the HTTP request body that can be parsed (default 100kB). The size can be given as a human-readable string, such as '200kB' or '5MB' (case insensitive).")
    .option('--timeout <number>', 'set the timeout value in milliseconds for sockets', parseFloat)
    .option('--cluster-workers <count>', '[experimental] spawn <count> workers to increase throughput', parseFloat)
    .option('--enable-query-batching', '[experimental] enable the server to process multiple GraphQL queries in one request')
    .option('--disable-query-log', 'disable logging queries to console (recommended in production)')
    .option('--allow-explain', '[EXPERIMENTAL] allows users to use the Explain button in GraphiQL to view the plan for the SQL that is executed (DO NOT USE IN PRODUCTION)');
pluginHook('cli:flags:add:webserver', addFlag);
// JWT-related options
program
    .option('-e, --jwt-secret <string>', 'the secret to be used when creating and verifying JWTs. if none is provided auth will be disabled')
    .option('--jwt-verify-algorithms <string>', 'a comma separated list of the names of the allowed jwt token algorithms', (option) => option.split(','))
    .option('-A, --jwt-verify-audience <string>', "a comma separated list of JWT audiences that will be accepted; defaults to 'postgraphile'. To disable audience verification, set to ''.", (option) => option.split(',').filter(_ => _))
    .option('--jwt-verify-clock-tolerance <number>', 'number of seconds to tolerate when checking the nbf and exp claims, to deal with small clock differences among different servers', parseFloat)
    .option('--jwt-verify-id <string>', 'the name of the allowed jwt token id')
    .option('--jwt-verify-ignore-expiration', 'if `true` do not validate the expiration of the token defaults to `false`')
    .option('--jwt-verify-ignore-not-before', 'if `true` do not validate the notBefore of the token defaults to `false`')
    .option('--jwt-verify-issuer <string>', 'a comma separated list of the names of the allowed jwt token issuer', (option) => option.split(','))
    .option('--jwt-verify-subject <string>', 'the name of the allowed jwt token subject')
    .option('--jwt-role <string>', 'a comma seperated list of strings that create a path in the jwt from which to extract the postgres role. if none is provided it will use the key `role` on the root of the jwt.', (option) => option.split(','))
    .option('-t, --jwt-token-identifier <identifier>', 'the Postgres identifier for a composite type that will be used to create JWT tokens');
pluginHook('cli:flags:add:jwt', addFlag);
// Any other options
pluginHook('cli:flags:add', addFlag);
// Deprecated
program
    .option('--token <identifier>', '[DEPRECATED] Use --jwt-token-identifier instead. This option will be removed in v5.')
    .option('--secret <string>', '[DEPRECATED] Use --jwt-secret instead. This option will be removed in v5.')
    .option('--jwt-audiences <string>', '[DEPRECATED] Use --jwt-verify-audience instead. This option will be removed in v5.', (option) => option.split(','))
    .option('--legacy-functions-only', '[DEPRECATED] PostGraphile 4.1.0 introduced support for PostgreSQL functions than declare parameters with IN/OUT/INOUT or declare RETURNS TABLE(...); enable this flag to ignore these types of functions. This option will be removed in v5.');
pluginHook('cli:flags:add:deprecated', addFlag);
// Awkward application workarounds / legacy support
program
    .option('--legacy-relations <omit|deprecated|only>', "some one-to-one relations were previously detected as one-to-many - should we export 'only' the old relation shapes, both new and old but mark the old ones as 'deprecated', or 'omit' the old relation shapes entirely")
    .option('--legacy-json-uuid', `ONLY use this option if you require the v3 typenames 'Json' and 'Uuid' over 'JSON' and 'UUID'`);
pluginHook('cli:flags:add:workarounds', addFlag);
program.on('--help', () => {
    console.log(`
Get started:

  $ postgraphile
  $ postgraphile -c postgres://localhost/my_db
  $ postgraphile --connection postgres://user:pass@localhost/my_db --schema my_schema --watch --dynamic-json
`);
    process.exit(0);
});
program.parse(argvSansPlugins);
function exitWithErrorMessage(message) {
    console.error(message);
    console.error();
    console.error('For help, run `postgraphile --help`');
    process.exit(1);
}
if (program.args.length) {
    exitWithErrorMessage(`ERROR: some of the parameters you passed could not be processed: '${program.args.join("', '")}'`);
}
if (program['plugins']) {
    exitWithErrorMessage(`--plugins must be the first argument to postgraphile if specified`);
}
// Kill server on exit.
process.on('SIGINT', () => {
    process.exit(1);
});
// For `--no-*` options, `program` automatically contains the default,
// overriding our options. We typically want the CLI to "win", but not
// with defaults! So this code extracts those `--no-*` values and
// re-overwrites the values if necessary.
const configOptions = postgraphilerc_1.default['options'] || {};
const overridesFromOptions = {};
['ignoreIndexes', 'ignoreRbac', 'setofFunctionsContainNulls'].forEach(option => {
    if (option in configOptions) {
        overridesFromOptions[option] = configOptions[option];
    }
});
// Destruct our configuration file and command line arguments, use defaults, and rename options to
// something appropriate for JavaScript.
const { demo: isDemo = false, connection: pgConnectionString, ownerConnection, subscriptions, live, watch: watchPg, schema: dbSchema, host: hostname = 'localhost', port = 5000, timeout: serverTimeout, maxPoolSize, defaultRole: pgDefaultRole, retryOnInitFail, graphql: graphqlRoute = '/graphql', graphiql: graphiqlRoute = '/graphiql', enhanceGraphiql = false, disableGraphiql = false, secret: deprecatedJwtSecret, jwtSecret, jwtPublicKey, jwtAudiences, jwtVerifyAlgorithms, jwtVerifyAudience, jwtVerifyClockTolerance, jwtVerifyId, jwtVerifyIgnoreExpiration, jwtVerifyIgnoreNotBefore, jwtVerifyIssuer, jwtVerifySubject, jwtSignOptions = {}, jwtVerifyOptions: rawJwtVerifyOptions, jwtRole = ['role'], token: deprecatedJwtPgTypeIdentifier, jwtTokenIdentifier: jwtPgTypeIdentifier, cors: enableCors = false, classicIds = false, dynamicJson = false, disableDefaultMutations = false, ignoreRbac = true, includeExtensionResources = false, exportSchemaJson: exportJsonSchemaPath, exportSchemaGraphql: exportGqlSchemaPath, sortExport = false, showErrorStack: rawShowErrorStack, extendedErrors = [], bodySizeLimit, appendPlugins: appendPluginNames, prependPlugins: prependPluginNames, 
// replaceAllPlugins is NOT exposed via the CLI
skipPlugins: skipPluginNames, readCache, writeCache, legacyRelations: rawLegacyRelations = 'deprecated', server: yesServer, clusterWorkers, enableQueryBatching, setofFunctionsContainNulls = true, legacyJsonUuid, disableQueryLog, allowExplain, simpleCollections, legacyFunctionsOnly, ignoreIndexes, } = { ...postgraphilerc_1.default['options'], ...program, ...overridesFromOptions };
const showErrorStack = (val => {
    switch (val) {
        case 'string':
        case true:
            return true;
        case null:
        case undefined:
            return undefined;
        case 'json':
            return 'json';
        default: {
            exitWithErrorMessage(`Invalid argument for '--show-error-stack' - expected no argument, or 'string' or 'json'`);
        }
    }
})(rawShowErrorStack);
if (allowExplain && !disableGraphiql && !enhanceGraphiql) {
    exitWithErrorMessage('`--allow-explain` requires `--enhance-graphiql` or `--disable-graphiql`');
}
let legacyRelations;
if (!['omit', 'only', 'deprecated'].includes(rawLegacyRelations)) {
    exitWithErrorMessage(`Invalid argument to '--legacy-relations' - expected on of 'omit', 'deprecated', 'only'; but received '${rawLegacyRelations}'`);
}
else {
    legacyRelations = rawLegacyRelations;
}
const noServer = !yesServer;
// Add custom logic for getting the schemas from our CLI. If we are in demo
// mode, we want to use the `forum_example` schema. Otherwise the `public`
// schema is what we want.
const schemas = dbSchema || (isDemo ? ['forum_example'] : ['public']);
const ownerConnectionString = ownerConnection || pgConnectionString || process.env.DATABASE_URL;
// Work around type mismatches between parsePgConnectionString and PoolConfig
const coerce = (o) => {
    return {
        ...o,
        application_name: o['application_name'] || undefined,
        ssl: o.ssl != null ? !!o.ssl : undefined,
        user: typeof o.user === 'string' ? o.user : undefined,
        database: typeof o.database === 'string' ? o.database : undefined,
        password: typeof o.password === 'string' ? o.password : undefined,
        port: o.port || typeof o.port === 'number' ? o.port : undefined,
        host: typeof o.host === 'string' ? o.host : undefined,
    };
};
// Create our Postgres config.
const pgConfig = {
    // If we have a Postgres connection string, parse it and use that as our
    // config. If we don’t have a connection string use some environment
    // variables or final defaults. Other environment variables should be
    // detected and used by `pg`.
    ...(pgConnectionString || process.env.DATABASE_URL || isDemo
        ? coerce(pg_connection_string_1.parse(pgConnectionString || process.env.DATABASE_URL || DEMO_PG_URL))
        : {
            host: process.env.PGHOST || process.env.PGHOSTADDR || 'localhost',
            port: (process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : null) || 5432,
            database: process.env.PGDATABASE,
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD,
        }),
    // Add the max pool size to our config.
    max: maxPoolSize,
};
const loadPlugins = (rawNames) => {
    if (!rawNames) {
        return undefined;
    }
    const names = Array.isArray(rawNames) ? rawNames : String(rawNames).split(',');
    return names.map(rawName => {
        if (typeof rawName === 'function') {
            return rawName;
        }
        const name = String(rawName);
        const parts = name.split(':');
        let root;
        try {
            root = require(String(parts.shift()));
        }
        catch (e) {
            // tslint:disable-next-line no-console
            console.error(`Failed to load plugin '${name}'`);
            throw e;
        }
        let plugin = root;
        let part;
        while ((part = parts.shift())) {
            plugin = plugin[part];
            if (plugin == null) {
                throw new Error(`No plugin found matching spec '${name}' - failed at '${part}'`);
            }
        }
        if (typeof plugin === 'function') {
            return plugin;
        }
        else if (plugin === root && typeof plugin.default === 'function') {
            return plugin.default; // ES6 workaround
        }
        else {
            throw new Error(`No plugin found matching spec '${name}' - expected function, found '${typeof plugin}'`);
        }
    });
};
if (jwtAudiences != null && jwtVerifyAudience != null) {
    exitWithErrorMessage(`Provide either '--jwt-audiences' or '-A, --jwt-verify-audience' but not both`);
}
function trimNulls(obj) {
    return Object.keys(obj).reduce((memo, key) => {
        if (obj[key] != null) {
            memo[key] = obj[key];
        }
        return memo;
    }, {});
}
if (rawJwtVerifyOptions &&
    (jwtVerifyAlgorithms ||
        jwtVerifyAudience ||
        jwtVerifyClockTolerance ||
        jwtVerifyId ||
        jwtVerifyIgnoreExpiration ||
        jwtVerifyIgnoreNotBefore ||
        jwtVerifyIssuer ||
        jwtVerifySubject)) {
    exitWithErrorMessage('You may not mix `jwtVerifyOptions` with the legacy `jwtVerify*` settings; please only provide `jwtVerifyOptions`.');
}
const jwtVerifyOptions = rawJwtVerifyOptions
    ? rawJwtVerifyOptions
    : trimNulls({
        algorithms: jwtVerifyAlgorithms,
        audience: jwtVerifyAudience,
        clockTolerance: jwtVerifyClockTolerance,
        jwtId: jwtVerifyId,
        ignoreExpiration: jwtVerifyIgnoreExpiration,
        ignoreNotBefore: jwtVerifyIgnoreNotBefore,
        issuer: jwtVerifyIssuer,
        subject: jwtVerifySubject,
    });
const appendPlugins = loadPlugins(appendPluginNames);
const prependPlugins = loadPlugins(prependPluginNames);
const skipPlugins = loadPlugins(skipPluginNames);
// The options to pass through to the schema builder, or the middleware
const postgraphileOptions = pluginHook('cli:library:options', {
    ...postgraphilerc_1.default['options'],
    classicIds,
    dynamicJson,
    disableDefaultMutations,
    ignoreRBAC: ignoreRbac,
    includeExtensionResources,
    graphqlRoute,
    graphiqlRoute,
    graphiql: !disableGraphiql,
    enhanceGraphiql: enhanceGraphiql ? true : undefined,
    jwtPgTypeIdentifier: jwtPgTypeIdentifier || deprecatedJwtPgTypeIdentifier,
    jwtSecret: jwtSecret || deprecatedJwtSecret || process.env.JWT_SECRET,
    jwtPublicKey,
    jwtAudiences,
    jwtSignOptions,
    jwtRole,
    jwtVerifyOptions,
    retryOnInitFail,
    pgDefaultRole,
    subscriptions: subscriptions || live,
    live,
    watchPg,
    showErrorStack,
    extendedErrors,
    disableQueryLog,
    allowExplain: allowExplain ? true : undefined,
    enableCors,
    exportJsonSchemaPath,
    exportGqlSchemaPath,
    sortExport,
    bodySizeLimit,
    appendPlugins: smartTagsPlugin ? [smartTagsPlugin, ...(appendPlugins || [])] : appendPlugins,
    prependPlugins,
    skipPlugins,
    readCache,
    writeCache,
    legacyRelations,
    setofFunctionsContainNulls,
    legacyJsonUuid,
    enableQueryBatching,
    pluginHook,
    simpleCollections,
    legacyFunctionsOnly,
    ignoreIndexes,
    ownerConnectionString,
}, { config: postgraphilerc_1.default, cliOptions: program });
function killAllWorkers(signal = 'SIGTERM') {
    for (const id in cluster.workers) {
        const worker = cluster.workers[id];
        if (Object.prototype.hasOwnProperty.call(cluster.workers, id) && worker) {
            worker.kill(signal);
        }
    }
}
if (noServer) {
    // No need for a server, let's just spin up the schema builder
    (async () => {
        const pgPool = new pg_1.Pool(pgConfig);
        pgPool.on('error', err => {
            // tslint:disable-next-line no-console
            console.error('PostgreSQL client generated error: ', err.message);
        });
        const { getGraphQLSchema } = postgraphile_1.getPostgraphileSchemaBuilder(pgPool, schemas, postgraphileOptions);
        await getGraphQLSchema();
        if (!watchPg) {
            await pgPool.end();
        }
    })().then(null, e => {
        console.error('Error occurred!');
        console.error(e);
        process.exit(1);
    });
}
else {
    if (clusterWorkers >= 2 && cluster.isMaster) {
        let shuttingDown = false;
        const shutdown = () => {
            if (!shuttingDown) {
                shuttingDown = true;
                process.exitCode = 1;
                const fallbackTimeout = setTimeout(() => {
                    const remainingCount = Object.keys(cluster.workers).length;
                    if (remainingCount > 0) {
                        console.log(`  [cluster] ${remainingCount} workers did not die fast enough, sending SIGKILL`);
                        killAllWorkers('SIGKILL');
                        const ultraFallbackTimeout = setTimeout(() => {
                            console.log(`  [cluster] really should have exited automatically, but haven't - exiting`);
                            process.exit(3);
                        }, 5000);
                        ultraFallbackTimeout.unref();
                    }
                    else {
                        console.log(`  [cluster] should have exited automatically, but haven't - exiting`);
                        process.exit(2);
                    }
                }, 5000);
                fallbackTimeout.unref();
                console.log(`  [cluster] killing other workers with SIGTERM`);
                killAllWorkers('SIGTERM');
            }
        };
        cluster.on('exit', (worker, code, signal) => {
            console.log(`  [cluster] worker pid=${worker.process.pid} exited (code=${code}, signal=${signal})`);
            shutdown();
        });
        for (let i = 0; i < clusterWorkers; i++) {
            const worker = cluster.fork({
                POSTGRAPHILE_WORKER_NUMBER: String(i + 1),
            });
            console.log(`  [cluster] started worker ${i + 1} (pid=${worker.process.pid})`);
        }
    }
    else {
        // Create’s our PostGraphile server
        const rawMiddleware = postgraphile_1.default(pgConfig, schemas, postgraphileOptions);
        // You probably don't want this hook; likely you want
        // `postgraphile:middleware` instead. This hook will likely be removed in
        // future without warning.
        const middleware = pluginHook(
        /* DO NOT USE -> */ 'cli:server:middleware' /* <- DO NOT USE */, rawMiddleware, {
            options: postgraphileOptions,
        });
        const server = http_1.createServer(middleware);
        if (serverTimeout) {
            server.timeout = serverTimeout;
        }
        if (postgraphileOptions.subscriptions) {
            subscriptions_1.enhanceHttpServerWithSubscriptions(server, middleware);
        }
        pluginHook('cli:server:created', server, {
            options: postgraphileOptions,
            middleware,
        });
        // Start our server by listening to a specific port and host name. Also log
        // some instructions and other interesting information.
        server.listen(port, hostname, () => {
            const address = server.address();
            const actualPort = typeof address === 'string' ? port : address.port;
            const self = cluster.isMaster
                ? isDev
                    ? `server (pid=${process.pid})`
                    : 'server'
                : `worker ${process.env.POSTGRAPHILE_WORKER_NUMBER} (pid=${process.pid})`;
            const versionString = `v${manifest.version}`;
            if (cluster.isMaster || process.env.POSTGRAPHILE_WORKER_NUMBER === '1') {
                console.log('');
                console.log(`PostGraphile ${versionString} ${self} listening on port ${chalk_1.default.underline(actualPort.toString())} 🚀`);
                console.log('');
                const { host: rawPgHost, port: rawPgPort, database: pgDatabase, user: pgUser, password: pgPassword, } = pgConfig;
                // Not using default because want to handle the empty string also.
                const pgHost = rawPgHost || 'localhost';
                const pgPort = (rawPgPort && parseInt(String(rawPgPort), 10)) || 5432;
                const safeConnectionString = isDemo
                    ? 'postgraphile_demo'
                    : `postgres://${pgUser ? pgUser : ''}${pgPassword ? ':[SECRET]' : ''}${pgUser || pgPassword ? '@' : ''}${pgUser || pgPassword || pgHost !== 'localhost' || pgPort !== 5432 ? pgHost : ''}${pgPort !== 5432 ? `:${pgConfig.port || 5432}` : ''}${pgDatabase ? `/${pgDatabase}` : ''}`;
                const information = pluginHook('cli:greeting', [
                    `GraphQL API:         ${chalk_1.default.underline.bold.blue(`http://${hostname}:${actualPort}${graphqlRoute}`)}` +
                        (postgraphileOptions.subscriptions
                            ? ` (${postgraphileOptions.live ? 'live ' : ''}subscriptions enabled)`
                            : ''),
                    !disableGraphiql &&
                        `GraphiQL GUI/IDE:    ${chalk_1.default.underline.bold.blue(`http://${hostname}:${actualPort}${graphiqlRoute}`)}` +
                            (postgraphileOptions.enhanceGraphiql ||
                                postgraphileOptions.live ||
                                postgraphileOptions.subscriptions
                                ? ''
                                : ` (enhance with '--enhance-graphiql')`),
                    `Postgres connection: ${chalk_1.default.underline.magenta(safeConnectionString)}${postgraphileOptions.watchPg ? ' (watching)' : ''}`,
                    `Postgres schema(s):  ${schemas.map(schema => chalk_1.default.magenta(schema)).join(', ')}`,
                    `Documentation:       ${chalk_1.default.underline(`https://graphile.org/postgraphile/introduction/`)}`,
                    extractedPlugins.length === 0
                        ? `Join ${chalk_1.default.bold(sponsor)} in supporting PostGraphile development: ${chalk_1.default.underline.bold.blue(`https://graphile.org/sponsor/`)}`
                        : null,
                ], {
                    options: postgraphileOptions,
                    middleware,
                    port: actualPort,
                    chalk: chalk_1.default,
                }).filter(isString);
                console.log(information.map(msg => `  ‣ ${msg}`).join('\n'));
                console.log('');
                console.log(chalk_1.default.gray('* * *'));
            }
            else {
                console.log(`PostGraphile ${versionString} ${self} listening on port ${chalk_1.default.underline(actualPort.toString())} 🚀`);
            }
            console.log('');
        });
    }
}
/* eslint-enable */
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3Bvc3RncmFwaGlsZS9jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSw0QkFBNEI7O0FBRTVCOzs7Ozs7R0FNRztBQUNILHFEQUFzQztBQUV0QywrQkFBb0M7QUFDcEMsaUNBQTBCO0FBQzFCLHFDQUFzQztBQUV0QywrREFBd0U7QUFDeEUsaURBQTRFO0FBQzVFLHdDQUEyRDtBQUMzRCwyQkFBc0M7QUFDdEMsbUNBQW9DO0FBQ3BDLDZDQUFrRTtBQUNsRSxzQ0FBdUM7QUFFdkMsK0NBQStDO0FBQy9DLGdEQUFpRDtBQUNqRCx3REFBMEU7QUFDMUUsMkJBQWdDO0FBRWhDLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRywwQkFBMEIsQ0FBQztBQUM1RDs7O0dBR0c7QUFDSCxNQUFNLGVBQWUsR0FBRyxlQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLHVDQUE2QixFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUV0RixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixLQUFLLGFBQWEsQ0FBQztBQUU3RCxTQUFTLFFBQVEsQ0FBQyxHQUFZO0lBQzVCLE9BQU8sT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDO0FBQ2pDLENBQUM7QUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFFdEUsTUFBTSxRQUFRLEdBQUcsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFFbEQsK0JBQStCO0FBQy9CLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQztBQUV6QixTQUFTLGNBQWMsQ0FDckIsT0FBc0I7SUFLdEIsSUFBSSxJQUFJLENBQUM7SUFDVCxJQUFJLGFBQWEsR0FB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