// *************** IMPORT LIBRARY ***************
const { ApolloServer, HeaderMap } = require("@apollo/server");

/**
 * Creates and starts an Apollo Server, returning an Express middleware function.
 *
 * @param {Object} schema - Object containing typeDefs and resolvers
 * @returns {Promise<Function>} Express middleware for the /graphql route
 */
async function CreateApolloMiddleware(schema) {
  const server = new ApolloServer({
    typeDefs: schema.typeDefs,
    resolvers: schema.resolvers,
  });

  await server.start();

  /**
   * Express middleware that handles GraphQL requests via Apollo Server.
   *
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  return async function apolloMiddleware(req, res, next) {
    try {
      // *************** Convert Express headers to Apollo HeaderMap
      const headers = new HeaderMap();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
      }

      // *************** Execute the GraphQL request ***************
      const httpGraphQLRequest = {
        method: req.method.toUpperCase(),
        headers,
        body: req.body,
        search: req.url.split("?")[1] || "",
      };

      const result = await server.executeHTTPGraphQLRequest({
        httpGraphQLRequest,
        context: async () => ({}),
      });

      // *************** Write response headers ***************
      for (const [key, value] of result.headers) {
        res.setHeader(key, value);
      }
      res.statusCode = result.status || 200;

      // *************** Write response body ***************
      if (result.body.kind === "complete") {
        res.send(result.body.string);
      } else {
        res.send("");
      }
    } catch (err) {
      next(err);
    }
  };
}

// *************** EXPORT MODULE ***************
module.exports = { CreateApolloMiddleware };
