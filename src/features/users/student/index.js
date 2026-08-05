// *************** IMPORT MODULE ***************
const typeDefs = require("./student.typedef");
const mutationResolver = require("./student.mutation.resolver");
const queryResolver = require("./student.query.resolver");

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers: { ...mutationResolver, ...queryResolver },
};
