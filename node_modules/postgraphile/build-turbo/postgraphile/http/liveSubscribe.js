"use strict";
/**
 * This file contains code that is derived from code copyright (c) Facebook,
 * Inc. and its affiliates; released under the MIT license.
 *
 * The original code can be seen at the following URL, which includes a
 * reference to the original license:
 *
 *   https://github.com/graphql/graphql-js/blob/f56905bd6b030d5912092a1239ed21f73fbdd408/src/subscription/subscribe.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable no-any */
const graphql_1 = require("graphql");
const mapAsyncIterator_1 = require("./mapAsyncIterator");
const iterall_1 = require("iterall");
function liveSubscribe(argsOrSchema, document, rootValue, contextValue, variableValues, operationName, fieldResolver, subscribeFieldResolver) {
    /* eslint-enable no-redeclare */
    // Extract arguments from object args if provided.
    return arguments.length === 1
        ? liveSubscribeImpl(argsOrSchema.schema, argsOrSchema.document, argsOrSchema.rootValue, argsOrSchema.contextValue, argsOrSchema.variableValues, argsOrSchema.operationName, argsOrSchema.fieldResolver, argsOrSchema.subscribeFieldResolver)
        : liveSubscribeImpl(argsOrSchema, document, rootValue, contextValue, variableValues, operationName, fieldResolver, subscribeFieldResolver);
}
exports.default = liveSubscribe;
function liveSubscribeImpl(schema, document, rootValue, contextValue, variableValues, operationName, fieldResolver, subscribeFieldResolver) {
    const sourcePromise = graphql_1.createSourceEventStream(schema, document, rootValue, contextValue, variableValues, operationName, subscribeFieldResolver);
    // For each payload yielded from a subscription, map it over the normal
    // GraphQL `execute` function, with `payload` as the rootValue.
    // This implements the "MapSourceToResponseEvent" algorithm described in
    // the GraphQL specification. The `execute` function provides the
    // "ExecuteSubscriptionEvent" algorithm, as it is nearly identical to the
    // "ExecuteQuery" algorithm, for which `execute` is also used.
    const mapSourceToResponse = async (payload) => {
        /*
         * GRAPHILE FORK
         *
         * We need to tell Graphile Engine when the execution has completed
         * (because we cannot detect this from inside the GraphQL execution) so
         * that it can clean up old listeners; we do this with the `finally` block.
         */
        try {
            return await graphql_1.execute(schema, document, payload, contextValue, variableValues, operationName, fieldResolver);
        }
        finally {
            if (payload && typeof payload.release === 'function') {
                payload.release();
            }
        }
    };
    // Resolve the Source Stream, then map every source value to a
    // ExecutionResult value as described above.
    return sourcePromise.then(resultOrStream => 
    // Note: Flow can't refine isAsyncIterable, so explicit casts are used.
    iterall_1.isAsyncIterable(resultOrStream)
        ? mapAsyncIterator_1.default(resultOrStream, mapSourceToResponse, reportGraphQLError)
        : resultOrStream, reportGraphQLError);
}
/**
 * This function checks if the error is a GraphQLError. If it is, report it as
 * an ExecutionResult, containing only errors and no data. Otherwise treat the
 * error as a system-class error and re-throw it.
 */
