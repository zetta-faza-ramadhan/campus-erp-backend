// *************** IMPORT CORE ***************

// *************** IMPORT LIBRARY ***************

// *************** IMPORT MODULE ***************

// *************** GLOBAL VARIABLES ***************

/**
 * System GraphQL type definitions.
 * Provides the baseline schema required for Apollo Server to boot.
 */
const typeDefs = `#graphql
  type Query {
    ping: String!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
