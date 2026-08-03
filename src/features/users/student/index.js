// *************** IMPORT MODULE ***************
const typeDefs = require("./student.typedef");
const mutationResolver = require("./student.mutation.resolver");

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers: { ...mutationResolver },
};