function reportGraphQLError(error) {
    if (error instanceof graphql_1.GraphQLError) {
        return { errors: [error] };
    }
    throw error;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGl2ZVN1YnNjcmliZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9wb3N0Z3JhcGhpbGUvaHR0cC9saXZlU3Vic2NyaWJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7R0FRRzs7QUFFSCwyQkFBMkI7QUFDM0IscUNBUWlCO0FBQ2pCLHlEQUFrRDtBQUNsRCxxQ0FBMEM7QUFJMUMsU0FBd0IsYUFBYSxDQUNuQyxZQUFpQyxFQUNqQyxRQUFzQixFQUN0QixTQUFlLEVBQ2YsWUFBa0IsRUFDbEIsY0FBdUMsRUFDdkMsYUFBc0IsRUFDdEIsYUFBOEMsRUFDOUMsc0JBQXVEO0lBRXZELGdDQUFnQztJQUNoQyxrREFBa0Q7SUFDbEQsT0FBTyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDM0IsQ0FBQyxDQUFDLGlCQUFpQixDQUNmLFlBQVksQ0FBQyxNQUFNLEVBQ25CLFlBQVksQ0FBQyxRQUFRLEVBQ3JCLFlBQVksQ0FBQyxTQUFTLEVBQ3RCLFlBQVksQ0FBQyxZQUFZLEVBQ3pCLFlBQVksQ0FBQyxjQUFjLEVBQzNCLFlBQVksQ0FBQyxhQUFhLEVBQzFCLFlBQVksQ0FBQyxhQUFhLEVBQzFCLFlBQVksQ0FBQyxzQkFBc0IsQ0FDcEM7UUFDSCxDQUFDLENBQUMsaUJBQWlCLENBQ2YsWUFBWSxFQUNaLFFBQVEsRUFDUixTQUFTLEVBQ1QsWUFBWSxFQUNaLGNBQWMsRUFDZCxhQUFhLEVBQ2IsYUFBYSxFQUNiLHNCQUFzQixDQUN2QixDQUFDO0FBQ1IsQ0FBQztBQWpDRCxnQ0FpQ0M7QUFFRCxTQUFTLGlCQUFpQixDQUN4QixNQUFxQixFQUNyQixRQUFzQixFQUN0QixTQUFlLEVBQ2YsWUFBa0IsRUFDbEIsY0FBdUMsRUFDdkMsYUFBc0IsRUFDdEIsYUFBOEMsRUFDOUMsc0JBQXVEO0lBRXZELE1BQU0sYUFBYSxHQUFHLGlDQUF1QixDQUMzQyxNQUFNLEVBQ04sUUFBUSxFQUNSLFNBQVMsRUFDVCxZQUFZLEVBQ1osY0FBYyxFQUNkLGFBQWEsRUFDYixzQkFBc0IsQ0FDdkIsQ0FBQztJQUVGLHVFQUF1RTtJQUN2RSwrREFBK0Q7SUFDL0Qsd0VBQXdFO0lBQ3hFLGlFQUFpRTtJQUNqRSx5RUFBeUU7SUFDekUsOERBQThEO0lBQzlELE1BQU0sbUJBQW1CLEdBQUcsS0FBSyxFQUFFLE9BQVksRUFBRSxFQUFFO1FBQ2pEOzs7Ozs7V0FNRztRQUNILElBQUk7WUFDRixPQUFPLE1BQU0saUJBQU8sQ0FDbEIsTUFBTSxFQUNOLFFBQVEsRUFDUixPQUFPLEVBQ1AsWUFBWSxFQUNaLGNBQWMsRUFDZCxhQUFhLEVBQ2IsYUFBYSxDQUNkLENBQUM7U0FDSDtnQkFBUztZQUNSLElBQUksT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUU7Z0JBQ3BELE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQzthQUNuQjtTQUNGO0lBQ0gsQ0FBQyxDQUFDO0lBRUYsOERBQThEO0lBQzlELDRDQUE0QztJQUM1QyxPQUFPLGFBQWEsQ0FBQyxJQUFJLENBQ3ZCLGNBQWMsQ0FBQyxFQUFFO0lBQ2YsdUVBQXVFO0lBQ3ZFLHlCQUFlLENBQUMsY0FBYyxDQUFDO1FBQzdCLENBQUMsQ0FBQywwQkFBZ0IsQ0FDYixjQUE4QyxFQUMvQyxtQkFBbUIsRUFDbkIsa0JBQWtCLENBQ25CO1FBQ0gsQ0FBQyxDQUFHLGNBQTBDLEVBQ2xELGtCQUFrQixDQUNuQixDQUFDO0FBQ0osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGtCQUFrQixDQUFDLEtBQVU7SUFDcEMsSUFBSSxLQUFLLFlBQVksc0JBQVksRUFBRTtRQUNqQyxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztLQUM1QjtJQUNELE1BQU0sS0FBSyxDQUFDO0FBQ2QsQ0FBQyJ9