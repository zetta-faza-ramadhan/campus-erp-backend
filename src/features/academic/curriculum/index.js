// *************** IMPORT MODULE ***************
const typeDefs = require("./curriculum.typedef");
const queryResolver = require("./curriculum.query.resolver");
const mutationResolver = require("./curriculum.mutation.resolver");

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers: { ...queryResolver, ...mutationResolver },
};
