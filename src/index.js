// *************** IMPORT LIBRARY ***************
const express = require("express");
const cors = require("cors");

// *************** IMPORT MODULE ***************
const config = require("./core/config");
require("./core/db");
const { CreateApolloMiddleware } = require("./core/apollo");
const systemSchema = require("./features/system");
const curriculumSchema = require("./features/academic/curriculum");
const studentSchema = require("./features/users/student");
const enrollmentSchema = require("./features/academic/enrollment");
const authSchema = require("./features/users/auth");
const AuthMiddleware = require("./shared/middlewares/auth.middleware");

// *************** INITIALIZE APPLICATION ***************
const app = express();

app.use(cors());
app.use(express.json());
app.use(AuthMiddleware);

// *************** RESOLVER MERGE UTILITY ***************
/**
 * Merges resolver maps from multiple feature schemas so every root
 * operation type (Query, Mutation, Subscription) and every type resolver
 * is preserved. Feature-scoped resolvers can override core ones.
 *
 * @param {...Object} schemas - Feature schemas exposing { typeDefs, resolvers }.
 * @returns {Object} A combined resolver map.
 */
function MergeResolvers(...schemas) {
  return schemas.reduce((merged, schema) => {
    for (const [key, value] of Object.entries(schema.resolvers)) {
      merged[key] = { ...merged[key], ...value };
    }
    return merged;
  }, {});
}

// *************** INITIALIZE AND MOUNT APOLLO SERVER ***************
/**
 * Start express server and mount Apollo GraphQL middleware
 *
 * @returns {Promise<void>} Resolves when the server is listening.
 */
async function StartServer() {
  const graphqlMiddleware = await CreateApolloMiddleware({
    typeDefs: [
      systemSchema.typeDefs,
      curriculumSchema.typeDefs,
      studentSchema.typeDefs,
      enrollmentSchema.typeDefs,
      authSchema.typeDefs,
    ],
    resolvers: MergeResolvers(
      systemSchema,
      curriculumSchema,
      studentSchema,
      enrollmentSchema,
      authSchema,
    ),
  });
  app.use("/graphql", graphqlMiddleware);

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}/graphql`);
  });
}

// *************** Initialize the server
StartServer();
