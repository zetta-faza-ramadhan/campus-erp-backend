// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  scalar DateTime

  type AcademicYear {
    _id: ID!
    name: String!
    start_date: DateTime!
    end_date: DateTime!
    status: String!
    block_ids: [ID!]!
    student_ids: [ID!]!
    created_at: DateTime!
    updated_at: DateTime!
    deleted_at: DateTime
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
