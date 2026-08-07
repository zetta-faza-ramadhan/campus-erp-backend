// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  scalar DateTime

  type StudentGrade {
    _id: ID!
    student_id: ID!
    test_id: ID!
    academic_year_id: ID!
    score: Float!
    created_at: DateTime!
    updated_at: DateTime!
  }

  input StudentScoreInput {
    student_id: ID!
    score: Float!
  }

  input SubmitTestGradesInput {
    academic_year_id: ID!
    test_id: ID!
    grades: [StudentScoreInput!]!
  }

  type Mutation {
    SubmitTestGrades(input: SubmitTestGradesInput!): [StudentGrade!]! @auth(requires: TEACHER)
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
