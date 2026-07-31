// *************** IMPORT MODULE ***************
const typeDefs = require("./enrollment.typedef");
const mutationResolver = require("./enrollment.mutation.resolver");

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers: { ...mutationResolver },
};
