// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
   input LoginInput {
     email: String!
     password: String!
   }

   type Mutation {
     Login(input: LoginInput!): String! 
   }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
