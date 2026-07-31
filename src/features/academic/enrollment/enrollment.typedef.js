// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  type AcademicYear {
    _id: ID!
    name: String!
    start_date: String!
    end_date: String!
    status: String!
    block_ids: [ID!]!
    student_ids: [ID!]!
  }

  input EnrollStudentsInput {
    academic_year_id: ID!
    student_ids: [ID!]!
  }

  type Mutation {
    EnrollStudentsToYear(input: EnrollStudentsInput!): AcademicYear!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
