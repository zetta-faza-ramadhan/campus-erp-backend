// *************** DEFINE GRAPHQL SCHEMA ***************
const typeDefs = `#graphql
  scalar DateTime

  type Student {
    _id: ID!
    first_name: String!
    last_name: String!
    email: String!
    student_number: String!
    registration_date: DateTime!
    created_at: DateTime!
    updated_at: DateTime!
    deleted_at: DateTime
    academic_year_ids: [ID!]!
    academic_years: [AcademicYear!]! 
  }

  input CreateStudentInput {
    first_name: String!
    last_name: String!
    email: String!
    student_number: String!
  }

  type Query {
    GetStudentsByAcademicYear(input: GetStudentsByAcademicYearInput!): PaginatedStudentResponse!
  }

  type Mutation {
    CreateStudent(input: CreateStudentInput!): Student! @auth(requires: ADMIN)
  }

  type PaginatedStudentResponse {
    total_count: Int!
    current_page: Int!
    total_pages: Int!
    data: [Student]!
  }

  input GetStudentsByAcademicYearInput {
    academic_year_id: ID!
    page: Int
    limit: Int
    search: String
  }

`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
