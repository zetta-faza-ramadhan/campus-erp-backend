// *************** IMPORT MODULE ***************
const typeDefs = require("./grading.typedef");
const mutationResolver = require("./grading.mutation.resolver");

// *************** EXPORT MODULE ***************
module.exports = {
  typeDefs,
  resolvers: { ...mutationResolver },
};
