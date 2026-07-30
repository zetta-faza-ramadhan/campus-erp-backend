// *************** IMPORT LIBRARY ***************
const express = require("express");
const cors = require("cors");

// *************** IMPORT MODULE ***************
const config = require("./core/config");
require("./core/db");
const { CreateApolloMiddleware } = require("./core/apollo");
const systemSchema = require("./features/system");
const curriculumSchema = require("./features/academic/curriculum");

// *************** INITIALIZE APPLICATION ***************
const app = express();

app.use(cors());
app.use(express.json());

// *************** INITIALIZE AND MOUNT APOLLO SERVER ***************
/**
 * Start express server and mount Apollo GraphQL middleware
 *
 * @returns {Promise<void>} Resolves when the server is listening.
 */
async function StartServer() {
  const graphqlMiddleware = await CreateApolloMiddleware({
    typeDefs: [systemSchema.typeDefs, curriculumSchema.typeDefs],
    resolvers: {
      Query: { ...systemSchema.resolvers.Query, ...curriculumSchema.resolvers.Query },
      Mutation: { ...curriculumSchema.resolvers.Mutation },
    },
  });
  app.use("/graphql", graphqlMiddleware);

  app.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}/graphql`);
  });
}

// *************** Initialize the server
StartServer();
