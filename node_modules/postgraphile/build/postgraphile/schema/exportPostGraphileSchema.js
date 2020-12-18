"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const graphql_1 = require("graphql");
const util_1 = require("util");
const readFile = util_1.promisify(fs_1.readFile);
const writeFile = util_1.promisify(fs_1.writeFile);
async function writeFileIfDiffers(path, contents) {
    let oldContents = null;
    try {
        oldContents = await readFile(path, 'utf8');
    }
    catch (e) {
        /* noop */
    }
    if (oldContents !== contents) {
        await writeFile(path, contents);
    }
}
/**
 * Exports a PostGraphile schema by looking at a Postgres client.
 */
async function exportPostGraphileSchema(schema, options = {}) {
    const jsonPath = typeof options.exportJsonSchemaPath === 'string' ? options.exportJsonSchemaPath : null;
    const graphqlPath = typeof options.exportGqlSchemaPath === 'string' ? options.exportGqlSchemaPath : null;
    // Sort schema, if requested
    const finalSchema = options.sortExport && graphql_1.lexicographicSortSchema && (jsonPath || graphqlPath)
        ? graphql_1.lexicographicSortSchema(schema)
        : schema;
    // JSON version
    if (jsonPath) {
        const result = await graphql_1.graphql(finalSchema, graphql_1.introspectionQuery);
        await writeFileIfDiffers(jsonPath, JSON.stringify(result, null, 2));
    }
    // Schema language version
    if (graphqlPath) {
        await writeFileIfDiffers(graphqlPath, graphql_1.printSchema(finalSchema));
    }
}
exports.default = exportPostGraphileSchema;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwb3J0UG9zdEdyYXBoaWxlU2NoZW1hLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL3Bvc3RncmFwaGlsZS9zY2hlbWEvZXhwb3J0UG9zdEdyYXBoaWxlU2NoZW1hLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsMkJBQTBFO0FBQzFFLHFDQU1pQjtBQUVqQiwrQkFBaUM7QUFFakMsTUFBTSxRQUFRLEdBQUcsZ0JBQVMsQ0FBQyxhQUFZLENBQUMsQ0FBQztBQUN6QyxNQUFNLFNBQVMsR0FBRyxnQkFBUyxDQUFDLGNBQWEsQ0FBQyxDQUFDO0FBRTNDLEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxJQUFZLEVBQUUsUUFBZ0I7SUFDOUQsSUFBSSxXQUFXLEdBQWtCLElBQUksQ0FBQztJQUN0QyxJQUFJO1FBQ0YsV0FBVyxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztLQUM1QztJQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ1YsVUFBVTtLQUNYO0lBQ0QsSUFBSSxXQUFXLEtBQUssUUFBUSxFQUFFO1FBQzVCLE1BQU0sU0FBUyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztLQUNqQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNZLEtBQUssVUFBVSx3QkFBd0IsQ0FDcEQsTUFBcUIsRUFDckIsVUFBK0IsRUFBRTtJQUVqQyxNQUFNLFFBQVEsR0FDWixPQUFPLE9BQU8sQ0FBQyxvQkFBb0IsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3pGLE1BQU0sV0FBVyxHQUNmLE9BQU8sT0FBTyxDQUFDLG1CQUFtQixLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFFdkYsNEJBQTRCO0lBQzVCLE1BQU0sV0FBVyxHQUNmLE9BQU8sQ0FBQyxVQUFVLElBQUksaUNBQXVCLElBQUksQ0FBQyxRQUFRLElBQUksV0FBVyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxpQ0FBdUIsQ0FBQyxNQUFNLENBQUM7UUFDakMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztJQUViLGVBQWU7SUFDZixJQUFJLFFBQVEsRUFBRTtRQUNaLE1BQU0sTUFBTSxHQUFHLE1BQU0saUJBQU8sQ0FBQyxXQUFXLEVBQUUsNEJBQWtCLENBQUMsQ0FBQztRQUM5RCxNQUFNLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNyRTtJQUVELDBCQUEwQjtJQUMxQixJQUFJLFdBQVcsRUFBRTtRQUNmLE1BQU0sa0JBQWtCLENBQUMsV0FBVyxFQUFFLHFCQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUNqRTtBQUNILENBQUM7QUF6QkQsMkNBeUJDIn0=