// *************** IMPORT LIBRARY ***************
const { ApolloServer, HeaderMap } = require("@apollo/server");
const { makeExecutableSchema } = require("@graphql-tools/schema");

// *************** IMPORT MODULE ***************
const config = require("./config");
const { DateTime } = require("./scalars");
const { NormalizeClientErrors } = require("./graphql_error");
const { CreateAllLoaders } = require("../loaders");
const {
  AUTH_DIRECTIVE_SDL,
  AuthDirectiveTransformer,
} = require("../shared/directives/auth.directive");

/**
 * Creates and starts an Apollo Server, returning an Express middleware function.
 *
 * @param {Object} schema - Object containing typeDefs and resolvers
 * @returns {Promise<Function>} Express middleware for the /graphql route
 */
const NORMALIZE_CLIENT_ERROR_PLUGIN = {
  async requestDidStart() {
    return {
      async willSendResponse({ response }) {
        NormalizeClientErrors(response.body);
      },
    };
  },
};

async function CreateApolloMiddleware(schema) {
  // *************** Create executable schema with auth directive
  let executableSchema = makeExecutableSchema({
    typeDefs: [AUTH_DIRECTIVE_SDL, schema.typeDefs],
    resolvers: {
      ...schema.resolvers,
      DateTime,
    },
  });

  // *************** Apply @auth directive transformer to the schema
  executableSchema = AuthDirectiveTransformer(executableSchema);

  const server = new ApolloServer({
    schema: executableSchema,
    nodeEnv: config.nodeEnv,
    plugins: [NORMALIZE_CLIENT_ERROR_PLUGIN],
  });

  await server.start();
  return (req, res, next) => ApolloMiddleware(req, res, next, server);
}

/**
 * Express middleware that handles GraphQL requests via Apollo Server.
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @param {ApolloServer} server - The started Apollo Server instance
 */
async function ApolloMiddleware(req, res, next, server) {
  try {
    // *************** Convert Express headers to Apollo HeaderMap
    const headers = new HeaderMap();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }
    // *************** Execute the GraphQL request
    const httpGraphQLRequest = {
      method: req.method.toUpperCase(),
      headers,
      body: req.body,
      search: req.url.split("?")[1] || "",
    };
    const result = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest,
      context: async () => ({
        // *************** Attach user from request (if authenticated)
        user: req.user,
        // *************** Per-request loaders (fresh cache per request)
        loaders: CreateAllLoaders(),
      }),
    });
    // *************** Write response headers
    for (const [key, value] of result.headers) {
      res.setHeader(key, value);
    }
    res.statusCode = result.status || 200;
    // *************** Write response body
    if (result.body.kind === "complete") {
      res.send(result.body.string);
    } else {
      res.send("");
    }
  } catch (err) {
    next(err);
  }
}

// *************** EXPORT MODULE ***************
module.exports = { CreateApolloMiddleware };
