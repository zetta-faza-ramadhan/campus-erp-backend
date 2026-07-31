// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  type Student {
    _id: ID!
    first_name: String!
    last_name: String!
    email: String!
    student_number: String!
    registration_date: String!
    academic_year_ids: [ID!]!
  }

  input CreateStudentInput {
    first_name: String!
    last_name: String!
    email: String!
    student_number: String!
  }

  type Mutation {
    CreateStudent(input: CreateStudentInput!): Student!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
