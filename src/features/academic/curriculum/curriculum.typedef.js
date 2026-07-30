const typeDefs = `#graphql
  type GradingRule {
    label: String!
    operator: String!
    threshold: Float!
  }

  type Block {
    id: ID!
    name: String!
    academic_year: String!
    grading_rules: [GradingRule!]!
  }

  type Subject {
    id: ID!
    name: String!
    block_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
  }

  type Test {
    id: ID!
    name: String!
    subject_id: ID!
    weightage: Float!
    grading_rules: [GradingRule!]!
  }

  input CreateBlockInput {
    name: String!
    academic_year: String!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateBlockInput {
    id: ID!
    name: String
    academic_year: String
    grading_rules: [GradingRuleInput!]
  }

  input CreateSubjectInput {
    name: String!
    block_id: ID!
    weightage: Float!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateSubjectInput {
    id: ID!
    name: String
    block_id: ID
    weightage: Float
    grading_rules: [GradingRuleInput!]
  }

  input CreateTestInput {
    name: String!
    subject_id: ID!
    weightage: Float!
    grading_rules: [GradingRuleInput!]!
  }

  input UpdateTestInput {
    id: ID!
    name: String
    subject_id: ID
    weightage: Float
    grading_rules: [GradingRuleInput!]
  }

  input GradingRuleInput {
    label: String!
    operator: String!
    threshold: Float!
  }

  type Query {
    getBlocks: [Block!]!
    getSubjects(blockId: ID!): [Subject!]!
    getTests(subjectId: ID!): [Test!]!
  }
  
  type Mutation {
    createBlock(input: CreateBlockInput!): Block!
    updateBlock(input: UpdateBlockInput!): Block!
    deleteBlock(id: ID!): Block!
    createSubject(input: CreateSubjectInput!): Subject!
    updateSubject(input: UpdateSubjectInput!): Subject!
    deleteSubject(id: ID!): Subject!
    createTest(input: CreateTestInput!): Test!
    updateTest(input: UpdateTestInput!): Test!
    deleteTest(id: ID!): Test!
  }
`;

// *************** EXPORT MODULE ***************
module.exports = typeDefs;
